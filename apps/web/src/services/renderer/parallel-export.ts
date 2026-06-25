/**
 * Parallel (multi-segment) export pipeline.
 *
 * The single-worker exporter renders + encodes the whole timeline on one
 * worker, one frame at a time. That leaves most of a multi-core machine idle.
 * This module is the CapCut-style approach: split the timeline into N
 * contiguous frame ranges ("segments"), render + encode each segment on its
 * own worker (its own OffscreenCanvas, WebGPU device and decoder) fully in
 * parallel, then stitch the encoded segments back together at the *packet*
 * level — no re-encode, so the output is bit-for-bit the same quality as a
 * serial export, just produced ~N× faster.
 *
 * Why stitching is lossless and seamless:
 * - Every worker's encoder starts fresh, so each segment begins with a key
 *   frame (IDR). Concatenating key-frame-aligned segments needs no re-encode.
 * - All workers are pinned to the *same* negotiated codec, so every segment's
 *   bitstream is mutually compatible (shared decoder config).
 * - Each segment is encoded with segment-local (0-based) timestamps; on
 *   concatenation we add a constant offset equal to the segment's global start
 *   time. Because the tick→seconds mapping is linear, the resulting global
 *   timestamps are identical to what a serial export would have produced —
 *   uniform frame spacing with no gap or overlap at segment boundaries.
 *
 * Audio is encoded exactly once during concatenation (from the pre-mixed
 * buffer), never per segment.
 *
 * The whole path is best-effort: callers should treat a thrown error or a
 * `{ fallback: true }` result as "use the single-worker exporter instead", so
 * a parallel-path problem can never block an export.
 */

import {
	ALL_FORMATS,
	AudioBufferSource,
	BlobSource,
	BufferTarget,
	EncodedPacketSink,
	EncodedVideoPacketSource,
	Input,
	Mp4OutputFormat,
	Output,
	WebMOutputFormat,
} from "mediabunny";
import type { FrameRate } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { frameRateToFloat } from "@/lib/fps/utils";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import type { SerializedNode } from "./scene-serializer";
import {
	audioBitrateFor,
	negotiateAudioCodec,
	negotiateVideoCodec,
	type ExportVideoCodec,
} from "./export-codec";
import {
	runExportInWorker,
	type ExportWorkerResult,
} from "./export-worker-bridge";
import { buildSegmentPlans, planSegmentCount } from "./segment-plan";

export type ParallelExportResult =
	| ExportWorkerResult
	| { success: false; fallback: true };

/**
 * Render + encode every segment in parallel, then concatenate them.
 *
 * Returns `{ fallback: true }` when parallelism isn't worthwhile so the caller
 * can transparently use the single-worker exporter. Throws on unexpected
 * errors (also a signal to fall back).
 */
export async function runParallelExport({
	sceneTree,
	files,
	audioBuffer,
	width,
	height,
	fps,
	durationTicks,
	format,
	quality,
	shouldIncludeAudio,
	onProgress,
	getCancelled,
}: {
	sceneTree: SerializedNode;
	files: Array<{ mediaId: string; file: File }>;
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	fps: FrameRate;
	durationTicks: number;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio: boolean;
	onProgress?: ({ progress }: { progress: number }) => void;
	getCancelled?: () => boolean;
}): Promise<ParallelExportResult> {
	const fpsFloat = frameRateToFloat(fps);
	const ticksPerFrame = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const totalFrames = Math.floor(durationTicks / ticksPerFrame);

	const cores =
		typeof navigator !== "undefined" && navigator.hardwareConcurrency
			? navigator.hardwareConcurrency
			: 4;
	const segmentCount = planSegmentCount(totalFrames, cores);
	if (segmentCount < 2) {
		return { success: false, fallback: true };
	}

	// Pin one codec for every segment up-front so the bitstreams are mutually
	// compatible and can be stitched without a re-encode.
	const videoCodec = await negotiateVideoCodec({
		format,
		quality,
		width,
		height,
		fpsFloat,
	});

	const plans = buildSegmentPlans({
		totalFrames,
		count: segmentCount,
		ticksPerFrame,
		ticksPerSecond: TICKS_PER_SECOND,
	});

	// Aggregate progress across segments, weighted by each segment's frame count.
	const segmentProgress = new Array<number>(segmentCount).fill(0);
	const reportProgress = () => {
		if (!onProgress) return;
		let done = 0;
		for (const plan of plans) {
			done += (segmentProgress[plan.index] ?? 0) * plan.frames;
		}
		onProgress({ progress: totalFrames > 0 ? done / totalFrames : 0 });
	};

	// Launch every segment worker concurrently. Each gets its own OffscreenCanvas
	// and a cloned (not transferred) copy of the shared media Files.
	const segmentResults = await Promise.all(
		plans.map((plan) => {
			const canvas = new OffscreenCanvas(width, height);
			return runExportInWorker({
				canvas,
				sceneTree,
				files,
				audioBuffer: null,
				width,
				height,
				fps,
				format,
				quality,
				shouldIncludeAudio: false,
				videoOnly: true,
				videoCodec,
				startFrame: plan.startFrame,
				endFrame: plan.endFrame,
				transferFiles: false,
				onProgress: ({ progress }) => {
					segmentProgress[plan.index] = progress;
					reportProgress();
				},
				getCancelled,
			});
		}),
	);

	// Any cancellation → bubble up as cancelled.
	if (segmentResults.some((r) => !r.success && "cancelled" in r)) {
		return { success: false, cancelled: true };
	}

	// Any segment failure → throw so the caller falls back to single-worker.
	const segmentBuffers: ArrayBuffer[] = [];
	for (const result of segmentResults) {
		if (!result.success || !("buffer" in result)) {
			const error =
				!result.success && "error" in result
					? result.error
					: "Segment export produced no buffer";
			throw new Error(`Parallel segment failed: ${error}`);
		}
		segmentBuffers.push(result.buffer);
	}

	if (getCancelled?.()) {
		return { success: false, cancelled: true };
	}

	const buffer = await concatenateSegments({
		segmentBuffers,
		segmentStartSeconds: plans.map((p) => p.startSeconds),
		format,
		videoCodec,
		fpsFloat,
		audioBuffer: shouldIncludeAudio ? audioBuffer : null,
	});

	onProgress?.({ progress: 1 });
	return { success: true, buffer };
}

/**
 * Stitch segment files into one output by copying their encoded video packets
 * (offset to global time) into a single track — no re-encode — and muxing the
 * pre-mixed audio once.
 */
async function concatenateSegments({
	segmentBuffers,
	segmentStartSeconds,
	format,
	videoCodec,
	fpsFloat,
	audioBuffer,
}: {
	segmentBuffers: ArrayBuffer[];
	segmentStartSeconds: number[];
	format: ExportFormat;
	videoCodec: ExportVideoCodec;
	fpsFloat: number;
	audioBuffer: AudioBuffer | null;
}): Promise<ArrayBuffer> {
	const outputFormat =
		format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();
	const output = new Output({
		format: outputFormat,
		target: new BufferTarget(),
	});

	const videoSource = new EncodedVideoPacketSource(videoCodec);
	output.addVideoTrack(videoSource, { frameRate: fpsFloat });

	let audioSource: AudioBufferSource | null = null;
	if (audioBuffer) {
		const audioCodec = await negotiateAudioCodec({
			format,
			sampleRate: audioBuffer.sampleRate,
			numberOfChannels: audioBuffer.numberOfChannels,
		});
		audioSource = new AudioBufferSource({
			codec: audioCodec,
			bitrate: audioBitrateFor(audioCodec),
		});
		output.addAudioTrack(audioSource);
	}

	await output.start();

	// Encode the audio once, concurrently with the video packet copy.
	const audioEncode =
		audioSource && audioBuffer
			? audioSource.add(audioBuffer).finally(() => audioSource?.close())
			: null;

	// The decoder config from the first segment applies to all segments (they
	// share an identical encoder config); it must be supplied on the first
	// `add()` so the muxer can write the track's codec metadata.
	let isFirstPacket = true;

	for (const [s, segmentBuffer] of segmentBuffers.entries()) {
		const offset = segmentStartSeconds[s] ?? 0;
		const input = new Input({
			source: new BlobSource(new Blob([segmentBuffer])),
			formats: ALL_FORMATS,
		});
		try {
			const track = await input.getPrimaryVideoTrack();
			if (!track) {
				throw new Error("Segment has no video track");
			}
			const sink = new EncodedPacketSink(track);
			const decoderConfig = isFirstPacket
				? await track.getDecoderConfig()
				: undefined;

			// Packets are read in decode order with their presentation
			// timestamps; offsetting every timestamp by the segment's global
			// start keeps decode order intact and yields continuous global PTS.
			let packet = await sink.getFirstPacket();
			while (packet) {
				const shifted = packet.clone({ timestamp: packet.timestamp + offset });
				await videoSource.add(
					shifted,
					isFirstPacket && decoderConfig
						? { decoderConfig: decoderConfig as VideoDecoderConfig }
						: undefined,
				);
				isFirstPacket = false;
				packet = await sink.getNextPacket(packet);
			}
		} finally {
			input.dispose();
		}
	}

	videoSource.close();
	if (audioEncode) await audioEncode;
	await output.finalize();

	const buffer = output.target.buffer;
	if (!buffer) {
		throw new Error("Concatenation produced no buffer");
	}
	return buffer;
}
