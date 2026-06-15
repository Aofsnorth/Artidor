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

type ExportParams = {
	width: number;
	height: number;
	fps: FrameRate;
	format: ExportFormat;
	quality: ExportQuality;
	shouldIncludeAudio?: boolean;
	audioBuffer?: AudioBuffer;
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
const YIELD_EVERY_FRAMES = 8;

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
const PROFILE_EXPORT = true;

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

	private isCancelled = false;

	constructor({
		width,
		height,
		fps,
		format,
		quality,
		shouldIncludeAudio,
		audioBuffer,
	}: ExportParams) {
		super();
		this.renderer = new CanvasRenderer({
			width,
			height,
			fps,
		});

		this.format = format;
		this.quality = quality;
		this.shouldIncludeAudio = shouldIncludeAudio ?? false;
		this.audioBuffer = audioBuffer;
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
		const frameCount = Math.floor(rootNode.duration / ticksPerFrame);

		const outputFormat =
			this.format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

		const output = new Output({
			format: outputFormat,
			target: new BufferTarget(),
		});

		// Pick the right video codec for the requested format. HEVC is the
		// H.265 codec (smaller files, modern devices); AVC is the broadly
		// compatible H.264 codec; VP9 is the WebM default.
		const videoCodec: "avc" | "vp9" | "hevc" =
			this.format === "webm" ? "vp9" : this.format === "hevc" ? "hevc" : "avc";

		const videoSource = new CanvasSource(this.renderer.getOutputCanvas(), {
			codec: videoCodec,
			bitrate: qualityMap[this.quality],
		});

		output.addVideoTrack(videoSource, { frameRate: fpsFloat });

		let audioSource: AudioBufferSource | null = null;
		if (this.shouldIncludeAudio && this.audioBuffer) {
			// AAC for MP4 (H.264 and H.265 share the same container / audio codec),
			// Opus for WebM. If the browser can't encode AAC we silently fall back
			// to Opus.
			let audioCodec: "aac" | "opus" = this.format === "webm" ? "opus" : "aac";

			if (audioCodec === "aac" && typeof AudioEncoder !== "undefined") {
				const { supported } = await AudioEncoder.isConfigSupported({
					codec: "mp4a.40.2",
					sampleRate: this.audioBuffer.sampleRate,
					numberOfChannels: this.audioBuffer.numberOfChannels,
					bitrate: 192000,
				});
				if (!supported) audioCodec = "opus";
			}

			audioSource = new AudioBufferSource({
				codec: audioCodec,
				bitrate: qualityMap[this.quality],
			});
			output.addAudioTrack(audioSource);
		}

		await output.start();

		if (audioSource && this.audioBuffer) {
			await audioSource.add(this.audioBuffer);
			audioSource.close();
		}

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
