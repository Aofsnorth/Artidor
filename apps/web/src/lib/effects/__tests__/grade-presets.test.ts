import { describe, expect, it } from "bun:test";
import {
	buildGradePresetEffects,
	gradePresets,
	getGradePreset,
	gradePresetCatalogText,
} from "@/lib/effects/grade-presets";

describe("grade presets (ported from DonkeyCut)", () => {
	it("ships 41 presets across five categories", () => {
		expect(gradePresets.length).toBe(41);
		for (const category of ["cinematic", "film", "warm", "mood", "bw"]) {
			expect(
				gradePresets.filter((p) => p.category === category).length,
			).toBeGreaterThanOrEqual(8);
		}
	});

	it("has unique ids", () => {
		const ids = new Set(gradePresets.map((p) => p.id));
		expect(ids.size).toBe(gradePresets.length);
	});

	it("carries the signature presets verbatim", () => {
		const tealOrange = getGradePreset("teal-orange");
		expect(tealOrange?.label).toBe("Teal & Orange");
		expect(tealOrange?.adjustments).toEqual({
			contrast: 10,
			vibrance: 10,
			saturation: 6,
		});

		const bleach = getGradePreset("bleach-bypass");
		expect(bleach?.adjustments.saturation).toBe(-30);

		const golden = getGradePreset("golden-hour");
		expect(golden?.adjustments.temperature).toBe(18);

		const lowKey = getGradePreset("low-key");
		expect(lowKey?.adjustments.brightness).toBe(-8);
	});

	it("builds effect instances scaled by amount", () => {
		const preset = getGradePreset("thriller");
		expect(preset).toBeDefined();
		if (!preset) return;

		const full = buildGradePresetEffects({ preset, amount: 1 });
		expect(full.length).toBe(4);
		expect(full.every((e) => e.enabled && e.id.length > 0)).toBe(true);
		// Contrast is neutral at 100, so a DonkeyCut +16 delta is 116, not 16.
		const contrast = full.find((e) => e.type === "contrast");
		expect(contrast?.params.amount).toBe(116);
		// Temperature is neutral at 0, so its delta is written verbatim.
		const temperature = full.find((e) => e.type === "temperature");
		expect(temperature?.params.amount).toBe(-14);

		const half = buildGradePresetEffects({ preset, amount: 0.5 });
		const halfContrast = half.find((e) => e.type === "contrast");
		expect(halfContrast?.params.amount).toBe(108);
		const halfTemperature = half.find((e) => e.type === "temperature");
		expect(halfTemperature?.params.amount).toBe(-7);

		const zero = buildGradePresetEffects({ preset, amount: 0 });
		expect(zero.length).toBe(0);
	});

	it("maps brightness, contrast and saturation around their 100 neutral", () => {
		const preset = getGradePreset("teal-orange");
		expect(preset).toBeDefined();
		if (!preset) return;

		const effects = buildGradePresetEffects({ preset });
		expect(effects.find((e) => e.type === "contrast")?.params.amount).toBe(110);
		expect(effects.find((e) => e.type === "saturation")?.params.amount).toBe(106);
		expect(effects.find((e) => e.type === "vibrance")?.params.amount).toBe(10);
	});

	it("emits no effects for neutral deltas at any amount", () => {
		const neutral = {
			id: "neutral",
			label: "Neutral",
			category: "cinematic" as const,
			keywords: [],
			adjustments: {
				brightness: 0,
				contrast: 0,
				saturation: 0,
				vibrance: 0,
				temperature: 0,
				highlights: 0,
				shadows: 0,
			},
		};
		expect(buildGradePresetEffects({ preset: neutral })).toEqual([]);
		expect(buildGradePresetEffects({ preset: neutral, amount: 0.5 })).toEqual(
			[],
		);
	});

	it("renders a one-line-per-category catalog for AI descriptions", () => {
		const text = gradePresetCatalogText();
		expect(text).toContain("Cinematic: teal-orange");
		expect(text).toContain("B&W: mono");
	});
});
