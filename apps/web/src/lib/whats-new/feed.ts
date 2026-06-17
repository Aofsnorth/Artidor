/**
 * Fine-grained "What's New" feed. Unlike the version-level changelog (markdown
 * content-collections), this is a per-change log surfaced as a small card in the
 * bottom-left of the editor. Add a new entry at the TOP of WHATS_NEW for every
 * shipped change — the newest entry's id drives the unseen indicator.
 */
export type WhatsNewTag = "feature" | "improvement" | "fix" | "performance";

export interface WhatsNewEntry {
	/** Stable unique id (also the seen-tracking key). Newest entry first. */
	id: string;
	/** Absolute date, YYYY-MM-DD. */
	date: string;
	title: string;
	tag: WhatsNewTag;
	items: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
	{
		id: "2026-06-17-timeline-anchors",
		date: "2026-06-17",
		tag: "fix",
		title: "Timeline trim/crop stays anchored",
		items: [
			"Dragging a clip's edge no longer slides its thumbnail or waveform — the source media stays put while you trim.",
			"The ruler's seconds labels no longer flicker as you widen or zoom the timeline.",
		],
	},
	{
		id: "2026-06-17-changelog-tab",
		date: "2026-06-17",
		tag: "improvement",
		title: "Changelog tab in the header",
		items: [
			"A direct link to the full changelog now sits in the landing-page header nav.",
		],
	},
	{
		id: "2026-06-17-shapes-75",
		date: "2026-06-17",
		tag: "feature",
		title: "75+ customizable shapes",
		items: [
			"Added trapezoid, parallelogram, diamond, pie, arc, gear, burst, flower, teardrop, location pin, shield, cloud, home, squircle and more.",
			"Polygons (3–10 sides), multi-point stars, and outline variants are all one click away.",
			"Every shape stays fully adjustable: fill, border and per-shape controls.",
		],
	},
	{
		id: "2026-06-17-color-picker-fix",
		date: "2026-06-17",
		tag: "fix",
		title: "Color picker no longer crashes",
		items: [
			"Dragging the saturation/value square to change a shape's colour no longer throws an error.",
		],
	},
	{
		id: "2026-06-17-presets",
		date: "2026-06-17",
		tag: "feature",
		title: "Reusable presets",
		items: [
			"New Presets tab in the sidebar.",
			"Right-click any clip or group → Save to preset to reuse a styled, animated layer (e.g. a spinning coin) in any project.",
			"Presets keep their full style + keyframe animation and drop back in at the playhead.",
		],
	},
	{
		id: "2026-06-17-shapes",
		date: "2026-06-17",
		tag: "feature",
		title: "Alight Motion-style shapes",
		items: [
			"Added Line, Arrow, Chevron, Ring, Plus, Right Triangle, Heart, Lightning, Moon and Speech Bubble.",
			"Every shape is fully adjustable: fill, border colour/width/alignment, and per-shape controls.",
		],
	},
	{
		id: "2026-06-16-renderer",
		date: "2026-06-16",
		tag: "performance",
		title: "Smoother playback",
		items: [
			"Static text is cached instead of re-rendered every frame.",
			"Layer parenting now drives child position, rotation and scale at render time.",
		],
	},
	{
		id: "2026-06-16-keyframes",
		date: "2026-06-16",
		tag: "feature",
		title: "After Effects-style animation",
		items: [
			"Easy Ease (F9) and a per-keyframe Keyframe Assistant menu.",
			"Per-character text animators: Fade, Rise, Drop, Zoom, Pop, Typewriter, Wave.",
		],
	},
];

export function getLatestWhatsNewId(): string | null {
	return WHATS_NEW[0]?.id ?? null;
}
