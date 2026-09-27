import type { FrameRate } from "artidor-wasm";
import type { AnyBaseNode } from "./nodes/base-node";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import { compositor } from "./compositor/unified-compositor";
import { resolveRenderTree } from "./resolve";

export type CanvasRenderTiming = {
	resolveMs: number;
	descriptorMs: number;
	compositeMs: number;
	blitMs: number;
	totalMs: number;
};

/**
 * Hard bounds on any dimension handed to the GPU.
 *
 * A dimension that reaches the compositor as 0, `NaN`, or a runaway value turns
 * into a giant texture upload: wgpu then allocates a staging buffer with
 * `createBuffer(mappedAtCreation: true)`, which throws
 * `RangeError: ... size is too large for the implementation`. That throw happens
 * *inside* the compositor's `RefCell` borrow, and because wasm panics do not
 * unwind Rust destructors, the borrow is never released — every later frame then
 * dies immediately on `RefCell already borrowed`, so the preview is permanently
 * black instead of briefly wrong.
 *
 * The preview derives its output size from a quality governor, so it is exactly
 * the kind of input that can go degenerate. Clamping here is the one place every
 * dimension that reaches the GPU passes through.
 */
const MIN_TEXTURE_DIM = 1;
const MAX_TEXTURE_DIM = 8192;

export function clampTextureDimension(value: number): number {
	if (!Number.isFinite(value)) return MIN_TEXTURE_DIM;
	return Math.min(MAX_TEXTURE_DIM, Math.max(MIN_TEXTURE_DIM, Math.round(value)));
}

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
		this.width = clampTextureDimension(width);
		this.height = clampTextureDimension(height);
		this.canvasSize = canvasSize
			? {
					width: clampTextureDimension(canvasSize.width),
					height: clampTextureDimension(canvasSize.height),
				}
			: { width: this.width, height: this.height };
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
		// Clamp before comparing: an out-of-range request must not be treated as
		// "unchanged" just because the bad value was already stored.
		const nextWidth = clampTextureDimension(width);
		const nextHeight = clampTextureDimension(height);
		const nextCanvasWidth = canvasSize
			? clampTextureDimension(canvasSize.width)
			: this.canvasSize.width;
		const nextCanvasHeight = canvasSize
			? clampTextureDimension(canvasSize.height)
			: this.canvasSize.height;

		if (
			this.width === nextWidth &&
			this.height === nextHeight &&
			this.canvasSize.width === nextCanvasWidth &&
			this.canvasSize.height === nextCanvasHeight
		) {
			return;
		}
		this.width = nextWidth;
		this.height = nextHeight;
		this.canvasSize = { width: nextCanvasWidth, height: nextCanvasHeight };
	}

	async render({
		node,
		time,
	}: {
		node: AnyBaseNode;
		time: number;
	}): Promise<Omit<CanvasRenderTiming, "blitMs"> | null> {
		const renderStart = this.measurePerformance ? performance.now() : 0;
		await resolveRenderTree({ node, renderer: this, time });
		const resolveEnd = this.measurePerformance ? performance.now() : 0;
		const { frame, textures } = buildFrameDescriptor({
			node,
			renderer: this,
		});
		// Every dimension below reaches wgpu as a texture allocation. One
		// degenerate value is enough to brick the compositor (see
		// clampTextureDimension), so the descriptor is sanitised at the boundary.
		frame.width = clampTextureDimension(frame.width);
		frame.height = clampTextureDimension(frame.height);
		for (const texture of textures) {
			texture.width = clampTextureDimension(texture.width);
			texture.height = clampTextureDimension(texture.height);
		}
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
			if (!(Number.isFinite(scaleX) && Number.isFinite(scaleY))) {
				throw new Error(
					`Degenerate render scale: ${this.width}x${this.height} over ${this.canvasSize.width}x${this.canvasSize.height}`,
				);
			}
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
		// reset, OOM) must not crash the render loop. A lost device means
		// the preview freezes on the last good frame until page reload.
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
					"[renderer] GPU device lost, preview frozen until reload:",
					msg,
				);
			} else {
				throw error;
			}
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
