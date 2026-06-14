import type { EffectDefinition } from "@/lib/effects/types";

export const pixelateEffectDefinition: EffectDefinition = {
	type: "pixelate",
	name: "Pixelate",
	keywords: ["pixelate", "mosaic", "block", "pixel"],
	params: [
		{
			key: "amount",
			label: "Size",
			type: "number",
			default: 8,
			min: 2,
			max: 64,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "pixelate",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
							? effectParams.amount
							: Number.parseFloat(String(effectParams.amount));
					return { u_amount: amount };
				},
			},
		],
	},
};
