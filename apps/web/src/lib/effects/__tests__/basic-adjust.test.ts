import { describe, expect, test } from "bun:test";
import {
	BASIC_ADJUST_CONTROLS,
	resolveBasicAdjustAmount,
	resolveBasicAdjustSliderValue,
} from "../basic-adjust";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

describe("basic adjust controls", () => {
	test("every control points at a registered effect with an amount param", () => {
		for (const control of BASIC_ADJUST_CONTROLS) {
			expect(effectsRegistry.has(control.effectType)).toBe(true);
			const definition = effectsRegistry.get(control.effectType);
			const amount = definition.params.find((param) => param.key === "amount");
			expect(amount).toBeDefined();
		}
	});
});

describe("resolveBasicAdjustAmount", () => {
	// Regression: the tab hardcoded `1 + value * scale`, which is the wrong
	// neutral for contrast (100) and wrong for every zero-centred primitive
	// (0), so no control ever rendered a neutral image.
	test("a centred param maps slider 0 to the definition's own neutral", () => {
		// contrast: min 0, max 200, default 100
		expect(
			resolveBasicAdjustAmount({
				effectType: "contrast",
				sliderValue: 0,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBeNull();
		expect(
			resolveBasicAdjustAmount({
				effectType: "contrast",
				sliderValue: 100,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBe(200);
		expect(
			resolveBasicAdjustAmount({
				effectType: "contrast",
				sliderValue: -100,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBe(0);
	});

	test("a zero-centred param maps slider 0 to neutral and the ends to the range", () => {
		// temperature: min -100, max 100, default 0
		expect(
			resolveBasicAdjustAmount({
				effectType: "temperature",
				sliderValue: 0,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBeNull();
		expect(
			resolveBasicAdjustAmount({
				effectType: "temperature",
				sliderValue: 50,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBe(50);
		expect(
			resolveBasicAdjustAmount({
				effectType: "temperature",
				sliderValue: -50,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBe(-50);
	});

	// dehaze is one-sided (0..100, default 0): its slider is 0..100 so that the
	// slider's own zero is neutral. A negative slider position must clamp to
	// neutral rather than produce an out-of-range amount.
	test("a one-sided param clamps below its neutral start", () => {
		expect(
			resolveBasicAdjustAmount({
				effectType: "dehaze",
				sliderValue: 0,
				sliderMin: 0,
				sliderMax: 100,
			}),
		).toBeNull();
		expect(
			resolveBasicAdjustAmount({
				effectType: "dehaze",
				sliderValue: 100,
				sliderMin: 0,
				sliderMax: 100,
			}),
		).toBe(100);
		expect(
			resolveBasicAdjustAmount({
				effectType: "dehaze",
				sliderValue: -20,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBeNull();
	});

	test("an unknown effect type resolves to no effect", () => {
		expect(
			resolveBasicAdjustAmount({
				effectType: "not-a-real-effect",
				sliderValue: 10,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBeNull();
	});
});

describe("resolveBasicAdjustSliderValue", () => {
	test("round-trips the forward mapping", () => {
		for (const control of BASIC_ADJUST_CONTROLS) {
			for (const sliderValue of [control.sliderMin, control.sliderMax]) {
				const amount = resolveBasicAdjustAmount({
					effectType: control.effectType,
					sliderValue,
					sliderMin: control.sliderMin,
					sliderMax: control.sliderMax,
				});
				if (amount === null) continue;
				expect(
					resolveBasicAdjustSliderValue({
						effectType: control.effectType,
						amount,
						sliderMin: control.sliderMin,
						sliderMax: control.sliderMax,
					}),
				).toBeCloseTo(sliderValue, 6);
			}
		}
	});

	test("an absent effect reads back as the neutral position", () => {
		expect(
			resolveBasicAdjustSliderValue({
				effectType: "contrast",
				amount: undefined,
				sliderMin: -100,
				sliderMax: 100,
			}),
		).toBe(0);
		expect(
			resolveBasicAdjustSliderValue({
				effectType: "dehaze",
				amount: undefined,
				sliderMin: 0,
				sliderMax: 100,
			}),
		).toBe(0);
	});
});
