import type { EffectDefinition } from "@/lib/effects/types";

// Parametric video effects ported from DonkeyCut (Apache 2.0,
// github.com/DonkeyCut/Donkey — site/packages/effects-kit/src/effects.ts).
// Each drives the matching WGSL shader in the Rust effects crate with an
// `u_amount` knob (0..1) and element-local time in seconds.

const TICKS_PER_SECOND = 120_000;

const amount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) / 100 : 0.5;
};

const numberOr = (v: unknown, fallback: number): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	return Number.isFinite(n) ? n : fallback;
};

const timeSeconds = (localTime?: number): number =>
	Math.max(0, (localTime ?? 0) / TICKS_PER_SECOND);

function singleAmountEffect({
	type,
	name,
	keywords,
	label,
	defaultValue,
	shader,
}: {
	type: string;
	name: string;
	keywords: string[];
	label: string;
	defaultValue: number;
	shader: string;
}): EffectDefinition {
	return {
		type,
		name,
		keywords,
		params: [
			{
				key: "amount",
				label,
				type: "number",
				default: defaultValue,
				min: 0,
				max: 100,
				step: 1,
			},
		],
		renderer: {
			passes: [
				{
					shader,
					uniforms: ({ effectParams, localTime }) => ({
						u_amount: amount01(effectParams.amount),
						u_time: timeSeconds(localTime),
					}),
				},
			],
		},
	};
}

/** Push in on one point of the frame over a ramp, then hold. */
export const zoomPushEffectDefinition: EffectDefinition = {
	type: "zoom-push",
	name: "Zoom Push",
	keywords: ["zoom", "push", "ken burns", "scale", "move"],
	params: [
		{
			key: "amount",
			label: "Depth",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "focusX",
			label: "Focus X",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "focusY",
			label: "Focus Y",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "ramp",
			label: "Ramp (s)",
			type: "number",
			default: 0.5,
			min: 0,
			max: 4,
			step: 0.1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "zoom-push",
				uniforms: ({ effectParams, localTime }) => ({
					u_amount: amount01(effectParams.amount),
					u_focus: [
						numberOr(effectParams.focusX, 50) / 100,
						numberOr(effectParams.focusY, 50) / 100,
					],
					u_ramp: Math.min(4, Math.max(0, numberOr(effectParams.ramp, 0.5))),
					u_time: timeSeconds(localTime),
				}),
			},
		],
	},
};

export const shakeEffectDefinition = singleAmountEffect({
	type: "shake",
	name: "Camera Shake",
	keywords: ["shake", "camera", "jitter", "handheld", "impact"],
	label: "Amplitude",
	defaultValue: 50,
	shader: "shake",
});

export const lightLeakEffectDefinition = singleAmountEffect({
	type: "lightleak",
	name: "Light Leak",
	keywords: ["light", "leak", "flare", "bloom", "streak", "warm"],
	label: "Amount",
	defaultValue: 50,
	shader: "lightleak",
});

export const flashEffectDefinition = singleAmountEffect({
	type: "flash",
	name: "Flash",
	keywords: ["flash", "white", "pop", "impact", "strobe"],
	label: "Intensity",
	defaultValue: 70,
	shader: "flash",
});

export const chromaGlitchEffectDefinition = singleAmountEffect({
	type: "chroma-glitch",
	name: "Glitch",
	keywords: ["glitch", "chroma", "tearing", "digital", "distort", "rgb"],
	label: "Amount",
	defaultValue: 50,
	shader: "chroma-glitch",
});
