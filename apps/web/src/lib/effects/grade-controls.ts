/**
 * Slider ⇄ primitive-effect tables for the advanced grading panels.
 *
 * The advanced Adjust panels used to drive one `davinci-adjust` effect that is
 * not in the registry at all, so every control persisted a param no GPU pass
 * ever read: the inspector moved, the picture did not. This module is the
 * replacement — the single table that says which REGISTERED, rendering
 * primitive each control writes, and the pure conversions around it.
 *
 * Two rules keep the mapping honest, and both already live in
 * `basic-adjust.ts` rather than being reinvented here:
 *
 * 1. A slider maps onto the effect's own declared `amount` range, never onto an
 *    assumed neutral of 1.0. `resolveBasicAdjustAmount` reads the primitive's
 *    real default, so contrast (0..200, default 100) and dehaze (0..100,
 *    default 0) both come out right.
 * 2. A control at its neutral position stores NO effect at all.
 *
 * `offAt` exists for the three primitives whose declared default is NOT their
 * shader's off value — `glow`, `box-blur` and `tint` all declare
 * `default: 50` in 0..100 (a sensible gallery thumbnail) while their WGSL
 * multiplies by `amount`, so amount 0 is the real no-op. Without `offAt` the
 * shared mapping would treat the slider's midpoint as neutral and every
 * position below it as a *stronger* push, which inverts half the control.
 */

import { buildDefaultEffectInstance } from "@/lib/effects";
import {
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "@/lib/effects/basic-adjust";
import type { Effect } from "@/lib/effects/types";

export interface GradeControl {
	label: string;
	/** The registered, rendering primitive this control writes. */
	effectType: string;
	/** Slider range shown in the inspector. */
	sliderMin: number;
	sliderMax: number;
	step?: number;
	/** Decimal places for the readout. */
	decimals?: number;
	/** Optional semantic track background (a CSS background value). */
	gradient?: string;
	/**
	 * Slider position that means "store nothing". Defaults to the position the
	 * shared mapping derives from the primitive's declared default; set it
	 * only where that default is not the shader's off value.
	 */
	offAt?: number;
}

/**
 * Primary bars. Pivot, midtone detail and the luma/chroma mix pair were
 * removed: no registered primitive exposes a tonal pivot, a local-detail
 * control or a luma/chroma separator, so keeping them would have been another
 * control that only moves a number nobody reads.
 */
export const BARS_CONTROLS: readonly GradeControl[] = [
	{
		label: "Contrast",
		effectType: "contrast",
		sliderMin: -100,
		sliderMax: 100,
	},
	{
		label: "Highlights",
		effectType: "highlights",
		sliderMin: -100,
		sliderMax: 100,
	},
	{ label: "Shadows", effectType: "shadows", sliderMin: -100, sliderMax: 100 },
	{ label: "Whites", effectType: "whites", sliderMin: -100, sliderMax: 100 },
	{ label: "Blacks", effectType: "blacks", sliderMin: -100, sliderMax: 100 },
	{
		label: "Saturation",
		effectType: "saturation",
		sliderMin: -100,
		sliderMax: 100,
	},
	{ label: "Hue", effectType: "hue-rotate", sliderMin: -180, sliderMax: 180 },
];

/** The `vignette` primitive only reads `amount`; shape and per-zone controls
 * had no rendering home and were folded into this single amount. */
export const VIGNETTE_CONTROLS: readonly GradeControl[] = [
	{ label: "Amount", effectType: "vignette", sliderMin: 0, sliderMax: 100 },
];

export const DETAIL_CONTROLS: readonly GradeControl[] = [
	{ label: "Sharpen", effectType: "sharpen", sliderMin: 0, sliderMax: 100 },
	{
		label: "Blur",
		effectType: "box-blur",
		sliderMin: 0,
		sliderMax: 100,
		offAt: 0,
	},
	{ label: "Defog", effectType: "dehaze", sliderMin: 0, sliderMax: 100 },
];

/** Halation radius had no rendering home and was removed with the rest. */
export const GLOW_GRAIN_CONTROLS: readonly GradeControl[] = [
	{ label: "Glow", effectType: "glow", sliderMin: 0, sliderMax: 100, offAt: 0 },
	{ label: "Grain", effectType: "grain", sliderMin: 0, sliderMax: 100 },
];

/** `temperature` is bipolar (-100..100, neutral 0), so Temp stays bipolar. */
export const TEMPERATURE_CONTROL: GradeControl = {
	label: "Temp",
	effectType: "temperature",
	sliderMin: -100,
	sliderMax: 100,
	gradient: "linear-gradient(to right, #4d9aff 0%, #ffffff 50%, #ffb84d 100%)",
};

/**
 * `tint` is a one-sided amber wash (0..100, off at 0), so the control is
 * one-sided too. The green half of the old bipolar Tint slider has no
 * rendering home: no registered primitive tints toward green.
 */
export const TINT_CONTROL: GradeControl = {
	label: "Tint",
	effectType: "tint",
	sliderMin: 0,
	sliderMax: 100,
	offAt: 0,
	gradient: "linear-gradient(to right, #27272a 0%, #ffb84d 100%)",
};

/** Where a control sits when it is storing nothing. */
export function readGradeNeutral(control: GradeControl): number {
	if (control.offAt !== undefined) return control.offAt;
	return resolveBasicAdjustSliderValue({
		effectType: control.effectType,
		amount: undefined,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
}

/** Map a slider position onto the effect's `amount`, or `null` for "store nothing". */
export function resolveGradeAmount(
	control: GradeControl,
	sliderValue: number,
): number | null {
	const mapped = resolveBasicAdjustAmount({
		effectType: control.effectType,
		sliderValue,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
	if (mapped === null) return null;
	if (control.offAt !== undefined && sliderValue === control.offAt) return null;
	return mapped;
}

/** Where a stored `amount` sits on the slider; an absent effect reads as neutral. */
export function readGradeSliderValue(
	control: GradeControl,
	amount: number | undefined,
): number {
	if (amount === undefined) return readGradeNeutral(control);
	return resolveBasicAdjustSliderValue({
		effectType: control.effectType,
		amount,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
}

/** The stored `amount` of one effect type, or `undefined` when it is absent. */
export function readGradeAmount(
	effects: readonly Effect[] | undefined,
	effectType: string,
): number | undefined {
	const raw = effects?.find((effect) => effect.type === effectType)?.params
		?.amount;
	return typeof raw === "number" ? raw : undefined;
}

/** Slider position of a control, read straight off the element. */
export function readGradeControlValue(
	effects: readonly Effect[] | undefined,
	control: GradeControl,
): number {
	return readGradeSliderValue(
		control,
		readGradeAmount(effects, control.effectType),
	);
}

/**
 * Write ONE control onto an element's effect list.
 *
 * At the control's neutral position the effect is REMOVED rather than stored
 * as a no-op, matching the Basic tab. Effects the caller does not name —
 * including effects belonging to another panel — are left byte-identical.
 */
export function setGradeControlValue({
	effects,
	control,
	sliderValue,
}: {
	effects: readonly Effect[] | undefined;
	control: GradeControl;
	sliderValue: number;
}): Effect[] {
	const current = [...(effects ?? [])];
	const index = current.findIndex((e) => e.type === control.effectType);
	const amount = resolveGradeAmount(control, sliderValue);

	if (amount === null) {
		if (index === -1) return current;
		current.splice(index, 1);
		return current;
	}
	if (index === -1) {
		return [
			...current,
			{
				...buildDefaultEffectInstance({ effectType: control.effectType }),
				params: { amount },
			},
		];
	}
	return current.map((effect, i) =>
		i === index ? { ...effect, params: { ...effect.params, amount } } : effect,
	);
}

/** Strip every effect named by `controls`, leaving all other effects alone. */
export function clearGradeControls(
	effects: readonly Effect[] | undefined,
	controls: readonly GradeControl[],
): Effect[] {
	const owned = new Set(controls.map((control) => control.effectType));
	return (effects ?? []).filter((effect) => !owned.has(effect.type));
}

/* -------------------------------------------------------------------------- */
/*  Colour wheels: wheel bias (x / y / luma) ⇄ the `color-wheels` hex params  */
/* -------------------------------------------------------------------------- */

/** Half the 0..255 channel range — the amplitude of a full wheel deflection. */
const HALF_RANGE = 127.5;

/**
 * Neutral colour per wheel, taken from `color-wheels`' own declared defaults.
 * Its renderer subtracts 0.5 from every channel before uploading, so exactly
 * these values produce a zero uniform — i.e. a wheel at rest.
 */
export const WHEEL_NEUTRAL_HEX = {
	lift: "#000000",
	gamma: "#808080",
	gain: "#ffffff",
} as const;

export type WheelId = keyof typeof WHEEL_NEUTRAL_HEX;

export const WHEEL_IDS = [
	"lift",
	"gamma",
	"gain",
] as const as readonly WheelId[];

export const WHEEL_LABELS: Record<WheelId, string> = {
	lift: "Lift",
	gamma: "Gamma",
	gain: "Gain",
};

export interface WheelBias {
	/** Red (negative) ⇄ cyan (positive), matching the puck's own axes. */
	x: number;
	/** Blue (negative) ⇄ yellow (positive). */
	y: number;
	/** Additive luma push, applied equally to all three channels. */
	luma: number;
}

export const NEUTRAL_WHEEL_BIAS: WheelBias = { x: 0, y: 0, luma: 0 };

export const NEUTRAL_WHEEL_BIASES: Record<WheelId, WheelBias> = {
	lift: { ...NEUTRAL_WHEEL_BIAS },
	gamma: { ...NEUTRAL_WHEEL_BIAS },
	gain: { ...NEUTRAL_WHEEL_BIAS },
};

const clampUnit = (value: number) => {
	const clamped = Math.max(-1, Math.min(1, value));
	// Normalise `-0` so a wheel at rest reads back as exactly `{x: 0, ...}`.
	return clamped === 0 ? 0 : clamped;
};

function parseHex(hex: string): [number, number, number] {
	const body = hex.startsWith("#") ? hex.slice(1) : hex;
	return [
		Number.parseInt(body.slice(0, 2), 16),
		Number.parseInt(body.slice(2, 4), 16),
		Number.parseInt(body.slice(4, 6), 16),
	];
}

function toHex(rgb: readonly [number, number, number]): string {
	const part = (value: number) =>
		Math.round(Math.max(0, Math.min(255, value)))
			.toString(16)
			.padStart(2, "0");
	return `#${part(rgb[0])}${part(rgb[1])}${part(rgb[2])}`;
}

/**
 * Chroma push per channel, in -127.5..127.5.
 *
 * These are the same red/cyan and blue/yellow axes the wheel puck is COLOURED
 * with, so dragging the handle toward red produces a red-biased colour and
 * the visual feedback keeps matching what is stored. The three deltas always
 * sum to zero, which is what makes the luma/chroma split below exact.
 */
function chromaDeltas(x: number, y: number): [number, number, number] {
	return [
		((-x + 1) / 2) * 255 - HALF_RANGE,
		((x - y) / 2 + 0.5) * 255 - HALF_RANGE,
		((y + 1) / 2) * 255 - HALF_RANGE,
	];
}

/**
 * Wheel bias → the `color-wheels` hex colour for that wheel.
 *
 * The mapping is deliberately simple and documented rather than physically
 * exact: the puck's x/y push the colour around the neutral grey, and the luma
 * slider adds the SAME amount to all three channels at the same half-range
 * amplitude. Zero bias therefore returns each wheel's own neutral colour
 * exactly, which is what makes "no effect" detectable.
 *
 * Note the push is ADDITIVE, which is what the shader does with it
 * (`color + liftOffset`), so it clips at the ends of a channel: a lift cannot
 * go below black and a gain cannot go above white. `gamma` sits mid-range and
 * round-trips over the whole ±1 box; the two end wheels only round-trip for
 * the half of the puck that stays in range.
 */
export function wheelBiasToHex(wheelId: WheelId, bias: WheelBias): string {
	const base = parseHex(WHEEL_NEUTRAL_HEX[wheelId]);
	const chroma = chromaDeltas(clampUnit(bias.x), clampUnit(bias.y));
	const luma = clampUnit(bias.luma) * HALF_RANGE;
	return toHex([
		base[0] + chroma[0] + luma,
		base[1] + chroma[1] + luma,
		base[2] + chroma[2] + luma,
	]);
}

/**
 * Inverse of {@link wheelBiasToHex}: where the stored colour puts the puck and
 * the luma slider. Any RGB offset splits exactly into a grey (mean) component
 * and a chroma component, because `chromaDeltas` always sums to zero.
 *
 * Colours are stored 8-bit, so this is accurate to roughly ±0.5/127.5 rather
 * than exact.
 */
export function hexToWheelBias(
	wheelId: WheelId,
	hex: string | undefined,
): WheelBias {
	if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) {
		return { ...NEUTRAL_WHEEL_BIAS };
	}
	const base = parseHex(WHEEL_NEUTRAL_HEX[wheelId]);
	const rgb = parseHex(hex);
	const offsets = [rgb[0] - base[0], rgb[1] - base[1], rgb[2] - base[2]];
	const mean = (offsets[0] + offsets[1] + offsets[2]) / 3;
	const luma = clampUnit(mean / HALF_RANGE);
	const lumaDelta = luma * HALF_RANGE;
	return {
		x: clampUnit(-(offsets[0] - lumaDelta) / HALF_RANGE),
		y: clampUnit((offsets[2] - lumaDelta) / HALF_RANGE),
		luma,
	};
}

/** Read every wheel's bias off the element's `color-wheels` effect. */
export function readWheelBiases(
	effects: readonly Effect[] | undefined,
): Record<WheelId, WheelBias> {
	const params = effects?.find(
		(effect) => effect.type === "color-wheels",
	)?.params;
	const biases = { ...NEUTRAL_WHEEL_BIASES };
	for (const id of WHEEL_IDS) {
		const raw = params?.[id];
		if (typeof raw === "string") biases[id] = hexToWheelBias(id, raw);
	}
	return biases;
}

/**
 * Write every wheel at once. Three wheels share one `color-wheels` effect, so
 * writing all three together keeps the effect's params complete (and stops a
 * returned-to-neutral wheel from keeping a stale colour), and lets the effect
 * be dropped entirely once all three are at their neutral colour.
 */
export function setWheelBiases({
	effects,
	biases,
}: {
	effects: readonly Effect[] | undefined;
	biases: Record<WheelId, WheelBias>;
}): Effect[] {
	const current = [...(effects ?? [])];
	const index = current.findIndex((e) => e.type === "color-wheels");
	const params: Record<string, string> = {};
	let moved = false;
	for (const id of WHEEL_IDS) {
		const hex = wheelBiasToHex(id, biases[id]);
		params[id] = hex;
		if (hex !== WHEEL_NEUTRAL_HEX[id]) moved = true;
	}

	if (!moved) {
		if (index === -1) return current;
		current.splice(index, 1);
		return current;
	}
	if (index === -1) {
		return [
			...current,
			{
				...buildDefaultEffectInstance({ effectType: "color-wheels" }),
				params,
			},
		];
	}
	return current.map((effect, i) =>
		i === index ? { ...effect, params } : effect,
	);
}
