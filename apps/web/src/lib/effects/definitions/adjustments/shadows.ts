import type { EffectDefinition } from "@/lib/effects/types";

export const shadowsAdjustmentDefinition: EffectDefinition = {
	type: "shadows",
	name: "Shadows",
	keywords: ["shadows", "dark", "light", "adjust"],
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
				shader: "shadows",
				uniforms: ({ effectParams }) => {
					const amount = typeof effectParams.amount === "number"
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
