import { lazy, Suspense, type ReactNode } from "react";
import type {
	EffectElement,
	GraphicElement,
	ImageElement,
	MaskableElement,
	RetimableElement,
	StickerElement,
	TextElement,
	VisualElement,
	VideoElement,
	AudioElement,
	TimelineElement,
} from "@/lib/timeline";
import type { CameraElement } from "@/lib/camera";
import type { MediaAsset } from "@/lib/media/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	TextFontIcon,
	ArrowExpandIcon,
	MusicNote03Icon,
	MagicWand05Icon,
	DashboardSpeed02Icon,
	PlayIcon,
	SparklesIcon,
	Link01Icon,
	Camera01Icon,
	InformationCircleIcon,
	Image01Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { TransformTab } from "./tabs/transform-tab";
import { AudioTab } from "./tabs/audio-tab";
import { TextTab } from "./tabs/text-tab";
import { SpeedTab } from "./tabs/speed-tab";
import { GraphicTab } from "./tabs/graphic-tab";
import { OcShapesIcon } from "@/components/icons";

// Default / frequently-used tabs are eager-loaded so the selected element
// inspector is immediately usable. Heavy tabs are lazy-loaded per-tab to keep
// the editor's initial bundle small.
const LazyImageTab = lazy(() =>
	import("./tabs/image-tab").then((m) => ({ default: m.ImageTab })),
);
const LazyGraphicsStyleTab = lazy(() =>
	import("./tabs/graphics-style-tab").then((m) => ({
		default: m.GraphicsStyleTab,
	})),
);
const LazyElementTab = lazy(() =>
	import("./tabs/element-tab").then((m) => ({ default: m.ElementTab })),
);
const LazyClipEffectsTab = lazy(() =>
	import("./tabs/effects-tab").then((m) => ({ default: m.ClipEffectsTab })),
);
const LazyStandaloneEffectTab = lazy(() =>
	import("./tabs/effects-tab").then((m) => ({
		default: m.StandaloneEffectTab,
	})),
);
const LazyMasksTab = lazy(() =>
	import("./tabs/masks-tab").then((m) => ({ default: m.MasksTab })),
);
const LazyAudioEffectsTab = lazy(() =>
	import("./tabs/audio-effects-tab").then((m) => ({
		default: m.AudioEffectsTab,
	})),
);
const LazySpeedRampTab = lazy(() =>
	import("./tabs/speed-ramp-tab").then((m) => ({
		default: m.SpeedRampTab,
	})),
);
const LazyParentingTab = lazy(() =>
	import("./tabs/parenting-tab").then((m) => ({ default: m.ParentingTab })),
);
const LazyCameraTab = lazy(() =>
	import("./tabs/camera-tab").then((m) => ({ default: m.CameraTab })),
);
const LazyCameraInspectTab = lazy(() =>
	import("./tabs/camera-tab").then((m) => ({
		default: m.CameraInspectTab,
	})),
);
const LazyAnimationsTab = lazy(() =>
	import("./tabs/animations-tab").then((m) => ({ default: m.AnimationsTab })),
);

/** Skeleton shown while a lazy property tab chunk loads. */
function TabSkeleton() {
	return (
		<div className="flex flex-col gap-3 p-4">
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-4 w-1/2" />
		</div>
	);
}

export type TabContentProps = {
	trackId: string;
	/** Display name of the track the selected element sits on. */
	trackName: string;
	/** All media assets in the current project. Available to tabs that
	   need to look up the source media for the selected element
	   (e.g. the Image tab). */
	mediaAssets: MediaAsset[];
	/** Convenience — the MediaAsset bound to the selected element
	   (if any). Mirrors `(mediaAssets ?? []).find(...)` against the
	   element's `mediaId`. */
	mediaAsset: MediaAsset | undefined;
};

export type PropertiesTabDef = {
	id: string;
	label: string;
	icon: ReactNode;
	content: (props: TabContentProps) => ReactNode;
};

export type ElementPropertiesConfig = {
	defaultTab: string;
	tabs: PropertiesTabDef[];
};

function buildTransformTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "transform",
		label: "Transform",
		icon: <HugeiconsIcon icon={ArrowExpandIcon} size={16} />,
		content: ({ trackId }) => (
			<TransformTab element={element} trackId={trackId} />
		),
	};
}

/**
 * Audio tab shown when a *video* element is selected. Adds the
 * "audio has been separated" recovery banner because the source audio
 * may have been pulled out into its own audio track.
 */
function buildAudioTab({
	element,
}: {
	element: AudioElement | VideoElement;
}): PropertiesTabDef {
	return {
		id: "audio",
		label: "Audio",
		icon: <HugeiconsIcon icon={MusicNote03Icon} size={16} />,
		content: ({ trackId }) => <AudioTab element={element} trackId={trackId} />,
	};
}

/**
 * Audio tab shown when a standalone *audio* element is selected. Mirrors
 * the video audio tab's volume/pan/fade controls but skips the source
 * separation banner (no video source to separate from) and is given a
 * distinct id so the two inspectors don't share a key.
 */
function buildAudioElementTab({
	element,
}: {
	element: AudioElement;
}): PropertiesTabDef {
	return {
		id: "audio-element",
		label: "Audio",
		icon: <HugeiconsIcon icon={MusicNote03Icon} size={16} />,
		content: ({ trackId }) => (
			<AudioTab element={element} trackId={trackId} variant="audio-element" />
		),
	};
}

function buildSpeedTab({
	element,
}: {
	element: RetimableElement;
}): PropertiesTabDef {
	return {
		id: "speed",
		label: "Speed",
		icon: <HugeiconsIcon icon={DashboardSpeed02Icon} size={16} />,
		content: ({ trackId }) => <SpeedTab element={element} trackId={trackId} />,
	};
}

function buildSpeedRampTab({
	element,
}: {
	element: RetimableElement;
}): PropertiesTabDef {
	return {
		id: "speed-ramp",
		label: "Speed Ramp",
		icon: <HugeiconsIcon icon={DashboardSpeed02Icon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazySpeedRampTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildAudioEffectsTab({
	element,
}: {
	element: AudioElement | VideoElement;
}): PropertiesTabDef {
	return {
		id: "audio-effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={SparklesIcon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyAudioEffectsTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildMasksTab({
	element,
}: {
	element: MaskableElement;
}): PropertiesTabDef {
	return {
		id: "masks",
		label: "Masks",
		icon: <OcShapesIcon size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyMasksTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildClipEffectsTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={MagicWand05Icon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyClipEffectsTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

/**
 * Image-specific source / opacity / replace controls. Pulls the
 * media asset straight from the `mediaAssets` passed in via
 * `TabContentProps` so the registry can keep all tab lookups
 * through the same props surface.
 */
function buildImageTab({
	element,
}: {
	element: ImageElement;
}): PropertiesTabDef {
	return {
		id: "image",
		label: "Image",
		icon: <HugeiconsIcon icon={Image01Icon} size={16} />,
		content: ({ trackId, mediaAsset }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyImageTab
					element={element}
					trackId={trackId}
					mediaAsset={mediaAsset}
				/>
			</Suspense>
		),
	};
}

function buildTextTab({ element }: { element: TextElement }): PropertiesTabDef {
	return {
		id: "text",
		label: "Text",
		icon: <HugeiconsIcon icon={TextFontIcon} size={16} />,
		content: ({ trackId }) => <TextTab element={element} trackId={trackId} />,
	};
}

function buildGraphicTab({
	element,
}: {
	element: GraphicElement;
}): PropertiesTabDef {
	return {
		id: "graphic",
		label: "Graphic",
		icon: <OcShapesIcon size={16} />,
		content: ({ trackId }) => (
			<GraphicTab element={element} trackId={trackId} />
		),
	};
}

function buildGraphicsStyleTab({
	element,
}: {
	element: VideoElement | ImageElement | TextElement;
}): PropertiesTabDef {
	return {
		id: "graphics-style",
		label: "Graphics",
		icon: <OcShapesIcon size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyGraphicsStyleTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildStandaloneEffectTab({
	element,
}: {
	element: EffectElement;
}): PropertiesTabDef {
	return {
		id: "effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={MagicWand05Icon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyStandaloneEffectTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildAnimationsTab(): PropertiesTabDef {
	return {
		id: "animations",
		label: "Animation",
		icon: <HugeiconsIcon icon={PlayIcon} size={16} />,
		content: () => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyAnimationsTab />
			</Suspense>
		),
	};
}

function buildParentingTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "parenting",
		label: "Link",
		icon: <HugeiconsIcon icon={Link01Icon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyParentingTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

function buildCameraTab(): PropertiesTabDef {
	return {
		id: "camera",
		label: "Camera",
		icon: <HugeiconsIcon icon={Camera01Icon} size={16} />,
		content: () => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyCameraTab />
			</Suspense>
		),
	};
}

function buildCameraInspectTab({
	element,
}: {
	element: CameraElement;
}): PropertiesTabDef {
	return {
		id: "camera-inspect",
		label: "Camera Properties",
		icon: <HugeiconsIcon icon={Camera01Icon} size={16} />,
		content: ({ trackId }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyCameraInspectTab element={element} trackId={trackId} />
			</Suspense>
		),
	};
}

/**
 * Element-level summary tab — shows the element's identity, source media,
 * timeline position and structural relationships. Surfaces only when a
 * single element is selected (the inspector itself hides all tabs at
 * other times). Always rendered as a secondary tab below the primary
 * "Element" quick-switch button, so it benefits from the same dispatch
 * as the other categories.
 */
function buildElementTab({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}): PropertiesTabDef {
	return {
		id: "element-info",
		label: "Info",
		icon: <HugeiconsIcon icon={InformationCircleIcon} size={16} />,
		content: ({ trackId, trackName }) => (
			<Suspense fallback={<TabSkeleton />}>
				<LazyElementTab
					element={element}
					trackId={trackId}
					trackName={trackName}
					mediaAssets={mediaAssets}
				/>
			</Suspense>
		),
	};
}

function getTextConfig({
	element,
	mediaAssets: _mediaAssets,
}: {
	element: TextElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "text",
		tabs: [
			// Text elements have their own dedicated tab. The generic
			// "Element" tab (identity, source, relationships) is skipped
			// because Text already carries its own identity (the content
			// string, font, size, etc.) and we don't want to mix generic
			// metadata into a text-focused inspector.
			buildTextTab({ element }),
			buildGraphicsStyleTab({ element }),
			buildTransformTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
			buildAnimationsTab(),
		],
	};
}

function getNullLayerConfig({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildTransformTab({ element: element as VisualElement }),
			buildParentingTab({ element: element as VisualElement }),
			buildAnimationsTab(),
		],
	};
}

function getVideoConfig({
	element,
	mediaAsset,
	mediaAssets,
}: {
	element: VideoElement;
	mediaAsset: MediaAsset | undefined;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	// Show the Audio tab whenever the underlying media *might* have an
	// audio track. We treat `undefined` and `true` as "show" — only an
	// explicit `hasAudio === false` hides the tab. This is more
	// forgiving than `=== true` because mediabunny occasionally returns
	// `null` for the audio track on container formats it can decode but
	// doesn't fully introspect (especially mid-file scans), and the
	// user expects the audio tab to be there when they drop a music
	// video — the worst case is the volume slider becomes a no-op.
	const hideAudioTab = mediaAsset?.hasAudio === false;
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildTransformTab({ element }),
			buildGraphicsStyleTab({ element }),
			...(hideAudioTab ? [] : [buildAudioTab({ element })]),
			buildSpeedTab({ element }),
			buildSpeedRampTab({ element }),
			// Colour correction now lives in its own dedicated card in
			// the left-bar "Advanced" tab (with wheels, HSL, curves,
			// LUT). The inspector stays focused on the per-element
			// tools you reach for while keyframing.
			buildParentingTab({ element }),
			buildCameraTab(),
			buildAnimationsTab(),
			buildMasksTab({ element }),
			buildClipEffectsTab({ element }),
		],
	};
}

function getStickerConfig({
	element,
	mediaAssets,
}: {
	element: StickerElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildTransformTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
			buildAnimationsTab(),
			buildClipEffectsTab({ element }),
		],
	};
}

function getGraphicConfig({
	element,
	mediaAssets,
}: {
	element: GraphicElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "graphic",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildGraphicTab({ element }),
			buildTransformTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
			buildMasksTab({ element }),
			buildClipEffectsTab({ element }),
		],
	};
}

function getAudioConfig({
	element,
	mediaAssets,
}: {
	element: AudioElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "audio-element",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildAudioElementTab({ element }),
			buildSpeedTab({ element }),
			buildSpeedRampTab({ element }),
			buildAudioEffectsTab({ element }),
		],
	};
}

function getImageConfig({
	element,
	mediaAssets,
}: {
	element: ImageElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildImageTab({ element }),
			buildGraphicsStyleTab({ element }),
			buildTransformTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
			buildAnimationsTab(),
			buildMasksTab({ element }),
			buildClipEffectsTab({ element }),
		],
	};
}

function getEffectConfig({
	element,
	mediaAssets,
}: {
	element: EffectElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "effects",
		tabs: [
			buildElementTab({ element, mediaAssets }),
			buildStandaloneEffectTab({ element }),
		],
	};
}

function getCameraConfig({
	element,
	mediaAssets,
}: {
	element: CameraElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	return {
		defaultTab: "camera-inspect",
		tabs: [
			buildCameraInspectTab({ element }),
			buildElementTab({ element, mediaAssets }),
		],
	};
}

export function getPropertiesConfig({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	switch (element.type) {
		case "text": {
			// Null layers are text elements with nullLayer flag — show transform only
			if ((element as { nullLayer?: boolean }).nullLayer) {
				return getNullLayerConfig({ element, mediaAssets });
			}
			return getTextConfig({ element, mediaAssets });
		}
		case "video": {
			const mediaAsset = mediaAssets.find((a) => a.id === element.mediaId);
			return getVideoConfig({ element, mediaAsset, mediaAssets });
		}
		case "image":
			return getImageConfig({ element, mediaAssets });
		case "sticker":
			return getStickerConfig({ element, mediaAssets });
		case "graphic":
			return getGraphicConfig({ element, mediaAssets });
		case "audio":
			return getAudioConfig({ element, mediaAssets });
		case "effect":
			return getEffectConfig({ element, mediaAssets });
		case "camera":
			return getCameraConfig({ element, mediaAssets });
	}
}
