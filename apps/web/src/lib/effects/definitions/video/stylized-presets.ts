import type { EffectDefinition } from "@/lib/effects/types";

function readAmount(value: unknown, fallback: number): number {
	const parsed =
		typeof value === "number" ? value : Number.parseFloat(String(value));
	return Number.isFinite(parsed) ? parsed : fallback;
}

const intensityParam = {
	key: "intensity",
	label: "Intensity",
	type: "number" as const,
	default: 70,
	min: 0,
	max: 100,
	step: 1,
};

export const cinematicPopEffectDefinition: EffectDefinition = {
	type: "cinematic-pop",
	name: "Cinematic Pop",
	keywords: ["cinematic", "pop", "contrast", "color", "preset"],
	params: [intensityParam],
	renderer: {
		passes: [
			{
				shader: "brightness",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0012 };
				},
			},
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0022 };
				},
			},
			{
				shader: "saturation",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0018 };
				},
			},
			{
				shader: "vignette",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.0045 };
				},
			},
		],
	},
};

export const matteFilmEffectDefinition: EffectDefinition = {
	type: "matte-film",
	name: "Matte Film",
	keywords: ["matte", "film", "soft", "grain", "preset"],
	params: [intensityParam],
	renderer: {
		passes: [
			{
				shader: "brightness",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0006 };
				},
			},
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 - amount * 0.001 };
				},
			},
			{
				shader: "saturation",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 - amount * 0.0012 };
				},
			},
			{
				shader: "grain",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.012 };
				},
			},
		],
	},
};

export const neonBoostEffectDefinition: EffectDefinition = {
	type: "neon-boost",
	name: "Neon Boost",
	keywords: ["neon", "glow", "cyber", "color", "preset"],
	params: [intensityParam],
	renderer: {
		passes: [
			{
				shader: "saturation",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.004 };
				},
			},
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0016 };
				},
			},
			{
				shader: "glow",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.0075 };
				},
			},
		],
	},
};

export const dreamyBloomEffectDefinition: EffectDefinition = {
	type: "dreamy-bloom",
	name: "Dreamy Bloom",
	keywords: ["dream", "bloom", "soft", "glow", "preset"],
	params: [intensityParam],
	renderer: {
		passes: [
			{
				shader: "brightness",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0018 };
				},
			},
			{
				shader: "saturation",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.001 };
				},
			},
			{
				shader: "glow",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.0065 };
				},
			},
		],
	},
};

export const retroCrtEffectDefinition: EffectDefinition = {
	type: "retro-crt",
	name: "Retro CRT",
	keywords: ["retro", "crt", "scanlines", "vhs", "preset"],
	params: [intensityParam],
	renderer: {
		passes: [
			{
				shader: "contrast",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: 1 + amount * 0.0014 };
				},
			},
			{
				shader: "scanlines",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.008 };
				},
			},
			{
				shader: "grain",
				uniforms: ({ effectParams }) => {
					const amount = readAmount(effectParams.intensity, 70);
					return { u_amount: amount * 0.01 };
				},
			},
		],
	},
};
