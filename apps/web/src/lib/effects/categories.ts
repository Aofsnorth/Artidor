/**
 * Effect category mapping for the Effects + Adjustments panel filter bars.
 *
 * Kept as a central map keyed by effect `type` rather than a field on every
 * EffectDefinition, so categorising (and re-categorising) is one edit here
 * instead of ~50 definition files. Types not listed fall under "All" only.
 */

/** Category labels for the Effects panel bar, in display order. */
export const EFFECT_CATEGORIES = [
	"Basic",
	"Blur",
	"Light",
	"Glitch",
	"Retro",
	"Cinematic",
	"Stylize",
	"Distortion",
	"Particles",
	"Texture",
	"Artistic",
	"Generator",
] as const;

/**
 * Category labels for the Adjustments panel bar, in display order.
 * The "Color" category here is the home for Alight Motion-style color
 * grading (Grayscale / Sepia / Vintage / Cinematic / Duotone / HSL /
 * etc.) — color grading presets were moved out of the Effects panel
 * entirely so the two panels don't overlap.
 */
export const ADJUST_CATEGORIES = ["Basic", "Color", "Effects"] as const;

const EFFECT_CATEGORY_MAP: Record<string, string> = {
	// Blur
	blur: "Blur",
	"motion-blur": "Blur",
	"velocity-blur": "Blur",
	// Light
	glow: "Light",
	"outer-glow": "Light",
	"neon-boost": "Light",
	"dreamy-bloom": "Light",
	// Glitch
	"chromatic-aberration": "Glitch",
	// Retro / VHS
	scanlines: "Retro",
	"retro-crt": "Retro",
	"matte-film": "Retro",
	// Cinematic
	"cinematic-pop": "Cinematic",
	// Basic
	"chroma-key": "Basic",
	"remove-background": "Basic",
	// Stylize / Distort
	posterize: "Stylize",
	"edge-detect": "Stylize",
	halftone: "Stylize",
	mirror: "Stylize",
	swirl: "Stylize",
	bulge: "Stylize",
	twist: "Stylize",
	thermal: "Stylize",
	duotone: "Color",
	comic: "Stylize",
	ascii: "Retro",
	datamosh: "Glitch",
	"lens-flare": "Light",
	bokeh: "Cinematic",
	vhs: "Retro",
	emboss: "Stylize",
	pixelate: "Stylize",
	stroke: "Stylize",
	"drop-shadow": "Stylize",
	wave: "Stylize",
	ripple: "Stylize",
	fisheye: "Stylize",
	// Color tools that currently live in the Effects panel
	hsl: "Color",
	curves: "Color",
	lut: "Color",
	"color-wheels": "Color",
};

const ADJUST_CATEGORY_MAP: Record<string, string> = {
	// Basic / lighting
	brightness: "Basic",
	contrast: "Basic",
	highlights: "Basic",
	shadows: "Basic",
	whites: "Basic",
	blacks: "Basic",
	fade: "Basic",
	sharpen: "Basic",
	clarity: "Basic",
	dehaze: "Basic",
	// Color / white balance
	temperature: "Color",
	saturation: "Color",
	vibrance: "Color",
	"hue-rotate": "Color",
	grayscale: "Color",
	invert: "Color",
	sepia: "Color",
	// Effects / vignette
	vignette: "Effects",
	grain: "Effects",
};

export function getEffectCategory(type: string): string | undefined {
	return EFFECT_CATEGORY_MAP[type];
}

export function getAdjustCategory(type: string): string | undefined {
	return ADJUST_CATEGORY_MAP[type];
}
