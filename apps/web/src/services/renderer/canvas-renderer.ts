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
				return;
			}
			throw error;
		}
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
