import type { EffectDefinition } from "@/lib/effects/types";

/**
 * Chroma key / green screen. Keys out a chosen colour on the chroma plane
 * (hue/saturation, ignoring brightness) so an evenly-lit green or blue screen
 * drops to transparent, then suppresses colour spill on the retained edges.
 * The heavy lifting is the `chroma-key` WGSL shader in the Rust effects crate.
 */
export const chromaKeyEffectDefinition: EffectDefinition = {
	type: "chroma-key",
	name: "Chroma Key",
	keywords: [
		"chroma",
		"key",
		"green",
		"screen",
		"greenscreen",
		"blue",
		"transparent",
		"keying",
		"composite",
	],
	params: [
		{
			key: "keyColor",
			label: "Key Color",
			type: "color",
			default: "#00ff00",
		},
		{
			key: "similarity",
			label: "Similarity",
			type: "number",
			default: 40,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "smoothness",
			label: "Smoothness",
			type: "number",
			default: 10,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "spill",
			label: "Spill Suppression",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		passes: [
			{
				shader: "chroma-key",
				uniforms: ({ effectParams }) => {
					const hexToRgb = (v: unknown): [number, number, number] => {
						const s = typeof v === "string" ? v.replace("#", "") : "00ff00";
						const r = Number.parseInt(s.slice(0, 2), 16) / 255;
						const g = Number.parseInt(s.slice(2, 4), 16) / 255;
						const b = Number.parseInt(s.slice(4, 6), 16) / 255;
						return [
							Number.isFinite(r) ? r : 0,
							Number.isFinite(g) ? g : 1,
							Number.isFinite(b) ? b : 0,
						];
					};

					const asNumber = (v: unknown, fallback: number): number => {
						const n = typeof v === "number" ? v : Number.parseFloat(String(v));
						return Number.isFinite(n) ? n : fallback;
					};

					const keyColor = hexToRgb(effectParams.keyColor);
					// Similarity/smoothness are authored 0..100 but operate as
					// chroma-plane distances (~0..0.7), so scale into that range.
					const similarity = asNumber(effectParams.similarity, 40) / 100;
					const smoothness = asNumber(effectParams.smoothness, 10) / 100;
					const spill = asNumber(effectParams.spill, 30) / 100;

					return {
						u_key_color: keyColor,
						u_similarity: similarity,
						u_smoothness: smoothness,
						u_spill: spill,
					};
				},
			},
		],
	},
};
