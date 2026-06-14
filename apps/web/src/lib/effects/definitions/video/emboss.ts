import type { EffectDefinition } from "@/lib/effects/types";

export const embossEffectDefinition: EffectDefinition = {
	type: "emboss",
	name: "Emboss",
	keywords: ["emboss", "3d", "metal", "sculpture"],
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
				shader: "emboss",
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
