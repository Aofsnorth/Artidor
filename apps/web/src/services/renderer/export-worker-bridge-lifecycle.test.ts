/**
 * Export worker bridge — lifecycle behaviour (problems 4, 5 and 6).
 *
 * A real `Worker` needs a browser, so `globalThis.Worker` is replaced with a
 * fake that records `postMessage`/`terminate` and lets a test deliver messages
 * synchronously. That is enough to exercise the three properties that were
 * wrong and are invisible to a source-level contract test:
 *
 *  - `onReady` must mean "GPU initialised", not "module evaluated" (the
 *    parallel launcher staggers adapter requests on it);
 *  - the PCM handover must be a transfer, not a copy, when the caller says the
 *    mixdown is spent;
 *  - the cancel-polling `setInterval` must be cleared on *every* settle path,
 *    otherwise a settled export keeps a live timer that terminates the worker
 *    a second time.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	runExportInWorker,
	type ExportWorkerResult,
} from "./export-worker-bridge";

type Posted = { message: Record<string, unknown>; transfer: Transferable[] };

class FakeWorker {
	onmessage: ((event: { data: unknown }) => void) | null = null;
	onmessageerror: ((event: unknown) => void) | null = null;
	onerror: ((event: { message?: string }) => void) | null = null;
	readonly posted: Posted[] = [];
	terminateCalls = 0;

	constructor(
		readonly url: string | URL,
		readonly options?: WorkerOptions,
	) {
		workers.push(this);
	}

	postMessage(message: unknown, transfer: Transferable[] = []): void {
		this.posted.push({
			message: message as Record<string, unknown>,
			transfer,
		});
	}

	terminate(): void {
		this.terminateCalls++;
	}

	/** Deliver a worker→main message synchronously. */
	emit(data: unknown): void {
		this.onmessage?.({ data });
	}
}

let workers: FakeWorker[] = [];
const globals = globalThis as unknown as Record<string, unknown>;
const originalWorker = globals.Worker;
const originalNavigator = globals.navigator;

beforeEach(() => {
	workers = [];
	globals.Worker = FakeWorker;
});

afterEach(() => {
	globals.Worker = originalWorker;
	globals.navigator = originalNavigator;
});

function latest(): FakeWorker {
	const worker = workers[workers.length - 1];
	if (!worker) throw new Error("no worker was constructed");
	return worker;
}

const FPS = { numerator: 30, denominator: 1 } as unknown as Parameters<
	typeof runExportInWorker
>[0]["fps"];

function baseArgs() {
	return {
		sceneTree: {
			type: "root",
			params: { duration: 120_000 },
			children: [],
		} as unknown as Parameters<typeof runExportInWorker>[0]["sceneTree"],
		files: [],
		audioBuffer: null,
		width: 1920,
		height: 1080,
		fps: FPS,
		format: "mp4" as const,
		quality: "high" as const,
		shouldIncludeAudio: false,
		// Never touch the module-level warm pool: these tests are about the
		// per-export lifecycle, and a shared warm worker would leak across them.
		reuseWorker: false,
	};
}

/** An AudioBuffer whose channels are backed by real ArrayBuffers. */
function audioBufferWithRealBacking(samples: number) {
	const channels = [
		new Float32Array(samples).fill(0.25),
		new Float32Array(samples).fill(-0.5),
	];
	const audioBuffer = {
		numberOfChannels: channels.length,
		sampleRate: 48_000,
		length: samples,
		getChannelData: (ch: number) => channels[ch] as Float32Array,
	} as unknown as AudioBuffer;
	return { audioBuffer, channels };
}

/**
 * An AudioBuffer whose channel views point at browser-internal storage: the
 * backing ArrayBuffer is empty, so there is nothing transferable to hand over.
 */
function audioBufferWithOpaqueBacking(samples: number) {
	const opaque = new ArrayBuffer(0);
	const view = new Float32Array(samples).fill(0.25);
	Object.defineProperty(view, "buffer", { value: opaque });
	const audioBuffer = {
		numberOfChannels: 1,
		sampleRate: 48_000,
		length: samples,
		getChannelData: () => view,
	} as unknown as AudioBuffer;
	return { audioBuffer, view };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Longer than the 100 ms cancel-poll interval. */
const POLL_GRACE_MS = 250;

describe("bridge gpu-ready gating", () => {
	test("onReady does not fire on module evaluation, only after GPU init", async () => {
		const readyEvents: number[] = [];
		const promise = runExportInWorker({
			...baseArgs(),
			onReady: () => readyEvents.push(performance.now()),
		});
		const worker = latest();

		// (1) "ready" after module evaluation. This is the only safe moment to
		// post init, and it must NOT open the stagger gate.
		worker.emit({ type: "ready" });
		expect(readyEvents).toHaveLength(0);
		expect(worker.posted).toHaveLength(1);
		expect(worker.posted[0]?.message.type).toBe("init");

		// (2) "ready" after initializeGpu() + compositor init.
		worker.emit({ type: "ready" });
		expect(readyEvents).toHaveLength(1);

		worker.emit({ type: "complete", buffer: new ArrayBuffer(4) });
		await promise;
	});

	test("a second export on a warm worker gates on its post-GPU ready", async () => {
		const { disposeWarmWorker } = await import("./export-worker-bridge");
		disposeWarmWorker();
		const readyCounts: number[] = [];
		try {
			const first = runExportInWorker({
				...baseArgs(),
				reuseWorker: true,
				onReady: () => readyCounts.push(1),
			});
			const fresh = latest();
			fresh.emit({ type: "ready" });
			fresh.emit({ type: "ready" });
			fresh.emit({ type: "complete", buffer: new ArrayBuffer(1) });
			await first;
			expect(readyCounts).toHaveLength(1);

			// The pool now holds that worker. The next call must not send init
			// blind, and its single "ready" is the post-GPU one.
			const second = runExportInWorker({
				...baseArgs(),
				reuseWorker: true,
				onReady: () => readyCounts.push(1),
			});
			expect(latest()).toBe(fresh);
			expect(fresh.posted).toHaveLength(2);
			fresh.emit({ type: "ready" });
			expect(readyCounts).toHaveLength(2);
			fresh.emit({ type: "complete", buffer: new ArrayBuffer(1) });
			await second;
		} finally {
			disposeWarmWorker();
		}
	});
});

describe("bridge PCM handover", () => {
	test("transfers the caller's channel buffers when the mixdown is spent", async () => {
		const { audioBuffer, channels } = audioBufferWithRealBacking(128);
		const promise = runExportInWorker({
			...baseArgs(),
			audioBuffer,
			shouldIncludeAudio: true,
			consumeAudioBuffer: true,
		});
		const worker = latest();
		worker.emit({ type: "ready" });

		const sent = worker.posted[0] as Posted;
		const audioData = sent.message.audioData as { channels: Float32Array[] };
		// The views handed to the worker ARE the caller's views (no copy), and
		// their backing buffers went into the transfer list.
		expect(audioData.channels[0]).toBe(channels[0]);
		expect(audioData.channels[1]).toBe(channels[1]);
		expect(sent.transfer).toContain((channels[0] as Float32Array).buffer);
		expect(sent.transfer).toContain((channels[1] as Float32Array).buffer);

		worker.emit({ type: "complete", buffer: new ArrayBuffer(4) });
		await promise;
	});

	test("copies the PCM by default so a reused AudioBuffer survives", async () => {
		const { audioBuffer, channels } = audioBufferWithRealBacking(128);
		const promise = runExportInWorker({
			...baseArgs(),
			audioBuffer,
			shouldIncludeAudio: true,
		});
		const worker = latest();
		worker.emit({ type: "ready" });

		const sent = worker.posted[0] as Posted;
		const audioData = sent.message.audioData as { channels: Float32Array[] };
		expect(audioData.channels[0]).not.toBe(channels[0]);
		expect(Array.from(audioData.channels[0])).toEqual(
			Array.from(channels[0] as Float32Array),
		);
		// The caller's buffers must NOT be in the transfer list: the software
		// retry and the main-thread fallback read them again.
		expect(sent.transfer).not.toContain((channels[0] as Float32Array).buffer);

		worker.emit({ type: "complete", buffer: new ArrayBuffer(4) });
		await promise;
	});

	test("falls back to a copy when the AudioBuffer exposes no backing store", async () => {
		const { audioBuffer, view } = audioBufferWithOpaqueBacking(128);
		const promise = runExportInWorker({
			...baseArgs(),
			audioBuffer,
			shouldIncludeAudio: true,
			consumeAudioBuffer: true,
		});
		const worker = latest();
		worker.emit({ type: "ready" });

		const sent = worker.posted[0] as Posted;
		const audioData = sent.message.audioData as { channels: Float32Array[] };
		// Nothing transferable exists, so the data is copied — the empty
		// ArrayBuffer must never be posted as if it held the PCM.
		expect(audioData.channels[0]).not.toBe(view);
		expect(audioData.channels[0]?.length).toBe(128);
		expect(Array.from(audioData.channels[0] ?? [])).toEqual(
			Array.from(view),
		);
		expect(sent.transfer).not.toContain(view.buffer);

		worker.emit({ type: "complete", buffer: new ArrayBuffer(4) });
		await promise;
	});
});

describe("bridge teardown releases the cancel poller on every settle path", () => {
	/** Drive one settle path and return the worker it used. */
	async function settleVia(
		settle: (worker: FakeWorker) => void | Promise<void>,
		{ getCancelled }: { getCancelled: () => boolean } = { getCancelled: () => false },
	): Promise<{ worker: FakeWorker; result: ExportWorkerResult }> {
		const promise = runExportInWorker({ ...baseArgs(), getCancelled });
		const worker = latest();
		worker.emit({ type: "ready" });
		await settle(worker);
		const result = await promise;
		return { worker, result };
	}

	const paths: Array<[string, (worker: FakeWorker) => void | Promise<void>]> = [
		["complete", (w) => w.emit({ type: "complete", buffer: new ArrayBuffer(2) })],
		["error", (w) => w.emit({ type: "error", error: "boom" })],
		["worker cancelled", (w) => w.emit({ type: "cancelled" })],
		["onerror", (w) => w.onerror?.({ message: "worker exploded" })],
		[
			"onmessageerror",
			(w) => w.onmessageerror?.({ data: null }),
		],
	];

	for (const [label, settle] of paths) {
		test(`no cancel poller survives ${label}`, async () => {
			let cancelled = false;
			const { worker, result } = await settleVia(settle, {
				getCancelled: () => cancelled,
			});
			expect(worker.terminateCalls).toBe(1);
			// If the interval leaked, flipping the cancel flag would tear the
			// worker down a second time and re-run the cleanup.
			cancelled = true;
			await sleep(POLL_GRACE_MS);
			expect(worker.terminateCalls).toBe(1);
			expect(result.success).toBe(label === "complete");
		});
	}

	test("no cancel poller survives the no-activity timeout", async () => {
		let cancelled = false;
		const promise = runExportInWorker({
			...baseArgs(),
			getCancelled: () => cancelled,
			// Tiny inactivity budget: the first-message cap keeps this fast.
			timeoutMs: 1,
		});
		const worker = latest();
		const result = await promise;
		expect(result.success).toBe(false);
		expect(worker.terminateCalls).toBe(1);
		cancelled = true;
		await sleep(POLL_GRACE_MS);
		expect(worker.terminateCalls).toBe(1);
	});

	test("the cancel poller tears a stuck worker down exactly once", async () => {
		let cancelled = false;
		const promise = runExportInWorker({
			...baseArgs(),
			getCancelled: () => cancelled,
		});
		const worker = latest();
		worker.emit({ type: "ready" });
		cancelled = true;
		await expect(promise).resolves.toEqual({
			success: false,
			cancelled: true,
		});
		await sleep(POLL_GRACE_MS);
		expect(worker.terminateCalls).toBe(1);
	});

	test("a late message after a streamed handover cannot re-arm the timer", async () => {
		// The streamed path detaches its handlers a microtask later than it
		// resolves; a progress message racing that gap must be dropped, or the
		// activity timer it re-arms would outlive the export.
		const fileBytes = new Uint8Array([1, 2, 3]);
		globals.navigator = {
			storage: {
				getDirectory: async () => ({
					getDirectoryHandle: async () => ({
						getFileHandle: async () => ({
							getFile: async () => ({
								size: fileBytes.length,
								lastModified: Date.now(),
								type: "",
							}),
						}),
						removeEntry: async () => {},
					}),
				}),
			},
		};

		const promise = runExportInWorker({
			...baseArgs(),
			streamToDisk: true,
			timeoutMs: 1,
		});
		const worker = latest();
		worker.emit({ type: "ready" });
		worker.emit({
			type: "complete-streamed",
			byteLength: fileBytes.length,
			fileName: "export-test.mp4",
		});
		const result = await promise;
		expect(result).toEqual({
			success: true,
			streamed: { byteLength: fileBytes.length, fileName: "export-test.mp4" },
		});
		expect(worker.terminateCalls).toBe(1);

		// Racing messages: one before and one after the teardown microtask.
		worker.onmessage?.({ data: { type: "progress", progress: 0.5 } });
		await sleep(0);
		expect(worker.onmessage).toBeNull();
		await sleep(POLL_GRACE_MS);
		expect(worker.terminateCalls).toBe(1);
	});
});
