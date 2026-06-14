import type { EffectDefinition } from "@/lib/effects/types";

export const temperatureAdjustmentDefinition: EffectDefinition = {
	type: "temperature",
	name: "Temperature",
	keywords: ["temperature", "warm", "cool", "color", "adjust"],
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
				shader: "temperature",
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
