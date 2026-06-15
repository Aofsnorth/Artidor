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
