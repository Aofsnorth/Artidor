import { describe, expect, test } from "bun:test";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";
import {
	BASIC_ADJUST_CONTROLS,
	BASIC_ADJUST_GROUP_ORDER,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "@/lib/effects/basic-adjust";

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

/**
 * Regression for the Image Adjust sliders snapping back to 0.
 *
 * The inspector's Adjust sliders write through `resolveBasicAdjustAmount`, which
 * resolves the effect's `amount` param from the effects registry. When an effect
 * type is not registered (or has no `amount` param) it returns `null`, which the
 * caller reads as "neutral — no effect needed" and therefore deletes the effect
 * instead of writing it. The slider then moves during the drag (local scrub
 * state) and falls straight back to 0 on release, because nothing was stored.
 *
 * These tests make that silent no-op impossible to ship: every control must
 * resolve to a registered effect with a numeric `amount` param, and the
 * slider → param → slider round trip must be exact.
 */
describe("basic adjust controls resolve against the effects registry", () => {
	test("the roster is the full CapCut Adjust panel, grouped CapCut-style", () => {
		const expected = BASIC_ADJUST_GROUP_ORDER.flatMap((group) =>
			BASIC_ADJUST_CONTROLS.filter((control) => control.group === group).map(
				(control) => `${group}:${control.label}`,
			),
		);

		expect(expected).toEqual([
			"Light:Brightness",
			"Light:Exposure",
			"Light:Contrast",
			"Light:Highlights",
			"Light:Shadows",
			"Light:Whites",
			"Light:Blacks",
			"Color:Temperature",
			"Color:Tint",
			"Color:Hue",
			"Color:Saturation",
			"Color:Vibrance",
			"Detail:Sharpness",
			"Detail:Clarity",
			"Detail:Dehaze",
			"Creative:Fade",
			"Creative:Vignette",
			"Creative:Grain",
		]);
	});

	test("every control maps to a registered effect with a numeric amount param", () => {
		const broken = BASIC_ADJUST_CONTROLS.filter((control) => {
			if (!effectsRegistry.has(control.effectType)) return true;
			const amountParam = effectsRegistry
				.get(control.effectType)
				.params.find((param) => param.key === "amount");
			if (!amountParam) return true;
			return (
				typeof amountParam.min !== "number" ||
				typeof amountParam.default !== "number"
			);
		}).map((control) => control.effectType);

		expect(broken).toEqual([]);
	});

	test("every control can move away from neutral in its adjustable direction", () => {
		// A control whose entire range maps to null is un-draggable: the slider
		// moves during the scrub and snaps straight back because nothing stores.
		// Two-sided (centred) controls must store at BOTH ends; one-sided
		// controls (param default == min, e.g. dehaze) rest AT their minimum, so
		// only the maximum needs to store.
		const broken = BASIC_ADJUST_CONTROLS.filter((control) => {
			if (!effectsRegistry.has(control.effectType)) return true;
			const amountParam = effectsRegistry
				.get(control.effectType)
				.params.find((param) => param.key === "amount");
			const oneSided = amountParam?.default === amountParam?.min;

			const maxAmount = resolveBasicAdjustAmount({
				effectType: control.effectType,
				sliderValue: control.sliderMax,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});
			if (maxAmount === null) return true;
			if (oneSided) return false;

			const minAmount = resolveBasicAdjustAmount({
				effectType: control.effectType,
				sliderValue: control.sliderMin,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});
			return minAmount === null;
		}).map((control) => control.effectType);

		expect(broken).toEqual([]);
	});

	test("slider -> param -> slider round-trips exactly for every control", () => {
		const mismatches: Array<{
			label: string;
			sent: number;
			got: number;
		}> = [];

		for (const control of BASIC_ADJUST_CONTROLS) {
			for (const t of [0.25, 0.5, 0.75]) {
				const sent = Math.round(
					control.sliderMin + t * (control.sliderMax - control.sliderMin),
				);
				const amount = resolveBasicAdjustAmount({
					effectType: control.effectType,
					sliderValue: sent,
					sliderMin: control.sliderMin,
					sliderMax: control.sliderMax,
				});
				if (amount === null) continue;
				const got = Math.round(
					resolveBasicAdjustSliderValue({
						effectType: control.effectType,
						amount,
						sliderMin: control.sliderMin,
						sliderMax: control.sliderMax,
					}),
				);
				if (got !== sent) {
					mismatches.push({ label: control.label, sent, got });
				}
			}
		}

		expect(mismatches).toEqual([]);
	});

	test("an absent effect reads as its neutral slider position", () => {
		for (const control of BASIC_ADJUST_CONTROLS) {
			const neutral = resolveBasicAdjustSliderValue({
				effectType: control.effectType,
				amount: undefined,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});
			const amount = resolveBasicAdjustAmount({
				effectType: control.effectType,
				sliderValue: neutral,
				sliderMin: control.sliderMin,
				sliderMax: control.sliderMax,
			});
			// Neutral must map to "no effect stored", otherwise the reset button
			// and a freshly-added element both leave a stray effect behind.
			expect({ label: control.label, amount }).toEqual({
				label: control.label,
				amount: null,
			});
		}
	});
});
