import {
	lazy,
	memo,
	Suspense,
	type ComponentType,
	type ReactNode,
} from "react";
import type {
	EffectElement,
	GraphicElement,
	ImageElement,
	MaskableElement,
	RetimableElement,
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
	SlidersVerticalIcon,
	PlayIcon,
	SparklesIcon,
	Link01Icon,
	Camera01Icon,
	InformationCircleIcon,
	Image01Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioTab } from "./tabs/audio-tab";
import { SpeedTab } from "./tabs/speed-tab";
import { GraphicTab } from "./tabs/graphic-tab";
import { OcShapesIcon } from "@/components/icons";

// Default / frequently-used tabs are eager-loaded so the selected element
// inspector is immediately usable. Heavy tabs are lazy-loaded per-tab to keep
// the editor's initial bundle small — `transform-tab` (26KB) and `text-tab`
// (36KB, which drags in `react-window` and the font/color pickers) used to be
// static imports and landed in the initial chunk. They now split the same way
// every other heavy tab does, so the editor shell ships without them.
const LazyTransformTab = lazy(() =>
	import("./tabs/transform-tab").then((m) => ({ default: m.TransformTab })),
);
const LazyTextTab = lazy(() =>
	import("./tabs/text-tab").then((m) => ({ default: m.TextTab })),
);
const LazyImageTab = lazy(() =>
	import("./tabs/image-tab").then((m) => ({ default: m.ImageTab })),
);
const LazyBasicAdjustTab = lazy(() =>
	import("./tabs/basic-adjust-tab").then((m) => ({ default: m.BasicAdjustTab })),
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
	/** The element the tab is rendering controls for.
	 *
	 * Threaded through props instead of captured in a `build*Tab` closure so
	 * that every tab content is a module-level component with a permanent
	 * identity. Two things depend on that: rebuilding the config (which the
	 * inspector memoizes on `element` + `mediaAssets`) can never swap the
	 * component type and remount the visible tab, and `memo` can genuinely
	 * block a render instead of seeing a fresh closure every time. */
	element: TimelineElement;
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
	/** A real component boundary, rendered as `<activeTab.content ... />`.
	 * Keeping it a component (instead of a function invoked inline during
	 * the inspector's render) is what lets React memoize the tab subtree. */
	content: ComponentType<TabContentProps>;
};

export type ElementPropertiesConfig = {
	defaultTab: string;
	tabs: PropertiesTabDef[];
};

/**
 * Tab content components.
 *
 * Every tab is a module-level `memo` component taking the selected element as
 * a prop. That is what turns the tab from "a closure inlined into the
 * inspector's element list" into a real boundary: the inspector can be
 * re-rendered by an unrelated editor notification without rebuilding this
 * subtree, and the config (memoized on `element` + `mediaAssets`) can be
 * rebuilt without changing any component identity.
 *
 * The `element as XElement` narrowing is safe by construction: the config
 * switch in {@link getPropertiesConfig} only ever offers a tab to the
 * element types it was written for, and the inspector renders the tab only
 * when it is in that config's `tabs` list.
 */

const TransformTabContent = memo(function TransformTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyTransformTab element={element as VisualElement} trackId={trackId} />
		</Suspense>
	);
});

/**
 * Audio tab shown when a *video* element is selected. Adds the
 * "audio has been separated" recovery banner because the source audio
 * may have been pulled out into its own audio track.
 */
const AudioTabContent = memo(function AudioTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<AudioTab element={element as AudioElement | VideoElement} trackId={trackId} />
	);
});

/**
 * Audio tab shown when a standalone *audio* element is selected. Mirrors
 * the video audio tab's volume/pan/fade controls but skips the source
 * separation banner (no video source to separate from) and is given a
 * distinct id so the two inspectors don't share a key.
 */
const AudioElementTabContent = memo(function AudioElementTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<AudioTab
			element={element as AudioElement}
			trackId={trackId}
			variant="audio-element"
		/>
	);
});

const SpeedTabContent = memo(function SpeedTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<SpeedTab element={element as RetimableElement} trackId={trackId} />
	);
});

const SpeedRampTabContent = memo(function SpeedRampTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazySpeedRampTab element={element as RetimableElement} trackId={trackId} />
		</Suspense>
	);
});

const AudioEffectsTabContent = memo(function AudioEffectsTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyAudioEffectsTab
				element={element as AudioElement | VideoElement}
				trackId={trackId}
			/>
		</Suspense>
	);
});

const MasksTabContent = memo(function MasksTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyMasksTab element={element as MaskableElement} trackId={trackId} />
		</Suspense>
	);
});

const ClipEffectsTabContent = memo(function ClipEffectsTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyClipEffectsTab element={element as VisualElement} trackId={trackId} />
		</Suspense>
	);
});

/**
 * Image-specific source / opacity / replace controls. Pulls the
 * media asset straight from the `mediaAssets` passed in via
 * `TabContentProps` so the registry can keep all tab lookups
 * through the same props surface.
 */
const ImageTabContent = memo(function ImageTabContent({
	element,
	trackId,
	mediaAsset,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyImageTab
				element={element as ImageElement}
				trackId={trackId}
				mediaAsset={mediaAsset}
			/>
		</Suspense>
	);
});

const TextTabContent = memo(function TextTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyTextTab element={element as TextElement} trackId={trackId} />
		</Suspense>
	);
});

const GraphicTabContent = memo(function GraphicTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<GraphicTab element={element as GraphicElement} trackId={trackId} />
	);
});

const GraphicsStyleTabContent = memo(function GraphicsStyleTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyGraphicsStyleTab
				element={element as VideoElement | ImageElement | TextElement}
				trackId={trackId}
			/>
		</Suspense>
	);
});

const BasicAdjustTabContent = memo(function BasicAdjustTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyBasicAdjustTab element={element as VisualElement} trackId={trackId} />
		</Suspense>
	);
});

const StandaloneEffectTabContent = memo(function StandaloneEffectTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyStandaloneEffectTab element={element as EffectElement} trackId={trackId} />
		</Suspense>
	);
});

const AnimationsTabContent = memo(function AnimationsTabContent() {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyAnimationsTab />
		</Suspense>
	);
});

const ParentingTabContent = memo(function ParentingTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyParentingTab element={element as VisualElement} trackId={trackId} />
		</Suspense>
	);
});

const CameraTabContent = memo(function CameraTabContent() {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyCameraTab />
		</Suspense>
	);
});

const CameraInspectTabContent = memo(function CameraInspectTabContent({
	element,
	trackId,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyCameraInspectTab element={element as CameraElement} trackId={trackId} />
		</Suspense>
	);
});

/**
 * Element-level summary tab — shows the element's identity, source media,
 * timeline position and structural relationships. Surfaces only when a
 * single element is selected (the inspector itself hides all tabs at
 * other times). Always rendered as a secondary tab below the primary
 * "Element" quick-switch button, so it benefits from the same dispatch
 * as the other categories.
 */
const ElementTabContent = memo(function ElementTabContent({
	element,
	trackId,
	trackName,
	mediaAssets,
}: TabContentProps) {
	return (
		<Suspense fallback={<TabSkeleton />}>
			<LazyElementTab
				element={element}
				trackId={trackId}
				trackName={trackName}
				mediaAssets={mediaAssets}
			/>
		</Suspense>
	);
});

function buildTransformTab(): PropertiesTabDef {
	return {
		id: "transform",
		label: "Transform",
		icon: <HugeiconsIcon icon={ArrowExpandIcon} size={16} />,
		content: TransformTabContent,
	};
}

function buildAudioTab(): PropertiesTabDef {
	return {
		id: "audio",
		label: "Audio",
		icon: <HugeiconsIcon icon={MusicNote03Icon} size={16} />,
		content: AudioTabContent,
	};
}

function buildAudioElementTab(): PropertiesTabDef {
	return {
		id: "audio-element",
		label: "Audio",
		icon: <HugeiconsIcon icon={MusicNote03Icon} size={16} />,
		content: AudioElementTabContent,
	};
}

function buildSpeedTab(): PropertiesTabDef {
	return {
		id: "speed",
		label: "Speed",
		icon: <HugeiconsIcon icon={DashboardSpeed02Icon} size={16} />,
		content: SpeedTabContent,
	};
}

function buildSpeedRampTab(): PropertiesTabDef {
	return {
		id: "speed-ramp",
		label: "Speed Ramp",
		icon: <HugeiconsIcon icon={DashboardSpeed02Icon} size={16} />,
		content: SpeedRampTabContent,
	};
}

function buildAudioEffectsTab(): PropertiesTabDef {
	return {
		id: "audio-effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={SparklesIcon} size={16} />,
		content: AudioEffectsTabContent,
	};
}

function buildMasksTab(): PropertiesTabDef {
	return {
		id: "masks",
		label: "Masks",
		icon: <OcShapesIcon size={16} />,
		content: MasksTabContent,
	};
}

function buildClipEffectsTab(): PropertiesTabDef {
	return {
		id: "effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={MagicWand05Icon} size={16} />,
		content: ClipEffectsTabContent,
	};
}

function buildImageTab(): PropertiesTabDef {
	return {
		id: "image",
		label: "Image",
		icon: <HugeiconsIcon icon={Image01Icon} size={16} />,
		content: ImageTabContent,
	};
}

function buildTextTab(): PropertiesTabDef {
	return {
		id: "text",
		label: "Text",
		icon: <HugeiconsIcon icon={TextFontIcon} size={16} />,
		content: TextTabContent,
	};
}

function buildGraphicTab(): PropertiesTabDef {
	return {
		id: "graphic",
		label: "Graphic",
		icon: <OcShapesIcon size={16} />,
		content: GraphicTabContent,
	};
}

function buildAdjustTab(): PropertiesTabDef {
	return {
		id: "adjust",
		label: "Adjust",
		icon: <HugeiconsIcon icon={SlidersVerticalIcon} size={16} />,
		content: BasicAdjustTabContent,
	};
}

function buildGraphicsStyleTab(): PropertiesTabDef {
	return {
		id: "graphics-style",
		label: "Graphics",
		icon: <OcShapesIcon size={16} />,
		content: GraphicsStyleTabContent,
	};
}

function buildStandaloneEffectTab(): PropertiesTabDef {
	return {
		id: "effects",
		label: "Effects",
		icon: <HugeiconsIcon icon={MagicWand05Icon} size={16} />,
		content: StandaloneEffectTabContent,
	};
}

function buildAnimationsTab(): PropertiesTabDef {
	return {
		id: "animations",
		label: "Animation",
		icon: <HugeiconsIcon icon={PlayIcon} size={16} />,
		content: AnimationsTabContent,
	};
}

function buildParentingTab(): PropertiesTabDef {
	return {
		id: "parenting",
		label: "Link",
		icon: <HugeiconsIcon icon={Link01Icon} size={16} />,
		content: ParentingTabContent,
	};
}

function buildCameraTab(): PropertiesTabDef {
	return {
		id: "camera",
		label: "Camera",
		icon: <HugeiconsIcon icon={Camera01Icon} size={16} />,
		content: CameraTabContent,
	};
}

function buildCameraInspectTab(): PropertiesTabDef {
	return {
		id: "camera-inspect",
		label: "Camera Properties",
		icon: <HugeiconsIcon icon={Camera01Icon} size={16} />,
		content: CameraInspectTabContent,
	};
}

function buildElementTab(): PropertiesTabDef {
	return {
		id: "element-info",
		label: "Info",
		icon: <HugeiconsIcon icon={InformationCircleIcon} size={16} />,
		content: ElementTabContent,
	};
}

function getTextConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "text",
		tabs: [
			// Text elements have their own dedicated tab. The generic
			// "Element" tab (identity, source, relationships) is skipped
			// because Text already carries its own identity (the content
			// string, font, size, etc.) and we don't want to mix generic
			// metadata into a text-focused inspector.
			buildTextTab(),
			buildGraphicsStyleTab(),
			buildTransformTab(),
			buildParentingTab(),
			buildCameraTab(),
			buildAnimationsTab(),
		],
	};
}

function getNullLayerConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab(),
			buildTransformTab(),
			buildParentingTab(),
			buildAnimationsTab(),
		],
	};
}

function getVideoConfig({
	mediaAsset,
}: {
	mediaAsset: MediaAsset | undefined;
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
			buildElementTab(),
			buildTransformTab(),
			buildGraphicsStyleTab(),
			...(hideAudioTab ? [] : [buildAudioTab()]),
			buildSpeedTab(),
			buildSpeedRampTab(),
			// Colour correction now lives in its own dedicated card in
			// the left-bar "Advanced" tab (with wheels, HSL, curves,
			// LUT). The inspector stays focused on the per-element
			// tools you reach for while keyframing.
			buildParentingTab(),
			buildCameraTab(),
			buildAnimationsTab(),
			buildMasksTab(),
			buildClipEffectsTab(),
		],
	};
}

function getStickerConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab(),
			buildTransformTab(),
			buildParentingTab(),
			buildCameraTab(),
			buildAnimationsTab(),
			buildClipEffectsTab(),
		],
	};
}

function getGraphicConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "graphic",
		tabs: [
			buildElementTab(),
			buildGraphicTab(),
			buildTransformTab(),
			buildParentingTab(),
			buildCameraTab(),
			buildMasksTab(),
			buildClipEffectsTab(),
		],
	};
}

function getAudioConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "audio-element",
		tabs: [
			buildElementTab(),
			buildAudioElementTab(),
			buildSpeedTab(),
			buildSpeedRampTab(),
			buildAudioEffectsTab(),
		],
	};
}

function getImageConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildElementTab(),
			buildImageTab(),
			buildAdjustTab(),
			buildGraphicsStyleTab(),
			buildTransformTab(),
			buildParentingTab(),
			buildCameraTab(),
			buildAnimationsTab(),
			buildMasksTab(),
			buildClipEffectsTab(),
		],
	};
}

function getEffectConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "effects",
		tabs: [
			buildElementTab(),
			buildStandaloneEffectTab(),
		],
	};
}

function getCameraConfig(): ElementPropertiesConfig {
	return {
		defaultTab: "camera-inspect",
		tabs: [buildCameraInspectTab(), buildElementTab()],
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
				return getNullLayerConfig();
			}
			return getTextConfig();
		}
		case "video": {
			const mediaAsset = mediaAssets.find((a) => a.id === element.mediaId);
			return getVideoConfig({ mediaAsset });
		}
		case "image":
			return getImageConfig();
		case "sticker":
			return getStickerConfig();
		case "graphic":
			return getGraphicConfig();
		case "audio":
			return getAudioConfig();
		case "effect":
			return getEffectConfig();
		case "camera":
			return getCameraConfig();
	}
}
