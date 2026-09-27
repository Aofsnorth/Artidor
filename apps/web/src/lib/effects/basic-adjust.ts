/**
 * CapCut-style "basic adjust" controls for the inspector.
 *
 * Every control maps one slider onto one ALREADY-REGISTERED primitive effect
 * (brightness, contrast, temperature, …). Two rules make this correct:
 *
 * 1. The slider range is mapped onto the effect's own declared param range
 *    instead of assuming a neutral of 1.0. The primitives disagree about their
 *    neutral — `contrast`/`brightness`/`saturation` are centred at 100, the
 *    rest at 0 — so a hardcoded `1 + value * scale` wrote a non-neutral amount
 *    for every control.
 * 2. A control at its neutral position is REMOVED from the element rather than
 *    stored as a no-op effect, so an untouched element resolves to zero effect
 *    passes and costs nothing to render.
 */

import { effectsRegistry } from "@/lib/effects/registry";
import type { ParamDefinition } from "@/lib/params";

export type BasicAdjustGroup = "Light" | "Color" | "Detail" | "Creative";

export interface BasicAdjustControl {
	label: string;
	effectType: string;
	/** Slider range shown in the inspector. */
	sliderMin: number;
	sliderMax: number;
	/** CapCut-style section the control is listed under. */
	group: BasicAdjustGroup;
}

/**
 * The full CapCut Image > Adjust roster, one slider per registered primitive
 * effect. Every control CapCut's Adjust panel exposes is here and wired to a
 * real GPU effect:
 *
 * - Light: Brightness, Exposure, Contrast, Highlights, Shadows, Whites, Blacks
 * - Color: Temperature, Tint (green/magenta), Hue, Saturation, Vibrance
 * - Detail: Sharpness, Clarity, Dehaze
 * - Creative: Fade, Vignette, Grain
 */
export const BASIC_ADJUST_CONTROLS: readonly BasicAdjustControl[] = [
	// Light
	{
		label: "Brightness",
		effectType: "brightness",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Exposure",
		effectType: "exposure",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Contrast",
		effectType: "contrast",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Highlights",
		effectType: "highlights",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Shadows",
		effectType: "shadows",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Whites",
		effectType: "whites",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	{
		label: "Blacks",
		effectType: "blacks",
		sliderMin: -100,
		sliderMax: 100,
		group: "Light",
	},
	// Color
	{
		label: "Temperature",
		effectType: "temperature",
		sliderMin: -100,
		sliderMax: 100,
		group: "Color",
	},
	{
		label: "Tint",
		effectType: "tint-shift",
		sliderMin: -100,
		sliderMax: 100,
		group: "Color",
	},
	{
		label: "Hue",
		effectType: "hue-rotate",
		sliderMin: -100,
		sliderMax: 100,
		group: "Color",
	},
	{
		label: "Saturation",
		effectType: "saturation",
		sliderMin: -100,
		sliderMax: 100,
		group: "Color",
	},
	{
		label: "Vibrance",
		effectType: "vibrance",
		sliderMin: -100,
		sliderMax: 100,
		group: "Color",
	},
	// Detail
	{
		label: "Sharpness",
		effectType: "sharpen",
		sliderMin: 0,
		sliderMax: 100,
		group: "Detail",
	},
	{
		label: "Clarity",
		effectType: "clarity",
		sliderMin: -100,
		sliderMax: 100,
		group: "Detail",
	},
	{
		label: "Dehaze",
		effectType: "dehaze",
		sliderMin: 0,
		sliderMax: 100,
		group: "Detail",
	},
	// Creative
	{
		label: "Fade",
		effectType: "fade",
		sliderMin: 0,
		sliderMax: 100,
		group: "Creative",
	},
	{
		label: "Vignette",
		effectType: "vignette",
		sliderMin: 0,
		sliderMax: 100,
		group: "Creative",
	},
	{
		label: "Grain",
		effectType: "grain",
		sliderMin: 0,
		sliderMax: 100,
		group: "Creative",
	},
] as const;

/** Render order of the CapCut-style sections in the Adjust tab. */
export const BASIC_ADJUST_GROUP_ORDER: readonly BasicAdjustGroup[] = [
	"Light",
	"Color",
	"Detail",
	"Creative",
] as const;

function findAmountParam(effectType: string): ParamDefinition | undefined {
	// `registry.get` THROWS for an unknown key, so probe with `has` first: an
	// unregistered type (stale project data, a renamed effect) must degrade to
	// "no adjustment", never take the inspector down.
	if (!effectsRegistry.has(effectType)) return undefined;
	return effectsRegistry
		.get(effectType)
		.params.find((param) => param.key === "amount");
}

interface SliderToParam {
	from: number;
	span: number;
	paramMin: number;
	paramMax: number;
	paramDefault: number;
}

/**
 * Shared endpoints of the slider↔param mapping.
 *
 * - A param whose default sits in the MIDDLE of its range (e.g. contrast
 *   0..200 default 100) maps the whole slider range across the full range, so
 *   the slider's midpoint lands exactly on the neutral default.
 * - A one-sided param (default == min, e.g. dehaze 0..100) maps 0..sliderMax
 *   across the range, so the slider's own zero is the neutral default and
 *   negative positions simply clamp to neutral.
 */
function resolveSliderToParam({
	effectType,
	sliderMin,
	sliderMax,
}: {
	effectType: string;
	sliderMin: number;
	sliderMax: number;
}): SliderToParam | null {
	const param = findAmountParam(effectType);
	if (!param) return null;
	if (typeof param.default !== "number" || typeof param.min !== "number") {
		return null;
	}
	const paramMax = typeof param.max === "number" ? param.max : param.min;
	const isCentred = Math.abs(param.default - (param.min + paramMax) / 2) < 1e-9;
	const from = isCentred ? sliderMin : 0;
	const span = sliderMax - from;
	if (span <= 0) return null;
	return {
		from,
		span,
		paramMin: param.min,
		paramMax,
		paramDefault: param.default,
	};
}

/**
 * Map a slider position onto the effect's `amount` param, using the param's own
 * declared default/min/max.
 *
 * Returns `null` when the position is neutral, meaning "no effect needed".
 */
export function resolveBasicAdjustAmount({
	effectType,
	sliderValue,
	sliderMin,
	sliderMax,
}: {
	effectType: string;
	sliderValue: number;
	sliderMin: number;
	sliderMax: number;
}): number | null {
	const mapping = resolveSliderToParam({ effectType, sliderMin, sliderMax });
	if (!mapping) return null;
	const t = Math.min(
		1,
		Math.max(0, (sliderValue - mapping.from) / mapping.span),
	);
	const amount = mapping.paramMin + t * (mapping.paramMax - mapping.paramMin);
	if (Math.abs(amount - mapping.paramDefault) < 1e-9) return null;
	return amount;
}

/**
 * Inverse of {@link resolveBasicAdjustAmount}: where a stored `amount` sits on
 * the slider. An absent effect reads as the NEUTRAL position — the slider
 * value that maps to the param's own default, which is the slider's midpoint
 * for a centred param (contrast) and its zero for a one-sided one (dehaze).
 */
export function resolveBasicAdjustSliderValue({
	effectType,
	amount,
	sliderMin,
	sliderMax,
}: {
	effectType: string;
	amount: number | undefined;
	sliderMin: number;
	sliderMax: number;
}): number {
	const mapping = resolveSliderToParam({ effectType, sliderMin, sliderMax });
	if (!mapping) return 0;
	const paramRange = mapping.paramMax - mapping.paramMin;
	if (paramRange === 0) return mapping.from;
	const neutralT = (mapping.paramDefault - mapping.paramMin) / paramRange;
	if (amount === undefined) {
		return mapping.from + Math.min(1, Math.max(0, neutralT)) * mapping.span;
	}
	const t = (amount - mapping.paramMin) / paramRange;
	return mapping.from + Math.min(1, Math.max(0, t)) * mapping.span;
}
