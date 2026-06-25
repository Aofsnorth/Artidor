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
	QUALITY_LOW,
	QUALITY_MEDIUM,
	QUALITY_HIGH,
	QUALITY_VERY_HIGH,
} from "mediabunny";
import { CanvasRenderer } from "./canvas-renderer";
import { deserializeSceneTree } from "./scene-deserializer";
import type { SerializedNode } from "./scene-serializer";

// ── Quality map ──────────────────────────────────────────────────────
const qualityMap = {
	low: QUALITY_LOW,
	medium: QUALITY_MEDIUM,
	high: QUALITY_HIGH,
	very_high: QUALITY_VERY_HIGH,
};

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
		self.postMessage({ type: "error", error: message } satisfies WorkerOutMessage);
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
	const frameCount = Math.floor(durationTicks / ticksPerFrame);

	const outputFormat =
		format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

	const output = new Output({
		format: outputFormat,
		target: new BufferTarget(),
	});

	// Codec negotiation: AV1 → VP9/AVC, or HEVC → AVC
	let videoCodec: "avc" | "vp9" | "hevc" | "av1" =
		format === "webm"
			? "vp9"
			: format === "hevc"
				? "hevc"
				: format === "av1"
					? "av1"
					: "avc";

	if (
		(videoCodec === "hevc" || videoCodec === "av1") &&
		typeof VideoEncoder !== "undefined"
	) {
		try {
			const codecString =
				videoCodec === "av1" ? "av01.0.16M.08" : "hev1.1.6.L93.B0";
			const bitrate = Math.max(
				1,
				Math.floor(Number(qualityMap[quality])),
			);
			const { supported } = await VideoEncoder.isConfigSupported({
				codec: codecString,
				width,
				height,
				bitrate,
				framerate: fpsFloat,
			});
			if (!supported) {
				videoCodec = format === "webm" ? "vp9" : "avc";
			}
		} catch {
			videoCodec = format === "webm" ? "vp9" : "avc";
		}
	}

	// The compositor canvas is now an OffscreenCanvas
	const compositorCanvas = wasmCompositor.getCanvas();
	const videoSource = new CanvasSource(compositorCanvas as OffscreenCanvas, {
		codec: videoCodec,
		bitrate: qualityMap[quality],
	});
	output.addVideoTrack(videoSource, { frameRate: fpsFloat });

	let audioSource: AudioBufferSource | null = null;
	const audioBuffer: AudioBuffer | null = audioBufferTransfer;

	if (shouldIncludeAudio && audioBuffer) {
		let audioCodec: "aac" | "opus" = format === "webm" ? "opus" : "aac";

		if (audioCodec === "aac" && typeof AudioEncoder !== "undefined") {
			try {
				const { supported } = await AudioEncoder.isConfigSupported({
					codec: "mp4a.40.2",
					sampleRate: audioBuffer.sampleRate,
					numberOfChannels: audioBuffer.numberOfChannels,
					bitrate: 192000,
				});
				if (!supported) audioCodec = "opus";
			} catch {
				audioCodec = "opus";
			}
		}

		// Audio bitrate is fixed at 128 kbps (AAC) / 64 kbps (Opus) —
		// these are transparent for stereo music/speech and don't need
		// to scale with the video quality factor. Using QUALITY_HIGH
		// (factor 2.0) for audio was wasteful (256 kbps AAC for stereo
		// is overkill) and contributed to file-size bloat.
		audioSource = new AudioBufferSource({
			codec: audioCodec,
			bitrate: audioCodec === "opus" ? 64000 : 128000,
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

	for (let i = 0; i < frameCount; i++) {
		if (isCancelled) {
			if (pendingEncode) await pendingEncode.catch(() => {});
			await output.cancel();
			self.postMessage({ type: "cancelled" } satisfies WorkerOutMessage);
			return;
		}

		const timeTicks = i * ticksPerFrame;
		const timeSeconds = mediaTimeToSeconds({ time: timeTicks });

		// Backpressure: wait for previous frame's encoder to be ready
		if (pendingEncode) {
			await pendingEncode;
		}

		// Composite frame
		await renderer.render({ node: rootNode, time: timeTicks });

		// Snapshot canvas → VideoFrame → encoder
		pendingEncode = videoSource.add(timeSeconds, frameDuration);

		// Report progress
		self.postMessage({
			type: "progress",
			progress: i / frameCount,
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
	self.postMessage(
		{ type: "complete", buffer } satisfies WorkerOutMessage,
		{ transfer: [buffer] },
	);
}
