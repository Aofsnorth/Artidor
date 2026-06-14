import type { EffectDefinition } from "@/lib/effects/types";

export const grayscaleAdjustmentDefinition: EffectDefinition = {
	type: "grayscale",
	name: "Grayscale",
	keywords: ["grayscale", "black-white", "monochrome", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
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
				shader: "grayscale",
				uniforms: ({ effectParams }) => {
					const amount = typeof effectParams.amount === "number"
						? effectParams.amount
						: Number.parseFloat(String(effectParams.amount));
					return {
						u_amount: amount / 100,
					};
				},
			},
		],
	},
};
