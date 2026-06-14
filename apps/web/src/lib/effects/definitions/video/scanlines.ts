import type { EffectDefinition } from "@/lib/effects/types";

export const scanlinesEffectDefinition: EffectDefinition = {
	type: "scanlines",
	name: "Scanlines",
	keywords: ["scanlines", "retro", "vhs", "crt", "tv"],
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
				shader: "scanlines",
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
