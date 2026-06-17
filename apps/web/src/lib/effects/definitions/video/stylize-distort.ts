import type { EffectDefinition } from "@/lib/effects/types";

// A batch of single-knob GPU effects. Each maps a 0..100 "amount" slider to a
// normalized 0..1 `u_amount` uniform consumed by the matching WGSL shader in
// the Rust effects crate. Grouped here because they share that exact shape.

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
	return clamped / 100;
};

function singleAmountEffect({
	type,
	name,
	keywords,
	label,
	defaultValue,
}: {
	type: string;
	name: string;
	keywords: string[];
	label: string;
	defaultValue: number;
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
					shader: type,
					uniforms: ({ effectParams }) => ({
						u_amount: asAmount01(effectParams.amount),
					}),
				},
			],
		},
	};
}

export const posterizeEffectDefinition = singleAmountEffect({
	type: "posterize",
	name: "Posterize",
	keywords: ["posterize", "levels", "quantize", "banding", "poster"],
	label: "Levels",
	defaultValue: 60,
});

export const edgeDetectEffectDefinition = singleAmountEffect({
	type: "edge-detect",
	name: "Edge Detect",
	keywords: ["edge", "detect", "outline", "sobel", "sketch", "lines"],
	label: "Strength",
	defaultValue: 50,
});

export const halftoneEffectDefinition = singleAmountEffect({
	type: "halftone",
	name: "Halftone",
	keywords: ["halftone", "dots", "print", "newsprint", "comic", "pop art"],
	label: "Amount",
	defaultValue: 50,
});

export const mirrorEffectDefinition = singleAmountEffect({
	type: "mirror",
	name: "Kaleidoscope",
	keywords: ["mirror", "kaleidoscope", "reflect", "symmetry", "wedge"],
	label: "Segments",
	defaultValue: 40,
});

export const swirlEffectDefinition = singleAmountEffect({
	type: "swirl",
	name: "Swirl",
	keywords: ["swirl", "twist", "spiral", "rotate", "whirl", "distort"],
	label: "Amount",
	defaultValue: 50,
});

export const bulgeEffectDefinition = singleAmountEffect({
	type: "bulge",
	name: "Bulge / Pinch",
	keywords: ["bulge", "pinch", "spherize", "warp", "fisheye", "distort"],
	label: "Amount",
	defaultValue: 75,
});

export const twistEffectDefinition = singleAmountEffect({
	type: "twist",
	name: "Twist",
	keywords: ["twist", "spiral", "rotate", "warp", "distort"],
	label: "Amount",
	defaultValue: 40,
});

export const thermalEffectDefinition = singleAmountEffect({
	type: "thermal",
	name: "Thermal",
	keywords: ["thermal", "heat", "infrared", "predator", "temperature", "flir"],
	label: "Amount",
	defaultValue: 100,
});

export const duotoneEffectDefinition: EffectDefinition = {
	type: "duotone",
	name: "Duotone",
	keywords: ["duotone", "two", "tone", "duo", "spotify", "gradient"],
	params: [
		{
			key: "amount",
			label: "Blend",
			type: "number",
			default: 70,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "saturation",
				uniforms: ({ effectParams }) => ({
					u_amount: 1 - asAmount01(effectParams.amount) * 0.95,
				}),
			},
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => ({
					u_amount: 1 + asAmount01(effectParams.amount) * 0.002,
				}),
			},
		],
	},
};

export const comicEffectDefinition: EffectDefinition = {
	type: "comic",
	name: "Comic",
	keywords: ["comic", "cartoon", "anime", "cel", "shading", "halftone"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "saturation",
				uniforms: ({ effectParams }) => ({
					u_amount: 1 + asAmount01(effectParams.amount) * 0.0035,
				}),
			},
			{
				shader: "edge-detect",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.5,
				}),
			},
		],
	},
};

export const asciiEffectDefinition: EffectDefinition = {
	type: "ascii",
	name: "ASCII",
	keywords: ["ascii", "text", "matrix", "terminal", "code", "monochrome"],
	params: [
		{
			key: "amount",
			label: "Density",
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
				shader: "grayscale",
				uniforms: () => ({ u_amount: 1 }),
			},
			{
				shader: "pixelate",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.6,
				}),
			},
		],
	},
};

export const datamoshEffectDefinition: EffectDefinition = {
	type: "datamosh",
	name: "Datamosh",
	keywords: ["datamosh", "glitch", "compression", "artifact", "blocky"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "pixelate",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.7,
				}),
			},
			{
				shader: "scanlines",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.01,
				}),
			},
		],
	},
};

export const lensFlareEffectDefinition: EffectDefinition = {
	type: "lens-flare",
	name: "Lens Flare",
	keywords: ["lens", "flare", "anamorphic", "streak", "light", "sun"],
	params: [
		{
			key: "amount",
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
				shader: "brightness",
				uniforms: ({ effectParams }) => ({
					u_amount: 1 + asAmount01(effectParams.amount) * 0.001,
				}),
			},
			{
				shader: "glow",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.012,
				}),
			},
		],
	},
};

export const bokehEffectDefinition: EffectDefinition = {
	type: "bokeh",
	name: "Bokeh",
	keywords: ["bokeh", "blur", "out", "of", "focus", "cinematic", "depth"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "blur",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.6,
				}),
			},
		],
	},
};

export const vhsEffectDefinition: EffectDefinition = {
	type: "vhs",
	name: "VHS",
	keywords: ["vhs", "retro", "tape", "analog", "crt", "80s", "90s"],
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
				shader: "scanlines",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.012,
				}),
			},
			{
				shader: "grain",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.012,
				}),
			},
			{
				shader: "chromatic-aberration",
				uniforms: ({ effectParams }) => ({
					u_amount: asAmount01(effectParams.amount) * 0.3,
				}),
			},
		],
	},
};
