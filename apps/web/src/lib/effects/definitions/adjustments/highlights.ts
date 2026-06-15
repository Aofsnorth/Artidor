import type { EffectDefinition } from "@/lib/effects/types";

export const highlightsAdjustmentDefinition: EffectDefinition = {
	type: "highlights",
	name: "Highlights",
	keywords: ["highlights", "bright", "light", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "highlights",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
							? effectParams.amount
							: Number.parseFloat(String(effectParams.amount));
					return {
						u_amount: amount,
					};
				},
			},
		],
	},
};
