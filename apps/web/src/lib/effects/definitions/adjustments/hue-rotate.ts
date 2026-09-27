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
			// Symmetric around the neutral 0 so the Adjust tab can expose a
			// CapCut-style -100..100 Hue slider that rotates -180..+180 degrees.
			// A rotation stored by an older preset in 0..360 terms still renders
			// identically (rotation is modular).
			min: -180,
			max: 180,
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
