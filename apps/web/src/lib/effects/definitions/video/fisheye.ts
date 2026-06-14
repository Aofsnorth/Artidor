import type { EffectDefinition } from "@/lib/effects/types";

export const fisheyeEffectDefinition: EffectDefinition = {
	type: "fisheye",
	name: "Fisheye",
	keywords: ["fisheye", "lens", "barrel", "spherical"],
	params: [
		{
			key: "amount",
			label: "Strength",
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
				shader: "fisheye",
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
