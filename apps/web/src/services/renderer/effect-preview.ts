import { createOffscreenCanvas } from "./canvas-utils";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { gpuRenderer } from "./gpu-renderer";

const PREVIEW_SIZE = 160;
const PREVIEW_IMAGE_PATH = "/effects/preview.jpg";

/**
 * Hard cap on concurrent GPU renders. 4 keeps the GPU command
 * queue full without starving the rest of the editor — the
 * preview canvas, timeline, and audio engine all need the GPU
 * during playback. Visible cards paint within the first 50-100
 * ms; the rest trickle in via the queue's idle pump.
 */
const MAX_CONCURRENT_RENDERS = 4;

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
	| "noise" // flat field of high-contrast dots (great for noise / grain)
	| "scene" // image-like procedural scene (great for realistic effects)
	| "grid" // perspective grid (great for distortion / 3D)
	| "waves" // flowing colour waves (great for blur / motion)
	| "halftone" // comic dots (great for stylize / threshold)
	| "tiles"; // geometric mosaic (great for pixelate / kaleidoscope)

const SOURCE_PATTERNS: SourcePattern[] = [
	"gradient",
	"checkerboard",
	"colorbars",
	"radial",
	"stripes",
	"portrait",
	"noise",
	"scene",
	"grid",
	"waves",
	"halftone",
	"tiles",
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
		string,
		OffscreenCanvas | HTMLCanvasElement
	>();
	private previewImageElement: HTMLImageElement | null = null;
	private hasPreviewImageFailed = false;
	private onReadyCallbacks = new Set<() => void>();
	/**
	 * Pending GPU render jobs. The GPU pipeline is single-threaded
	 * (WebGPU command queue), so calling `applyEffect` 165 times in
	 * rapid succession — which is what happens when the user opens
	 * the Effects tab — simply queues 165 jobs that all fight for
	 * the same lock. That queue then starves the rest of the editor
	 * (timeline, preview, audio) and the visible cards all
	 * flicker their silhouette logo for several hundred ms before
	 * any of them paints.
	 *
	 * The scheduler below caps concurrent GPU work to
	 * `MAX_CONCURRENT_RENDERS` (4) and processes the rest in
	 * `requestIdleCallback` chunks so the visible cards paint
	 * first and the rest trickle in as the browser goes idle.
	 */
	private renderQueue: Array<{
		id: number;
		run: () => void;
		priority: number;
	}> = [];
	private inFlight = 0;
	private nextRenderId = 0;
	private idleDrainHandle: number | null = null;

	readonly PREVIEW_SIZE = PREVIEW_SIZE;

	constructor() {
		this.loadPreviewImage();
	}

	onPreviewImageReady({ callback }: { callback: () => void }): () => void {
		this.onReadyCallbacks.add(callback);
		return () => this.onReadyCallbacks.delete(callback);
	}

	/**
	 * Schedule a GPU render at the given priority. The default
	 * priority is 0 (visible card). Negative numbers run sooner
	 * (used for the first batch of cards the user sees when a tab
	 * opens). Positive numbers defer until the browser is idle.
	 *
	 * Returns a cancel function. If the card scrolls out of view
	 * before its turn comes up, the caller should invoke it to
	 * remove the job from the queue — otherwise we'll waste GPU
	 * time on a card the user can't see.
	 */
	scheduleRender({
		run,
		priority = 0,
	}: {
		run: () => void;
		priority?: number;
	}): () => void {
		const job = { id: ++this.nextRenderId, run, priority };
		this.renderQueue.push(job);
		// Re-sort so the lowest priority (most negative) jobs run
		// first. Insertion sort is O(n) and n is small (≤ a few
		// hundred in pathological cases) so this is fine.
		this.renderQueue.sort((a, b) => a.priority - b.priority);
		this.pumpQueue();
		return () => {
			const index = this.renderQueue.findIndex((j) => j.id === job.id);
			if (index !== -1) this.renderQueue.splice(index, 1);
		};
	}

	private pumpQueue(): void {
		// Drain the visible / already-visible (priority ≤ 0) jobs
		// immediately. Anything priority > 0 is deferred to the next
		// idle slot via requestIdleCallback so the off-screen cards
		// only paint when the browser has nothing better to do.
		while (
			this.inFlight < MAX_CONCURRENT_RENDERS &&
			this.renderQueue.length > 0 &&
			(this.renderQueue[0]?.priority ?? 0) <= 0
		) {
			const job = this.renderQueue.shift();
			if (!job) break;
			this.runJob(job);
		}
		if (this.renderQueue.some((j) => j.priority > 0)) {
			this.scheduleIdleDrain();
		}
	}

	private scheduleIdleDrain(): void {
		if (this.idleDrainHandle !== null) return;
		// Browser idle callback when available (Chrome / Edge / Safari
		// 16.5+ / Firefox 55+); fall back to a 16 ms setTimeout on
		// older browsers. The handle type is `number` in both cases
		// at runtime, but TypeScript widens `setTimeout` to
		// `Timeout`, so we cast to `number`.
		const handle: number =
			typeof window !== "undefined" && "requestIdleCallback" in window
				? (
						window as unknown as {
							requestIdleCallback: (cb: () => void) => number;
						}
					).requestIdleCallback(() => {
						this.idleDrainHandle = null;
						this.pumpQueue();
					})
				: (setTimeout(() => {
						this.idleDrainHandle = null;
						this.pumpQueue();
					}, 16) as unknown as number);
		this.idleDrainHandle = handle;
	}

	private runJob(job: { run: () => void }): void {
		this.inFlight++;
		// Defer to a microtask so React can finish its commit pass
		// before we start hammering the GPU — gives the browser a
		// chance to paint the skeleton/placeholder for any
		// still-unrendered cards.
		queueMicrotask(() => {
			try {
				job.run();
			} finally {
				this.inFlight--;
				this.pumpQueue();
			}
		});
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
			console.warn("Failed to render effect preview:", effectType, error);
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
			console.warn("Failed to draw effect preview:", effectType, error);
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
		// Cache key includes the effect type so patterns that vary their
		// colours per effect always produce the same source for the same
		// effect across re-renders.
		const cacheKey = `${pattern}:${effectType}`;
		const cached = this.testSourceCanvases.get(cacheKey);
		if (cached && cached.width === width && cached.height === height) {
			return cached;
		}

		const canvas = this.createTestSource({
			pattern,
			width,
			height,
			effectType,
		});
		if (canvas) {
			this.testSourceCanvases.set(cacheKey, canvas);
		}
		return canvas;
	}

	private createTestSource({
		pattern,
		width,
		height,
		effectType,
	}: {
		pattern: SourcePattern;
		width: number;
		height: number;
		effectType: string;
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
				if (!useImageForBase)
					this.drawGradientSource({ ctx, width, height, effectType });
				break;
			case "checkerboard":
				this.drawCheckerboardSource({ ctx, width, height, effectType });
				break;
			case "colorbars":
				this.drawColorbarsSource({ ctx, width, height, effectType });
				break;
			case "radial":
				this.drawRadialSource({ ctx, width, height, effectType });
				break;
			case "stripes":
				this.drawStripesSource({ ctx, width, height, effectType });
				break;
			case "portrait":
				this.drawPortraitSource({ ctx, width, height, effectType });
				break;
			case "noise":
				this.drawNoiseSource({ ctx, width, height, effectType });
				break;
			case "scene":
				this.drawSceneSource({ ctx, width, height, effectType });
				break;
			case "grid":
				this.drawGridSource({ ctx, width, height, effectType });
				break;
			case "waves":
				this.drawWavesSource({ ctx, width, height, effectType });
				break;
			case "halftone":
				this.drawHalftoneSource({ ctx, width, height, effectType });
				break;
			case "tiles":
				this.drawTilesSource({ ctx, width, height, effectType });
				break;
		}

		return canvas;
	}

	/**
	 * Gradient source with 6 colour palettes so effect previews that hash
	 * to the "gradient" pattern don't all look the same. The palette is
	 * picked from the effect type hash (second hash byte) so it's
	 * deterministic per-effect and stable across re-renders.
	 */
	private static readonly GRADIENT_PALETTES: ReadonlyArray<{
		stops: [string, string, string, string];
		sun: string;
		bar: string;
	}> = [
		{
			// Warm sunset
			stops: ["#f97316", "#ec4899", "#6366f1", "#06b6d4"],
			sun: "rgba(255,255,255,0.72)",
			bar: "rgba(15,23,42,0.68)",
		},
		{
			// Cool ocean
			stops: ["#0ea5e9", "#06b6d4", "#0891b2", "#164e63"],
			sun: "rgba(224,242,254,0.7)",
			bar: "rgba(8,47,73,0.7)",
		},
		{
			// Forest
			stops: ["#84cc16", "#22c55e", "#15803d", "#14532d"],
			sun: "rgba(236,253,200,0.6)",
			bar: "rgba(20,83,45,0.7)",
		},
		{
			// Plum/magenta
			stops: ["#a855f7", "#ec4899", "#be185d", "#831843"],
			sun: "rgba(250,232,255,0.65)",
			bar: "rgba(131,24,67,0.7)",
		},
		{
			// Amber/honey
			stops: ["#fbbf24", "#f59e0b", "#d97706", "#78350f"],
			sun: "rgba(254,243,199,0.7)",
			bar: "rgba(120,53,15,0.7)",
		},
		{
			// Slate/steel
			stops: ["#94a3b8", "#64748b", "#475569", "#1e293b"],
			sun: "rgba(248,250,252,0.6)",
			bar: "rgba(15,23,42,0.7)",
		},
	];

	/**
	 * Deterministic colour set derived from the effect type. Used by the
	 * non-gradient patterns so checkerboards, stripes, radial glows, etc.
	 * don't all share the same fixed hues.
	 */
	private getEffectColors(effectType: string): {
		bg: string;
		primary: string;
		secondary: string;
		accent: string;
		light: string;
	} {
		const palettes: {
			bg: string;
			primary: string;
			secondary: string;
			accent: string;
			light: string;
		}[] = [
			{
				bg: "#0f172a",
				primary: "#f97316",
				secondary: "#ec4899",
				accent: "#fbbf24",
				light: "#fff7ed",
			},
			{
				bg: "#082f49",
				primary: "#0ea5e9",
				secondary: "#06b6d4",
				accent: "#38bdf8",
				light: "#f0f9ff",
			},
			{
				bg: "#052e16",
				primary: "#22c55e",
				secondary: "#84cc16",
				accent: "#4ade80",
				light: "#f0fdf4",
			},
			{
				bg: "#3b0764",
				primary: "#a855f7",
				secondary: "#ec4899",
				accent: "#e879f9",
				light: "#faf5ff",
			},
			{
				bg: "#451a03",
				primary: "#d97706",
				secondary: "#f59e0b",
				accent: "#fbbf24",
				light: "#fffbeb",
			},
			{
				bg: "#1e1b4b",
				primary: "#6366f1",
				secondary: "#a855f7",
				accent: "#c084fc",
				light: "#eef2ff",
			},
			{
				bg: "#4c0519",
				primary: "#e11d48",
				secondary: "#fb7185",
				accent: "#fecdd3",
				light: "#fff1f2",
			},
			{
				bg: "#111827",
				primary: "#22d3ee",
				secondary: "#f472b6",
				accent: "#facc15",
				light: "#f8fafc",
			},
		];
		let hash = 5381;
		for (let i = 0; i < effectType.length; i++) {
			hash = ((hash << 5) + hash) ^ effectType.charCodeAt(i);
		}
		return palettes[Math.abs(hash) % palettes.length] ?? palettes[0];
	}

	private drawGradientSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		// Second hash byte picks the palette so even effects that hash to
		// the same pattern get different colours.
		let hash = 5381;
		for (let i = 0; i < effectType.length; i++) {
			hash = ((hash << 5) + hash) ^ effectType.charCodeAt(i);
		}
		const palette =
			EffectPreviewService.GRADIENT_PALETTES[
				Math.abs(hash >> 8) % EffectPreviewService.GRADIENT_PALETTES.length
			] ?? EffectPreviewService.GRADIENT_PALETTES[0];

		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, palette.stops[0]);
		gradient.addColorStop(0.35, palette.stops[1]);
		gradient.addColorStop(0.7, palette.stops[2]);
		gradient.addColorStop(1, palette.stops[3]);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = palette.sun;
		ctx.beginPath();
		ctx.arc(width * 0.5, height * 0.38, width * 0.18, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = palette.bar;
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const cell = Math.max(8, Math.floor(width / 8));
		for (let y = 0; y < height; y += cell) {
			for (let x = 0; x < width; x += cell) {
				const dark = (x / cell + y / cell) % 2 === 0;
				ctx.fillStyle = dark ? colors.bg : colors.light;
				ctx.fillRect(x, y, cell, cell);
			}
		}
		// bright accent line so motion-blur / chromatic-aberration have
		// something coloured to spread
		ctx.fillStyle = colors.primary;
		ctx.fillRect(width * 0.18, height * 0.46, width * 0.64, 4);
		ctx.fillStyle = colors.secondary;
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const bars = [
			colors.light,
			colors.accent,
			colors.secondary,
			colors.primary,
			"#c0c0c0",
			colors.bg,
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const cx = width * 0.3;
		const cy = height * 0.35;
		const radius = Math.max(width, height) * 0.85;
		const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
		gradient.addColorStop(0, colors.light);
		gradient.addColorStop(0.3, colors.accent);
		gradient.addColorStop(0.65, colors.primary);
		gradient.addColorStop(1, colors.bg);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// bright star in the centre for lens flare
		ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
		ctx.beginPath();
		ctx.arc(cx, cy, Math.min(width, height) * 0.06, 0, Math.PI * 2);
		ctx.fill();

		// diagonal streaks for anamorphic-style effects
		ctx.strokeStyle = `${colors.secondary}73`;
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		ctx.fillStyle = colors.bg;
		ctx.fillRect(0, 0, width, height);

		const stripeWidth = Math.max(6, Math.floor(width / 16));
		ctx.save();
		ctx.translate(width / 2, height / 2);
		ctx.rotate(Math.PI / 6);
		ctx.translate(-width, -height / 2);
		for (let x = 0; x < width * 2; x += stripeWidth * 2) {
			ctx.fillStyle =
				x % (stripeWidth * 4) === 0 ? colors.primary : colors.secondary;
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		ctx.fillStyle = colors.light;
		ctx.fillRect(0, 0, width, height);

		// shoulders / body
		ctx.fillStyle = colors.bg;
		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.lineTo(0, height * 0.78);
		ctx.quadraticCurveTo(width * 0.5, height * 0.5, width, height * 0.78);
		ctx.lineTo(width, height);
		ctx.closePath();
		ctx.fill();

		// head
		ctx.fillStyle = colors.accent;
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
		ctx.strokeStyle = colors.primary;
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// eyes
		ctx.fillStyle = colors.primary;
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
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
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
				next() > 0.5 ? `${colors.primary}B3` : `${colors.secondary}B3`;
			ctx.fillRect(x, y, 2, 2);
		}
	}

	/**
	 * Procedural scene image drawn directly to canvas. Looks like a tiny
	 * photo (landscape / city / ocean) so effects that target realistic
	 * footage show a meaningful preview.
	 */
	private drawSceneSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const sky = ctx.createLinearGradient(0, 0, 0, height);
		sky.addColorStop(0, colors.bg);
		sky.addColorStop(0.6, colors.secondary);
		sky.addColorStop(1, colors.primary);
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, width, height);

		// sun / moon
		ctx.fillStyle = colors.light;
		ctx.beginPath();
		ctx.arc(width * 0.75, height * 0.22, width * 0.12, 0, Math.PI * 2);
		ctx.fill();

		// mountains / ground
		ctx.fillStyle = colors.bg;
		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.lineTo(0, height * 0.62);
		ctx.quadraticCurveTo(
			width * 0.35,
			height * 0.45,
			width * 0.6,
			height * 0.58,
		);
		ctx.lineTo(width, height * 0.52);
		ctx.lineTo(width, height);
		ctx.closePath();
		ctx.fill();

		// water / foreground
		ctx.fillStyle = colors.primary;
		ctx.globalAlpha = 0.4;
		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.lineTo(0, height * 0.78);
		ctx.quadraticCurveTo(width * 0.45, height * 0.68, width, height * 0.8);
		ctx.lineTo(width, height);
		ctx.closePath();
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	/**
	 * Perspective grid — great for distortion, 3D, perspective effects.
	 */
	private drawGridSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		ctx.fillStyle = colors.bg;
		ctx.fillRect(0, 0, width, height);

		ctx.strokeStyle = colors.accent;
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;
		for (let i = 0; i <= 8; i++) {
			const x = (i / 8) * width;
			ctx.beginPath();
			ctx.moveTo(x + width * 0.1 * (i - 4), -height * 0.2);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		for (let i = 0; i <= 6; i++) {
			const y = (i / 6) * height;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	/**
	 * Flowing colour waves — great for blur, motion, ripple effects.
	 */
	private drawWavesSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, colors.bg);
		gradient.addColorStop(0.5, colors.secondary);
		gradient.addColorStop(1, colors.primary);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		ctx.strokeStyle = colors.light;
		ctx.lineWidth = 2;
		for (let i = 0; i < 5; i++) {
			ctx.beginPath();
			const y = height * 0.2 + i * height * 0.15;
			ctx.moveTo(0, y);
			for (let x = 0; x <= width; x += 8) {
				ctx.lineTo(x, y + Math.sin((x / width) * Math.PI * 4 + i) * 10);
			}
			ctx.stroke();
		}
	}

	/**
	 * Halftone comic dots — great for stylize, threshold, posterize.
	 */
	private drawHalftoneSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		ctx.fillStyle = colors.light;
		ctx.fillRect(0, 0, width, height);

		ctx.fillStyle = colors.primary;
		const spacing = 14;
		for (let y = spacing / 2; y < height; y += spacing) {
			for (let x = spacing / 2; x < width; x += spacing) {
				const dx = x - width / 2;
				const dy = y - height / 2;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const r = Math.max(
					2,
					(1 - dist / Math.max(width, height)) * spacing * 0.5,
				);
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	/**
	 * Geometric mosaic tiles — great for pixelate, kaleidoscope, mirror.
	 */
	private drawTilesSource({
		ctx,
		width,
		height,
		effectType,
	}: {
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		width: number;
		height: number;
		effectType: string;
	}): void {
		const colors = this.getEffectColors(effectType);
		const tile = Math.floor(width / 5);
		let hash = 0;
		for (let i = 0; i < effectType.length; i++) {
			hash = (hash << 5) - hash + effectType.charCodeAt(i);
			hash |= 0;
		}
		const palette = [
			colors.bg,
			colors.primary,
			colors.secondary,
			colors.accent,
			colors.light,
		];
		for (let y = 0; y < height; y += tile) {
			for (let x = 0; x < width; x += tile) {
				const idx = Math.abs(hash + x + y * 7) % palette.length;
				ctx.fillStyle = palette[idx] ?? colors.bg;
				ctx.fillRect(x, y, tile, tile);
				ctx.strokeStyle = colors.light;
				ctx.lineWidth = 1;
				ctx.strokeRect(x, y, tile, tile);
			}
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
