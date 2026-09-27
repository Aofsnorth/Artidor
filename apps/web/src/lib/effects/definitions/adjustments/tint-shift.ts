import type { EffectDefinition } from "@/lib/effects/types";

/**
 * White-balance tint axis: positive pushes magenta, negative pushes green —
 * the axis CapCut's Adjust tab calls "Tint". The pre-existing `tint` effect
 * is a warm colour wash (a creative overlay), not this adjustment, so this
 * gets its own type.
 */
export const tintShiftAdjustmentDefinition: EffectDefinition = {
	type: "tint-shift",
	name: "Tint",
	keywords: ["tint", "green", "magenta", "white balance", "adjust"],
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
				shader: "tint-shift",
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
