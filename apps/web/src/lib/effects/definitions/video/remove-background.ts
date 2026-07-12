import type { EffectDefinition } from "@/lib/effects/types";

/**
 * Remove Background — auto colour keyer. Samples border texels to detect the
 * dominant background colour, then keys out similar colours with a soft edge
 * and spill suppression. The heavy lifting is the `remove-background` WGSL
 * shader in the Rust effects crate.
 *
 * Unlike Chroma Key (which requires the user to pick a key colour), this
 * effect auto-detects the background from the frame borders, so it works
 * with zero configuration on clips shot against a relatively uniform
 * backdrop (white wall, grey wall, sky, solid sheet).
 */
export const removeBackgroundEffectDefinition: EffectDefinition = {
	type: "remove-background",
	name: "Remove Background",
	keywords: [
		"remove",
		"background",
		"bg",
		"cutout",
		"cut",
		"out",
		"transparent",
		"key",
		"keying",
		"auto",
		"subject",
		"isolate",
	],
	params: [
		{
			key: "tolerance",
			label: "Tolerance",
			type: "number",
			default: 25,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "smoothness",
			label: "Edge Softness",
			type: "number",
			default: 15,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "spill",
			label: "Spill Suppression",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "remove-background",
				uniforms: ({ effectParams }) => {
					const asNumber = (v: unknown, fallback: number): number => {
						const n = typeof v === "number" ? v : Number.parseFloat(String(v));
						return Number.isFinite(n) ? n : fallback;
					};

					// Authored 0..100, operate as colour-distance fractions.
					const tolerance = asNumber(effectParams.tolerance, 25) / 100;
					const smoothness = asNumber(effectParams.smoothness, 15) / 100;
					const spill = asNumber(effectParams.spill, 20) / 100;

					return {
						u_tolerance: tolerance,
						u_smoothness: smoothness,
						u_spill: spill,
					};
				},
			},
		],
	},
};
