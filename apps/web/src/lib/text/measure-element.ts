import { CORNER_RADIUS_MIN } from "@/lib/text/background";
import { FONT_SIZE_SCALE_REFERENCE } from "@/lib/text/typography";
import { resolveNumberAtTime } from "@/lib/animation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type { TextBackground, TextElement } from "@/lib/timeline";
import {
	measureTextBlock,
	setCanvasLetterSpacing,
	getTextVisualRect,
	type TextBlockMeasurement,
} from "./layout";

export interface ResolvedTextBackground extends TextBackground {
	paddingX: number;
	paddingY: number;
	offsetX: number;
	offsetY: number;
	cornerRadius: number;
}

export interface MeasuredTextElement {
	scaledFontSize: number;
	fontString: string;
	letterSpacing: number;
	lineHeightPx: number;
	lines: string[];
	lineMetrics: TextMetrics[];
	block: TextBlockMeasurement;
	fontSizeRatio: number;
	resolvedBackground: ResolvedTextBackground;
	visualRect: { left: number; top: number; width: number; height: number };
}

let textMeasurementContext:
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D
	| null = null;

export function getTextMeasurementContext():
	| CanvasRenderingContext2D
	| OffscreenCanvasRenderingContext2D {
	if (textMeasurementContext) {
		return textMeasurementContext;
	}

	if (typeof OffscreenCanvas !== "undefined") {
		const canvas = new OffscreenCanvas(1, 1);
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	if (typeof document !== "undefined") {
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (context) {
			textMeasurementContext = context;
			return context;
		}
	}

	throw new Error("Failed to create text measurement context");
}

// ── Font-shaping memo ────────────────────────────────────────────────
// `ctx.measureText` runs font shaping, which is the most expensive call in
// text resolution and used to run once per line, per text node, per frame (60x
// /second per layer) even when nothing about the text had changed. Only the
// shaped metrics are memoised — the time-dependent background/visualRect work
// below is cheap and still runs every call, so the returned object is exactly
// as fresh as before.
//
// Bounded LRU: keys embed the full text content, so an unbounded Map would grow
// with every keystroke/undo step. 256 entries holds a typical editing session's
// distinct (text, font, size) triples; a miss only costs one re-measure.
const MEASUREMENT_CACHE_MAX = 256;
type ShapedMeasurement = {
	lineMetrics: TextMetrics[];
	block: TextBlockMeasurement;
};
const measurementCache = new Map<string, ShapedMeasurement>();

/**
 * Incremented whenever a font finishes loading. `measureText` falls back to a
 * default font until the real face is ready, so without this a measurement taken
 * before `document.fonts.load()` resolved would be cached (and kept) with
 * fallback metrics, leaving text laid out against the wrong font. Webfonts and
 * user-imported FontFaces both land via this event.
 */
let fontEpoch = 0;

function watchFontLoading(): void {
	if (typeof document === "undefined") {
		return;
	}
	const fontSet = document.fonts;
	if (!fontSet || typeof fontSet.addEventListener !== "function") {
		return;
	}
	fontSet.addEventListener("loadingdone", () => {
		fontEpoch += 1;
	});
}

watchFontLoading();

/** Distinguishes measurement contexts: a different context may shape differently. */
const contextIds = new WeakMap<object, number>();
let nextContextId = 1;

function contextId(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
): number {
	const existing = contextIds.get(ctx);
	if (existing !== undefined) {
		return existing;
	}
	const id = nextContextId++;
	contextIds.set(ctx, id);
	return id;
}

function measureShapedText({
	ctx,
	fontString,
	letterSpacing,
	lines,
	lineHeightPx,
}: {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	fontString: string;
	letterSpacing: number;
	lines: string[];
	lineHeightPx: number;
}): ShapedMeasurement {
	// `canvasHeight` is already folded into `fontString` (it scales the font
	// size), and `content` fully determines `lines`; the epoch guards a font
	// that finished loading after an earlier measurement.
	const key = `${fontEpoch}:${contextId(ctx)}|${fontString}|${letterSpacing}|${lineHeightPx}|${lines.join("\n")}`;
	const cached = measurementCache.get(key);
	if (cached) {
		// Touch for LRU recency.
		measurementCache.delete(key);
		measurementCache.set(key, cached);
		return cached;
	}

	ctx.save();
	ctx.font = fontString;
	ctx.textBaseline = "middle";
	setCanvasLetterSpacing({ ctx, letterSpacingPx: letterSpacing });
	const lineMetrics = lines.map((line) => ctx.measureText(line));
	ctx.restore();

	const shaped: ShapedMeasurement = {
		lineMetrics,
		block: measureTextBlock({
			lineMetrics,
			lineHeightPx,
		}),
	};

	measurementCache.set(key, shaped);
	if (measurementCache.size > MEASUREMENT_CACHE_MAX) {
		// Evict the least recently used (first-inserted) entry.
		const oldest = measurementCache.keys().next().value;
		if (oldest !== undefined) measurementCache.delete(oldest);
	}
	return shaped;
}

export function measureTextElement({
	element,
	canvasHeight,
	localTime,
	ctx,
}: {
	element: TextElement;
	canvasHeight: number;
	localTime: number;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): MeasuredTextElement {
	const scaledFontSize =
		element.fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
	const fontWeight = element.fontWeight === "bold" ? "bold" : "normal";
	const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
	const fontFamily = `"${element.fontFamily.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	const fontString = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}, sans-serif`;
	const letterSpacing = element.letterSpacing ?? 0;
	const lineHeightPx =
		scaledFontSize * (element.lineHeight ?? DEFAULTS.text.lineHeight);
	const fontSizeRatio = element.fontSize / DEFAULTS.text.element.fontSize;
	const lines = element.content.split("\n");

	const { lineMetrics, block } = measureShapedText({
		ctx,
		fontString,
		letterSpacing,
		lines,
		lineHeightPx,
	});

	const bg = element.background;
	const resolvedBackground: ResolvedTextBackground = {
		...bg,
		paddingX: resolveNumberAtTime({
			baseValue: bg.paddingX ?? DEFAULTS.text.background.paddingX,
			animations: element.animations,
			propertyPath: "background.paddingX",
			localTime,
		}),
		paddingY: resolveNumberAtTime({
			baseValue: bg.paddingY ?? DEFAULTS.text.background.paddingY,
			animations: element.animations,
			propertyPath: "background.paddingY",
			localTime,
		}),
		offsetX: resolveNumberAtTime({
			baseValue: bg.offsetX ?? DEFAULTS.text.background.offsetX,
			animations: element.animations,
			propertyPath: "background.offsetX",
			localTime,
		}),
		offsetY: resolveNumberAtTime({
			baseValue: bg.offsetY ?? DEFAULTS.text.background.offsetY,
			animations: element.animations,
			propertyPath: "background.offsetY",
			localTime,
		}),
		cornerRadius: resolveNumberAtTime({
			baseValue: bg.cornerRadius ?? CORNER_RADIUS_MIN,
			animations: element.animations,
			propertyPath: "background.cornerRadius",
			localTime,
		}),
	};

	const visualRect = getTextVisualRect({
		textAlign: element.textAlign,
		block,
		background: resolvedBackground,
		fontSizeRatio,
	});

	return {
		scaledFontSize,
		fontString,
		letterSpacing,
		lineHeightPx,
		lines,
		lineMetrics,
		block,
		fontSizeRatio,
		resolvedBackground,
		visualRect,
	};
}
