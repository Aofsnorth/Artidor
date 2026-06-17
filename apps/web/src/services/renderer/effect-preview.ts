import { createOffscreenCanvas } from "./canvas-utils";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { gpuRenderer } from "./gpu-renderer";

const PREVIEW_SIZE = 160;
const PREVIEW_IMAGE_PATH = "/effects/preview.jpg";

class EffectPreviewService {
	private testSourceCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private previewImageElement: HTMLImageElement | null = null;
	private hasPreviewImageFailed = false;
	private onReadyCallbacks = new Set<() => void>();

	readonly PREVIEW_SIZE = PREVIEW_SIZE;

	constructor() {
		this.loadPreviewImage();
	}

	onPreviewImageReady({ callback }: { callback: () => void }): () => void {
		this.onReadyCallbacks.add(callback);
		return () => this.onReadyCallbacks.delete(callback);
	}

	renderPreview({
		effectType,
		params,
		targetCanvas,
		uniformDimensions,
	}: {
		effectType: string;
		params: ParamValues;
		targetCanvas: HTMLCanvasElement;
		uniformDimensions?: { width: number; height: number };
	}): void {
		const size = PREVIEW_SIZE;
		const targetCtx = targetCanvas.getContext(
			"2d",
		) as CanvasRenderingContext2D | null;
		if (!targetCtx) return;

		targetCanvas.width = size;
		targetCanvas.height = size;

		const source = this.getTestSource({ width: size, height: size });
		if (!source) return;

		const definition = effectsRegistry.get(effectType);
		const resolvedParams =
			Object.keys(params).length > 0
				? params
				: buildDefaultParamValues(definition.params);

		let result: CanvasImageSource = source;
		try {
			const passes = resolveEffectPasses({
				definition,
				effectParams: resolvedParams,
				width: uniformDimensions?.width ?? size,
				height: uniformDimensions?.height ?? size,
			});
			const gpuResult = this.applyGpuEffect({
				source,
				width: size,
				height: size,
				passes,
			});

			// Validate the GPU result is usable. A lost WebGL context or
			// failed shader can produce a canvas with 0 dimensions or a
			// blank image. Fall back to the unprocessed source in that case.
			if (this.isValidCanvasResult(gpuResult)) {
				result = gpuResult;
			} else {
				console.warn(
					`GPU effect preview for ${effectType} produced invalid result, using source fallback`,
				);
			}
		} catch (error) {
			console.warn(`Failed to render effect preview for ${effectType}:`, error);
		}

		targetCtx.clearRect(0, 0, size, size);
		try {
			targetCtx.drawImage(result, 0, 0, size, size);

			// Even if the canvas object is valid, the underlying WebGL/WebGPU
			// pipeline might fail silently and return a completely empty or
			// black canvas. We sample the center pixel to ensure it actually
			// rendered something.
			if (result !== source) {
				const pixels = targetCtx.getImageData(
					Math.floor(size / 2),
					Math.floor(size / 2),
					1,
					1,
				).data;

				const isBlank =
					pixels[3] === 0 || // fully transparent
					(pixels[0] === 0 && pixels[1] === 0 && pixels[2] === 0); // pure black

				if (isBlank) {
					console.warn(
						`GPU effect preview for ${effectType} produced visually blank/black canvas, falling back to source.`,
					);
					targetCtx.clearRect(0, 0, size, size);
					targetCtx.drawImage(source, 0, 0, size, size);
				}
			}
		} catch (error) {
			console.warn(`Failed to draw effect preview for ${effectType}:`, error);
			// Last resort: draw the original source without effects
			try {
				targetCtx.clearRect(0, 0, size, size);
				targetCtx.drawImage(source, 0, 0, size, size);
			} catch {
				// Nothing we can do — leave the canvas cleared
			}
		}
	}

	private loadPreviewImage(): void {
		if (typeof window === "undefined") return;
		const image = new Image();
		image.onload = () => {
			this.hasPreviewImageFailed = false;
			this.testSourceCanvas = null;
			this.notifyReadyCallbacks();
		};
		image.onerror = () => {
			this.hasPreviewImageFailed = true;
			this.testSourceCanvas = null;
			this.notifyReadyCallbacks();
		};
		image.src = PREVIEW_IMAGE_PATH;
		this.previewImageElement = image;
	}

	private notifyReadyCallbacks(): void {
		for (const callback of this.onReadyCallbacks) {
			callback();
		}
	}

	private createTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const canvas = createOffscreenCanvas({ width, height });
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return null;
		}

		const isImageReady =
			!this.hasPreviewImageFailed &&
			this.previewImageElement?.complete &&
			(this.previewImageElement.naturalWidth ?? 0) > 0;
		if (isImageReady && this.previewImageElement) {
			ctx.drawImage(this.previewImageElement, 0, 0, width, height);
			return canvas;
		}

		this.drawFallbackSource({ ctx, width, height });
		return canvas;
	}

	private drawFallbackSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, "#f97316");
		gradient.addColorStop(0.35, "#ec4899");
		gradient.addColorStop(0.7, "#6366f1");
		gradient.addColorStop(1, "#06b6d4");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
		ctx.beginPath();
		ctx.arc(width * 0.5, height * 0.38, width * 0.18, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
		ctx.beginPath();
		ctx.roundRect(width * 0.2, height * 0.62, width * 0.6, height * 0.2, 14);
		ctx.fill();

		ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
		ctx.fillRect(width * 0.22, height * 0.82, width * 0.56, 2);
	}

	private getTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): CanvasImageSource | null {
		if (
			!this.testSourceCanvas ||
			this.testSourceCanvas.width !== width ||
			this.testSourceCanvas.height !== height
		) {
			this.testSourceCanvas = this.createTestSource({ width, height });
		}
		return this.testSourceCanvas;
	}

	private applyGpuEffect({
		source,
		width,
		height,
		passes,
	}: {
		source: CanvasImageSource;
		width: number;
		height: number;
		passes: ReturnType<typeof resolveEffectPasses>;
	}): OffscreenCanvas | HTMLCanvasElement {
		return gpuRenderer.applyEffect({
			source,
			width,
			height,
			passes,
		}) as OffscreenCanvas | HTMLCanvasElement;
	}

	/**
	 * Check that the GPU output canvas is actually usable. A lost WebGL
	 * context or failed shader compilation can produce a canvas whose
	 * dimensions are 0, or whose context is marked as lost. Either case
	 * renders as a solid black rectangle when drawn into the 2D preview.
	 */
	private isValidCanvasResult(canvas: CanvasImageSource): boolean {
		if (canvas instanceof HTMLCanvasElement) {
			if (canvas.width === 0 || canvas.height === 0) return false;
			const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
			if (gl?.isContextLost()) return false;
		} else if (canvas instanceof OffscreenCanvas) {
			if (canvas.width === 0 || canvas.height === 0) return false;
		}
		return true;
	}
}

export const effectPreviewService = new EffectPreviewService();
