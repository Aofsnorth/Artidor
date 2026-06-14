import type { EffectDefinition } from "@/lib/effects/types";

export const waveEffectDefinition: EffectDefinition = {
	type: "wave",
	name: "Wave",
	keywords: ["wave", "warp", "distortion", "ripple"],
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
				shader: "wave",
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
