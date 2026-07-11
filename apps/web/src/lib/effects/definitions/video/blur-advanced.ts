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

export const zoomBlurEffectDefinition: EffectDefinition = {
	type: "zoom-blur",
	name: "Zoom Blur",
	keywords: ["zoom", "blur", "radial", "motion", "speed"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "zoom-blur",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const directionalBlurEffectDefinition: EffectDefinition = {
	type: "directional-blur",
	name: "Directional Blur",
	keywords: ["directional", "blur", "motion", "wind", "streak"],
	params: [
		{
			key: "amount",
			label: "Distance",
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
			default: 0,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "directional-blur",
				uniforms: ({ effectParams }) => {
					const amount = asAmount01(effectParams.amount);
					const angleDegrees = asNumber(effectParams.direction, 0);
					const angle = (angleDegrees * Math.PI) / 180;
					return {
						u_amount: amount,
						u_direction: [Math.cos(angle), Math.sin(angle)],
					};
				},
			},
		],
	},
};

export const boxBlurEffectDefinition: EffectDefinition = {
	type: "box-blur",
	name: "Box Blur",
	keywords: ["box", "blur", "average", "smooth", "uniform"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "box-blur",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const lensBlurEffectDefinition: EffectDefinition = {
	type: "lens-blur",
	name: "Lens Blur",
	keywords: ["lens", "blur", "bokeh", "out", "focus", "depth"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "lens-blur",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const unsharpMaskEffectDefinition: EffectDefinition = {
	type: "unsharp-mask",
	name: "Unsharp Mask",
	keywords: ["unsharp", "mask", "sharpen", "clarity", "edge"],
	params: [
		{
			key: "amount",
			label: "Radius",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "intensity",
			label: "Intensity",
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
				shader: "unsharp-mask",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
					u_intensity: asAmount01(effectParams.intensity),
				}),
			},
		],
	},
};
