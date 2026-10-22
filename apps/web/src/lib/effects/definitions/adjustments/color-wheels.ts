import type { EffectDefinition } from "@/lib/effects/types";

/** Neutral wheel value: subtracting 0.5 yields a zero shift. */
const NEUTRAL_RGB: [number, number, number] = [0.5, 0.5, 0.5];

/**
 * Parse a 3- or 6-digit hex colour into normalised RGB. Invalid, short or
 * non-hex input falls back to neutral instead of producing NaN uniforms.
 */
function hexToRgb(value: unknown): [number, number, number] {
	if (typeof value !== "string") return NEUTRAL_RGB;
	const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (!match) return NEUTRAL_RGB;
	const hex =
		match[1].length === 3
			? [...match[1]].map((char) => char + char).join("")
			: match[1];
	const channel = (start: number): number => {
		const parsed = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
		return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.5;
	};
	return [channel(0), channel(2), channel(4)];
}

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
