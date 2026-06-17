import type { ReactNode } from "react";
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
import type { MediaAsset } from "@/lib/media/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	TextFontIcon,
	ArrowExpandIcon,
	MusicNote03Icon,
	MagicWand05Icon,
	DashboardSpeed02Icon,
	Sun01Icon,
	PlayIcon,
	SparklesIcon,
	Link01Icon,
	Camera01Icon,
	InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { TransformTab } from "./tabs/transform-tab";
import { AudioTab } from "./tabs/audio-tab";
import { AudioEffectsTab } from "./tabs/audio-effects-tab";
import { TextTab } from "./tabs/text-tab";
import { ClipEffectsTab, StandaloneEffectTab } from "./tabs/effects-tab";
import { MasksTab } from "./tabs/masks-tab";
import { SpeedTab } from "./tabs/speed-tab";
import { SpeedRampTab } from "./tabs/speed-ramp-tab";
import { GraphicTab } from "./tabs/graphic-tab";
import { AdjustmentsTab } from "./tabs/adjustments-tab";
import { ColorGradingTab } from "./tabs/color-grading-tab";
import { AnimationsTab } from "./tabs/animations-tab";
import { ParentingTab } from "./tabs/parenting-tab";
import { CameraTab } from "./tabs/camera-tab";
import { ElementTab } from "./tabs/element-tab";
import { OcShapesIcon } from "@/components/icons";

export type TabContentProps = {
	trackId: string;
	/** Display name of the track the selected element sits on. */
	trackName: string;
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
			<SpeedRampTab element={element} trackId={trackId} />
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
			<AudioEffectsTab element={element} trackId={trackId} />
		),
	};
}

import { BasicAdjustTab } from "./tabs/basic-adjust-tab";
import { ColorWheelsTab } from "./tabs/color-wheels-tab";
import { DavinciAdjustTab } from "./tabs/davinci-adjust-tab";

function buildBasicAdjustTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "basic-adjust",
		label: "Basic",
		icon: <HugeiconsIcon icon={Sun01Icon} size={16} />,
		content: ({ trackId }) => (
			<BasicAdjustTab element={element} trackId={trackId} />
		),
	};
}

function buildColorWheelsTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "color-wheels",
		label: "Wheels",
		icon: <HugeiconsIcon icon={Sun01Icon} size={16} />,
		content: ({ trackId }) => (
			<ColorWheelsTab element={element} trackId={trackId} />
		),
	};
}

function buildColorGradingTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "color",
		label: "Color",
		icon: <HugeiconsIcon icon={Sun01Icon} size={16} />,
		content: ({ trackId }) => (
			<ColorGradingTab element={element} trackId={trackId} />
		),
	};
}

function buildDavinciAdjustTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "davinci-adjust",
		label: "Manual",
		icon: <HugeiconsIcon icon={Sun01Icon} size={16} />,
		content: ({ trackId }) => (
			<DavinciAdjustTab element={element} trackId={trackId} />
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
		content: ({ trackId }) => <MasksTab element={element} trackId={trackId} />,
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
			<ClipEffectsTab element={element} trackId={trackId} />
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
			<StandaloneEffectTab element={element} trackId={trackId} />
		),
	};
}

function buildAdjustmentsTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "adjustments",
		label: "Adjust",
		icon: <HugeiconsIcon icon={Sun01Icon} size={16} />,
		content: ({ trackId }) => (
			<AdjustmentsTab element={element} trackId={trackId} />
		),
	};
}

function buildAnimationsTab(): PropertiesTabDef {
	return {
		id: "animations",
		label: "Animation",
		icon: <HugeiconsIcon icon={PlayIcon} size={16} />,
		content: () => <AnimationsTab />,
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
			<ParentingTab element={element} trackId={trackId} />
		),
	};
}

function buildCameraTab(): PropertiesTabDef {
	return {
		id: "camera",
		label: "Camera",
		icon: <HugeiconsIcon icon={Camera01Icon} size={16} />,
		content: () => <CameraTab />,
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
			<ElementTab
				element={element}
				trackId={trackId}
				trackName={trackName}
				mediaAssets={mediaAssets}
			/>
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
			buildTransformTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
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
			...(hideAudioTab ? [] : [buildAudioTab({ element })]),
			buildSpeedTab({ element }),
			buildSpeedRampTab({ element }),
			// Colour-correction sub-tabs (Basic / Manual / Wheels / Color /
			// Adjustments) moved to the left bar's new `color` tab —
			// see `views/color.tsx`. They operate on the same effect
			// params (`davinci-adjust`) so users don't lose any tools,
			// only the location changes.
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
			buildTransformTab({ element }),
			buildBasicAdjustTab({ element }),
			buildDavinciAdjustTab({ element }),
			buildColorWheelsTab({ element }),
			buildColorGradingTab({ element }),
			buildParentingTab({ element }),
			buildCameraTab(),
			buildAnimationsTab(),
			buildAdjustmentsTab({ element }),
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

export function getPropertiesConfig({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	switch (element.type) {
		case "text":
			return getTextConfig({ element, mediaAssets });
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
	}
}
