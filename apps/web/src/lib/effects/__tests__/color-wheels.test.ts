import { describe, expect, test } from "bun:test";
import { colorWheelsAdjustmentDefinition } from "@/lib/effects/definitions/adjustments/color-wheels";
import type { ParamValues } from "@/lib/params";

const uniforms = colorWheelsAdjustmentDefinition.renderer.passes[0].uniforms;

function wheelUniforms(params: ParamValues) {
	return uniforms({ effectParams: params, width: 1, height: 1 });
}

describe("color wheels hex parsing", () => {
	test("accepts 6- and 3-digit hex colours", () => {
		const full = wheelUniforms({
			lift: "#ff0000",
			gamma: "#ffffff",
			gain: "#fff",
		});
		expect(full.u_lift).toEqual([0.5, -0.5, -0.5]);
		expect(full.u_gamma).toEqual([0.5, 0.5, 0.5]);
		expect(full.u_gain).toEqual([0.5, 0.5, 0.5]);

		const short = wheelUniforms({ lift: "#abc" });
		expect(short.u_lift).toEqual([
			0xaa / 255 - 0.5,
			0xbb / 255 - 0.5,
			0xcc / 255 - 0.5,
		]);
	});

	test("falls back to neutral for short, empty or non-hex input", () => {
		for (const value of ["", "#", "#12", "#12345", "#gggggg", "red", "ff00ff"]) {
			const result = wheelUniforms({ lift: value });
			expect(result.u_lift, value).toEqual([0, 0, 0]);
		}

		const missing = wheelUniforms({});
		expect(missing.u_lift).toEqual([0, 0, 0]);
		expect(missing.u_gamma).toEqual([0, 0, 0]);
		expect(missing.u_gain).toEqual([0, 0, 0]);
	});

	test("never emits non-finite uniforms", () => {
		const result = wheelUniforms({ lift: "#zzz", gamma: undefined, gain: 42 });
		for (const value of Object.values(result)) {
			expect(Array.isArray(value)).toBe(true);
			for (const channel of value as number[]) {
				expect(Number.isFinite(channel)).toBe(true);
			}
		}
	});
});