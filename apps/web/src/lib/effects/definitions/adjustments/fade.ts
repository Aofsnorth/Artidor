import type { EffectDefinition } from "@/lib/effects/types";

export const fadeAdjustmentDefinition: EffectDefinition = {
	type: "fade",
	name: "Fade",
	keywords: ["fade", "matte", "lift", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 0,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "fade",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
							? effectParams.amount
							: Number.parseFloat(String(effectParams.amount));
					return { u_amount: amount / 100 };
				},
			},
		],
	},
};
