import type { EffectDefinition } from "@/lib/effects/types";

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
	return clamped / 100;
};

const asNumber = (v: unknown, fallback: number): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	return Number.isFinite(n) ? n : fallback;
};

export const textGlowEffectDefinition: EffectDefinition = {
	type: "text-glow",
	name: "Text Glow",
	keywords: ["text", "glow", "neon", "outline", "alpha"],
	params: [
		{
			key: "amount",
			label: "Radius",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 60,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "text-glow",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
					u_intensity: asAmount01(effectParams.intensity),
				}),
			},
		],
	},
};

export const textStrokeEffectDefinition: EffectDefinition = {
	type: "text-stroke",
	name: "Text Stroke",
	keywords: ["text", "stroke", "outline", "border", "alpha"],
	params: [
		{
			key: "amount",
			label: "Width",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "intensity",
			label: "Opacity",
			type: "number",
			default: 80,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "text-stroke",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
					u_intensity: asAmount01(effectParams.intensity),
				}),
			},
		],
	},
};

export const textShadowEffectDefinition: EffectDefinition = {
	type: "text-shadow",
	name: "Text Shadow",
	keywords: ["text", "shadow", "drop", "offset", "alpha"],
	params: [
		{
			key: "amount",
			label: "Distance",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "intensity",
			label: "Blur",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "direction",
			label: "Angle",
			type: "number",
			default: 45,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "text-shadow",
				uniforms: ({ effectParams }) => {
					const amount = asAmount01(effectParams.amount);
					const intensity = asAmount01(effectParams.intensity);
					const angleDegrees = asNumber(effectParams.direction, 45);
					const angle = (angleDegrees * Math.PI) / 180;
					return {
						u_amount: amount,
						u_intensity: intensity,
						u_direction: [Math.cos(angle), Math.sin(angle)],
					};
				},
			},
		],
	},
};

export const text3dEffectDefinition: EffectDefinition = {
	type: "text-3d",
	name: "Text 3D",
	keywords: ["text", "3d", "extrude", "depth", "alpha"],
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
	],
	renderer: {
		passes: [
			{
				shader: "text-3d",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};
