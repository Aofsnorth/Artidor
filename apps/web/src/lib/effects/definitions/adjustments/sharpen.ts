import type { EffectDefinition } from "@/lib/effects/types";

export const sharpenAdjustmentDefinition: EffectDefinition = {
	type: "sharpen",
	name: "Sharpen",
	keywords: ["sharpen", "detail", "clear", "adjust"],
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
				shader: "sharpen",
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
