/**
 * Export Web Worker.
 *
 * Runs the entire render + encode pipeline off the main thread:
 * 1. Initializes WASM GPU runtime and compositor
 * 2. Reconstructs the scene tree from serialized data
 * 3. Runs the frame-by-frame render loop (resolve → build → composite)
 * 4. Encodes via mediabunny (WebCodecs)
 * 5. Posts progress and the final buffer back to the main thread
 *
 * The main thread is 100% unblocked during export.
 */

// Top-level log to confirm the worker module loaded successfully.
console.info("[export-worker] module loaded");

import type { ExportFormat, ExportMode, ExportQuality } from "@/lib/export";
import type { FrameRate } from "artidor-wasm";
import { mediaTimeToSeconds } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { frameRateToFloat } from "@/lib/fps/utils";
import {
	Output,
	Mp4OutputFormat,
	WebMOutputFormat,
	BufferTarget,
	CanvasSource,
	AudioBufferSource,
} from "mediabunny";
import { CanvasRenderer } from "./canvas-renderer";
import { deserializeSceneTree } from "./scene-deserializer";
import type { SerializedNode } from "./scene-serializer";
import {
	EXPORT_QUALITY_MAP,
	audioBitrateFor,
	negotiateAudioCodec,
	negotiateVideoCodec,
	type ExportAudioCodec,
	type ExportVideoCodec,
} from "./export-codec";

// ── Message types ────────────────────────────────────────────────────
type WorkerInMessage = {
	type: "init";
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	/** Raw PCM audio data (transferred ArrayBuffers), reconstructed into AudioBuffer. */
	audioData: {
		channels: Float32Array[];
		sampleRate: number;
		numberOfChannels: number;
		length: number;
	} | null;
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
	/** Export mode: "auto" (GPU+CPU), "gpu", or "cpu". */
	mode?: ExportMode;
	/**
	 * Optional inclusive-start frame index for *segment* exports (parallel
	 * pipeline). Defaults to 0 — the start of the timeline.
	 */
	startFrame?: number;
	/**
	 * Optional exclusive-end frame index for segment exports. Defaults to the
	 * full frame count derived from the scene duration.
	 */
	endFrame?: number;
	/**
	 * When true, the worker encodes video only and skips audio entirely. The
	 * parallel pipeline uses this so audio is muxed once during concatenation
	 * rather than duplicated across every segment.
	 */
	videoOnly?: boolean;
	/**
	 * Pinned video codec. When provided (parallel pipeline), the worker uses it
	 * verbatim instead of negotiating, guaranteeing every segment shares a
	 * bitstream-compatible codec so they can be stitched without re-encoding.
	 */
	videoCodec?: ExportVideoCodec;
	/** Pinned audio codec (parallel single-worker-with-audio case). */
	audioCodec?: ExportAudioCodec;
};

type WorkerOutMessage =
	| { type: "progress"; progress: number }
	| { type: "complete"; buffer: ArrayBuffer }
	| { type: "error"; error: string }
	| { type: "cancelled" }
	| { type: "ready" };

// ── State ────────────────────────────────────────────────────────────
let isCancelled = false;

// Catch any unhandled promise rejections so they surface as error messages
// instead of silently killing the worker.
self.addEventListener("unhandledrejection", (event) => {
	const reason = event.reason;
	const message = reason instanceof Error ? reason.message : String(reason);
	console.error("[export-worker] unhandled rejection:", message);
	self.postMessage({
		type: "error",
		error: `Unhandled rejection: ${message}`,
	} satisfies WorkerOutMessage);
});

// ── Message handler ──────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
	const data = event.data;

	if (data.type !== "init") return;

	console.info("[export-worker] received init message");

	try {
		await handleExport(data);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown worker error";

		// Treating "Output has been canceled." as a cancellation keeps a user
		// cancel that races with output.start() from surfacing as an error.
		if (message === "Output has been canceled.") {
			self.postMessage({ type: "cancelled" } satisfies WorkerOutMessage);
			return;
		}

		self.postMessage({
			type: "error",
			error: message,
		} satisfies WorkerOutMessage);
	}
};

// Signal that the worker is ready to receive messages. In ESM workers
// (especially under Turbopack/Next.js dev), the main thread's postMessage
// can arrive before the module finishes evaluating and registers onmessage.
// The bridge waits for this signal before sending the init message.
self.postMessage({ type: "ready" } satisfies WorkerOutMessage);
console.info("[export-worker] ready signal sent");

self.onmessageerror = () => {
	self.postMessage({
		type: "error",
		error: "Worker received an unserializable message",
	} satisfies WorkerOutMessage);
};

// Allow cancellation via a separate message channel
self.addEventListener("message", (event: MessageEvent) => {
	if (event.data === "cancel") {
		isCancelled = true;
	}
});

async function handleExport(msg: WorkerInMessage) {
	const {
		sceneTree: serializedTree,
		files: fileEntries,
		audioData,
		width,
		height,
		fps,
		format,
		quality,
		shouldIncludeAudio,
		mode = "auto",
		videoOnly = false,
	} = msg;

	// Create the OffscreenCanvas inside the worker. This avoids transferring
	// an OffscreenCanvas via postMessage, which can silently fail in some
	// browser/dev-server combinations.
	const canvas = new OffscreenCanvas(width, height);

	// ── 1. Initialize WASM GPU + compositor in the worker ──
	// Dynamic import the WASM module (artidor-wasm)
	console.info(`[export-worker] importing wasm module (mode: ${mode})`);
	const wasm = await import("artidor-wasm");

	if (mode === "cpu") {
		console.info("[export-worker] CPU mode — skipping GPU init");
	} else {
		console.info("[export-worker] initializing GPU");
		await wasm.initializeGpu();
		console.info("[export-worker] GPU initialized");
	}

	// Initialize compositor with the worker's OffscreenCanvas
	const { wasmCompositor } = await import("./compositor/wasm-compositor");
	console.info("[export-worker] initializing compositor");
	wasmCompositor.ensureInitializedWithCanvas({ canvas, width, height });
	console.info("[export-worker] compositor initialized");

	// Signal readiness so the parallel launcher can start the next worker's
	// GPU init — staggering avoids adapter-request deadlocks when many workers
	// call navigator.gpu.requestAdapter() simultaneously.
	self.postMessage({ type: "ready" } satisfies WorkerOutMessage);

	// ── 2. Reconstruct scene tree ──
	const files = new Map(fileEntries.map((e) => [e.mediaId, e.file]));
	const rootNode = deserializeSceneTree(serializedTree, files);
	console.info("[export-worker] scene tree reconstructed");

	// ── 3. Create renderer ──
	const renderer = new CanvasRenderer({ width, height, fps });

	// ── 4. Set up mediabunny encoder ──
	const fpsFloat = frameRateToFloat(fps);
	const ticksPerFrame = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const durationTicks = Math.round(
		(rootNode.params as { duration?: number }).duration ?? 0,
	);
	const totalFrameCount = Math.floor(durationTicks / ticksPerFrame);

	// Frame range for this (possibly segmented) export. The non-segmented path
	// passes neither bound, so this is the full [0, totalFrameCount) range.
	const startFrame = Math.max(0, msg.startFrame ?? 0);
	const endFrame = Math.min(totalFrameCount, msg.endFrame ?? totalFrameCount);
	const segmentFrameCount = Math.max(0, endFrame - startFrame);

	console.info(
		`[export-worker] exporting frames ${startFrame}..${endFrame} (${segmentFrameCount} frames)`,
	);

	const outputFormat =
		format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

	const output = new Output({
		format: outputFormat,
		target: new BufferTarget(),
	});

	// Use the pinned codec when provided (parallel pipeline — every segment must
	// share an identical codec to stitch losslessly), else negotiate.
	const videoCodec: ExportVideoCodec =
		msg.videoCodec ??
		(await negotiateVideoCodec({ format, quality, width, height, fpsFloat }));

	// The compositor canvas is now an OffscreenCanvas
	const compositorCanvas = wasmCompositor.getCanvas();
	const videoSource = new CanvasSource(compositorCanvas as OffscreenCanvas, {
		codec: videoCodec,
		bitrate: EXPORT_QUALITY_MAP[quality],
	});
	output.addVideoTrack(videoSource, { frameRate: fpsFloat });

	let audioSource: AudioBufferSource | null = null;

	// Reconstruct AudioBuffer from transferred PCM data (AudioBuffer itself
	// is not structured-cloneable, so the bridge sends raw Float32Arrays).
	let audioBuffer: AudioBuffer | null = null;
	if (audioData) {
		const ctx = new OfflineAudioContext(
			audioData.numberOfChannels,
			audioData.length,
			audioData.sampleRate,
		);
		audioBuffer = ctx.createBuffer(
			audioData.numberOfChannels,
			audioData.length,
			audioData.sampleRate,
		);
		for (let ch = 0; ch < audioData.numberOfChannels; ch++) {
			// Copy into a fresh Float32Array backed by a plain ArrayBuffer to
			// satisfy the DOM type signature (copyToChannel requires
			// Float32Array<ArrayBuffer>, not SharedArrayBuffer-backed views).
			const src = audioData.channels[ch];
			const copy = new Float32Array(src);
			audioBuffer.copyToChannel(copy, ch);
		}
	}

	// Segment workers (videoOnly) skip audio — it is muxed once during
	// concatenation so it is never encoded redundantly per segment.
	if (!videoOnly && shouldIncludeAudio && audioBuffer) {
		const audioCodec: ExportAudioCodec =
			msg.audioCodec ??
			(await negotiateAudioCodec({
				format,
				sampleRate: audioBuffer.sampleRate,
				numberOfChannels: audioBuffer.numberOfChannels,
			}));

		// Audio bitrate is fixed at 128 kbps (AAC) / 64 kbps (Opus) —
		// these are transparent for stereo music/speech and don't need
		// to scale with the video quality factor.
		audioSource = new AudioBufferSource({
			codec: audioCodec,
			bitrate: audioBitrateFor(audioCodec),
		});
		output.addAudioTrack(audioSource);
	}

	// If the user cancelled while we were setting up tracks, stop here before
	// starting the output. Starting a canceled output throws "Output has been
	// canceled.", so we must short-circuit.
	if (isCancelled) {
		await output.cancel().catch(() => {});
		self.postMessage({ type: "cancelled" } satisfies WorkerOutMessage);
		return;
	}

	console.info("[export-worker] starting output");
	await output.start();
	console.info(
		`[export-worker] output started, entering render loop (${segmentFrameCount} frames)`,
	);

	// Fire audio encode concurrently
	const audioEncode =
		audioSource && audioBuffer
			? audioSource.add(audioBuffer).finally(() => audioSource?.close())
			: null;

	// ── 5. Render loop with deep render/Encode pipelining ──
	//
	// WebCodecs VideoEncoder.encode() is async and returns immediately — it
	// just adds the frame to the encoder's internal queue. The encoder
	// processes frames in the background. So we can feed many frames to the
	// encoder without waiting for each one to finish.
	//
	// Strategy: render N frames ahead, feeding each to the encoder, then wait
	// for the oldest pending encode to finish before rendering the next frame.
	// This keeps both GPU (rendering) and CPU (encoding) at ~100% utilization.
	//
	//   Depth 1 (old):  [render][wait encode][render][wait encode]...
	//   GPU idle ~90% of the time.
	//
	//   Depth 8 (new):  [render][render][render]...[render][wait oldest]
	//   GPU renders continuously while encoder processes the queue.
	const RENDER_QUEUE_DEPTH = mode === "turbo" ? 16 : 8;
	const pendingEncodes: Promise<void>[] = [];
	const frameDuration = 1 / fpsFloat;
	const progressDenominator = Math.max(1, segmentFrameCount);

	console.info(
		`[export-worker] render queue depth: ${RENDER_QUEUE_DEPTH} (mode: ${mode})`,
	);

	for (let i = startFrame; i < endFrame; i++) {
		if (isCancelled) {
			// Wait for all pending encodes to settle, then cancel.
			await Promise.allSettled(pendingEncodes);
			await output.cancel();
			self.postMessage({ type: "cancelled" } satisfies WorkerOutMessage);
			return;
		}

		// The scene is composited at the *global* timeline time so the rendered
		// pixels are correct, but the frame is encoded at a segment-*local*
		// (0-based) timestamp. Each segment is therefore a standalone clip; the
		// concatenator offsets it back to its global position. For the
		// non-segmented path startFrame is 0, so local == global as before.
		const globalTimeTicks = i * ticksPerFrame;
		const localTimeSeconds = mediaTimeToSeconds({
			time: (i - startFrame) * ticksPerFrame,
		});

		// Backpressure: if the render queue is full, wait for the oldest
		// pending encode to finish. This is the only point where the GPU
		// might stall — and it only happens when the encoder is slower than
		// the renderer (which is the normal case, so the queue stays full
		// and both GPU and CPU stay busy).
		if (pendingEncodes.length >= RENDER_QUEUE_DEPTH) {
			const oldest = pendingEncodes.shift()!;
			await oldest;
		}

		// Composite frame (GPU) — runs continuously while encoder processes
		// the queue in the background.
		await renderer.render({ node: rootNode, time: globalTimeTicks });

		// Snapshot canvas → VideoFrame → encoder (async, returns immediately)
		pendingEncodes.push(videoSource.add(localTimeSeconds, frameDuration));

		// Report progress every 10 frames (reduces postMessage overhead)
		const localFrame = i - startFrame;
		if (localFrame % 10 === 0 || localFrame === segmentFrameCount - 1) {
			self.postMessage({
				type: "progress",
				progress: localFrame / progressDenominator,
			} satisfies WorkerOutMessage);
		}

		// Log every 500 frames for debugging (less overhead than every 100)
		if (localFrame % 500 === 0) {
			console.info(
				`[export-worker] frame ${localFrame}/${segmentFrameCount}`,
			);
		}
	}

	// Drain all pending encodes
	await Promise.all(pendingEncodes);

	if (isCancelled) {
		await output.cancel();
		self.postMessage({ type: "cancelled" } satisfies WorkerOutMessage);
		return;
	}

	// ── 6. Finalize ──
	videoSource.close();
	if (audioEncode) await audioEncode;
	await output.finalize();

	const buffer = output.target.buffer;
	if (!buffer) {
		self.postMessage({
			type: "error",
			error: "Export failed to produce buffer",
		} satisfies WorkerOutMessage);
		return;
	}

	// Transfer the buffer back to main thread
	self.postMessage({ type: "complete", buffer } satisfies WorkerOutMessage, {
		transfer: [buffer],
	});
}
