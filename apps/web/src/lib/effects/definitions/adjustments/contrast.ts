import type { EffectDefinition } from "@/lib/effects/types";

export const contrastAdjustmentDefinition: EffectDefinition = {
	type: "contrast",
	name: "Contrast",
	keywords: ["contrast", "pop", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 100,
			min: 0,
			max: 200,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
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
