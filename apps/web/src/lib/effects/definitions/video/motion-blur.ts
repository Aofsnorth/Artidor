import type { EffectDefinition } from "@/lib/effects/types";

export const motionBlurEffectDefinition: EffectDefinition = {
	type: "motion-blur",
	name: "Motion Blur",
	keywords: ["motion", "blur", "trail", "movement"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 10,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "direction",
			label: "Direction (deg)",
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
				shader: "motion-blur",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
							? effectParams.amount
							: Number.parseFloat(String(effectParams.amount));
					const dir =
						typeof effectParams.direction === "number"
							? effectParams.direction
							: Number.parseFloat(String(effectParams.direction));
					const rad = (dir * Math.PI) / 180;
					return {
						u_amount: amount,
						u_direction: [Math.cos(rad), Math.sin(rad)],
					};
				},
			},
		],
	},
};
