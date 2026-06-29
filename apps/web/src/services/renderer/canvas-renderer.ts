import type { FrameRate } from "artidor-wasm";
import type { AnyBaseNode } from "./nodes/base-node";
import { buildFrameDescriptor } from "./compositor/frame-descriptor";
import { compositor } from "./compositor/unified-compositor";
import { resolveRenderTree } from "./resolve";

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
};

export class CanvasRenderer {
	canvas: OffscreenCanvas | HTMLCanvasElement;
	context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
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

	constructor({ width, height, canvasSize, fps }: CanvasRendererParams) {
		this.width = width;
		this.height = height;
		this.canvasSize = canvasSize ?? { width, height };
		this.fps = fps;
		this.maxSourceDim = undefined;

		try {
			this.canvas = new OffscreenCanvas(width, height);
		} catch {
			this.canvas = document.createElement("canvas");
			this.canvas.width = width;
			this.canvas.height = height;
		}

		const context = this.canvas.getContext("2d");
		if (!context) {
			throw new Error("Failed to get canvas context");
		}

		this.context = context as
			| OffscreenCanvasRenderingContext2D
			| CanvasRenderingContext2D;
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
		// current quality scale, and reallocating the backing canvas per frame
		// would defeat the purpose.
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

		if (this.canvas instanceof OffscreenCanvas) {
			this.canvas = new OffscreenCanvas(width, height);
		} else {
			this.canvas.width = width;
			this.canvas.height = height;
		}

		const context = this.canvas.getContext("2d");
		if (!context) {
			throw new Error("Failed to get canvas context");
		}
		this.context = context as
			| OffscreenCanvasRenderingContext2D
			| CanvasRenderingContext2D;
	}

	async render({ node, time }: { node: AnyBaseNode; time: number }) {
		await resolveRenderTree({ node, renderer: this, time });
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
		compositor.ensureInitialized({
			width: this.width,
			height: this.height,
		});
		compositor.syncTextures(textures);
		compositor.render(frame);
	}

	async renderToCanvas({
		node,
		time,
		targetCanvas,
	}: {
		node: AnyBaseNode;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}) {
		await this.render({ node, time });

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
	}
}
