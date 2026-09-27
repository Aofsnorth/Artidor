import { describe, expect, test } from "bun:test";
import {
	EXPORT_FRAME_QUEUE_BUDGET_BYTES,
	getExportRenderQueueDepth,
	planExportMemory,
	readExportHostHeadroom,
	waitForWorkerGpuReady,
} from "./export-performance";

describe("waitForWorkerGpuReady", () => {
	test("launches the next worker as soon as GPU initialization completes", async () => {
		let signalReady: (() => void) | undefined;
		const ready = new Promise<void>((resolve) => {
			signalReady = resolve;
		});

		signalReady?.();
		const started = performance.now();
		await waitForWorkerGpuReady(ready, 1_000);
		expect(performance.now() - started).toBeLessThan(100);
	});

	test("uses the fallback delay when no GPU-ready signal arrives", async () => {
		const started = performance.now();
		await waitForWorkerGpuReady(new Promise<void>(() => {}), 5);
		expect(performance.now() - started).toBeGreaterThanOrEqual(4);
	});
});

describe("getExportRenderQueueDepth", () => {
	// The depth is a *byte* budget (EXPORT_FRAME_QUEUE_BUDGET_BYTES) divided by
	// the frame cost, capped by core count. A fixed frame count is wrong at every
	// resolution but 1080p: 16 frames is 15 MB at 360p and 1.3 GB at 8K.
	const BUDGET = EXPORT_FRAME_QUEUE_BUDGET_BYTES;
	const frameBytes = (width: number, height: number) => width * height * 4;

	test("uses a deep queue at 1080p", () => {
		// 128 MiB / (1920*1080*4) = 16 frames, which is also the hard cap.
		expect(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: 16 }),
		).toBe(16);
	});

	test("limits retained frames at 4K", () => {
		// 128 MiB / (3840*2160*4) = 4 frames. The old per-resolution ladder
		// allowed 12 here — 400 MB of retained VideoFrames per worker.
		expect(
			getExportRenderQueueDepth({ width: 3840, height: 2160, cores: 16 }),
		).toBe(4);
	});

	test("uses the minimum queue above 4K", () => {
		// A single 8K frame already exceeds the budget, so the 2-frame floor
		// applies: 1 would serialise render against encode.
		expect(
			getExportRenderQueueDepth({ width: 7680, height: 4320, cores: 2 }),
		).toBe(2);
	});

	test("scales the queue up with more cores", () => {
		expect(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: 12 }),
		).toBe(12);
		expect(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: 4 }),
		).toBe(4);
	});

	test("does not let core count buy frames the byte budget forbids", () => {
		// The regression this replaces: 10 cores at 8K used to queue 10 frames
		// (~1.3 GB of VRAM) because depth scaled with cores, not pixels.
		for (const cores of [2, 10, 32]) {
			const depth = getExportRenderQueueDepth({
				width: 7680,
				height: 4320,
				cores,
			});
			const allowed = Math.max(
				2,
				Math.floor(BUDGET / frameBytes(7680, 4320)),
			);
			expect(depth).toBeLessThanOrEqual(allowed);
		}
	});

	test("retains roughly the same bytes at every resolution", () => {
		const retained = (width: number, height: number, cores: number) =>
			getExportRenderQueueDepth({ width, height, cores }) *
			frameBytes(width, height);
		// Low resolution is cheap per frame, so the cap binds rather than the
		// budget — 360p must not be throttled to a 1080p-sized queue.
		expect(
			getExportRenderQueueDepth({ width: 640, height: 360, cores: 8 }),
		).toBe(8);
		// 4K retains no more than 1080p does, and strictly fewer frames.
		expect(retained(3840, 2160, 16)).toBeLessThanOrEqual(
			retained(1920, 1080, 16),
		);
		expect(
			getExportRenderQueueDepth({ width: 3840, height: 2160, cores: 16 }),
		).toBeLessThan(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: 16 }),
		);
	});

	test("never queues more than the budget or the 2-frame floor allows", () => {
		for (const [width, height, cores] of [
			[7680, 4320, 2],
			[7680, 4320, 10],
			[3840, 2160, 2],
			[1920, 1080, 2],
			[1920, 1080, 64],
			[640, 360, 8],
		] as const) {
			const depth = getExportRenderQueueDepth({ width, height, cores });
			const allowed = Math.max(2, Math.floor(BUDGET / frameBytes(width, height)));
			expect(depth).toBeLessThanOrEqual(allowed);
			expect(depth).toBeGreaterThanOrEqual(1);
		}
	});

	test("returns a positive queue depth for 1080p", () => {
		const depth = getExportRenderQueueDepth({ width: 1920, height: 1080 });
		expect(depth).toBeGreaterThan(0);
	});

	test("survives degenerate dimensions and a NaN core count", () => {
		expect(
			getExportRenderQueueDepth({ width: 0, height: 0, cores: 4 }),
		).toBeGreaterThan(0);
		expect(
			getExportRenderQueueDepth({ width: 1920, height: 1080, cores: Number.NaN }),
		).toBeGreaterThan(0);
		expect(
			getExportRenderQueueDepth({ width: -1920, height: 1080, cores: 4 }),
		).toBeGreaterThan(0);
	});
});

describe("planExportMemory", () => {
	const HD_5MIN = {
		durationSeconds: 300,
		width: 1920,
		height: 1080,
		fps: 30,
		quality: "high" as const,
		includeAudio: true,
		diskCopies: 2,
		storageQuotaBytes: 50 * 1024 ** 3,
		storageUsageBytes: 1 * 1024 ** 3,
		deviceMemoryGb: 8,
	};

	test("estimates a 5-minute 1080p export in the measured 300-560MB band", () => {
		const plan = planExportMemory({ ...HD_5MIN, requestedWorkerCount: 4 });
		const mb = plan.estimatedOutputBytes / 1024 ** 2;
		expect(mb).toBeGreaterThan(250);
		expect(mb).toBeLessThan(700);
		// Parallel streaming keeps the segments and the stitch on disk together.
		expect(plan.estimatedDiskBytes).toBe(plan.estimatedOutputBytes * 2);
		expect(plan.insufficient).toBe(false);
	});

	test("refuses an export that cannot fit in the reported quota", () => {
		const plan = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: 4,
			// ~450 MB of output against 500 MB of headroom: 2 disk copies
			// cannot fit, so the run would die at the very end.
			storageQuotaBytes: 1.5 * 1024 ** 3,
			storageUsageBytes: 1 * 1024 ** 3,
		});
		expect(plan.insufficient).toBe(true);
		expect(plan.reason).toContain("Not enough storage");
	});

	test("allows the same export once the quota headroom is real", () => {
		const plan = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: 4,
			storageQuotaBytes: 20 * 1024 ** 3,
			storageUsageBytes: 1 * 1024 ** 3,
		});
		expect(plan.insufficient).toBe(false);
		expect(plan.storageHeadroomBytes).toBe(19 * 1024 ** 3);
	});

	test("assumes a bounded quota when the browser reports none", () => {
		// Unknown must not mean "unlimited": a 4K very-high hour would need
		// ~10 GB across the segments and the stitch, so it is refused against
		// the conservative 2 GB default rather than started and aborted late.
		const unknown = planExportMemory({
			...HD_5MIN,
			width: 3840,
			height: 2160,
			durationSeconds: 3600,
			quality: "very_high",
			requestedWorkerCount: 1,
			storageQuotaBytes: null,
			storageUsageBytes: null,
			deviceMemoryGb: 8,
		});
		expect(unknown.storageHeadroomBytes).toBeNull();
		expect(unknown.insufficient).toBe(true);
		// The same export with a real quota passes.
		const reported = planExportMemory({
			...HD_5MIN,
			width: 3840,
			height: 2160,
			durationSeconds: 3600,
			quality: "very_high",
			requestedWorkerCount: 1,
			storageQuotaBytes: 100 * 1024 ** 3,
			storageUsageBytes: 0,
			deviceMemoryGb: 8,
		});
		expect(reported.storageHeadroomBytes).toBe(100 * 1024 ** 3);
		expect(reported.insufficient).toBe(false);
	});

	test("reduces the worker fan-out on a low-memory device", () => {
		const roomy = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: 8,
			deviceMemoryGb: 8,
		});
		expect(roomy.workerCount).toBe(8);
		const cramped = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: 8,
			deviceMemoryGb: 2,
		});
		expect(cramped.workerCount).toBeLessThan(roomy.workerCount);
		expect(cramped.workerCount).toBeGreaterThanOrEqual(1);
	});

	test("shrinks 8K harder than 1080p for the same RAM budget", () => {
		// Both are capped by `requestedWorkerCount` on a roomy device, so the
		// comparison needs a budget that actually binds.
		const at8k = planExportMemory({
			...HD_5MIN,
			width: 7680,
			height: 4320,
			requestedWorkerCount: 8,
			deviceMemoryGb: 4,
		});
		const at1080 = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: 8,
			deviceMemoryGb: 4,
		});
		expect(at8k.workerCount).toBeLessThan(at1080.workerCount);
	});

	test("charges a buffer-mode output against RAM instead of quota", () => {
		// No OPFS: the output lives in RAM, so quota is irrelevant and the
		// estimate must show up in the peak instead.
		const plan = planExportMemory({
			...HD_5MIN,
			diskCopies: 0,
			requestedWorkerCount: 1,
			storageQuotaBytes: 10,
			storageUsageBytes: 10,
		});
		expect(plan.estimatedDiskBytes).toBe(0);
		expect(plan.estimatedPeakBytes).toBeGreaterThan(
			plan.estimatedOutputBytes,
		);
		expect(plan.insufficient).toBe(false);
	});

	test("never proposes fewer than one worker and ignores NaN inputs", () => {
		const plan = planExportMemory({
			...HD_5MIN,
			requestedWorkerCount: Number.NaN,
			durationSeconds: Number.NaN,
			fps: Number.NaN,
			deviceMemoryGb: null,
		});
		expect(plan.workerCount).toBe(1);
		// A zero-length timeline needs no disk; the point is that NaN cannot
		// poison the numbers.
		expect(plan.estimatedOutputBytes).toBe(0);
		expect(plan.estimatedDiskBytes).toBe(0);
		expect(Number.isFinite(plan.estimatedPeakBytes)).toBe(true);
	});

	test("scales the output estimate with duration and resolution", () => {
		const short = planExportMemory({ ...HD_5MIN, requestedWorkerCount: 1 });
		const long = planExportMemory({
			...HD_5MIN,
			durationSeconds: 600,
			requestedWorkerCount: 1,
		});
		const bigger = planExportMemory({
			...HD_5MIN,
			width: 3840,
			height: 2160,
			requestedWorkerCount: 1,
		});
		expect(long.estimatedOutputBytes).toBeGreaterThan(
			short.estimatedOutputBytes,
		);
		expect(bigger.estimatedOutputBytes).toBeGreaterThan(
			short.estimatedOutputBytes,
		);
		// Quality tiers must matter, or a "very_high" request is under-planned.
		const low = planExportMemory({
			...HD_5MIN,
			quality: "low",
			requestedWorkerCount: 1,
		});
		const veryHigh = planExportMemory({
			...HD_5MIN,
			quality: "very_high",
			requestedWorkerCount: 1,
		});
		expect(veryHigh.estimatedOutputBytes).toBeGreaterThan(
			low.estimatedOutputBytes,
		);
	});
});

describe("readExportHostHeadroom", () => {
	type Mutable = Record<string, unknown>;
	const globals = globalThis as unknown as Mutable;
	const originalNavigator = globals.navigator;

	function withNavigator(value: unknown, run: () => Promise<void>) {
		globals.navigator = value;
		return run().finally(() => {
			globals.navigator = originalNavigator;
		});
	}

	test("reads quota, usage and device memory when the browser exposes them", async () => {
		await withNavigator(
			{
				storage: {
					estimate: async () => ({ quota: 100, usage: 40 }),
				},
				deviceMemory: 8,
			},
			async () => {
				expect(await readExportHostHeadroom()).toEqual({
					storageQuotaBytes: 100,
					storageUsageBytes: 40,
					deviceMemoryGb: 8,
				});
			},
		);
	});

	test("reports nulls (never throws) without StorageManager or deviceMemory", async () => {
		await withNavigator({}, async () => {
			expect(await readExportHostHeadroom()).toEqual({
				storageQuotaBytes: null,
				storageUsageBytes: null,
				deviceMemoryGb: null,
			});
		});
	});

	test("reports nulls (never throws) when estimate() rejects", async () => {
		await withNavigator(
			{
				storage: {
					estimate: async () => {
						throw new Error("denied");
					},
				},
			},
			async () => {
				expect(await readExportHostHeadroom()).toEqual({
					storageQuotaBytes: null,
					storageUsageBytes: null,
					deviceMemoryGb: null,
				});
			},
		);
	});
});
