import type { EffectDefinition } from "@/lib/effects/types";

export const saturationAdjustmentDefinition: EffectDefinition = {
	type: "saturation",
	name: "Saturation",
	keywords: ["saturation", "color", "vibrant", "adjust"],
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
				shader: "saturation",
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
