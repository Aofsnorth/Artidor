import type { EffectDefinition } from "@/lib/effects/types";

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

export const colorBalanceEffectDefinition = singleAmountEffect({
	type: "color-balance",
	name: "Color Balance",
	keywords: ["color", "balance", "warm", "cool", "grade"],
	label: "Amount",
	defaultValue: 50,
});

export const replaceColorEffectDefinition = singleAmountEffect({
	type: "replace-color",
	name: "Replace Color",
	keywords: ["replace", "color", "key", "swap", "green"],
	label: "Tolerance",
	defaultValue: 50,
});

export const tintEffectDefinition = singleAmountEffect({
	type: "tint",
	name: "Tint",
	keywords: ["tint", "color", "wash", "tone", "warm"],
	label: "Amount",
	defaultValue: 50,
});

export const gradientOverlayEffectDefinition = singleAmountEffect({
	type: "gradient-overlay",
	name: "Gradient Overlay",
	keywords: ["gradient", "overlay", "color", "blend"],
	label: "Blend",
	defaultValue: 40,
});

export const fourColorGradientEffectDefinition = singleAmountEffect({
	type: "four-color-gradient",
	name: "Four-Color Gradient",
	keywords: ["gradient", "color", "four", "overlay", "blend"],
	label: "Blend",
	defaultValue: 40,
});
