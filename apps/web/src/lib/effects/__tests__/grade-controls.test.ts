import { describe, expect, test } from "bun:test";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";
import {
	BARS_CONTROLS,
	DETAIL_CONTROLS,
	GLOW_GRAIN_CONTROLS,
	hexToWheelBias,
	readGradeControlValue,
	readGradeNeutral,
	resolveGradeAmount,
	setGradeControlValue,
	setWheelBiases,
	TEMPERATURE_CONTROL,
	TINT_CONTROL,
	VIGNETTE_CONTROLS,
	clearGradeControls,
	wheelBiasToHex,
	WHEEL_IDS,
	WHEEL_NEUTRAL_HEX,
	type GradeControl,
	type WheelId,
} from "@/lib/effects/grade-controls";
import type { Effect } from "@/lib/effects/types";

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

function unrelatedEffect(): Effect {
	return {
		id: "keep-me",
		type: "blur",
		params: { blurAmount: 4 },
		enabled: true,
	} as unknown as Effect;
}

function everyControl(): GradeControl[] {
	return [
		...BARS_CONTROLS,
		...VIGNETTE_CONTROLS,
		...DETAIL_CONTROLS,
		...GLOW_GRAIN_CONTROLS,
		TEMPERATURE_CONTROL,
		TINT_CONTROL,
	];
}

describe("every grading control targets a rendering primitive", () => {
	test("each effect type is registered and declares at least one pass", () => {
		for (const control of everyControl()) {
			expect(
				effectsRegistry.has(control.effectType),
				`${control.label} writes unregistered ${control.effectType}`,
			).toBe(true);
			const definition = effectsRegistry.get(control.effectType);
			expect(
				definition?.renderer?.passes?.length ?? 0,
				`${control.label} writes ${control.effectType}, which has no render pass`,
			).toBeGreaterThan(0);
		}
	});

	test("no control duplicates another's effect", () => {
		const types = everyControl().map((control) => control.effectType);
		expect(new Set(types).size).toBe(types.length);
	});

	test("nothing writes the old unregistered davinci-adjust effect", () => {
		for (const control of everyControl()) {
			expect(control.effectType).not.toBe("davinci-adjust");
		}
		expect(effectsRegistry.has("davinci-adjust")).toBe(false);
	});
});

describe("resolveGradeAmount", () => {
	test("a control at its neutral position stores nothing", () => {
		for (const control of everyControl()) {
			expect(
				resolveGradeAmount(control, readGradeNeutral(control)),
				`${control.label} neutral should store nothing`,
			).toBeNull();
		}
	});

	test("a moved control produces a real amount", () => {
		const contrast = BARS_CONTROLS.find((c) => c.effectType === "contrast");
		expect(contrast).toBeDefined();
		if (!contrast) return;
		// contrast's param is 0..200 with a neutral default of 100, so a slider
		// at +80 must land on 180 — not 1 + 80 * k.
		expect(resolveGradeAmount(contrast, 80)).toBeCloseTo(180, 6);
		expect(resolveGradeAmount(contrast, -80)).toBeCloseTo(20, 6);
	});

	test("glow and box-blur are off at zero, not at their declared default", () => {
		const glow = GLOW_GRAIN_CONTROLS.find((c) => c.effectType === "glow");
		const blur = DETAIL_CONTROLS.find((c) => c.effectType === "box-blur");
		expect(glow).toBeDefined();
		expect(blur).toBeDefined();
		if (!glow || !blur) return;
		// Both declare `default: 50`, but their shaders multiply by `amount`,
		// so 0 is the real no-op. Without `offAt` the shared mapping would
		// call 50 neutral and treat everything below it as a positive push.
		expect(resolveGradeAmount(glow, 0)).toBeNull();
		expect(resolveGradeAmount(blur, 0)).toBeNull();
		expect(resolveGradeAmount(glow, 40)).toBeCloseTo(40, 6);
		expect(resolveGradeAmount(blur, 40)).toBeCloseTo(40, 6);
		// Monotonic away from off: bigger slider, bigger amount.
		expect(resolveGradeAmount(glow, 90) ?? 0).toBeGreaterThan(
			resolveGradeAmount(glow, 30) ?? 0,
		);
	});

	test("tint is a one-sided wash whose off value is zero", () => {
		expect(TINT_CONTROL.sliderMin).toBe(0);
		expect(resolveGradeAmount(TINT_CONTROL, 0)).toBeNull();
		expect(resolveGradeAmount(TINT_CONTROL, 60)).toBeCloseTo(60, 6);
	});
});

describe("readGradeControlValue", () => {
	test("an absent effect reads as the neutral position", () => {
		for (const control of everyControl()) {
			expect(readGradeControlValue([], control)).toBe(
				readGradeNeutral(control),
			);
		}
	});

	test("a stored amount reads back onto the slider", () => {
		const vignette = VIGNETTE_CONTROLS[0];
		const stored = setGradeControlValue({
			effects: [],
			control: vignette,
			sliderValue: 42,
		});
		expect(readGradeControlValue(stored, vignette)).toBeCloseTo(42, 6);
	});
});

describe("setGradeControlValue", () => {
	test("writing creates the effect and keeps every other one", () => {
		const blur = unrelatedEffect();
		const next = setGradeControlValue({
			effects: [blur],
			control: VIGNETTE_CONTROLS[0],
			sliderValue: 30,
		});
		expect(next).toHaveLength(2);
		expect(next[0]).toBe(blur);
		expect(next[1].type).toBe("vignette");
		expect(next[1].params.amount).toBe(30);
	});

	test("returning to neutral removes the effect instead of storing a no-op", () => {
		const control = VIGNETTE_CONTROLS[0];
		const stored = setGradeControlValue({
			effects: [],
			control,
			sliderValue: 30,
		});
		const cleared = setGradeControlValue({
			effects: stored,
			control,
			sliderValue: readGradeNeutral(control),
		});
		expect(cleared).toHaveLength(0);
	});

	test("writing neutral when absent is a no-op", () => {
		const stored = setGradeControlValue({
			effects: [unrelatedEffect()],
			control: VIGNETTE_CONTROLS[0],
			sliderValue: readGradeNeutral(VIGNETTE_CONTROLS[0]),
		});
		expect(stored).toHaveLength(1);
		expect(stored[0].id).toBe("keep-me");
	});

	test("clearGradeControls only strips the effects the caller owns", () => {
		const graded = setGradeControlValue({
			effects: [unrelatedEffect()],
			control: VIGNETTE_CONTROLS[0],
			sliderValue: 30,
		});
		const cleared = clearGradeControls(graded, VIGNETTE_CONTROLS);
		expect(cleared).toHaveLength(1);
		expect(cleared[0].id).toBe("keep-me");
	});
});

describe("wheel bias ⇄ color-wheels hex", () => {
	test("a wheel at rest maps to its own declared neutral colour", () => {
		for (const id of WHEEL_IDS) {
			expect(wheelBiasToHex(id, { x: 0, y: 0, luma: 0 }), id).toBe(
				WHEEL_NEUTRAL_HEX[id],
			);
		}
	});

	test("the neutral colours are the ones color-wheels declares as defaults", () => {
		for (const id of WHEEL_IDS) {
			const params = effectsRegistry.get("color-wheels")?.params;
			const declared = params?.find((param) => param.key === id)?.default;
			expect(WHEEL_NEUTRAL_HEX[id], id).toBe(declared);
		}
	});

	/** Per-channel push of a stored colour away from that wheel's neutral. */
	function pushOf(id: WheelId, bias: { x: number; y: number; luma: number }) {
		const neutral = WHEEL_NEUTRAL_HEX[id].slice(1);
		const stored = wheelBiasToHex(id, bias).slice(1);
		const channel = (hex: string, at: number) =>
			Number.parseInt(hex.slice(at, at + 2), 16);
		return [0, 1, 2].map(
			(i) => channel(stored, i * 2) - channel(neutral, i * 2),
		);
	}

	test("x pushes along the puck's red/cyan axis", () => {
		// The puck colours itself r = (1-x)/2, g = (x-y)/2+0.5, b = (y+1)/2, so
		// x = +1 is cyan (red down, green up) and x = -1 is red.
		const cyan = pushOf("gamma", { x: 1, y: 0, luma: 0 });
		expect(cyan[0]).toBeLessThan(-100);
		expect(cyan[1]).toBeGreaterThan(100);
		const red = pushOf("gamma", { x: -1, y: 0, luma: 0 });
		expect(red[0]).toBeGreaterThan(100);
		expect(red[1]).toBeLessThan(-100);
	});

	test("y pushes along the puck's blue/yellow axis", () => {
		const yellow = pushOf("gamma", { x: 0, y: 1, luma: 0 });
		expect(yellow[2]).toBeGreaterThan(100);
		expect(yellow[1]).toBeLessThan(-100);
		const blue = pushOf("gamma", { x: 0, y: -1, luma: 0 });
		expect(blue[2]).toBeLessThan(-100);
		expect(blue[1]).toBeGreaterThan(100);
	});

	test("the push is additive, so lift clips at black and gain at white", () => {
		// A lift cannot be pushed below its neutral black and a gain cannot go
		// above white. This is the shader's behaviour too — it ADDS the offset
		// — not a mapping bug.
		expect(wheelBiasToHex("lift", { x: 0, y: 0, luma: -1 })).toBe("#000000");
		expect(wheelBiasToHex("gain", { x: 0, y: 0, luma: 1 })).toBe("#ffffff");
		// The in-range half still lands on the expected value.
		expect(wheelBiasToHex("lift", { x: -1, y: 0, luma: 0 })).toBe("#800000");
		expect(wheelBiasToHex("gain", { x: 1, y: 0, luma: 0 })).toBe("#80ffff");
	});

	test("luma moves all three channels together and leaves x / y alone", () => {
		expect(pushOf("gamma", { x: 0, y: 0, luma: 0.5 })).toEqual([64, 64, 64]);
		const biased = hexToWheelBias(
			"gamma",
			wheelBiasToHex("gamma", {
				x: 0.4,
				y: 0.2,
				luma: 0.1,
			}),
		);
		expect(biased.x).toBeCloseTo(0.4, 2);
		expect(biased.y).toBeCloseTo(0.2, 2);
		expect(biased.luma).toBeCloseTo(0.1, 2);
	});

	test("bias round-trips through the 8-bit colour within a quantisation step", () => {
		// `gamma` is the only wheel whose neutral sits mid range, so it is the
		// only one that round-trips over the whole ±1 box; the biases below
		// stay inside the channel range so the additive push never clips.
		for (const bias of [
			{ x: 0.4, y: 0.2, luma: 0.1 },
			{ x: -0.3, y: 0.5, luma: -0.1 },
			{ x: -0.2, y: -0.4, luma: 0.3 },
			{ x: 0, y: 0, luma: 0.5 },
		]) {
			const read = hexToWheelBias("gamma", wheelBiasToHex("gamma", bias));
			expect(read.x, `x for ${JSON.stringify(bias)}`).toBeCloseTo(bias.x, 2);
			expect(read.y, `y for ${JSON.stringify(bias)}`).toBeCloseTo(bias.y, 2);
			expect(read.luma, `luma for ${JSON.stringify(bias)}`).toBeCloseTo(
				bias.luma,
				2,
			);
		}
	});

	test("every wheel at rest round-trips to at rest", () => {
		for (const id of WHEEL_IDS) {
			expect(
				hexToWheelBias(id, wheelBiasToHex(id, { x: 0, y: 0, luma: 0 })),
			).toEqual({ x: 0, y: 0, luma: 0 });
		}
	});

	test("an unstored or malformed colour reads as a wheel at rest", () => {
		for (const id of WHEEL_IDS) {
			expect(hexToWheelBias(id, undefined)).toEqual({
				x: 0,
				y: 0,
				luma: 0,
			});
			expect(hexToWheelBias(id, "not-a-colour")).toEqual({
				x: 0,
				y: 0,
				luma: 0,
			});
		}
	});
});

describe("setWheelBiases", () => {
	const neutral: Record<WheelId, { x: number; y: number; luma: number }> = {
		lift: { x: 0, y: 0, luma: 0 },
		gamma: { x: 0, y: 0, luma: 0 },
		gain: { x: 0, y: 0, luma: 0 },
	};

	test("writing one wheel creates color-wheels and leaves other effects alone", () => {
		const blur = unrelatedEffect();
		const next = setWheelBiases({
			effects: [blur],
			biases: { ...neutral, lift: { x: 0.5, y: 0, luma: 0 } },
		});
		expect(next).toHaveLength(2);
		expect(next[0]).toBe(blur);
		expect(next[1].type).toBe("color-wheels");
		expect(typeof next[1].params.lift).toBe("string");
	});

	test("all wheels at rest stores no effect at all", () => {
		const written = setWheelBiases({
			effects: [],
			biases: { ...neutral, gain: { x: -0.4, y: 0.2, luma: 0 } },
		});
		expect(written).toHaveLength(1);
		const cleared = setWheelBiases({ effects: written, biases: neutral });
		expect(cleared).toHaveLength(0);
	});

	test("a neutral wheel goes back to its neutral colour but keeps the effect", () => {
		const written = setWheelBiases({
			effects: [],
			biases: {
				...neutral,
				lift: { x: 0.5, y: 0, luma: 0 },
				gain: { x: 0, y: 0.5, luma: 0 },
			},
		});
		const parked = setWheelBiases({
			effects: written,
			biases: { ...neutral, gain: { x: 0, y: 0.5, luma: 0 } },
		});
		expect(parked[0].params.lift).toBe(WHEEL_NEUTRAL_HEX.lift);
		expect(parked[0].params.gain).toBe(written[0].params.gain);
	});

	test("never touches an effect the wheels panel does not own", () => {
		const graded = setGradeControlValue({
			effects: [],
			control: VIGNETTE_CONTROLS[0],
			sliderValue: 25,
		});
		const withWheels = setWheelBiases({
			effects: graded,
			biases: { ...neutral, lift: { x: 0.3, y: 0, luma: 0 } },
		});
		expect(withWheels[0]).toEqual(graded[0]);
	});
});
