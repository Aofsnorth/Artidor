import type { EffectDefinition } from "@/lib/effects/types";

const asAmount01 = (v: unknown): number => {
	const n = typeof v === "number" ? v : Number.parseFloat(String(v));
	const clamped = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
	return clamped / 100;
};

function amountIntensityEffect({
	type,
	name,
	keywords,
	amountLabel,
	intensityLabel,
	amountDefault,
	intensityDefault,
}: {
	type: string;
	name: string;
	keywords: string[];
	amountLabel: string;
	intensityLabel: string;
	amountDefault: number;
	intensityDefault: number;
}): EffectDefinition {
	return {
		type,
		name,
		keywords,
		params: [
			{
				key: "amount",
				label: amountLabel,
				type: "number",
				default: amountDefault,
				min: 0,
				max: 100,
				step: 1,
			},
			{
				key: "intensity",
				label: intensityLabel,
				type: "number",
				default: intensityDefault,
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
						u_intensity: asAmount01(effectParams.intensity),
					}),
				},
			],
		},
	};
}

export const innerGlowEffectDefinition = amountIntensityEffect({
	type: "inner-glow",
	name: "Inner Glow",
	keywords: ["inner", "glow", "edge", "highlight", "rim"],
	amountLabel: "Radius",
	intensityLabel: "Intensity",
	amountDefault: 40,
	intensityDefault: 60,
});

export const edgeGlowEffectDefinition = amountIntensityEffect({
	type: "edge-glow",
	name: "Edge Glow",
	keywords: ["edge", "glow", "outline", "neon", "rim"],
	amountLabel: "Width",
	intensityLabel: "Intensity",
	amountDefault: 35,
	intensityDefault: 70,
});

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

export const contourLinesEffectDefinition = singleAmountEffect({
	type: "contour-lines",
	name: "Contour Lines",
	keywords: ["contour", "lines", "edge", "sketch", "outline"],
	label: "Threshold",
	defaultValue: 50,
});

export const matteEdgeEffectDefinition = singleAmountEffect({
	type: "matte-edge",
	name: "Matte Edge",
	keywords: ["matte", "edge", "border", "outline", "vintage"],
	label: "Width",
	defaultValue: 40,
});
