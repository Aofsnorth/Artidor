import type { TProject, TProjectSettings } from "@/lib/project/types";
import { generateUUID } from "@/utils/id";
import { DEFAULT_BACKGROUND_COLOR } from "@/lib/background/color";
import { DEFAULT_CANVAS_SIZE } from "@/lib/canvas/sizes";
import { floatToFrameRate } from "@/lib/fps/utils";
import type { TimelineElement, TScene } from "@/lib/timeline";
import { TICKS_PER_SECOND } from "@/lib/wasm";

export interface TemplatePlaceholder {
	id: string;
	label: string;
	type: "video" | "image" | "audio" | "text";
	required: boolean;
}

export interface TemplateElementSpec {
	id: string;
	type: "video" | "image" | "audio" | "text";
	name: string;
	durationTicks: number;
	startTick: number;
	trackId: string;
	trackType: "main" | "overlay" | "audio";
	textContent?: string;
	fontSize?: number;
	color?: string;
	backgroundColor?: string;
	fadeInDuration?: number;
	fadeOutDuration?: number;
	volume?: number;
	opacity?: number;
	transform?: {
		position: { x: number; y: number };
		scaleX: number;
		scaleY: number;
		rotate: number;
	};
}

export interface ProjectTemplate {
	id: string;
	name: string;
	description: string;
	category: TemplateCategory;
	canvasSize?: { width: number; height: number };
	fps?: number;
	durationTicks: number;
	backgroundColor?: string;
	elements: TemplateElementSpec[];
	placeholders: TemplatePlaceholder[];
}

export type TemplateCategory =
	| "intro"
	| "outro"
	| "social"
	| "vlog"
	| "promo"
	| "slideshow"
	| "lyric"
	| "tutorial";

const DEFAULT_TEXT_FONT_SIZE = 12;

function textElement({
	id,
	name,
	startTick,
	durationTicks,
	trackId,
	content,
	fontSize,
	color,
	backgroundColor,
	opacity,
	transform,
}: {
	id: string;
	name: string;
	startTick: number;
	durationTicks: number;
	trackId: string;
	content: string;
	fontSize?: number;
	color?: string;
	backgroundColor?: string;
	opacity?: number;
	transform?: TemplateElementSpec["transform"];
}): TemplateElementSpec {
	return {
		id,
		type: "text",
		name,
		trackType: "overlay",
		trackId,
		startTick,
		durationTicks,
		textContent: content,
		fontSize: fontSize ?? DEFAULT_TEXT_FONT_SIZE,
		color: color ?? "#ffffff",
		backgroundColor,
		opacity,
		transform,
	};
}

function videoPlaceholder({
	id,
	trackId,
	trackType,
	startTick,
	durationTicks,
	opacity,
	transform,
}: {
	id: string;
	trackId: string;
	trackType: "main" | "overlay";
	startTick: number;
	durationTicks: number;
	opacity?: number;
	transform?: TemplateElementSpec["transform"];
}): TemplateElementSpec {
	return {
		id,
		type: "video",
		name: "Video",
		trackType,
		trackId,
		startTick,
		durationTicks,
		opacity,
		transform,
	};
}

function imagePlaceholder({
	id,
	trackId,
	trackType,
	startTick,
	durationTicks,
	transform,
}: {
	id: string;
	trackId: string;
	trackType: "main" | "overlay";
	startTick: number;
	durationTicks: number;
	transform?: TemplateElementSpec["transform"];
}): TemplateElementSpec {
	return {
		id,
		type: "image",
		name: "Image",
		trackType,
		trackId,
		startTick,
		durationTicks,
		transform,
	};
}

function audioPlaceholder({
	id,
	trackId,
	startTick,
	durationTicks,
	volume,
	fadeInDuration,
	fadeOutDuration,
}: {
	id: string;
	trackId: string;
	startTick: number;
	durationTicks: number;
	volume?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
}): TemplateElementSpec {
	return {
		id,
		type: "audio",
		name: "Audio",
		trackType: "audio",
		trackId,
		startTick,
		durationTicks,
		volume,
		fadeInDuration,
		fadeOutDuration,
	};
}

function makePlaceholder(
	id: string,
	label: string,
	type: TemplatePlaceholder["type"],
	required = true,
): TemplatePlaceholder {
	return { id, label, type, required };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
	{
		id: "intro-zoom",
		name: "Zoom Intro",
		description: "Title card with a zoom-in animation",
		category: "intro",
		durationTicks: 3 * TICKS_PER_SECOND,
		elements: [
			textElement({
				id: "title",
				name: "Title",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 3 * TICKS_PER_SECOND,
				content: "Your Title",
				fontSize: 20,
				color: "#ffffff",
				backgroundColor: "#000000",
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [makePlaceholder("title", "Title", "text", false)],
	},
	{
		id: "outro-fade",
		name: "Fade Outro",
		description: "Call-to-action ending with fade out",
		category: "outro",
		durationTicks: 4 * TICKS_PER_SECOND,
		elements: [
			textElement({
				id: "cta",
				name: "Call to Action",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 4 * TICKS_PER_SECOND,
				content: "Thanks for watching!",
				fontSize: 16,
				color: "#ffffff",
				backgroundColor: "transparent",
				transform: {
					position: { x: 0, y: 200 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [makePlaceholder("cta", "Call to Action", "text", false)],
	},
	{
		id: "vlog-intro",
		name: "Vlog Intro",
		description: "Title card with subscribe button",
		category: "vlog",
		durationTicks: 4 * TICKS_PER_SECOND,
		elements: [
			videoPlaceholder({
				id: "bg",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 4 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			textElement({
				id: "title",
				name: "Title",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 4 * TICKS_PER_SECOND,
				content: "My Vlog",
				fontSize: 18,
				color: "#ffffff",
				backgroundColor: "transparent",
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [
			makePlaceholder("bg", "Background video", "video"),
			makePlaceholder("title", "Title text", "text", false),
		],
	},
	{
		id: "tutorial-step",
		name: "Tutorial Step",
		description: "Step-by-step tutorial layout",
		category: "tutorial",
		durationTicks: 6 * TICKS_PER_SECOND,
		elements: [
			videoPlaceholder({
				id: "demo",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 6 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			textElement({
				id: "step-num",
				name: "Step Number",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 6 * TICKS_PER_SECOND,
				content: "STEP 1",
				fontSize: 14,
				color: "#fbbf24",
				backgroundColor: "transparent",
				transform: {
					position: { x: 0, y: -250 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			textElement({
				id: "step-desc",
				name: "Step Description",
				trackId: "tpl-t2",
				startTick: 0,
				durationTicks: 6 * TICKS_PER_SECOND,
				content: "Click to continue",
				fontSize: 12,
				color: "#ffffff",
				backgroundColor: "rgba(0,0,0,0.7)",
				transform: {
					position: { x: 0, y: 250 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [
			makePlaceholder("demo", "Demo video", "video"),
			makePlaceholder("step-num", "Step number", "text", false),
			makePlaceholder("step-desc", "Step description", "text", false),
		],
	},
	{
		id: "lyric-card",
		name: "Lyric Card",
		description: "Song lyric with animated text",
		category: "lyric",
		durationTicks: 5 * TICKS_PER_SECOND,
		elements: [
			imagePlaceholder({
				id: "bg",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 5 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			audioPlaceholder({
				id: "music",
				trackId: "tpl-a1",
				startTick: 0,
				durationTicks: 5 * TICKS_PER_SECOND,
				volume: 0,
				fadeInDuration: 0.3,
				fadeOutDuration: 0.3,
			}),
			textElement({
				id: "lyric",
				name: "Lyric",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 5 * TICKS_PER_SECOND,
				content: "Your lyrics here",
				fontSize: 14,
				color: "#ffffff",
				backgroundColor: "transparent",
				transform: {
					position: { x: 0, y: 100 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [
			makePlaceholder("bg", "Background image", "image"),
			makePlaceholder("music", "Music", "audio"),
			makePlaceholder("lyric", "Lyric", "text", false),
		],
	},
	{
		id: "promo-cta",
		name: "Promo CTA",
		description: "Product call to action",
		category: "promo",
		durationTicks: 5 * TICKS_PER_SECOND,
		elements: [
			videoPlaceholder({
				id: "product",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 5 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			textElement({
				id: "headline",
				name: "Headline",
				trackId: "tpl-t1",
				startTick: 0,
				durationTicks: 5 * TICKS_PER_SECOND,
				content: "Shop Now",
				fontSize: 18,
				color: "#ffffff",
				backgroundColor: "transparent",
				transform: {
					position: { x: 0, y: -200 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [
			makePlaceholder("product", "Product video", "video"),
			makePlaceholder("headline", "Headline", "text", false),
		],
	},
	{
		id: "slideshow-3",
		name: "Photo Slideshow",
		description: "Three photos with smooth crossfade",
		category: "slideshow",
		durationTicks: 9 * TICKS_PER_SECOND,
		elements: [
			imagePlaceholder({
				id: "img1",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 3 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			imagePlaceholder({
				id: "img2",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 3 * TICKS_PER_SECOND,
				durationTicks: 3 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			imagePlaceholder({
				id: "img3",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 6 * TICKS_PER_SECOND,
				durationTicks: 3 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			audioPlaceholder({
				id: "music",
				trackId: "tpl-a1",
				startTick: 0,
				durationTicks: 9 * TICKS_PER_SECOND,
				volume: 0.5,
				fadeInDuration: 0.5,
				fadeOutDuration: 0.5,
			}),
		],
		placeholders: [
			makePlaceholder("img1", "Photo 1", "image"),
			makePlaceholder("img2", "Photo 2", "image"),
			makePlaceholder("img3", "Photo 3", "image"),
			makePlaceholder("music", "Background music", "audio", false),
		],
	},
	{
		id: "social-story",
		name: "Social Story",
		description: "Vertical 9:16 story with stickers",
		category: "social",
		canvasSize: { width: 1080, height: 1920 },
		durationTicks: 8 * TICKS_PER_SECOND,
		elements: [
			videoPlaceholder({
				id: "bg",
				trackId: "tpl-m1",
				trackType: "main",
				startTick: 0,
				durationTicks: 8 * TICKS_PER_SECOND,
				transform: {
					position: { x: 0, y: 0 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
			textElement({
				id: "swipe",
				name: "Swipe Up",
				trackId: "tpl-t1",
				startTick: 5 * TICKS_PER_SECOND,
				durationTicks: 3 * TICKS_PER_SECOND,
				content: "↑ Swipe Up",
				fontSize: 14,
				color: "#ffffff",
				backgroundColor: "rgba(0,0,0,0.5)",
				transform: {
					position: { x: 0, y: 700 },
					scaleX: 1,
					scaleY: 1,
					rotate: 0,
				},
			}),
		],
		placeholders: [
			makePlaceholder("bg", "Background video", "video"),
			makePlaceholder("swipe", "Swipe text", "text", false),
		],
	},
];

export function getTemplateById(id: string): ProjectTemplate | undefined {
	return PROJECT_TEMPLATES.find((t) => t.id === id);
}

export function applyTemplateToProject({
	template,
	mediaIdsByPlaceholder,
}: {
	template: ProjectTemplate;
	mediaIdsByPlaceholder: Record<string, string>;
}): TProject {
	const tracksByType: Record<
		"main" | "overlay" | "audio",
		Array<{ id: string; name: string; elements: TimelineElement[] }>
	> = {
		main: [{ id: "main", name: "Main", elements: [] }],
		overlay: [],
		audio: [],
	};

	const textIdToName = new Map<string, string>();

	for (const spec of template.elements) {
		const trackId = spec.trackId;
		const trackName = spec.trackType === "main" ? "Main" : `Track ${trackId}`;
		let track = tracksByType[spec.trackType].find((t) => t.id === trackId);
		if (!track) {
			track = { id: trackId, name: trackName, elements: [] };
			tracksByType[spec.trackType].push(track);
		}

		const mediaId = mediaIdsByPlaceholder[spec.id];
		const element = buildElementFromSpec({ spec, mediaId });
		track.elements.push(element);
		if (spec.type === "text") {
			textIdToName.set(spec.id, spec.textContent ?? spec.name);
		}
	}

	const scene: TScene = {
		id: generateUUID(),
		name: "Main scene",
		isMain: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		tracks: {
			main: tracksByType.main as never,
			overlay: tracksByType.overlay as never,
			audio: tracksByType.audio as never,
		},
		bookmarks: [],
		transitions: [],
	};

	const settings: TProjectSettings = {
		fps: floatToFrameRate(template.fps ?? 30),
		canvasSize: template.canvasSize ?? DEFAULT_CANVAS_SIZE,
		canvasSizeMode: "preset",
		lastCustomCanvasSize: null,
		originalCanvasSize: null,
		background: {
			type: "color",
			color: template.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
		},
	};

	const project: TProject = {
		metadata: {
			id: generateUUID(),
			name: template.name,
			duration: template.durationTicks,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		scenes: [scene],
		currentSceneId: scene.id,
		settings,
		version: 1,
	};

	return project;
}

function buildElementFromSpec({
	spec,
	mediaId,
}: {
	spec: TemplateElementSpec;
	mediaId?: string;
}): TimelineElement {
	const baseTransform = {
		scaleX: spec.transform?.scaleX ?? 1,
		scaleY: spec.transform?.scaleY ?? 1,
		position: spec.transform?.position ?? { x: 0, y: 0 },
		rotate: spec.transform?.rotate ?? 0,
	};
	const baseOpacity = spec.opacity ?? 1;

	switch (spec.type) {
		case "text": {
			const textElement: TimelineElement = {
				id: generateUUID(),
				type: "text",
				name: spec.name,
				startTime: spec.startTick,
				duration: spec.durationTicks,
				trimStart: 0,
				trimEnd: 0,
				content: spec.textContent ?? "",
				fontFamily: "Arial",
				fontSize: spec.fontSize ?? DEFAULT_TEXT_FONT_SIZE,
				fontWeight: "normal",
				fontStyle: "normal",
				textDecoration: "none",
				textAlign: "center",
				letterSpacing: 0,
				lineHeight: 1.2,
				color: spec.color ?? "#ffffff",
				background: {
					enabled:
						spec.backgroundColor !== undefined &&
						spec.backgroundColor !== "transparent",
					color: spec.backgroundColor ?? "#000000",
					cornerRadius: 0,
					paddingX: 0,
					paddingY: 0,
					offsetX: 0,
					offsetY: 0,
				},
				hidden: false,
				transform: baseTransform,
				opacity: baseOpacity,
			};
			return textElement;
		}
		case "video":
		case "image": {
			const element: TimelineElement = {
				id: generateUUID(),
				type: spec.type,
				name: spec.name,
				startTime: spec.startTick,
				duration: spec.durationTicks,
				trimStart: 0,
				trimEnd: 0,
				transform: baseTransform,
				opacity: baseOpacity,
				mediaId: mediaId ?? "",
			} as TimelineElement;
			return element;
		}
		case "audio": {
			const element: TimelineElement = {
				id: generateUUID(),
				type: "audio",
				name: spec.name,
				startTime: spec.startTick,
				duration: spec.durationTicks,
				trimStart: 0,
				trimEnd: 0,
				volume: spec.volume ?? 1,
				fadeInDuration: spec.fadeInDuration,
				fadeOutDuration: spec.fadeOutDuration,
				mediaId: mediaId ?? "",
			} as TimelineElement;
			return element;
		}
		default:
			throw new Error(`Unknown template element type: ${spec.type}`);
	}
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
	{ id: "intro", label: "Intro" },
	{ id: "outro", label: "Outro" },
	{ id: "social", label: "Social" },
	{ id: "vlog", label: "Vlog" },
	{ id: "promo", label: "Promo" },
	{ id: "slideshow", label: "Slideshow" },
	{ id: "lyric", label: "Lyric" },
	{ id: "tutorial", label: "Tutorial" },
];
