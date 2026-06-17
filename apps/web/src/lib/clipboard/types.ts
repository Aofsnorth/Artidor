import type { EditorCore } from "@/core";
import type {
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
	ScalarCurveKeyframePatch,
	SelectedKeyframeRef,
	ElementAnimations,
} from "@/lib/animation/types";
import type { Command } from "@/lib/commands/base-command";
import type { Effect } from "@/lib/effects/types";
import type { Mask } from "@/lib/masks/types";
import type { BlendMode, Transform, Transform3D } from "@/lib/rendering";
import type {
	CreateTimelineElement,
	ElementRef,
	TrackType,
	RetimeConfig,
	TextBackground,
	TextStroke,
	TextShadow,
	TextAnimator,
} from "@/lib/timeline";

export interface ElementClipboardItem {
	trackId: string;
	trackType: TrackType;
	element: CreateTimelineElement;
}

export interface KeyframeClipboardCurvePatch {
	componentKey: string;
	patch: ScalarCurveKeyframePatch;
}

export interface KeyframeClipboardItem {
	propertyPath: AnimationPath;
	timeOffset: number;
	value: AnimationValue;
	interpolation: AnimationInterpolation;
	curvePatches: KeyframeClipboardCurvePatch[];
}

export interface ElementsClipboardEntry {
	type: "elements";
	items: ElementClipboardItem[];
}

export interface KeyframesClipboardEntry {
	type: "keyframes";
	sourceElement: ElementRef;
	items: KeyframeClipboardItem[];
}

/**
 * Extracted "style" properties from an element — everything that defines how
 * the element looks/behaves but NOT its content or timeline position. This
 * mirrors Alight Motion's "Copy Style / Paste Style" feature where you can
 * copy the visual treatment of one layer and apply it to another.
 */
export interface ElementStyle {
	/* Visual transform */
	transform?: Transform;
	transform3d?: Transform3D;
	opacity?: number;
	blendMode?: BlendMode;

	/* Effects & masks */
	effects?: Effect[];
	masks?: Mask[];

	/* Animations */
	animations?: ElementAnimations;

	/* Text-specific */
	fontSize?: number;
	fontFamily?: string;
	color?: string;
	textAlign?: "left" | "center" | "right";
	fontWeight?: "normal" | "bold";
	fontStyle?: "normal" | "italic";
	textDecoration?: "none" | "underline" | "line-through";
	letterSpacing?: number;
	lineHeight?: number;
	stroke?: TextStroke;
	shadow?: TextShadow;
	textAnimator?: TextAnimator;
	background?: TextBackground;

	/* Audio / video */
	volume?: number;
	muted?: boolean;
	pan?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
	retime?: RetimeConfig;
}

export interface StyleClipboardEntry {
	type: "style";
	/** The element type the style was copied from — used to filter which
	    properties are applicable when pasting onto a different type. */
	sourceType: string;
	style: ElementStyle;
}

export interface ClipboardEntryByType {
	elements: ElementsClipboardEntry;
	keyframes: KeyframesClipboardEntry;
}

export type ClipboardEntry = ClipboardEntryByType[keyof ClipboardEntryByType];
export type ClipboardEntryType = keyof ClipboardEntryByType;

export interface CopyContext {
	editor: EditorCore;
	selectedElements: ElementRef[];
	selectedKeyframes: SelectedKeyframeRef[];
}

export interface PasteContext {
	editor: EditorCore;
	selectedElements: ElementRef[];
	selectedKeyframes: SelectedKeyframeRef[];
	time: number;
}

export interface ClipboardHandler<TType extends ClipboardEntryType> {
	type: TType;
	canCopy(context: CopyContext): boolean;
	copy(context: CopyContext): ClipboardEntryByType[TType] | null;
	paste(
		entry: ClipboardEntryByType[TType],
		context: PasteContext,
	): Command | null;
}

export type ClipboardHandlerMap = {
	[TType in ClipboardEntryType]: ClipboardHandler<TType>;
};
