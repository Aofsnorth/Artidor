import type { FrameRate } from "artidor-wasm";
import type { AnyBaseNode } from "./nodes/base-node";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import { compositor } from "./compositor/unified-compositor";
import { resolveRenderTree } from "./resolve";
import {
	initializeGpuRenderer,
	isGpuAvailable,
} from "./gpu-renderer";

export type CanvasRenderTiming = {
	resolveMs: number;
	descriptorMs: number;
	compositeMs: number;
	blitMs: number;
	totalMs: number;
};

/**
 * Thrown when the GPU device is lost mid-render. Distinct from a general
 * render failure so callers can distinguish "this frame is stale" from
 * "the pipeline is unusable" (e.g. unsupported GPU surface).
 */
export class GpuDeviceLostError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GpuDeviceLostError";
	}
}

/**
 * Serializes all main-thread compositor renders. The WASM compositor is a
 * singleton with ONE shared output canvas, but `renderToCanvas` has await
 * points (resolveRenderTree, buildFrameDescriptor) before the GPU section.
 * Without this lock, two concurrent callers — the preview's rAF loop and
 * thumbnail generation — interleave: one resizes the shared canvas mid-flight
 * (ensureInitialized/resizeCompositor), which invalidates the other's GPU
 * surface and surfaces as "the output surface does not support the required
 * texture format", and the later blit can copy the other caller's frame.
 * Rendering the full resize → composite → blit section under this chain makes
 * each call atomic. Errors don't break the chain; the next render still runs.
 */
let compositorRenderChain: Promise<unknown> = Promise.resolve();

export type CanvasRendererParams = {
	width: number;
	height: number;
	/**
	 * Project canvas size in logical pixels. The transform pipeline
	 * (`computeVisualTransform`, `resolveVisualState`) operates in this
	 * coordinate space, independent of the preview's output size. Defaults
	 * to `width`/`height` for callers that don't need the preview-quality
	 * downscale (exporter, thumbnails).
	 */
	canvasSize?: { width: number; height: number };
	fps: FrameRate;
	measurePerformance?: boolean;
};

export class CanvasRenderer {
	/** Output buffer width (preview-quality scaled). Used for the WASM compositor canvas. */
	width: number;
	/** Output buffer height. */
	height: number;
	/**
	 * Project canvas size. The transform pipeline uses this (not width/height)
	 * so positions are computed in canvas coords. The render() method then
	 * scales the resulting frame transforms to the output buffer before blitting.
	 */
	canvasSize: { width: number; height: number };
	fps: FrameRate;
	// Longest-edge cap for video decode. Set by the preview to avoid decoding
	// 4K sources for a downscaled preview. Left undefined (= no cap, full
	// source resolution) by the exporter so export quality is never reduced.
	maxSourceDim: number | undefined;
	private readonly measurePerformance: boolean;

	constructor({
		width,
		height,
		canvasSize,
		fps,
		measurePerformance = false,
	}: CanvasRendererParams) {
		this.width = width;
		this.height = height;
		this.canvasSize = canvasSize ?? { width, height };
		this.fps = fps;
		this.maxSourceDim = undefined;
		this.measurePerformance = measurePerformance;
	}

	getOutputCanvas(): HTMLCanvasElement | OffscreenCanvas {
		compositor.ensureInitialized({
			width: this.width,
			height: this.height,
		});
		return compositor.getCanvas();
	}

	setSize({
		width,
		height,
		canvasSize,
	}: {
		width: number;
		height: number;
		canvasSize?: { width: number; height: number };
	}) {
		// No-op when unchanged: the preview calls this every frame to apply the
		// current quality scale. Reallocating the backing canvas per frame
		// would defeat the purpose, but the actual output buffer is owned by the
		// WASM compositor — this renderer just tracks the desired dimensions.
		if (
			this.width === width &&
			this.height === height &&
			(!canvasSize ||
				(this.canvasSize.width === canvasSize.width &&
					this.canvasSize.height === canvasSize.height))
		) {
			return;
		}
		this.width = width;
		this.height = height;
		if (canvasSize) this.canvasSize = canvasSize;
	}

	async render({
		node,
		time,
	}: {
		node: AnyBaseNode;
		time: number;
	}): Promise<Omit<CanvasRenderTiming, "blitMs"> | null> {
		await initializeGpuRenderer();
		if (!isGpuAvailable()) {
			throw new Error("GPU renderer is unavailable");
		}

		const renderStart = this.measurePerformance ? performance.now() : 0;
		await resolveRenderTree({ node, renderer: this, time });
		const resolveEnd = this.measurePerformance ? performance.now() : 0;
		const { frame, textures } = await buildFrameDescriptor({
			node,
			renderer: this,
		});
		// The frame descriptor is in canvas coords (canvasSize). Scale to the
		// output buffer before blitting. Skip the scale pass when the buffer
		// already matches canvasSize (high-quality preview, exporter,
		// thumbnails) so we don't pay the per-item iteration cost there.
		if (
			this.width !== this.canvasSize.width ||
			this.height !== this.canvasSize.height
		) {
			const scaleX = this.width / this.canvasSize.width;
			const scaleY = this.height / this.canvasSize.height;
			for (const item of frame.items) {
				// sceneEffect items carry no transform — they apply to the
				// whole frame in the compositor. Skip them.
				if (item.type === "sceneEffect") continue;
				item.transform.centerX *= scaleX;
				item.transform.centerY *= scaleY;
				item.transform.width *= scaleX;
				item.transform.height *= scaleY;
			}
		}
		const descriptorEnd = this.measurePerformance ? performance.now() : 0;
		// Guard the entire GPU pipeline — wgpu panics (device lost, driver
		// reset, OOM) must not crash the render loop. Rethrow as a typed error
		// instead of silently succeeding: a swallowed failure makes callers
		// blit/caches the *previous* frame as if it were the requested one,
		// poisoning frame caches with stale content.
		try {
			compositor.ensureInitialized({
				width: this.width,
				height: this.height,
			});
			compositor.syncTextures(textures);
			compositor.render(frame);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (
				msg.includes("createBuffer") ||
				msg.includes("device is lost") ||
				msg.includes("GPUDevice") ||
				msg.includes("panicked")
			) {
				console.warn(
					"[renderer] GPU device lost; skipping this frame (callers will retry):",
					msg,
				);
				throw new GpuDeviceLostError(msg);
			}
			throw error;
		}

		if (!this.measurePerformance) return null;
		const renderEnd = performance.now();
		return {
			resolveMs: resolveEnd - renderStart,
			descriptorMs: descriptorEnd - resolveEnd,
			compositeMs: renderEnd - descriptorEnd,
			totalMs: renderEnd - renderStart,
		};
	}

	async renderToCanvas({
		node,
		time,
		targetCanvas,
	}: {
		node: AnyBaseNode;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}): Promise<CanvasRenderTiming | null> {
		const run = compositorRenderChain.then(() =>
			this.renderAndBlit({ node, time, targetCanvas }),
		);
		compositorRenderChain = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	/**
	 * Renders a frame and captures the compositor output as an ImageBitmap in
	 * one serialized chain section. Capturing outside the chain races with a
	 * queued thumbnail/preview render: the other render resizes the shared
	 * compositor canvas between blit and pixel copy, so the snapshot contains
	 * the other render's frame (cached under this frame's key).
	 */
	async renderToCanvasWithSnapshot({
		node,
		time,
		targetCanvas,
	}: {
		node: AnyBaseNode;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}): Promise<{ timing: CanvasRenderTiming | null; bitmap: ImageBitmap | null }> {
		const run = compositorRenderChain.then(async () => {
			const timing = await this.renderAndBlit({ node, time, targetCanvas });
			if (typeof createImageBitmap !== "function") {
				return { timing, bitmap: null };
			}
			const bitmap = await createImageBitmap(compositor.getCanvas());
			return { timing, bitmap };
		});
		compositorRenderChain = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	/**
	 * Runs `render()` under the compositor chain without blitting. Main-thread
	 * export loops (scene-exporter) call this instead of `render()` so their
	 * await points cannot interleave with preview/thumbnail renders that resize
	 * the shared compositor canvas. Deliberately not `async`: returning the raw
	 * chained promise keeps the caller's continuation in the same microtask
	 * cascade as the chain, so a synchronously-following canvas snapshot (the
	 * exporter's `videoSource.add()`) cannot be preempted by the next chained
	 * render.
	 */
	renderSerialized({
		node,
		time,
	}: {
		node: AnyBaseNode;
		time: number;
	}): Promise<Omit<CanvasRenderTiming, "blitMs"> | null> {
		const run = compositorRenderChain.then(() => this.render({ node, time }));
		compositorRenderChain = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}

	private async renderAndBlit({
		node,
		time,
		targetCanvas,
	}: {
		node: AnyBaseNode;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}): Promise<CanvasRenderTiming | null> {
		const timing = await this.render({ node, time });
		const blitStart = this.measurePerformance ? performance.now() : 0;

		const ctx = targetCanvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get target canvas context");
		}

		ctx.drawImage(
			compositor.getCanvas(),
			0,
			0,
			targetCanvas.width,
			targetCanvas.height,
		);
		if (!timing) return null;
		const blitMs = performance.now() - blitStart;
		return {
			...timing,
			blitMs,
			totalMs: timing.totalMs + blitMs,
		};
	}
}
