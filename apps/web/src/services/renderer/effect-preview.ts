import { createOffscreenCanvas } from "./canvas-utils";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { gpuRenderer } from "./gpu-renderer";

const PREVIEW_SIZE = 160;
const PREVIEW_IMAGE_PATH = "/effects/preview.jpg";

/**
 * Procedurally-generated test sources used as input for the effect
 * preview. Each pattern exercises a different aspect of the GPU
 * pipeline so a quick scan of the Effects panel actually shows the
 * effect doing something — not the same flat gradient 180 times.
 *
 * The selection is deterministic per-effect-type via a small djb2
 * hash, so a re-render picks the same pattern (no flicker) and the
 * card always looks the same when re-scrolled into view.
 */
type SourcePattern =
	| "gradient" // warm 4-stop diagonal gradient + circle + bar
	| "checkerboard" // 4×4 contrast checkerboard (great for blur / invert)
	| "colorbars" // CMY+white vertical color bars (great for color grading)
	| "radial" // off-centre radial gradient (great for vignette / glow)
	| "stripes" // diagonal stripes (great for stylize / glitch)
	| "portrait" // stylised head silhouette + bar (great for warp / liquify)
	| "noise"; // flat field of high-contrast dots (great for noise / grain)

const SOURCE_PATTERNS: SourcePattern[] = [
	"gradient",
	"checkerboard",
	"colorbars",
	"radial",
	"stripes",
	"portrait",
	"noise",
];

function pickPatternForEffect(effectType: string): SourcePattern {
	// djb2 hash — same algorithm the panel cards use elsewhere, so
	// the card preview matches any other "what pattern does this ID
	// hash to" decision in the codebase.
	let hash = 5381;
	for (let i = 0; i < effectType.length; i++) {
		hash = ((hash << 5) + hash) ^ effectType.charCodeAt(i);
	}
	const index = Math.abs(hash) % SOURCE_PATTERNS.length;
	return SOURCE_PATTERNS[index] ?? "gradient";
}

class EffectPreviewService {
	private testSourceCanvases = new Map<
		SourcePattern,
		OffscreenCanvas | HTMLCanvasElement
	>();
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

		const source = this.getTestSourceForEffect({
			effectType,
			width: size,
			height: size,
		});
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
			this.testSourceCanvases.clear();
			this.notifyReadyCallbacks();
		};
		image.onerror = () => {
			this.hasPreviewImageFailed = true;
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

	private getTestSourceForEffect({
		effectType,
		width,
		height,
	}: {
		effectType: string;
		width: number;
		height: number;
	}): CanvasImageSource | null {
		const pattern = pickPatternForEffect(effectType);
		const cached = this.testSourceCanvases.get(pattern);
		if (cached && cached.width === width && cached.height === height) {
			return cached;
		}

		const canvas = this.createTestSource({
			pattern,
			width,
			height,
		});
		if (canvas) {
			this.testSourceCanvases.set(pattern, canvas);
		}
		return canvas;
	}

	private createTestSource({
		pattern,
		width,
		height,
	}: {
		pattern: SourcePattern;
		width: number;
		height: number;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const canvas = createOffscreenCanvas({ width, height });
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) return null;

		// Some patterns benefit from the real preview.jpg if it's
		// loaded (warmer base for the gradient pattern), but every
		// pattern renders fully procedurally so the panel still looks
		// good with no image at all.
		const useImageForBase =
			pattern === "gradient" &&
			!this.hasPreviewImageFailed &&
			this.previewImageElement?.complete &&
			(this.previewImageElement.naturalWidth ?? 0) > 0;

		if (useImageForBase && this.previewImageElement) {
			ctx.drawImage(this.previewImageElement, 0, 0, width, height);
		}

		switch (pattern) {
			case "gradient":
				if (!useImageForBase) this.drawGradientSource({ ctx, width, height });
				break;
			case "checkerboard":
				this.drawCheckerboardSource({ ctx, width, height });
				break;
			case "colorbars":
				this.drawColorbarsSource({ ctx, width, height });
				break;
			case "radial":
				this.drawRadialSource({ ctx, width, height });
				break;
			case "stripes":
				this.drawStripesSource({ ctx, width, height });
				break;
			case "portrait":
				this.drawPortraitSource({ ctx, width, height });
				break;
			case "noise":
				this.drawNoiseSource({ ctx, width, height });
				break;
		}

		return canvas;
	}

	/**
	 * Warm diagonal gradient + a soft "sun" disc + a low bar — the
	 * classic hero-image background. Used as the default when nothing
	 * else fits, and as the base layer when the photo loads.
	 */
	private drawGradientSource({
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

	/**
	 * High-contrast checkerboard — shows up beautifully under blur,
	 * invert, pixelate, threshold, posterize.
	 */
	private drawCheckerboardSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		const cell = Math.max(8, Math.floor(width / 8));
		for (let y = 0; y < height; y += cell) {
			for (let x = 0; x < width; x += cell) {
				const dark = (x / cell + y / cell) % 2 === 0;
				ctx.fillStyle = dark ? "#0f172a" : "#f8fafc";
				ctx.fillRect(x, y, cell, cell);
			}
		}
		// bright accent line so motion-blur / chromatic-aberration have
		// something coloured to spread
		ctx.fillStyle = "#ef4444";
		ctx.fillRect(width * 0.18, height * 0.46, width * 0.64, 4);
		ctx.fillStyle = "#22d3ee";
		ctx.fillRect(width * 0.18, height * 0.5, width * 0.64, 4);
	}

	/**
	 * SMPTE-style colour bars. The single best source for HSL / hue /
	 * saturation / invert / grayscale — the user can see the colour
	 * shift immediately.
	 */
	private drawColorbarsSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		const bars = [
			"#c0c0c0",
			"#c0c000",
			"#00c0c0",
			"#00c000",
			"#c000c0",
			"#c00000",
			"#0000c0",
		];
		const barWidth = width / bars.length;
		const barHeight = height * 0.7;
		for (let i = 0; i < bars.length; i++) {
			ctx.fillStyle = bars[i] ?? "#000";
			ctx.fillRect(i * barWidth, 0, barWidth, barHeight);
		}
		// bottom strip — black/white/dark/light bars for invert/levels tests
		const subBars = ["#000", "#fff", "#0c0c0c", "#f3f3f3"];
		const subWidth = width / subBars.length;
		const subHeight = height * 0.18;
		for (let i = 0; i < subBars.length; i++) {
			ctx.fillStyle = subBars[i] ?? "#000";
			ctx.fillRect(i * subWidth, barHeight, subWidth, subHeight);
		}
		// a few coloured squares so duotone / colour-grade filters
		// have multiple distinct hues to map
		const swatches = ["#ec4899", "#f59e0b", "#10b981"];
		for (let i = 0; i < swatches.length; i++) {
			ctx.fillStyle = swatches[i] ?? "#000";
			ctx.fillRect(
				width * (0.15 + i * 0.28),
				height * 0.92,
				width * 0.14,
				height * 0.08,
			);
		}
	}

	/**
	 * Off-centre radial — best showcase for vignette, outer-glow,
	 * lens-flare, spotlight.
	 */
	private drawRadialSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		const cx = width * 0.3;
		const cy = height * 0.35;
		const radius = Math.max(width, height) * 0.85;
		const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
		gradient.addColorStop(0, "#fde68a");
		gradient.addColorStop(0.3, "#f97316");
		gradient.addColorStop(0.65, "#7c2d12");
		gradient.addColorStop(1, "#0c0a09");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// bright star in the centre for lens flare
		ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
		ctx.beginPath();
		ctx.arc(cx, cy, Math.min(width, height) * 0.06, 0, Math.PI * 2);
		ctx.fill();

		// diagonal streaks for anamorphic-style effects
		ctx.strokeStyle = "rgba(255, 200, 100, 0.45)";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(width * 0.05, height * 0.6);
		ctx.lineTo(width * 0.95, height * 0.4);
		ctx.stroke();
	}

	/**
	 * Diagonal stripes — best showcase for stylize / glitch /
	 * scanlines / pixelate.
	 */
	private drawStripesSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		ctx.fillStyle = "#1e293b";
		ctx.fillRect(0, 0, width, height);

		const stripeWidth = Math.max(6, Math.floor(width / 16));
		ctx.save();
		ctx.translate(width / 2, height / 2);
		ctx.rotate(Math.PI / 6);
		ctx.translate(-width, -height / 2);
		for (let x = 0; x < width * 2; x += stripeWidth * 2) {
			ctx.fillStyle = x % (stripeWidth * 4) === 0 ? "#22d3ee" : "#f472b6";
			ctx.fillRect(x, 0, stripeWidth, height * 2);
		}
		ctx.restore();

		// dark scanline overlay so glitch / scanline effects show
		ctx.fillStyle = "rgba(0,0,0,0.45)";
		for (let y = 0; y < height; y += 3) {
			ctx.fillRect(0, y, width, 1);
		}
	}

	/**
	 * Stylised head silhouette + bar — the classic "warp/liquify"
	 * demo. Effects that push pixels around (swirl, bulge, ripple)
	 * look striking against the smooth face outline.
	 */
	private drawPortraitSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		ctx.fillStyle = "#fef3c7";
		ctx.fillRect(0, 0, width, height);

		// shoulders / body
		ctx.fillStyle = "#1e3a8a";
		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.lineTo(0, height * 0.78);
		ctx.quadraticCurveTo(width * 0.5, height * 0.5, width, height * 0.78);
		ctx.lineTo(width, height);
		ctx.closePath();
		ctx.fill();

		// head
		ctx.fillStyle = "#fde68a";
		ctx.beginPath();
		ctx.ellipse(
			width / 2,
			height * 0.4,
			width * 0.22,
			height * 0.27,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.strokeStyle = "#92400e";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// eyes
		ctx.fillStyle = "#451a03";
		ctx.beginPath();
		ctx.arc(width * 0.42, height * 0.4, 3, 0, Math.PI * 2);
		ctx.arc(width * 0.58, height * 0.4, 3, 0, Math.PI * 2);
		ctx.fill();

		// mouth
		ctx.beginPath();
		ctx.arc(width / 2, height * 0.48, width * 0.06, 0, Math.PI);
		ctx.stroke();
	}

	/**
	 * High-contrast noise field — best showcase for grain / noise /
	 * halftone / threshold.
	 */
	private drawNoiseSource({
		ctx,
		width,
		height,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
	}): void {
		const imageData = ctx.createImageData(width, height);
		const data = imageData.data;
		// simple LCG so the noise is deterministic per call
		let seed = 1337;
		const next = () => {
			seed = (seed * 1664525 + 1013904223) >>> 0;
			return seed / 0xffffffff;
		};
		// mid-grey base with high-contrast speckle so grain filters
		// have something to bite into
		for (let i = 0; i < data.length; i += 4) {
			const v = Math.floor(96 + next() * 160);
			data[i] = v;
			data[i + 1] = v;
			data[i + 2] = v;
			data[i + 3] = 255;
		}
		ctx.putImageData(imageData, 0, 0);

		// a few coloured speckles so chromatic effects have something
		// to shift
		for (let i = 0; i < 80; i++) {
			const x = Math.floor(next() * width);
			const y = Math.floor(next() * height);
			ctx.fillStyle =
				next() > 0.5 ? "rgba(239, 68, 68, 0.7)" : "rgba(34, 211, 238, 0.7)";
			ctx.fillRect(x, y, 2, 2);
		}
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
