/**
 * Export Worker Bridge.
 *
 * Spawns the export Web Worker, transfers the OffscreenCanvas and
 * serialized scene tree, and listens for progress/completion/error
 * messages. The main thread is 100% unblocked during the export.
 *
 * Warm-reuse: when `reuseWorker` is true (default for single-worker
 * exports), the worker is kept alive after the export completes and
 * reused for the next export. This eliminates the WASM import + GPU
 * init cost (~5-30s) on subsequent exports. The parallel pipeline
 * passes `reuseWorker: false` because it spawns multiple concurrent
 * workers that are terminated after their segment completes.
 */

import type { FrameRate } from "artidor-wasm";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import type { SerializedNode } from "./scene-serializer";
import type { ExportAudioCodec, ExportVideoCodec } from "./export-codec";

export type ExportWorkerProgress = {
	progress: number;
};

export type ExportWorkerResult =
	| { success: true; buffer: ArrayBuffer }
	| { success: false; cancelled: true }
	| { success: false; error: string };

/**
 * Selects the worker inactivity deadline. Module-load failures must surface
 * quickly, while an active export keeps its caller-configured allowance.
 */
export function getExportWorkerActivityTimeout({
	timeoutMs,
	hasReceivedMessage,
}: {
	timeoutMs: number;
	hasReceivedMessage: boolean;
}): number {
	if (timeoutMs <= 0) return 0;
	return hasReceivedMessage ? timeoutMs : Math.min(timeoutMs, 10_000);
}
// ── Warm worker pool ─────────────────────────────────────────────────
// A single warm worker kept alive between exports to avoid re-paying
// WASM import + GPU init on every export. Only the single-worker path
// uses this; the parallel pipeline creates fresh workers per segment.
let warmWorker: Worker | null = null;
let warmWorkerBusy = false;

/**
 * Get a warm worker from the pool, or create a new one if the pool is
 * empty. Returns the worker and whether it was reused (already warm).
 * A warm worker has already passed module evaluation and can receive
 * "init" immediately — no need to wait for "ready".
 */
function acquireWarmWorker(): { worker: Worker; isWarm: boolean } {
	if (warmWorker && !warmWorkerBusy) {
		warmWorkerBusy = true;
		return { worker: warmWorker, isWarm: true };
	}
	const worker = new Worker(new URL("./export-worker.ts", import.meta.url), {
		type: "module",
	});
	warmWorker = worker;
	warmWorkerBusy = true;
	return { worker, isWarm: false };
}

/**
 * Return a worker to the pool (keep alive) or terminate it.
 * Called after the export completes, errors, or is cancelled.
 */
function releaseWarmWorker(worker: Worker, keepAlive: boolean): void {
	warmWorkerBusy = false;
	if (keepAlive && worker === warmWorker) {
		// Keep the worker alive for reuse. It will re-send "ready" after
		// the current export's completion message, signaling it's ready
		// for the next "init".
		return;
	}
	worker.terminate();
	if (worker === warmWorker) {
		warmWorker = null;
	}
}

/**
 * Terminate the warm worker (if any). Called when the editor unmounts
 * to release ~50-100MB of GPU/WASM memory.
 */
export function disposeWarmWorker(): void {
	if (warmWorker) {
		warmWorker.terminate();
		warmWorker = null;
		warmWorkerBusy = false;
	}
}

/**
 * Feature detection: check if the browser supports the Worker +
 * OffscreenCanvas + WebCodecs pipeline.
 */
export function isExportWorkerSupported(): boolean {
	try {
		// OffscreenCanvas must be transferable to Worker
		if (typeof OffscreenCanvas === "undefined") return false;
		// WebCodecs must be available (for mediabunny)
		if (typeof VideoEncoder === "undefined") return false;
		// Worker must be supported
		if (typeof Worker === "undefined") return false;
		return true;
	} catch {
		return false;
	}
}

/**
 * Run the export pipeline in a Web Worker.
 *
 * @param canvas - OffscreenCanvas transferred to the worker for compositing
 * @param sceneTree - Serialized scene tree (plain data, no class instances)
 * @param files - Media files to transfer to the worker
 * @param audioBuffer - Pre-mixed audio buffer (transferred, not copied)
 * @param config - Export configuration
 * @param onProgress - Progress callback (called on main thread)
 * @param getCancelled - Poll function to check if export was cancelled
 * @returns The final export buffer, or null if cancelled/failed
 */
export async function runExportInWorker({
	sceneTree,
	files,
	audioBuffer,
	width,
	height,
	fps,
	format,
	quality,
	shouldIncludeAudio,
	startFrame,
	endFrame,
	videoOnly,
	videoCodec,
	audioCodec,
	forceSoftwareEncoding = false,
	onProgress,
	onReady,
	getCancelled,
	timeoutMs = 0,
	reuseWorker = true,
}: {
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
	/** Inclusive start frame for segment exports (parallel pipeline). */
	startFrame?: number;
	/** Exclusive end frame for segment exports (parallel pipeline). */
	endFrame?: number;
	/** Encode video only and skip audio (parallel segments). */
	videoOnly?: boolean;
	/** Pinned video codec so all segments stay bitstream-compatible. */
	videoCodec?: ExportVideoCodec;
	/** Pinned audio codec. */
	audioCodec?: ExportAudioCodec;
	/**
	 * Force software video encoding (skip hardware acceleration). Used by the
	 * retry path after a hardware encoder configuration error.
	 */
	forceSoftwareEncoding?: boolean;
	onProgress?: ({ progress }: { progress: number }) => void;
	/** Called when the worker signals it has finished GPU init. */
	onReady?: () => void;
	getCancelled?: () => boolean;
	/**
	 * No-activity timeout. If the worker does not send any message for this
	 * many milliseconds, the worker is terminated and the promise resolves with
	 * an error. Useful for the parallel pipeline, where a stuck segment worker
	 * should fall back to the single-worker path instead of blocking forever.
	 * A value of 0 (default) disables the timeout.
	 */
	timeoutMs?: number;
	/**
	 * When true (default), keep the worker alive after the export completes
	 * so subsequent exports skip WASM import + GPU init (~5-30s savings).
	 * The parallel pipeline passes false because it spawns fresh workers
	 * per segment.
	 */
	reuseWorker?: boolean;
}): Promise<ExportWorkerResult> {
	return new Promise((resolve) => {
		// Warm-reuse: if the worker came from the pool, it's already past
		// module evaluation and has its onmessage handler registered. We
		// can send init immediately. Fresh workers send a "ready" signal
		// after module evaluation — we wait for that before sending init.
		let worker: Worker;
		let isWarmWorker = false;
		if (reuseWorker) {
			const acquired = acquireWarmWorker();
			worker = acquired.worker;
			isWarmWorker = acquired.isWarm;
		} else {
			worker = new Worker(new URL("./export-worker.ts", import.meta.url), {
				type: "module",
			});
		}

		// Build transferables. The OffscreenCanvas is created INSIDE the worker
		// (not transferred) because transferring OffscreenCanvas via postMessage
		// can silently fail in some browser/dev-server combinations. The worker
		// creates its own canvas from the width/height params.
		const transferables: Transferable[] = [];

		// Serialize AudioBuffer → transferable PCM data
		let audioData: {
			channels: Float32Array[];
			sampleRate: number;
			numberOfChannels: number;
			length: number;
		} | null = null;
		if (audioBuffer) {
			const numberOfChannels = audioBuffer.numberOfChannels;
			const channels: Float32Array[] = [];
			for (let ch = 0; ch < numberOfChannels; ch++) {
				// copyToChannel/getChannelData return Float32Array views; we need
				// to copy because the underlying buffer gets detached on transfer.
				const data = audioBuffer.getChannelData(ch);
				channels.push(new Float32Array(data)); // copy
				transferables.push(channels[ch].buffer);
			}
			audioData = {
				channels,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels,
				length: audioBuffer.length,
			};
		}

		// Cancel polling
		let cancelInterval: ReturnType<typeof setInterval> | null = null;
		let cancelled = false;
		if (getCancelled) {
			cancelInterval = setInterval(() => {
				if (getCancelled()) {
					if (cancelled) return;
					cancelled = true;
					// Terminate the worker immediately. If the worker is stuck in
					// a blocking operation (e.g. GPU init), it can't process a
					// "cancel" message — so we must terminate from this side.
					cleanup();
					resolve({ success: false, cancelled: true });
				}
			}, 100);
		}

		// No-activity timeout: terminate a stuck worker instead of waiting
		// forever (e.g. deadlocked GPU init or encoder configuration).
		let timeout: ReturnType<typeof setTimeout> | null = null;
		let lastActivity = Date.now();
		let hasReceivedMessage = false;
		const resetActivity = () => {
			lastActivity = Date.now();
			hasReceivedMessage = true;
		};
		const scheduleTimeout = () => {
			if (timeoutMs <= 0) return;
			if (timeout) clearTimeout(timeout);
			// Use a shorter timeout for the first message — if the worker hasn't
			// sent anything at all, it's likely broken (e.g. dev server serving
			// HTML instead of the worker module). Once we know the worker is
			// alive, use the full timeout.
			const effectiveTimeout = getExportWorkerActivityTimeout({
				timeoutMs,
				hasReceivedMessage,
			});
			timeout = setTimeout(() => {
				const elapsed = Date.now() - lastActivity;
				if (elapsed < effectiveTimeout) {
					// Timer fired early because of a reset race; reschedule.
					scheduleTimeout();
					return;
				}
				cleanup();
				resolve({
					success: false,
					error: hasReceivedMessage
						? `Export worker timed out (no activity for ${timeoutMs}ms)`
						: `Export worker sent no messages within ${effectiveTimeout / 1000}s (worker may have failed to load)`,
				});
			}, effectiveTimeout);
		};

		const cleanup = () => {
			if (timeout) clearTimeout(timeout);
			if (cancelInterval) clearInterval(cancelInterval);
			// Warm-reuse: keep the worker alive for the next export.
			// Parallel/fresh: terminate immediately.
			releaseWarmWorker(worker, reuseWorker);
		};

		worker.onmessage = (
			event: MessageEvent<
				| { type: "progress"; progress: number }
				| { type: "init-progress"; phase: string; progress: number }
				| { type: "complete"; buffer: ArrayBuffer }
				| { type: "error"; error: string }
				| { type: "cancelled" }
				| { type: "ready" }
			>,
		) => {
			const data = event.data;
			resetActivity();
			scheduleTimeout();

			switch (data.type) {
				case "ready":
					onReady?.();
					// Worker is ready to receive the init message. In ESM workers
					// (especially under Turbopack/Next.js dev), sending init before
					// the worker has registered its onmessage handler causes the
					// message to be silently lost.
					if (!initSent) {
						initSent = true;
						sendInit();
					}
					break;

				case "init-progress":
					// Forward init-phase progress to the same onProgress callback.
					// The init-progress values (0.01–0.10) map onto the worker's
					// share of the bar (5%–100% when audio is included), so the
					// user sees movement during the previously-silent init phase.
					onProgress?.({ progress: data.progress });
					break;

				case "progress":
					onProgress?.({ progress: data.progress });
					break;

				case "complete":
					cleanup();
					resolve({ success: true, buffer: data.buffer });
					break;

				case "error":
					cleanup();
					resolve({ success: false, error: data.error });
					break;

				case "cancelled":
					cleanup();
					resolve({ success: false, cancelled: true });
					break;
			}
		};

		worker.onmessageerror = () => {
			cleanup();
			resolve({
				success: false,
				error: "Worker message could not be deserialized",
			});
		};

		worker.onerror = (event) => {
			cleanup();
			resolve({
				success: false,
				error: event.message || "Worker threw an error",
			});
		};

		// Start the no-activity timer once the worker is spawned.
		scheduleTimeout();

		// Track whether we've sent the init message. In ESM workers, the
		// worker sends a "ready" signal after registering its onmessage
		// handler. We wait for that before sending init to avoid the message
		// being silently lost during module evaluation.
		//
		// Warm-reuse exception: a warm worker has already passed module
		// evaluation and is waiting for its next "init". Send immediately.
		let initSent = isWarmWorker;

		const sendInit = () => {
			worker.postMessage(
				{
					type: "init",
					sceneTree,
					files,
					audioData,
					width,
					height,
					fps,
					format,
					quality,
					shouldIncludeAudio,
					startFrame,
					endFrame,
					videoOnly,
					videoCodec,
					audioCodec,
					forceSoftwareEncoding,
				},
				transferables,
			);
		};

		// Don't send init immediately for fresh workers — wait for "ready".
		// Warm workers already have their handler registered, so send now.
		if (isWarmWorker) {
			sendInit();
		}
	});
}
