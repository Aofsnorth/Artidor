import type { EffectDefinition } from "@/lib/effects/types";

export const rippleEffectDefinition: EffectDefinition = {
	type: "ripple",
	name: "Ripple",
	keywords: ["ripple", "water", "drop", "distortion"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "ripple",
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
