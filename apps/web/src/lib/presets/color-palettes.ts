/**
 * Curated solid-color palettes (coolors.co style) and gradient presets
 * (uigradients.com style) surfaced in the color picker's "Saved" tab.
 * Hand-picked — no generated filler. Hex values are lowercase `#rrggbb`.
 */

export interface ColorPalette {
	id: string;
	name: string;
	colors: string[];
}

export interface GradientPreset {
	id: string;
	name: string;
	/** A valid CSS `linear-gradient(...)` string usable as a fill. */
	css: string;
}

/** Solid swatch sets — five colors each, distinct moods. */
export const COLOR_PALETTES: ColorPalette[] = [
	{
		id: "sunset",
		name: "Sunset",
		colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
	},
	{
		id: "berry",
		name: "Berry",
		colors: ["#590d22", "#a4133c", "#ff4d6d", "#ff8fa3", "#ffccd5"],
	},
	{
		id: "ocean",
		name: "Ocean",
		colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
	},
	{
		id: "forest",
		name: "Forest",
		colors: ["#081c15", "#1b4332", "#2d6a4f", "#52b788", "#b7e4c7"],
	},
	{
		id: "candy",
		name: "Candy",
		colors: ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"],
	},
	{
		id: "mono",
		name: "Mono",
		colors: ["#0b090a", "#3a3a3a", "#6c757d", "#adb5bd", "#f8f9fa"],
	},
	{
		id: "pastel",
		name: "Pastel",
		colors: ["#cdb4db", "#ffc8dd", "#ffafcc", "#bde0fe", "#a2d2ff"],
	},
	{
		id: "earth",
		name: "Earth",
		colors: ["#582f0e", "#7f4f24", "#936639", "#a68a64", "#c2c5aa"],
	},
	{
		id: "neon",
		name: "Neon",
		colors: ["#f72585", "#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0"],
	},
	{
		id: "autumn",
		name: "Autumn",
		colors: ["#621708", "#941b0c", "#bc3908", "#f6aa1c", "#ffba08"],
	},
];

/** Gradient presets (uigradients.com favourites), as CSS linear-gradients. */
export const GRADIENT_PRESETS: GradientPreset[] = [
	{ id: "purple-bliss", name: "Purple Bliss", css: "linear-gradient(135deg, #360033, #0b8793)" },
	{ id: "cosmic-fusion", name: "Cosmic Fusion", css: "linear-gradient(135deg, #ff00cc, #333399)" },
	{ id: "sunset-uig", name: "Sunset", css: "linear-gradient(135deg, #0b486b, #f56217)" },
	{ id: "instagram", name: "Instagram", css: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" },
	{ id: "mojito", name: "Mojito", css: "linear-gradient(135deg, #1d976c, #93f9b9)" },
	{ id: "bloody-mary", name: "Bloody Mary", css: "linear-gradient(135deg, #ff512f, #dd2476)" },
	{ id: "aqua-marine", name: "Aqua Marine", css: "linear-gradient(135deg, #1a2980, #26d0ce)" },
	{ id: "citrus-peel", name: "Citrus Peel", css: "linear-gradient(135deg, #fdc830, #f37335)" },
	{ id: "royal", name: "Royal", css: "linear-gradient(135deg, #141e30, #243b55)" },
	{ id: "peach", name: "Peach", css: "linear-gradient(135deg, #ed4264, #ffedbc)" },
	{ id: "moonlit", name: "Moonlit Asteroid", css: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)" },
	{ id: "sunrise", name: "Sunrise", css: "linear-gradient(135deg, #ff512f, #f09819)" },
];
