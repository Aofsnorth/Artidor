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

import type { ExportFormat, ExportQuality } from "@/lib/export";
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
	canvas: OffscreenCanvas;
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
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
	| { type: "cancelled" };

// ── State ────────────────────────────────────────────────────────────
let isCancelled = false;

// ── Message handler ──────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
	const data = event.data;

	if (data.type !== "init") return;

	try {
		await handleExport(data);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown worker error";
		self.postMessage({
			type: "error",
			error: message,
		} satisfies WorkerOutMessage);
	}
};

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
		canvas,
		sceneTree: serializedTree,
		files: fileEntries,
		audioBuffer: audioBufferTransfer,
		width,
		height,
		fps,
		format,
		quality,
		shouldIncludeAudio,
		videoOnly = false,
	} = msg;

	// ── 1. Initialize WASM GPU + compositor in the worker ──
	// Dynamic import the WASM module (artidor-wasm)
	const wasm = await import("artidor-wasm");
	await wasm.initializeGpu();

	// Initialize compositor with the transferred OffscreenCanvas
	const { wasmCompositor } = await import("./compositor/wasm-compositor");
	wasmCompositor.ensureInitializedWithCanvas({ canvas, width, height });

	// ── 2. Reconstruct scene tree ──
	const files = new Map(fileEntries.map((e) => [e.mediaId, e.file]));
	const rootNode = deserializeSceneTree(serializedTree, files);

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
	const audioBuffer: AudioBuffer | null = audioBufferTransfer;

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

	await output.start();

	// Fire audio encode concurrently
	const audioEncode =
		audioSource && audioBuffer
			? audioSource.add(audioBuffer).finally(() => audioSource?.close())
			: null;

	// ── 5. Render loop ──
	let pendingEncode: Promise<void> | null = null;
	const frameDuration = 1 / fpsFloat;
	const progressDenominator = Math.max(1, segmentFrameCount);

	for (let i = startFrame; i < endFrame; i++) {
		if (isCancelled) {
			if (pendingEncode) await pendingEncode.catch(() => {});
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

		// Backpressure: wait for previous frame's encoder to be ready
		if (pendingEncode) {
			await pendingEncode;
		}

		// Composite frame
		await renderer.render({ node: rootNode, time: globalTimeTicks });

		// Snapshot canvas → VideoFrame → encoder
		pendingEncode = videoSource.add(localTimeSeconds, frameDuration);

		// Report progress (relative to this segment's own frame range)
		self.postMessage({
			type: "progress",
			progress: (i - startFrame) / progressDenominator,
		} satisfies WorkerOutMessage);
	}

	// Drain last encode
	if (pendingEncode) {
		await pendingEncode;
	}

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
