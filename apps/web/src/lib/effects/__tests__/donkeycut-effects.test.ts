import { describe, expect, it } from "bun:test";
import {
	effectsRegistry,
	registerDefaultEffects,
	resolveEffectPasses,
} from "@/lib/effects";

describe("DonkeyCut effects (ported)", () => {
	it("registers the five parametric effects", () => {
		registerDefaultEffects();
		for (const type of [
			"zoom-push",
			"shake",
			"lightleak",
			"flash",
			"chroma-glitch",
		]) {
			expect(effectsRegistry.has(type)).toBe(true);
		}
	});

	it("registers the eight looks", () => {
		registerDefaultEffects();
		for (const type of [
			"look-vintage",
			"look-horror",
			"look-halation",
			"look-tech",
			"look-noir",
			"look-pastel",
			"look-blockbuster",
			"look-dreamy",
		]) {
			expect(effectsRegistry.has(type)).toBe(true);
		}
	});

	it("packs a single-amount look pass with amount and time uniforms", () => {
		registerDefaultEffects();
		const definition = effectsRegistry.get("look-vintage");
		expect(definition).toBeDefined();
		if (!definition) return;
		const passes = resolveEffectPasses({
			definition,
			effectParams: { amount: 40 },
			width: 1920,
			height: 1080,
			localTime: 120_000,
		});
		expect(passes.length).toBe(1);
		const pass = passes[0];
		expect(pass?.shader).toBe("look-vintage");
		expect(pass?.uniforms.u_amount).toBe(0.4);
		expect(pass?.uniforms.u_time).toBe(1);
	});

	it("packs the zoom-push focus, ramp, and eased time", () => {
		registerDefaultEffects();
		const definition = effectsRegistry.get("zoom-push");
		expect(definition).toBeDefined();
		if (!definition) return;
		const passes = resolveEffectPasses({
			definition,
			effectParams: { amount: 50, focusX: 25, focusY: 75, ramp: 1.5 },
			width: 1920,
			height: 1080,
			localTime: 240_000,
		});
		expect(passes.length).toBe(1);
		const pass = passes[0];
		expect(pass?.shader).toBe("zoom-push");
		expect(pass?.uniforms.u_amount).toBe(0.5);
		expect(pass?.uniforms.u_focus).toEqual([0.25, 0.75]);
		expect(pass?.uniforms.u_ramp).toBe(1.5);
		expect(pass?.uniforms.u_time).toBe(2);
	});
});
