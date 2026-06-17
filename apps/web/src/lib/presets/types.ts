// Shared types for the preset libraries.
// Header: 0 runtime exports aside from types; no data.

import type { CreateTimelineElement, TrackType } from "@/lib/timeline";

export type Easing =
	| "linear"
	| "ease"
	| "ease-in"
	| "ease-out"
	| "ease-in-out"
	| "ease-in-quad"
	| "ease-out-quad"
	| "ease-in-out-quad"
	| "ease-in-cubic"
	| "ease-out-cubic"
	| "ease-in-out-cubic"
	| "ease-in-quart"
	| "ease-out-quart"
	| "ease-in-out-quart"
	| "ease-in-expo"
	| "ease-out-expo"
	| "ease-in-out-expo"
	| "ease-in-back"
	| "ease-out-back"
	| "ease-in-out-back"
	| "ease-in-bounce"
	| "ease-out-bounce"
	| "ease-in-out-bounce"
	| "cubic-bezier(.68,-.55,.27,1.55)"
	| "cubic-bezier(.34,1.56,.64,1)"
	| "cubic-bezier(.87,0,.13,1)"
	| "cubic-bezier(.65,0,.35,1)"
	| "steps(6,end)";

// ─── Stickers ──────────────────────────────────────────────────────────────

export type StickerKind =
	| { kind: "emoji"; char: string }
	| { kind: "svg"; viewBox: string; paths: string[]; fill?: string };

export type StickerSubcategory =
	| "Emotions"
	| "Animals"
	| "Food"
	| "Tech"
	| "Travel"
	| "Sports"
	| "Music"
	| "Weather"
	| "Celebration"
	| "Gaming";

export interface Sticker {
	id: string;
	name: string;
	description: string;
	category: "sticker";
	subcategory: StickerSubcategory;
	visual: string;
	asset: StickerKind;
}

// ─── Overlays ──────────────────────────────────────────────────────────────

export type OverlaySubcategory =
	| "LightLeak"
	| "Dust"
	| "Scratch"
	| "FilmGrain"
	| "LensFlare"
	| "Snow"
	| "Rain"
	| "Fog"
	| "Smoke"
	| "Glitter"
	| "Sparkle"
	| "Bokeh"
	| "Halftone"
	| "Halo"
	| "Vignette"
	| "Glitch"
	| "Paper"
	| "Neon"
	| "Prismatic"
	| "Holographic"
	| "VHS";

export type OverlayBlendMode =
	| "normal"
	| "screen"
	| "overlay"
	| "multiply"
	| "soft-light"
	| "color-dodge"
	| "difference"
	| "exclusion";

export interface OverlayParticle {
	count: number;
	sizePx: [number, number];
	speedSec: [number, number];
	color: string;
}

export interface Overlay {
	id: string;
	name: string;
	description: string;
	category: "overlay";
	subcategory: OverlaySubcategory;
	visual: string;
	blendMode: OverlayBlendMode;
	opacity: number;
	css: string;
	particle?: OverlayParticle;
}

// ─── Transitions ───────────────────────────────────────────────────────────

/**
 * The 12 preset-category buckets the user requested. Mapped onto the existing
 * `TransitionDefinition["category"]` union (fade | slide | zoom | wipe | glitch)
 * via `baseCategory` so the array is assignable to the registry's type.
 */
export type TransitionPresetCategory =
	| "Fade"
	| "Slide"
	| "Push"
	| "Zoom"
	| "Rotate"
	| "Wipe"
	| "Morph"
	| "Glitch"
	| "Liquid"
	| "Light"
	| "3D"
	| "Geometric";

export type TransitionBaseCategory =
	| "fade"
	| "slide"
	| "zoom"
	| "wipe"
	| "glitch";

export const TRANSITION_PRESET_BASE: Record<
	TransitionPresetCategory,
	TransitionBaseCategory
> = {
	Fade: "fade",
	Slide: "slide",
	Push: "slide",
	Zoom: "zoom",
	Rotate: "zoom",
	Wipe: "wipe",
	Morph: "fade",
	Glitch: "glitch",
	Liquid: "wipe",
	Light: "fade",
	"3D": "zoom",
	Geometric: "wipe",
};

// ─── Effects ───────────────────────────────────────────────────────────────

export type EffectPresetCategory =
	| "Blur"
	| "Glow"
	| "Color"
	| "Distortion"
	| "Stylize"
	| "Particles"
	| "Texture"
	| "Light"
	| "Retro"
	| "Cinematic"
	| "Artistic"
	| "Generator";

export interface EffectPresetParams {
	[key: string]: number | string | boolean;
}

export interface EffectPresetDefinition {
	type: string;
	name: string;
	category: EffectPresetCategory;
	description: string;
	params: EffectPresetParams;
	previewCss?: string;
	renderPreview?: (canvas: HTMLCanvasElement, params: EffectPresetParams) => void;
}

// ─── Motion ────────────────────────────────────────────────────────────────

export type MotionCategory = "In" | "Out" | "InOut" | "Loop";

export type MotionTargetProperty =
	| "opacity"
	| "translate"
	| "scale"
	| "rotate"
	| "blur";

export interface MotionKeyframe {
	/** Normalized time on [0, 1]. */
	t: number;
	value: number | string;
	easing?: Easing;
}

export interface MotionPreset {
	id: string;
	name: string;
	description: string;
	category: MotionCategory;
	keyframes: MotionKeyframe[];
	targetProperties: MotionTargetProperty[];
}

// ─── Templates ─────────────────────────────────────────────────────────────

export interface TemplateBuildTrack {
	id: string;
	type: string;
	name: string;
}

export interface TemplateBuildTextElement {
	id: string;
	trackId: string;
	text: string;
	startSec: number;
	durationSec: number;
	fontSize: number;
	color: string;
	fontWeight: number;
	textAlign: "left" | "center" | "right";
	y: number;
}

export interface TemplateBuildGraphicElement {
	id: string;
	trackId: string;
	kind: string;
	startSec: number;
	durationSec: number;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
}

export interface TemplateBuildEffect {
	type: string;
	params?: EffectPresetParams;
}

export interface TemplateBuild {
	tracks: TemplateBuildTrack[];
	textElements: TemplateBuildTextElement[];
	graphicElements: TemplateBuildGraphicElement[];
	effects: TemplateBuildEffect[];
}

export type TemplateCategory =
	| "Intro"
	| "Outro"
	| "LowerThird"
	| "Title"
	| "Slideshow"
	| "Promo"
	| "Social"
	| "Story"
	| "Wedding"
	| "Travel"
	| "Sports"
	| "Music"
	| "Business"
	| "Tutorial"
	| "Sale";

export interface TemplateDefinition {
	id: string;
	name: string;
	description: string;
	category: TemplateCategory;
	durationSec: number;
	build(): TemplateBuild;
}

export type PresetKind = "element" | "group" | "animation" | "project";

export interface PresetElementItem {
	trackType: TrackType;
	sourceTrackKey: string;
	relativeStartTime: number;
	element: CreateTimelineElement;
}

export interface UserPreset {
	id: string;
	name: string;
	kind: PresetKind;
	category?: string;
	description?: string;
	thumbnail: string | null;
	duration: number;
	createdAt: number;
	items: PresetElementItem[];
}
