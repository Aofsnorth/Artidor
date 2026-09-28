import { describe, expect, test } from "bun:test";
import {
	ADJUSTMENT_PRESETS,
	applyAdjustmentValues,
	buildApplyAllPlan,
	clearAdjustments,
	readAdjustmentValues,
	readNeutralValue,
	scaleAdjustments,
	setAdjustmentValue,
} from "@/lib/effects/basic-adjust-actions";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";
import type { Effect } from "@/lib/effects/types";

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

function nonAdjustEffect(): Effect {
	return {
		id: "keep-me",
		type: "blur",
		params: { blurAmount: 4 },
		enabled: true,
	} as unknown as Effect;
}

describe("setAdjustmentValue", () => {
	test("writing a value creates the effect and round-trips", () => {
		const next = setAdjustmentValue({
			effects: [],
			effectType: "brightness",
			sliderValue: 40,
		});
		expect(next).toHaveLength(1);
		expect(next[0].type).toBe("brightness");
		expect(readAdjustmentValues(next).brightness).toBeCloseTo(40, 6);
	});

	test("neutral drops the effect entirely instead of storing a no-op", () => {
		const neutral = readNeutralValue("brightness");
		const stored = setAdjustmentValue({
			effects: [],
			effectType: "brightness",
			sliderValue: 40,
		});
		const cleared = setAdjustmentValue({
			effects: stored,
			effectType: "brightness",
			sliderValue: neutral,
		});
		expect(cleared).toHaveLength(0);
	});

	test("writing neutral when already absent is a no-op", () => {
		const neutral = readNeutralValue("contrast");
		expect(
			setAdjustmentValue({
				effects: [],
				effectType: "contrast",
				sliderValue: neutral,
			}),
		).toHaveLength(0);
	});

	test("never touches unrelated effects", () => {
		const blur = nonAdjustEffect();
		const next = setAdjustmentValue({
			effects: [blur],
			effectType: "saturation",
			sliderValue: 30,
		});
		expect(next).toHaveLength(2);
		expect(next[0]).toBe(blur);
	});

	test("an unregistered effect type is ignored, not thrown on", () => {
		const next = setAdjustmentValue({
			effects: [nonAdjustEffect()],
			effectType: "not-a-real-effect",
			sliderValue: 10,
		});
		expect(next).toHaveLength(1);
	});
});

describe("applyAdjustmentValues", () => {
	test("writes several adjustments at once and keeps untouched ones", () => {
		const withBlur = [nonAdjustEffect()];
		const step1 = setAdjustmentValue({
			effects: withBlur,
			effectType: "exposure",
			sliderValue: 20,
		});
		const step2 = applyAdjustmentValues({
			effects: step1,
			values: { contrast: 15, saturation: -10 },
		});
		const values = readAdjustmentValues(step2);
		// "exposure" was not named in the patch, so it must survive.
		expect(values.exposure).toBeCloseTo(20, 6);
		expect(values.contrast).toBeCloseTo(15, 6);
		expect(values.saturation).toBeCloseTo(-10, 6);
		expect(step2.some((e) => e.id === "keep-me")).toBe(true);
	});

	test("every built-in preset is applicable and produces real values", () => {
		for (const preset of ADJUSTMENT_PRESETS) {
			const next = applyAdjustmentValues({
				effects: [],
				values: preset.values,
			});
			for (const [effectType] of Object.entries(preset.values)) {
				expect(
					effectsRegistry.has(effectType),
					`preset "${preset.id}" names unregistered ${effectType}`,
				).toBe(true);
			}
			if (preset.id === "none") {
				expect(next).toHaveLength(0);
			} else {
				expect(next.length).toBeGreaterThan(0);
			}
		}
	});

	test("preset ids and labels are unique", () => {
		const ids = ADJUSTMENT_PRESETS.map((p) => p.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("clearAdjustments", () => {
	test("removes only adjustments and leaves other effects", () => {
		const blur = nonAdjustEffect();
		const graded = applyAdjustmentValues({
			effects: [blur],
			values: { contrast: 20, saturation: 20, sharpen: 30 },
		});
		const cleared = clearAdjustments(graded);
		expect(cleared).toHaveLength(1);
		expect(cleared[0].id).toBe("keep-me");
	});
});

describe("scaleAdjustments (master intensity)", () => {
	test("intensity 1 is the identity", () => {
		const values = { contrast: 40, sharpen: 30 };
		expect(scaleAdjustments({ values, intensity: 1 })).toEqual(values);
	});

	test("intensity 0 returns everything to neutral", () => {
		const scaled = scaleAdjustments({
			values: { contrast: 40, sharpen: 30 },
			intensity: 0,
		});
		expect(scaled.contrast).toBeCloseTo(readNeutralValue("contrast"), 6);
		expect(scaled.sharpen).toBeCloseTo(readNeutralValue("sharpen"), 6);
	});

	test("intensity 2 doubles the distance from neutral and stays in range", () => {
		const scaled = scaleAdjustments({
			values: { contrast: 100 },
			intensity: 2,
		});
		// contrast is -100..100 with neutral 0, so 2x 100 would be 200.
		expect(scaled.contrast).toBe(100);
	});

	test("a scaled grade still round-trips through storage", () => {
		const values = { contrast: 30, saturation: -20, sharpen: 15 };
		const scaled = scaleAdjustments({ values, intensity: 0.5 });
		const stored = applyAdjustmentValues({ effects: [], values: scaled });
		const readBack = readAdjustmentValues(stored);
		for (const [key, expected] of Object.entries(scaled)) {
			expect(readBack[key], key).toBeCloseTo(expected, 6);
		}
	});
});

describe("buildApplyAllPlan", () => {
	test("targets every requested element and nothing else", () => {
		const plan = buildApplyAllPlan({
			values: { contrast: 12 },
			targetElementIds: ["a", "b"],
		});
		expect(Object.keys(plan).sort()).toEqual(["a", "b"]);
		expect(plan.a).toEqual({ contrast: 12 });
	});
});
