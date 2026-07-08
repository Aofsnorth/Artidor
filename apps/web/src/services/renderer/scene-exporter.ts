import EventEmitter from "eventemitter3";

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
import type { FrameRate } from "artidor-wasm";
import { mediaTimeToSeconds } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { frameRateToFloat } from "@/lib/fps/utils";
import type { RootNode } from "./nodes/root-node";
import type { ExportFormat, ExportQuality } from "@/lib/export";
import { CanvasRenderer } from "./canvas-renderer";
import { negotiateVideoCodec } from "./export-codec";

type ExportParams = {
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio?: boolean;
	audioBuffer?: AudioBuffer;
	/**
	 * Force software video encoding (skip hardware acceleration). Used by the
	 * retry path in `RendererManager` after a hardware encoder configuration
	 * error — `isConfigSupported` can report hardware as supported while the
	 * actual `VideoEncoder.configure()` rejects it (Firefox), so the only
	 * reliable fallback is to force software encoding.
	 */
	forceSoftwareEncoding?: boolean;
};

const qualityMap = {
	low: QUALITY_LOW,
	medium: QUALITY_MEDIUM,
	high: QUALITY_HIGH,
	very_high: QUALITY_VERY_HIGH,
};

// How often (in frames) the export loop hands control back to the browser. The
// render/encode work is otherwise all microtasks, which would starve paints and
// macrotask timers — freezing the progress bar and the cancel interval. Yielding
// a real macrotask lets React repaint and the cancel check fire.
const YIELD_EVERY_FRAMES = 60;

// Stage-1 export profiling. Render and encode are pipelined, so the only number
// that tells us *what* is slow is how main-thread wall-clock per frame splits:
//   - render (composite + video decode, all on the main thread)
//   - backpressure wait (stalling for the WebCodecs encoder to drain)
//   - add() snapshot (canvas -> VideoFrame copy)
//   - yield (the deliberate macrotask hand-back)
// If render dominates and backpressure is ~0, the compositor is the bottleneck
// and moving it to a Worker/OffscreenCanvas raises throughput. If backpressure
// dominates, the encoder is the limit and a Worker only smooths the UI.
// Flip to false to silence the summary once the numbers are in.
const PROFILE_EXPORT = false;

// Yield a macrotask so the browser can paint and run timers. MessageChannel is
// used over setTimeout(0) because it is not subject to the 4ms clamp, keeping
// the yield overhead negligible.
function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		const channel = new MessageChannel();
		channel.port1.onmessage = () => {
			channel.port1.close();
			resolve();
		};
		channel.port2.postMessage(undefined);
	});
}

export type SceneExporterEvents = {
	progress: [progress: number];
	complete: [buffer: ArrayBuffer];
	error: [error: Error];
	cancelled: [];
};

export class SceneExporter extends EventEmitter<SceneExporterEvents> {
	private renderer: CanvasRenderer;
	private format: ExportFormat;
	private quality: ExportQuality;
	private shouldIncludeAudio: boolean;
	private audioBuffer?: AudioBuffer;
	private forceSoftwareEncoding: boolean;

	private isCancelled = false;

	constructor({
		width,
		height,
		fps,
		format,
		quality,
		shouldIncludeAudio,
		audioBuffer,
		forceSoftwareEncoding = false,
	}: ExportParams) {
		super();
		// The video codec is negotiated inside `export()`, but for the AVC
		// (H.264) and HEVC (H.265) codecs WebCodecs requires width and height
		// to be even (chroma subsampling needs sample-aligned coded sizes).
		// The codec is known from the format here:
		//   - webm → vp9 (odd OK)
		//   - hevc → hevc (even required)  — we round conservatively because
		//     `videoCodec` may fall back to avc on browsers without hevc.
		//   - av1  → av1 (odd OK) — may still fall back to avc, see above.
		//   - mp4  → avc (even required)
		// We always round up to the next even for formats that *might* land
		// on avc/hevc. The 1-px difference (e.g. 6000x3375 → 6000x3376) is
		// invisible on real content and avoids the encoder error:
		//   "dimensions 6000x3375 are not supported for codec 'avc'; both
		//    width and height must be even numbers".
		const requiresEven =
			format === "mp4" || format === "hevc" || format === "av1";
		const safeWidth = requiresEven ? width + (width % 2) : width;
		const safeHeight = requiresEven ? height + (height % 2) : height;
		if (safeWidth !== width || safeHeight !== height) {
			console.info(
				`[export] rounded canvas from ${width}x${height} to ${safeWidth}x${safeHeight} for codec compatibility`,
			);
		}
		this.renderer = new CanvasRenderer({
			width: safeWidth,
			height: safeHeight,
			fps,
		});

		this.format = format;
		this.quality = quality;
		this.shouldIncludeAudio = shouldIncludeAudio ?? false;
		this.audioBuffer = audioBuffer;
		this.forceSoftwareEncoding = forceSoftwareEncoding;
	}

	cancel(): void {
		this.isCancelled = true;
	}

	async export({
		rootNode,
	}: {
		rootNode: RootNode;
	}): Promise<ArrayBuffer | null> {
		const fps = this.renderer.fps;
		const fpsFloat = frameRateToFloat(fps);
		const ticksPerFrame = Math.round(
			(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
		);
		// Round duration to integer ticks to avoid WASM i64 type errors.
		// WASM functions expect integer MediaTime values, not floating point.
		const durationTicks = Math.round(rootNode.duration);
		const frameCount = Math.floor(durationTicks / ticksPerFrame);

		// Negotiate codec + hardware acceleration support via the shared helper so
		// that fallback behaviour (AV1→AVC, hardware→software, AVC→VP9) is
		// consistent across the main-thread, single-worker, and parallel-worker
		// paths. The negotiator can change the output container format (e.g.
		// MP4→WebM when falling back to VP9), so we build the container after.
		const { codec: videoCodec, hardwareAcceleration, outputFormat: negotiatedFormat } =
			await negotiateVideoCodec({
				format: this.format,
				quality: this.quality,
				width: this.renderer.width,
				height: this.renderer.height,
				fpsFloat,
				forceSoftware: this.forceSoftwareEncoding,
			});

		const outputFormatInstance =
			negotiatedFormat === "webm"
				? new WebMOutputFormat()
				: new Mp4OutputFormat();

		const output = new Output({
			format: outputFormatInstance,
			target: new BufferTarget(),
		});

		const videoSource = new CanvasSource(this.renderer.getOutputCanvas(), {
			codec: videoCodec,
			bitrate: qualityMap[this.quality],
			// Request hardware encoder (NVENC/QuickSync/VCE/VideoToolbox).
			// 10-100x faster than software encoding. Automatically downgrades to
			// software when the hardware encoder rejects the configuration.
			hardwareAcceleration,
		});

		output.addVideoTrack(videoSource, { frameRate: fpsFloat });

		let audioSource: AudioBufferSource | null = null;
		if (this.shouldIncludeAudio && this.audioBuffer) {
			// AAC for MP4 (H.264 and H.265 share the same container / audio codec),
			// Opus for WebM. If the browser can't encode AAC we silently fall back
			// to Opus. Use the negotiated format (may have switched to WebM for
			// VP9 fallback) instead of the original format.
			let audioCodec: "aac" | "opus" =
				negotiatedFormat === "webm" ? "opus" : "aac";

			if (audioCodec === "aac" && typeof AudioEncoder !== "undefined") {
				const { supported } = await AudioEncoder.isConfigSupported({
					codec: "mp4a.40.2",
					sampleRate: this.audioBuffer.sampleRate,
					numberOfChannels: this.audioBuffer.numberOfChannels,
					bitrate: 192000,
				});
				if (!supported) audioCodec = "opus";
			}

			// Audio bitrate fixed at 128 kbps (AAC) / 64 kbps (Opus) —
			// transparent for stereo, no need to scale with video quality.
			audioSource = new AudioBufferSource({
				codec: audioCodec,
				bitrate: audioCodec === "opus" ? 64000 : 128000,
			});
			output.addAudioTrack(audioSource);
		}

		// Short-circuit if the user cancelled during track setup. Starting a
		// canceled output throws "Output has been canceled."
		if (this.isCancelled) {
			await output.cancel().catch(() => {});
			this.emit("cancelled");
			return null;
		}

		try {
			await output.start();
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			if (message === "Output has been canceled.") {
				this.emit("cancelled");
				return null;
			}
			throw error;
		}

		const audioEncode =
			audioSource && this.audioBuffer
				? audioSource.add(this.audioBuffer).finally(() => audioSource?.close())
				: null;

		// Pipeline render and encode. `videoSource.add()` snapshots the canvas
		// synchronously into an independent VideoFrame, hands it to the WebCodecs
		// encoder (which runs on its own thread), and returns a promise that
		// resolves once the encoder is ready for more (backpressure: it only blocks
		// once ~4 frames are queued).
		//
		// Order per frame: await previous backpressure → render(i) → add(i). The
		// backpressure await normally resolves immediately, so render(i) proceeds
		// while the previous frame is still encoding on the codec thread — that is
		// the overlap. render(i) and add(i) are kept adjacent with no await between
		// them so the shared compositor canvas (also used by the live preview)
		// cannot be overwritten before add() captures frame i.
		let pendingEncode: Promise<void> | null = null;
		const frameDuration = 1 / fpsFloat;

		// Stage-1 profiling accumulators (ms). Only touched when PROFILE_EXPORT.
		let profRender = 0;
		let profBackpressure = 0;
		let profAdd = 0;
		let profYield = 0;
		const profStart = PROFILE_EXPORT ? performance.now() : 0;

		for (let i = 0; i < frameCount; i++) {
			if (this.isCancelled) {
				if (pendingEncode) await pendingEncode.catch(() => {});
				await output.cancel();
				this.emit("cancelled");
				return null;
			}

			// Use integer ticks to avoid WASM i64 type errors.
			const timeTicks = i * ticksPerFrame;
			const timeSeconds = mediaTimeToSeconds({ time: timeTicks });

			// Respect the previous frame's encoder backpressure before rendering the
			// next one. Usually already resolved, so this does not stall the overlap.
			if (pendingEncode) {
				if (PROFILE_EXPORT) {
					const t = performance.now();
					await pendingEncode;
					profBackpressure += performance.now() - t;
				} else {
					await pendingEncode;
				}
			}

			// Composite frame i, then immediately capture it. add() snapshots the
			// canvas synchronously, so these two must stay adjacent (no await).
			if (PROFILE_EXPORT) {
				const tRender = performance.now();
				await this.renderer.render({ node: rootNode, time: timeTicks });
				const tAdd = performance.now();
				profRender += tAdd - tRender;
				pendingEncode = videoSource.add(timeSeconds, frameDuration);
				profAdd += performance.now() - tAdd;
			} else {
				await this.renderer.render({ node: rootNode, time: timeTicks });
				pendingEncode = videoSource.add(timeSeconds, frameDuration);
			}

			this.emit("progress", i / frameCount);

			// Periodically hand control back to the browser so the UI (progress
			// bar) repaints and the cancel interval can fire. Safe here: frame i has
			// already been captured by add() above.
			if (i % YIELD_EVERY_FRAMES === 0) {
				if (PROFILE_EXPORT) {
					const t = performance.now();
					await yieldToEventLoop();
					profYield += performance.now() - t;
				} else {
					await yieldToEventLoop();
				}
			}
		}

		// Drain the last in-flight encode before finalizing.
		if (pendingEncode) {
			if (PROFILE_EXPORT) {
				const t = performance.now();
				await pendingEncode;
				profBackpressure += performance.now() - t;
			} else {
				await pendingEncode;
			}
		}

		if (PROFILE_EXPORT && frameCount > 0) {
			const wall = performance.now() - profStart;
			const per = (ms: number) => (ms / frameCount).toFixed(2);
			const pct = (ms: number) => ((ms / wall) * 100).toFixed(0);
			// One compact summary. render = composite+decode (Worker-offloadable);
			// backpressure = waiting on the WebCodecs encoder (NOT Worker-fixable).
			console.log(
				`[export-profile] ${frameCount} frames @ ${fpsFloat.toFixed(2)}fps | ` +
					`wall ${(wall / 1000).toFixed(2)}s (${(frameCount / (wall / 1000)).toFixed(1)} fps) | ` +
					`render ${per(profRender)}ms/f (${pct(profRender)}%) | ` +
					`backpressure ${per(profBackpressure)}ms/f (${pct(profBackpressure)}%) | ` +
					`add ${per(profAdd)}ms/f (${pct(profAdd)}%) | ` +
					`yield ${per(profYield)}ms/f (${pct(profYield)}%)`,
			);
		}

		if (this.isCancelled) {
			await output.cancel();
			this.emit("cancelled");
			return null;
		}

		videoSource.close();
		if (audioEncode) await audioEncode;
		await output.finalize();
		this.emit("progress", 1);

		const buffer = output.target.buffer;
		if (!buffer) {
			this.emit("error", new Error("Failed to export video"));
			return null;
		}

		this.emit("complete", buffer);
		return buffer;
	}
}
