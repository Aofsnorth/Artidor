import type { EffectDefinition } from "@/lib/effects/types";

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
	return clamped / 100;
};

export const rotateEffectDefinition: EffectDefinition = {
	type: "rotate",
	name: "Rotate",
	keywords: ["rotate", "spin", "turn", "angle", "transform"],
	params: [
		{
			key: "amount",
			label: "Angle",
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
				shader: "rotate",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const scaleEffectDefinition: EffectDefinition = {
	type: "scale",
	name: "Scale",
	keywords: ["scale", "zoom", "resize", "magnify", "transform"],
	params: [
		{
			key: "amount",
			label: "Zoom",
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
				shader: "scale",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const flipHorizontalEffectDefinition: EffectDefinition = {
	type: "flip-horizontal",
	name: "Flip Horizontal",
	keywords: ["flip", "horizontal", "mirror", "reverse", "transform"],
	params: [
		{
			key: "amount",
			label: "Apply",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "flip-horizontal",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const flipVerticalEffectDefinition: EffectDefinition = {
	type: "flip-vertical",
	name: "Flip Vertical",
	keywords: ["flip", "vertical", "mirror", "reverse", "transform"],
	params: [
		{
			key: "amount",
			label: "Apply",
			type: "number",
			default: 100,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "flip-vertical",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
				}),
			},
		],
	},
};

export const skewEffectDefinition: EffectDefinition = {
	type: "skew",
	name: "Skew",
	keywords: ["skew", "slant", "tilt", "shear", "transform"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "axis",
			label: "Axis",
			type: "select",
			default: "x",
			options: [
				{ value: "x", label: "Horizontal" },
				{ value: "y", label: "Vertical" },
			],
		},
	],
	renderer: {
		passes: [
			{
				shader: "skew",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount),
					u_direction:
						String(effectParams.axis).toLowerCase() === "y" ? [0, 1] : [1, 0],
				}),
			},
		],
	},
};
