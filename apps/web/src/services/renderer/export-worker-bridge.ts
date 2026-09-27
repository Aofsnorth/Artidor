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
 *
 * Readiness: the worker posts "ready" twice — once after module
 * evaluation (the only safe moment to post init) and once after its GPU
 * is initialised. Only the second one is surfaced as `onReady`, so the
 * parallel launcher can actually stagger adapter requests instead of
 * firing them all in the same tick.
 */

import type { FrameRate } from "artidor-wasm";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import type { SerializedNode } from "./scene-serializer";
import type { ExportVideoCodec, ExportAudioCodec } from "./export-codec";
import {
	deleteExportTempFileByName,
	openStreamedExportFile,
} from "./export-output";

export type ExportWorkerProgress = {
	progress: number;
};

export type ExportWorkerResult =
	| {
			success: true;
			buffer: ArrayBuffer;
			/** Disk-backed handover (set instead of `buffer`, never both). */
			streamed?: undefined;
	  }
	| {
			success: true;
			buffer?: undefined;
			/**
			 * Disk-backed handover: the muxed bytes live in
			 * `OPFS exports/<fileName>` (verified readable by the bridge).
			 * Resolve info only — reading to ArrayBuffer would cancel the
			 * streaming win. Open once via `openStreamedExportFile` for
			 * preview/download; delete via `deleteExportTempFileByName`.
			 */
			streamed: { byteLength: number; fileName: string };
	  }
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
		return;
	}
	worker.terminate();
	if (worker === warmWorker) warmWorker = null;
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
	streamToDisk = false,
	consumeAudioBuffer = false,
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
	/**
	 * Stream the muxed output to an OPFS temp file (streaming export Part 2).
	 * Default false preserves the legacy in-RAM buffer behavior. The worker
	 * still falls back to buffer mode when OPFS is unavailable, so callers
	 * must handle both result variants.
	 */
	streamToDisk?: boolean;
	/**
	 * Declare that this call is the last reader of `audioBuffer`.
	 *
	 * The PCM channel data is normally copied before it is posted, which is
	 * safe but costs one full copy of the mixdown (~106 MB for a 5-minute
	 * stereo track). When the browser exposes real `ArrayBuffer` backing
	 * storage for the channels, the bridge can instead *transfer* the original
	 * buffers — no copy at all. Transferring detaches them, so the caller must
	 * promise not to read the AudioBuffer again (the caller is responsible for
	 * re-mixing before any later consumer, e.g. the software-encoding retry).
	 *
	 * Default false keeps the copy, which is the only safe choice when the
	 * AudioBuffer is reused across attempts.
	 */
	consumeAudioBuffer?: boolean;
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
			// A set so two channel views that share one interleaved backing
			// buffer transfer it exactly once — posting the same ArrayBuffer
			// twice in `transferables` is a DataCloneError.
			const transferredBuffers = new Set<ArrayBuffer>();
			for (let ch = 0; ch < numberOfChannels; ch++) {
				const view = audioBuffer.getChannelData(ch);
				const backing = view.buffer;
				// `AudioBuffer.getChannelData()` sometimes returns a view onto
				// browser-internal storage, in which case there is no
				// transferable ArrayBuffer and a copy is the only option. When
				// real backing storage is exposed, transfer it as-is.
				if (
					consumeAudioBuffer &&
					view.byteLength > 0 &&
					backing instanceof ArrayBuffer &&
					backing.byteLength >= view.byteLength
				) {
					channels.push(view);
					if (!transferredBuffers.has(backing)) {
						transferredBuffers.add(backing);
						transferables.push(backing);
					}
				} else {
					channels.push(new Float32Array(view)); // copy
					transferables.push(channels[ch].buffer);
				}
			}
			audioData = {
				channels,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels,
				length: audioBuffer.length,
			};
		}

		// Lifecycle: name of the handed-over OPFS file owned by THIS export.
		// Deleted best-effort on cancel/error/timeout (the worker is already
		// terminated then, so the main thread must own cleanup via
		// directory.removeEntry). Success hands ownership to the caller.
		let pendingStreamedFileName: string | null = null;
		const discardPendingStreamedFile = () => {
			if (!pendingStreamedFileName) return;
			const fileName = pendingStreamedFileName;
			pendingStreamedFileName = null;
			void deleteExportTempFileByName(fileName);
		};

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
					completed = true;
					discardPendingStreamedFile();
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
				completed = true;
				discardPendingStreamedFile();
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
			// Detach the handlers so a settled export stops retaining the scene
			// tree, the media `File`s and the PCM buffers, and so a late message
			// from a terminating worker cannot re-arm the activity timer. The
			// next `runExportInWorker` re-assigns them.
			worker.onmessage = null;
			worker.onmessageerror = null;
			worker.onerror = null;
			// Warm-reuse: keep the worker alive for the next export.
			// Parallel/fresh: terminate immediately.
			releaseWarmWorker(worker, reuseWorker);
		};

		// Set by the last settle path. The `complete-streamed` path needs one
		// more turn of the event loop to detach its handlers safely (see below),
		// so without this a message racing that microtask could re-arm the
		// activity timer after teardown.
		let completed = false;

		worker.onmessage = (
			event: MessageEvent<
				| { type: "progress"; progress: number }
				| { type: "init-progress"; phase: string; progress: number }
				| { type: "complete"; buffer: ArrayBuffer }
				| { type: "complete-streamed"; byteLength: number; fileName: string }
				| { type: "error"; error: string }
				| { type: "cancelled" }
				| { type: "ready" }
			>,
		) => {
			// Post-settle messages are ignored: the promise is already settled,
			// so the only thing a late "progress" could still do is re-arm the
			// activity timer that `cleanup` just cleared.
			if (completed) return;
			const data = event.data;
			resetActivity();
			scheduleTimeout();

			switch (data.type) {
				case "ready": {
					// The worker emits "ready" at TWO distinct moments, and which
					// one arrived is the whole point of this branch:
					//   1. after module evaluation, before any init — the only
					//      safe moment to post init (an ESM worker that has not
					//      registered `onmessage` yet silently drops it);
					//   2. after `initializeGpu()` + compositor init — the genuine
					//      GPU-ready signal.
					// Firing `onReady` on (1) is what turned the parallel
					// launcher's stagger gate into a no-op: every worker opened
					// its `requestAdapter()` in the same tick, which is the
					// thundering herd the stagger exists to avoid. So `onReady`
					// now fires only on (2).
					if (!initSent) {
						initSent = true;
						sendInit();
						break;
					}
					onReady?.();
					break;
				}

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
					completed = true;
					cleanup();
					resolve({ success: true, buffer: data.buffer });
					break;

				case "complete-streamed": {
					// Resolve metadata only — reading to ArrayBuffer would defeat
					// streaming (peak RAM ≈ file size again). Verify readability
					// (size matches the worker's report) WITHOUT retaining bytes.
					const { byteLength, fileName } = data;
					void openStreamedExportFile(fileName).then(
						(file) => {
							if (file.size !== byteLength) {
								completed = true;
								cleanup();
								void deleteExportTempFileByName(fileName);
								resolve({
									success: false,
									error: `Streamed export file size mismatch (expected ${byteLength}, got ${file.size})`,
								});
								return;
							}
							pendingStreamedFileName = fileName;
							// Handlers are detached in a microtask rather than inline:
							// a message already queued for this worker would find
							// `onmessage` null and throw "cannot read properties of
							// null". Until it runs, the `completed` guard below makes
							// a late message a no-op, and its own `scheduleTimeout()`
							// is undone by the microtask's `cleanup()`.
							void Promise.resolve().then(() => {
								completed = true;
								cleanup();
							});
							resolve({
								success: true,
								streamed: { byteLength, fileName },
							});
						},
						() => {
							completed = true;
							cleanup();
							resolve({
								success: false,
								error: "Streamed export file is unreadable",
							});
						},
					);
					break;
				}

				case "error":
					completed = true;
					discardPendingStreamedFile();
					cleanup();
					resolve({ success: false, error: data.error });
					break;

				case "cancelled":
					completed = true;
					discardPendingStreamedFile();
					cleanup();
					resolve({ success: false, cancelled: true });
					break;
			}
		};

		worker.onmessageerror = () => {
			completed = true;
			discardPendingStreamedFile();
			cleanup();
			resolve({
				success: false,
				error: "Worker message could not be deserialized",
			});
		};

		worker.onerror = (event) => {
			completed = true;
			discardPendingStreamedFile();
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
					streamToDisk,
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
