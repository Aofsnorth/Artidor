/**
 * A filter preset is a named bundle of one or more effects with their default
 * parameter values. Applying a preset creates a single "filter" element on the
 * clip that internally carries all the bundled effects. This matches CapCut's
 * one-click "filter" UX where users see "Vintage" / "Cinematic" / "Warm" in
 * a gallery and just tap one to apply.
 */

export type FilterCategory =
	| "vintage"
	| "cinematic"
	| "film"
	| "bw"
	| "warm"
	| "cool"
	| "moody"
	| "dream"
	| "retro"
	| "neon"
	| "polaroid"
	| "movie"
	| "korea"
	| "social";

export interface FilterEffectSpec {
	type: string;
	params: Record<string, number | string>;
}

export interface FilterPreset {
	id: string;
	name: string;
	category: FilterCategory;
	thumbnailColor: [number, number, number]; // RGB for thumbnail swatch
	description: string;
	effects: FilterEffectSpec[];
}

/**
 * Catalog of one-click filter presets. Each preset bundles a set of clip
 * effects (the existing adjustment + video effect definitions) with the
 * right parameters. When the user picks one, we create a single filter
 * element that carries all of them.
 *
 * Categories match the rest of the project's grouping (B&W, Cinematic, …).
 */
export const FILTER_PRESETS: FilterPreset[] = [
	{
		id: "cinematic-warm",
		name: "Cinematic Warm",
		category: "cinematic",
		thumbnailColor: [180, 120, 60],
		description: "Warm film-like color with crushed shadows and soft contrast",
		effects: [
			{ type: "temperature", params: { amount: 30 } },
			{ type: "contrast", params: { amount: 115 } },
			{ type: "saturation", params: { amount: 110 } },
			{ type: "shadows", params: { amount: -30 } },
			{ type: "highlights", params: { amount: -20 } },
			{ type: "vignette", params: { amount: 30 } },
		],
	},
	{
		id: "cinematic-cool",
		name: "Cinematic Cool",
		category: "cinematic",
		thumbnailColor: [60, 110, 180],
		description: "Cold teal-and-orange blockbuster look",
		effects: [
			{ type: "temperature", params: { amount: -30 } },
			{ type: "contrast", params: { amount: 120 } },
			{ type: "saturation", params: { amount: 105 } },
			{ type: "highlights", params: { amount: 10 } },
			{ type: "vignette", params: { amount: 40 } },
		],
	},
	{
		id: "cinematic-blockbuster",
		name: "Blockbuster",
		category: "cinematic",
		thumbnailColor: [40, 80, 140],
		description: "Punchy contrast with teal shadows and orange highlights",
		effects: [
			{ type: "contrast", params: { amount: 130 } },
			{ type: "saturation", params: { amount: 120 } },
			{ type: "shadows", params: { amount: -40 } },
			{ type: "highlights", params: { amount: 20 } },
			{ type: "vibrance", params: { amount: 30 } },
		],
	},
	{
		id: "vintage-70s",
		name: "Vintage 70s",
		category: "vintage",
		thumbnailColor: [180, 130, 80],
		description: "Faded film stock with warm color shift",
		effects: [
			{ type: "temperature", params: { amount: 25 } },
			{ type: "fade", params: { amount: 30 } },
			{ type: "sepia", params: { amount: 30 } },
			{ type: "contrast", params: { amount: 90 } },
			{ type: "saturation", params: { amount: 80 } },
			{ type: "grain", params: { amount: 25 } },
		],
	},
	{
		id: "vintage-80s",
		name: "Vintage 80s",
		category: "vintage",
		thumbnailColor: [200, 100, 150],
		description: "Magenta-tinted retro look with grain",
		effects: [
			{ type: "hue-rotate", params: { amount: 340 } },
			{ type: "saturation", params: { amount: 120 } },
			{ type: "contrast", params: { amount: 110 } },
			{ type: "grain", params: { amount: 40 } },
		],
	},
	{
		id: "vintage-90s",
		name: "Vintage 90s",
		category: "vintage",
		thumbnailColor: [150, 180, 110],
		description: "Faded colors with greenish highlights",
		effects: [
			{ type: "fade", params: { amount: 35 } },
			{ type: "saturation", params: { amount: 85 } },
			{ type: "contrast", params: { amount: 95 } },
			{ type: "temperature", params: { amount: 10 } },
			{ type: "grain", params: { amount: 30 } },
		],
	},
	{
		id: "film-kodak",
		name: "Kodak Film",
		category: "film",
		thumbnailColor: [220, 180, 110],
		description: "Warm Kodak Portra film emulation",
		effects: [
			{ type: "temperature", params: { amount: 18 } },
			{ type: "saturation", params: { amount: 90 } },
			{ type: "fade", params: { amount: 18 } },
			{ type: "highlights", params: { amount: -15 } },
			{ type: "shadows", params: { amount: -10 } },
			{ type: "contrast", params: { amount: 95 } },
		],
	},
	{
		id: "film-fuji",
		name: "Fuji Film",
		category: "film",
		thumbnailColor: [110, 200, 180],
		description: "Cool Fuji Superia film emulation",
		effects: [
			{ type: "temperature", params: { amount: -15 } },
			{ type: "saturation", params: { amount: 85 } },
			{ type: "contrast", params: { amount: 100 } },
			{ type: "shadows", params: { amount: 10 } },
			{ type: "highlights", params: { amount: -10 } },
		],
	},
	{
		id: "bw-classic",
		name: "B&W Classic",
		category: "bw",
		thumbnailColor: [128, 128, 128],
		description: "Pure black-and-white with high contrast",
		effects: [
			{ type: "grayscale", params: { amount: 100 } },
			{ type: "contrast", params: { amount: 120 } },
		],
	},
	{
		id: "bw-noir",
		name: "B&W Noir",
		category: "bw",
		thumbnailColor: [40, 40, 40],
		description: "Dark, high-contrast film noir",
		effects: [
			{ type: "grayscale", params: { amount: 100 } },
			{ type: "contrast", params: { amount: 150 } },
			{ type: "brightness", params: { amount: 80 } },
			{ type: "shadows", params: { amount: -50 } },
			{ type: "grain", params: { amount: 50 } },
		],
	},
	{
		id: "bw-silver",
		name: "B&W Silver",
		category: "bw",
		thumbnailColor: [180, 180, 180],
		description: "Light, soft monochrome with silver tones",
		effects: [
			{ type: "grayscale", params: { amount: 100 } },
			{ type: "brightness", params: { amount: 110 } },
			{ type: "contrast", params: { amount: 90 } },
		],
	},
	{
		id: "warm-glow",
		name: "Warm Glow",
		category: "warm",
		thumbnailColor: [230, 160, 100],
		description: "Soft warm glow with lifted shadows",
		effects: [
			{ type: "temperature", params: { amount: 40 } },
			{ type: "shadows", params: { amount: 25 } },
			{ type: "saturation", params: { amount: 110 } },
			{ type: "glow", params: { amount: 30 } },
		],
	},
	{
		id: "warm-sunset",
		name: "Sunset",
		category: "warm",
		thumbnailColor: [240, 110, 70],
		description: "Vibrant orange sunset tones",
		effects: [
			{ type: "temperature", params: { amount: 50 } },
			{ type: "saturation", params: { amount: 130 } },
			{ type: "contrast", params: { amount: 110 } },
			{ type: "highlights", params: { amount: -10 } },
		],
	},
	{
		id: "warm-autumn",
		name: "Autumn",
		category: "warm",
		thumbnailColor: [180, 110, 50],
		description: "Warm orange and gold autumn tones",
		effects: [
			{ type: "temperature", params: { amount: 35 } },
			{ type: "saturation", params: { amount: 115 } },
			{ type: "contrast", params: { amount: 105 } },
			{ type: "fade", params: { amount: 15 } },
		],
	},
	{
		id: "cool-ice",
		name: "Ice",
		category: "cool",
		thumbnailColor: [150, 220, 230],
		description: "Cold blue ice tones",
		effects: [
			{ type: "temperature", params: { amount: -50 } },
			{ type: "saturation", params: { amount: 90 } },
			{ type: "contrast", params: { amount: 105 } },
			{ type: "shadows", params: { amount: 20 } },
		],
	},
	{
		id: "cool-ocean",
		name: "Ocean",
		category: "cool",
		thumbnailColor: [40, 130, 180],
		description: "Deep blue ocean tones",
		effects: [
			{ type: "temperature", params: { amount: -35 } },
			{ type: "saturation", params: { amount: 110 } },
			{ type: "contrast", params: { amount: 115 } },
			{ type: "highlights", params: { amount: -10 } },
		],
	},
	{
		id: "cool-mint",
		name: "Mint",
		category: "cool",
		thumbnailColor: [150, 220, 180],
		description: "Fresh mint green tones",
		effects: [
			{ type: "hue-rotate", params: { amount: 150 } },
			{ type: "saturation", params: { amount: 110 } },
			{ type: "brightness", params: { amount: 105 } },
		],
	},
	{
		id: "moody-dark",
		name: "Moody Dark",
		category: "moody",
		thumbnailColor: [40, 35, 50],
		description: "Dark cinematic moody look",
		effects: [
			{ type: "brightness", params: { amount: 75 } },
			{ type: "contrast", params: { amount: 130 } },
			{ type: "saturation", params: { amount: 80 } },
			{ type: "shadows", params: { amount: -50 } },
			{ type: "vignette", params: { amount: 60 } },
		],
	},
	{
		id: "moody-cinematic",
		name: "Cinematic Moody",
		category: "moody",
		thumbnailColor: [50, 40, 60],
		description: "Teal-and-orange cinematic look",
		effects: [
			{ type: "temperature", params: { amount: -25 } },
			{ type: "saturation", params: { amount: 115 } },
			{ type: "contrast", params: { amount: 130 } },
			{ type: "shadows", params: { amount: 30 } },
			{ type: "vibrance", params: { amount: 25 } },
		],
	},
	{
		id: "dream-soft",
		name: "Dream",
		category: "dream",
		thumbnailColor: [200, 180, 220],
		description: "Soft dreamy ethereal look",
		effects: [
			{ type: "brightness", params: { amount: 110 } },
			{ type: "contrast", params: { amount: 80 } },
			{ type: "saturation", params: { amount: 75 } },
			{ type: "fade", params: { amount: 35 } },
			{ type: "glow", params: { amount: 25 } },
		],
	},
	{
		id: "dream-pastel",
		name: "Pastel",
		category: "dream",
		thumbnailColor: [220, 200, 220],
		description: "Light pastel tones",
		effects: [
			{ type: "brightness", params: { amount: 115 } },
			{ type: "saturation", params: { amount: 75 } },
			{ type: "fade", params: { amount: 25 } },
			{ type: "contrast", params: { amount: 90 } },
		],
	},
	{
		id: "retro-arcade",
		name: "Retro Arcade",
		category: "retro",
		thumbnailColor: [255, 100, 200],
		description: "Bright neon retro arcade look",
		effects: [
			{ type: "saturation", params: { amount: 160 } },
			{ type: "contrast", params: { amount: 130 } },
			{ type: "scanlines", params: { amount: 40 } },
			{ type: "chromatic-aberration", params: { amount: 30 } },
		],
	},
	{
		id: "retro-vhs",
		name: "Retro VHS",
		category: "retro",
		thumbnailColor: [180, 130, 200],
		description: "80s VHS home video look",
		effects: [
			{ type: "scanlines", params: { amount: 50 } },
			{ type: "chromatic-aberration", params: { amount: 40 } },
			{ type: "grain", params: { amount: 50 } },
			{ type: "contrast", params: { amount: 90 } },
			{ type: "saturation", params: { amount: 85 } },
		],
	},
	{
		id: "retro-8mm",
		name: "Retro 8mm",
		category: "retro",
		thumbnailColor: [200, 150, 100],
		description: "8mm home movie look",
		effects: [
			{ type: "sepia", params: { amount: 50 } },
			{ type: "grain", params: { amount: 60 } },
			{ type: "vignette", params: { amount: 50 } },
			{ type: "fade", params: { amount: 20 } },
		],
	},
	{
		id: "neon-cyber",
		name: "Neon Cyber",
		category: "neon",
		thumbnailColor: [255, 50, 200],
		description: "Cyberpunk neon glow",
		effects: [
			{ type: "saturation", params: { amount: 150 } },
			{ type: "contrast", params: { amount: 130 } },
			{ type: "glow", params: { amount: 60 } },
			{ type: "chromatic-aberration", params: { amount: 50 } },
		],
	},
	{
		id: "neon-synthwave",
		name: "Synthwave",
		category: "neon",
		thumbnailColor: [255, 80, 180],
		description: "80s synthwave aesthetic",
		effects: [
			{ type: "temperature", params: { amount: 20 } },
			{ type: "saturation", params: { amount: 160 } },
			{ type: "contrast", params: { amount: 120 } },
			{ type: "vignette", params: { amount: 50 } },
			{ type: "glow", params: { amount: 40 } },
		],
	},
	{
		id: "polaroid-classic",
		name: "Polaroid",
		category: "polaroid",
		thumbnailColor: [240, 210, 150],
		description: "Classic Polaroid film look",
		effects: [
			{ type: "temperature", params: { amount: 30 } },
			{ type: "fade", params: { amount: 25 } },
			{ type: "contrast", params: { amount: 90 } },
			{ type: "saturation", params: { amount: 90 } },
			{ type: "vignette", params: { amount: 40 } },
		],
	},
	{
		id: "movie-teal-orange",
		name: "Hollywood",
		category: "movie",
		thumbnailColor: [200, 100, 50],
		description: "Teal-and-orange Hollywood blockbuster",
		effects: [
			{ type: "temperature", params: { amount: 15 } },
			{ type: "saturation", params: { amount: 125 } },
			{ type: "contrast", params: { amount: 130 } },
			{ type: "highlights", params: { amount: 30 } },
			{ type: "shadows", params: { amount: -30 } },
		],
	},
	{
		id: "korea-fade",
		name: "K-Drama",
		category: "korea",
		thumbnailColor: [200, 180, 200],
		description: "Soft pink K-drama tones",
		effects: [
			{ type: "temperature", params: { amount: 20 } },
			{ type: "brightness", params: { amount: 110 } },
			{ type: "fade", params: { amount: 20 } },
			{ type: "saturation", params: { amount: 85 } },
		],
	},
	{
		id: "social-vivid",
		name: "Social Vivid",
		category: "social",
		thumbnailColor: [255, 100, 200],
		description: "Vivid and bright for social media",
		effects: [
			{ type: "saturation", params: { amount: 130 } },
			{ type: "vibrance", params: { amount: 50 } },
			{ type: "contrast", params: { amount: 115 } },
			{ type: "brightness", params: { amount: 105 } },
		],
	},
	{
		id: "social-clean",
		name: "Social Clean",
		category: "social",
		thumbnailColor: [240, 240, 240],
		description: "Clean bright look for social media",
		effects: [
			{ type: "brightness", params: { amount: 108 } },
			{ type: "saturation", params: { amount: 115 } },
			{ type: "contrast", params: { amount: 105 } },
		],
	},
];

export const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
	{ id: "cinematic", label: "Cinematic" },
	{ id: "vintage", label: "Vintage" },
	{ id: "film", label: "Film" },
	{ id: "bw", label: "B&W" },
	{ id: "warm", label: "Warm" },
	{ id: "cool", label: "Cool" },
	{ id: "moody", label: "Moody" },
	{ id: "dream", label: "Dream" },
	{ id: "retro", label: "Retro" },
	{ id: "neon", label: "Neon" },
	{ id: "polaroid", label: "Polaroid" },
	{ id: "movie", label: "Movie" },
	{ id: "korea", label: "K-Drama" },
	{ id: "social", label: "Social" },
];

export function getFilterPresetById(id: string): FilterPreset | undefined {
	return FILTER_PRESETS.find((p) => p.id === id);
}
