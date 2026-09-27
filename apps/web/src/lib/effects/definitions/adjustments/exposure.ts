import type { EffectDefinition } from "@/lib/effects/types";

/**
 * Photometric exposure, distinct from the plain-multiplier `brightness`
 * shader. CapCut exposes both: Brightness is a linear multiplier while
 * Exposure moves in stops, so highlights roll off gradually instead of
 * clipping as fast. Slider units are -100..100; the shader maps that to
 * +/- 2 stops.
 */
export const exposureAdjustmentDefinition: EffectDefinition = {
	type: "exposure",
	name: "Exposure",
	keywords: ["exposure", "light", "stops", "adjust"],
	params: [
		{
			key: "amount",
			label: "Amount",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "exposure",
				uniforms: ({ effectParams }) => {
					const amount =
						typeof effectParams.amount === "number"
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
