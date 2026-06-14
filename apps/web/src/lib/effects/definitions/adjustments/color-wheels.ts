import type { EffectDefinition } from "@/lib/effects/types";

export const colorWheelsAdjustmentDefinition: EffectDefinition = {
	type: "color-wheels",
	name: "Color Wheels",
	keywords: ["color", "wheels", "lift", "gamma", "gain", "adjust"],
	params: [
		{
			key: "lift",
			label: "Lift (shadows)",
			type: "color",
			default: "#000000",
		},
		{
			key: "gamma",
			label: "Gamma (midtones)",
			type: "color",
			default: "#808080",
		},
		{
			key: "gain",
			label: "Gain (highlights)",
			type: "color",
			default: "#ffffff",
		},
	],
	renderer: {
		passes: [
			{
				shader: "color-wheels",
				uniforms: ({ effectParams }) => {
					const hexToRgb = (v: unknown): [number, number, number] => {
						const s = typeof v === "string" ? v.replace("#", "") : "000000";
						const r = Number.parseInt(s.slice(0, 2), 16) / 255;
						const g = Number.parseInt(s.slice(2, 4), 16) / 255;
						const b = Number.parseInt(s.slice(4, 6), 16) / 255;
						return [r, g, b];
					};
					const lift = hexToRgb(effectParams.lift);
					const gamma = hexToRgb(effectParams.gamma);
					const gain = hexToRgb(effectParams.gain);
					return {
						u_lift: [lift[0] - 0.5, lift[1] - 0.5, lift[2] - 0.5],
						u_gamma: [gamma[0] - 0.5, gamma[1] - 0.5, gamma[2] - 0.5],
						u_gain: [gain[0] - 0.5, gain[1] - 0.5, gain[2] - 0.5],
					};
				},
			},
		],
	},
};
