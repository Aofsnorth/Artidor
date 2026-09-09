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
		const contrast = full.find((e) => e.type === "contrast");
		expect(contrast?.params.amount).toBe(16);

		const half = buildGradePresetEffects({ preset, amount: 0.5 });
		const halfContrast = half.find((e) => e.type === "contrast");
		expect(halfContrast?.params.amount).toBe(8);

		const zero = buildGradePresetEffects({ preset, amount: 0 });
		expect(zero.length).toBe(0);
	});

	it("renders a one-line-per-category catalog for AI descriptions", () => {
		const text = gradePresetCatalogText();
		expect(text).toContain("Cinematic: teal-orange");
		expect(text).toContain("B&W: mono");
	});
});
