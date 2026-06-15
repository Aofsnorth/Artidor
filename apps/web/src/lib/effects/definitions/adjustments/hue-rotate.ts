import type { EffectDefinition } from "@/lib/effects/types";

export const hueRotateAdjustmentDefinition: EffectDefinition = {
	type: "hue-rotate",
	name: "Hue Rotate",
	keywords: ["hue", "color", "rotate", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 0,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "hue-rotate",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
							? effectParams.amount
							: Number.parseFloat(String(effectParams.amount));
					return {
						u_amount: (amount * Math.PI) / 180,
					};
				},
			},
		],
	},
};
