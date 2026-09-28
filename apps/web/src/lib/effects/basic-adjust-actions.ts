/**
 * Pure operations behind the CapCut-style Adjust panel.
 *
 * The panel itself is presentation; everything that decides WHAT a button
 * does lives here as plain data in / plain data out, so the behaviour is
 * unit-testable without a DOM and so the same rules can back the inspector
 * tab, presets and the apply-to-other-clips action.
 *
 * Storage model: each adjustment stays its own registered primitive effect
 * (see `basic-adjust.ts` for the slider↔param mapping). A control sitting at
 * its neutral is simply absent, which is what `setAdjustmentValue` and
 * `readAdjustmentValues` preserve.
 */

import {
	BASIC_ADJUST_CONTROLS,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
	type BasicAdjustControl,
} from "@/lib/effects/basic-adjust";
import { buildDefaultEffectInstance } from "@/lib/effects";
import type { Effect } from "@/lib/effects/types";

/** Slider position per adjustment type; absent key = at neutral. */
export type AdjustmentValues = Record<string, number>;

export const ADJUSTMENT_PRESETS: readonly {
	id: string;
	label: string;
	values: AdjustmentValues;
}[] = [
	{ id: "none", label: "None", values: {} },
	{
		id: "auto",
		label: "Auto",
		values: {
			brightness: 6,
			contrast: 10,
			highlights: -8,
			shadows: 10,
			saturation: 8,
			vibrance: 10,
			clarity: 6,
		},
	},
	{
		id: "warm",
		label: "Warm",
		values: { temperature: 18, tint: 6, saturation: 8, vibrance: 6, fade: 6 },
	},
	{
		id: "cool",
		label: "Cool",
		values: {
			temperature: -18,
			"tint-shift": -4,
			contrast: 8,
			highlights: 6,
			shadows: -6,
		},
	},
	{
		id: "cinematic",
		label: "Cine",
		values: {
			contrast: 18,
			highlights: -14,
			shadows: 12,
			blacks: -10,
			saturation: -6,
			vibrance: 8,
			"hue-rotate": -6,
			vignette: 22,
		},
	},
	{
		id: "mono",
		label: "Mono",
		values: { saturation: -100, contrast: 16, clarity: 10, grain: 12 },
	},
	{
		id: "vivid",
		label: "Vivid",
		values: { saturation: 22, vibrance: 26, contrast: 12, clarity: 12 },
	},
];

function controlFor(effectType: string): BasicAdjustControl | undefined {
	return BASIC_ADJUST_CONTROLS.find((c) => c.effectType === effectType);
}

/** Slider position of every adjustment present on the element. */
export function readAdjustmentValues(
	effects: readonly Effect[] | undefined,
): AdjustmentValues {
	const values: AdjustmentValues = {};
	for (const effect of effects ?? []) {
		const control = controlFor(effect.type);
		if (!control) continue;
		const raw = effect.params?.amount;
		values[effect.type] = resolveBasicAdjustSliderValue({
			effectType: effect.type,
			amount: typeof raw === "number" ? raw : undefined,
			sliderMin: control.sliderMin,
			sliderMax: control.sliderMax,
		});
	}
	return values;
}

/**
 * Slider position that is a no-op for a control — the inverse mapping of an
 * absent effect, i.e. the position that would store no effect at all.
 */
export function readNeutralValue(effectType: string): number {
	const control = controlFor(effectType);
	if (!control) return 0;
	return resolveBasicAdjustSliderValue({
		effectType,
		amount: undefined,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});
}

/**
 * Write ONE adjustment, keeping every other effect on the element intact and
 * dropping the effect entirely at neutral.
 */
export function setAdjustmentValue({
	effects,
	effectType,
	sliderValue,
}: {
	effects: readonly Effect[] | undefined;
	effectType: string;
	sliderValue: number;
}): Effect[] {
	const control = controlFor(effectType);
	if (!control) return [...(effects ?? [])];
	const current = [...(effects ?? [])];
	const index = current.findIndex((e) => e.type === effectType);
	const amount = resolveBasicAdjustAmount({
		effectType,
		sliderValue,
		sliderMin: control.sliderMin,
		sliderMax: control.sliderMax,
	});

	if (amount === null) {
		if (index === -1) return current;
		current.splice(index, 1);
		return current;
	}

	if (index === -1) {
		return [
			...current,
			{ ...buildDefaultEffectInstance({ effectType }), params: { amount } },
		];
	}
	return current.map((effect, i) =>
		i === index ? { ...effect, params: { ...effect.params, amount } } : effect,
	);
}

/**
 * Write a WHOLE set of adjustment values at once, leaving non-adjustment
 * effects (and adjustments the caller did not mention) untouched. Keys
 * missing from `values` are left alone, so a preset only has to name what
 * it actually changes.
 */
export function applyAdjustmentValues({
	effects,
	values,
}: {
	effects: readonly Effect[] | undefined;
	values: AdjustmentValues;
}): Effect[] {
	let next = [...(effects ?? [])];
	for (const [effectType, sliderValue] of Object.entries(values)) {
		next = setAdjustmentValue({
			effects: next,
			effectType,
			sliderValue,
		});
	}
	return next;
}

/** Strip every adjustment effect, keeping all other effects. */
export function clearAdjustments(
	effects: readonly Effect[] | undefined,
): Effect[] {
	return (effects ?? []).filter((e) => !controlFor(e.type));
}

/**
 * Master intensity: scale every adjustment around its neutral position.
 * `intensity` of 1 is the untouched grade, 0 returns everything to neutral
 * and >1 pushes the grade further. Clamped to the control's own range so
 * the result always round-trips through storage.
 */
export function scaleAdjustments({
	values,
	intensity,
}: {
	values: AdjustmentValues;
	intensity: number;
}): AdjustmentValues {
	const factor = Math.max(0, Math.min(2, intensity));
	const scaled: AdjustmentValues = {};
	for (const [effectType, sliderValue] of Object.entries(values)) {
		const control = controlFor(effectType);
		if (!control) continue;
		const neutral = readNeutralValue(effectType);
		const raw = neutral + (sliderValue - neutral) * factor;
		scaled[effectType] = Math.max(
			control.sliderMin,
			Math.min(control.sliderMax, Math.round(raw)),
		);
	}
	return scaled;
}

/**
 * Inverse of {@link scaleAdjustments}: given a value the user just set in the
 * SCALED (what-you-see) space, return the base value to store so that the
 * master intensity renders it back at exactly that position.
 *
 * This is what lets intensity be stateless: the element only ever stores the
 * base grade, and the displayed value is always derived, so moving the
 * intensity slider can never drift the underlying adjustments.
 */
export function unscaleAdjustments({
	values,
	intensity,
}: {
	values: AdjustmentValues;
	intensity: number;
}): AdjustmentValues {
	const factor = Math.max(0, Math.min(2, intensity));
	const base: AdjustmentValues = {};
	if (factor === 0) return base;
	for (const [effectType, sliderValue] of Object.entries(values)) {
		const control = controlFor(effectType);
		if (!control) continue;
		const neutral = readNeutralValue(effectType);
		const raw = neutral + (sliderValue - neutral) / factor;
		base[effectType] = Math.max(
			control.sliderMin,
			Math.min(control.sliderMax, Math.round(raw)),
		);
	}
	return base;
}

/**
 * CapCut's "Apply all": the same grade written onto every other selected
 * visual element, so a look tuned on one clip can be pushed across a whole
 * selection. Returns the value map to apply per element id — the caller owns
 * the write because each element needs its own command.
 */
export function buildApplyAllPlan({
	values,
	targetElementIds,
}: {
	values: AdjustmentValues;
	targetElementIds: readonly string[];
}): Record<string, AdjustmentValues> {
	const plan: Record<string, AdjustmentValues> = {};
	for (const elementId of targetElementIds) {
		plan[elementId] = { ...values };
	}
	return plan;
}
