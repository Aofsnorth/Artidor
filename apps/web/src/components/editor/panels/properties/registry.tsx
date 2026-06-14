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
	RainDropIcon,
	MusicNote03Icon,
	MagicWand05Icon,
	DashboardSpeed02Icon,
	Sun01Icon,
	PlayIcon,
	SparklesIcon,
	Link01Icon,
	Camera01Icon,
} from "@hugeicons/core-free-icons";
import { TransformTab } from "./tabs/transform-tab";
import { BlendingTab } from "./tabs/blending-tab";
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
import { OcShapesIcon } from "@/components/icons";

export type TabContentProps = {
	trackId: string;
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

function _buildBlendingTab({
	element,
}: {
	element: VisualElement;
}): PropertiesTabDef {
	return {
		id: "blending",
		label: "Blending",
		icon: <HugeiconsIcon icon={RainDropIcon} size={16} />,
		content: ({ trackId }) => (
			<BlendingTab element={element} trackId={trackId} />
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

function getTextConfig({
	element,
}: {
	element: TextElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "text",
		tabs: [
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
}: {
	element: VideoElement;
	mediaAsset: MediaAsset | undefined;
}): ElementPropertiesConfig {
	// Only expose the Audio tab when the underlying media actually has an
	// audio track. Videos with no audio stream get a Transform-only inspector.
	const showAudioTab = mediaAsset?.hasAudio === true;
	return {
		defaultTab: "transform",
		tabs: [
			buildTransformTab({ element }),
			...(showAudioTab ? [buildAudioTab({ element })] : []),
			buildSpeedTab({ element }),
			buildSpeedRampTab({ element }),
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

function getImageConfig({
	element,
}: {
	element: ImageElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
			buildTransformTab({ element }),
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

function getStickerConfig({
	element,
}: {
	element: StickerElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "transform",
		tabs: [
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
}: {
	element: GraphicElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "graphic",
		tabs: [
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
}: {
	element: AudioElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "audio-element",
		tabs: [
			buildAudioElementTab({ element }),
			buildSpeedTab({ element }),
			buildSpeedRampTab({ element }),
			buildAudioEffectsTab({ element }),
		],
	};
}

function getEffectConfig({
	element,
}: {
	element: EffectElement;
}): ElementPropertiesConfig {
	return {
		defaultTab: "effects",
		tabs: [buildStandaloneEffectTab({ element })],
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
			return getTextConfig({ element });
		case "video": {
			const mediaAsset = mediaAssets.find((a) => a.id === element.mediaId);
			return getVideoConfig({ element, mediaAsset });
		}
		case "image":
			return getImageConfig({ element });
		case "sticker":
			return getStickerConfig({ element });
		case "graphic":
			return getGraphicConfig({ element });
		case "audio":
			return getAudioConfig({ element });
		case "effect":
			return getEffectConfig({ element });
	}
}
