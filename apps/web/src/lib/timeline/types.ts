import type { ElementAnimations } from "@/lib/animation/types";
import type { Effect } from "@/lib/effects/types";
import type { Mask } from "@/lib/masks/types";
import type { ParamValues } from "@/lib/params";
import type {
	BlendMode,
	Camera3D,
	Transform,
	Transform3D,
} from "@/lib/rendering";
import type { CameraElement } from "@/lib/camera";

export type ElementRef = {
	trackId: string;
	elementId: string;
};

export interface Bookmark {
	time: number;
	note?: string;
	color?: string;
	duration?: number;
}

export interface Transition {
	id: string;
	transitionType: string;
	fromTrackId: string;
	fromElementId: string;
	toTrackId: string;
	toElementId: string;
	/** Start time in ticks (where the overlap begins). */
	startTime: number;
	/** Duration in ticks (overlap length). */
	duration: number;
}

export interface TScene {
	id: string;
	name: string;
	isMain: boolean;
	tracks: SceneTracks;
	bookmarks: Bookmark[];
	transitions?: Transition[];
	/** Optional 3D camera. Off by default. */
	camera?: Camera3D;
	createdAt: Date;
	updatedAt: Date;
}

export type TrackType =
	| "video"
	| "text"
	| "audio"
	| "graphic"
	| "effect"
	| "image"
	| "camera";

interface BaseTrack {
	id: string;
	name: string;
	/** Custom accent color for the track (hex string). When set, overrides the default type-based palette. */
	color?: string;
}

export interface VideoTrack extends BaseTrack {
	type: "video";
	elements: (VideoElement | ImageElement)[];
	muted: boolean;
	hidden: boolean;
}

export interface TextTrack extends BaseTrack {
	type: "text";
	elements: TextElement[];
	hidden: boolean;
}

export interface AudioTrack extends BaseTrack {
	type: "audio";
	elements: AudioElement[];
	muted: boolean;
}

export interface GraphicTrack extends BaseTrack {
	type: "graphic";
	elements: (StickerElement | GraphicElement)[];
	hidden: boolean;
}

export interface EffectTrack extends BaseTrack {
	type: "effect";
	elements: EffectElement[];
	hidden: boolean;
}

export interface ImageTrack extends BaseTrack {
	type: "image";
	elements: ImageElement[];
	hidden: boolean;
}

export interface CameraTrack extends BaseTrack {
	type: "camera";
	elements: CameraElement[];
	hidden: boolean;
}

export type TimelineTrack =
	| VideoTrack
	| TextTrack
	| AudioTrack
	| GraphicTrack
	| EffectTrack
	| ImageTrack
	| CameraTrack;

export type OverlayTrack =
	| VideoTrack
	| TextTrack
	| GraphicTrack
	| EffectTrack
	| ImageTrack
	| CameraTrack;

export interface SceneTracks {
	overlay: OverlayTrack[];
	main: VideoTrack;
	audio: AudioTrack[];
}

export interface RetimeCurveKeyframe {
	time: number; // 0..1 normalized along the clip
	speed: number; // playback-rate multiplier at this point
}

export interface RetimeConfig {
	rate: number;
	maintainPitch?: boolean;
	/**
	 * When set to "curve" the speed follows the `keyframes` interpolation
	 * instead of a constant `rate`. The renderer and audio pipeline look at
	 * this field; absent it the legacy constant-rate behavior is used.
	 */
	mode?: "constant" | "curve";
	keyframes?: RetimeCurveKeyframe[];
	/**
	 * Frame interpolation method used to synthesize in-between frames when
	 * the source rate doesn't align with the retimed rate (e.g. 24→60 fps
	 * slow-motion).
	 *
	 * - "blend"        — cross-dissolve neighbouring frames. Free, every device.
	 * - "optical-flow" — block-matching motion vectors, then warp. CPU/GPU.
	 * - "ai"           — RIFE v4.9 ONNX, neural network. Needs ~20MB model +
	 *                    WebGPU/WASM runtime. Best quality, slowest.
	 */
	interpolation?: "blend" | "optical-flow" | "ai";
}

/**
 * Hardware capability snapshot used by the frame-interpolation picker to
 * decide which methods are actually usable on the current device.
 */
export type FrameInterpolationHardware = "webgpu" | "webgl2" | "wasm";

export interface FrameInterpolationCapabilities {
	blend: boolean;
	opticalFlow: boolean;
	ai: boolean;
	hardware: FrameInterpolationHardware;
}

interface BaseAudioElement extends BaseTimelineElement {
	type: "audio";
	volume: number;
	muted?: boolean;
	buffer?: AudioBuffer;
	retime?: RetimeConfig;
	pan?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
}

export interface UploadAudioElement extends BaseAudioElement {
	sourceType: "upload";
	mediaId: string;
}

export interface LibraryAudioElement extends BaseAudioElement {
	sourceType: "library";
	sourceUrl: string;
}

export type AudioElement = UploadAudioElement | LibraryAudioElement;

export interface BaseTimelineElement {
	id: string;
	name: string;
	/**
	 * User-assigned label for this clip on the timeline. When set, it overrides
	 * the auto-derived display name (media filename, text content, effect type,
	 * etc.) everywhere the element is shown — the timeline clip, the inspector
	 * summary, layer lists. This mirrors how Premiere keeps a "clip name"
	 * distinct from the underlying source name, so renaming a clip never
	 * mutates the source media's name (other clips of the same media keep
	 * their own labels). Absent / empty means "use the derived name".
	 */
	customName?: string;
	duration: number;
	startTime: number;
	trimStart: number;
	trimEnd: number;
	sourceDuration?: number;
	animations?: ElementAnimations;
	/**
	 * Optional parent layer id. When set, this layer's transform inherits from
	 * the parent's transform — position is added, scale is multiplied, and
	 * rotation is composed. This is Alight Motion's "Link parent and child
	 * layers" feature.
	 */
	parentId?: string;
	/**
	 * Whether the parent's transform should be inherited. When false the
	 * parent link is kept but transforms are no longer applied (useful for
	 * temporarily "unlinking" without losing the relationship).
	 */
	parentEnabled?: boolean;
	/**
	 * Per-property overrides that turn off inheritance. Stored as a set of
	 * property paths (e.g. "transform.positionX") that should be evaluated
	 * locally instead of inheriting from the parent.
	 */
	parentOverrides?: string[];
	/**
	 * Optional group id. Multiple elements can belong to the same group, and
	 * group-level operations (move all, transform all, etc.) act on the
	 * entire group. This is Alight Motion's "Group layers together" feature.
	 */
	groupId?: string;
	/**
	 * Marks the element as a null/layer holder. A null element has no
	 * intrinsic content but is used as a parent or anchor for other layers.
	 * Matches Blurrr's "Null Object Layers" feature.
	 */
	nullLayer?: boolean;
	/**
	 * Element-level bookmarks/markers. The `time` is relative to the element's start time + trim.
	 */
	bookmarks?: Bookmark[];
}

export interface MediaBorder {
	enabled: boolean;
	color: string;
	width: number;
	opacity: number;
}

export interface MediaGraphicStyle {
	fillColor?: string;
	fillOpacity?: number;
	stroke?: TextStroke;
	shadow?: TextShadow;
	border?: MediaBorder;
}

export interface VideoElement extends BaseTimelineElement {
	type: "video";
	mediaId: string;
	volume?: number;
	muted?: boolean;
	isSourceAudioEnabled?: boolean;
	hidden?: boolean;
	retime?: RetimeConfig;
	transform: Transform;
	transform3d?: Transform3D;
	opacity: number;
	blendMode?: BlendMode;
	graphicStyle?: MediaGraphicStyle;
	effects?: Effect[];
	masks?: Mask[];
	pan?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
	/**
	 * 0-based index of the embedded audio track (dubbing) to use for
	 * preview and export. Defaults to 0 (primary track) when absent.
	 * Only meaningful when the media asset has multiple audio tracks
	 * (see `MediaAssetData.audioTracks`). Changing this switches which
	 * dubbing track plays.
	 */
	selectedAudioTrackIndex?: number;
}

export interface ImageElement extends BaseTimelineElement {
	type: "image";
	mediaId: string;
	hidden?: boolean;
	transform: Transform;
	transform3d?: Transform3D;
	opacity: number;
	blendMode?: BlendMode;
	graphicStyle?: MediaGraphicStyle;
	effects?: Effect[];
	masks?: Mask[];
}

export interface TextBackground {
	enabled: boolean;
	color: string;
	cornerRadius?: number;
	paddingX?: number;
	paddingY?: number;
	offsetX?: number;
	offsetY?: number;
}

export interface TextElement extends BaseTimelineElement {
	type: "text";
	content: string;
	fontSize: number;
	fontFamily: string;
	color: string;
	background: TextBackground;
	textAlign: "left" | "center" | "right";
	fontWeight: "normal" | "bold";
	fontStyle: "normal" | "italic";
	textDecoration: "none" | "underline" | "line-through";
	letterSpacing?: number;
	lineHeight?: number;
	/** Alight Motion-style text effects. */
	stroke?: TextStroke;
	shadow?: TextShadow;
	/** After-Effects-style per-character/word entrance animator. */
	textAnimator?: TextAnimator;
	hidden?: boolean;
	transform: Transform;
	transform3d?: Transform3D;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
}

/** Built-in per-unit text animation presets. */
export type TextAnimatorPreset =
	| "fade"
	| "rise"
	| "drop"
	| "zoom"
	| "pop"
	| "typewriter"
	| "wave";

/** Granularity the animator staggers over. */
export type TextAnimatorUnit = "character" | "word";

export interface TextAnimator {
	preset: TextAnimatorPreset;
	unit: TextAnimatorUnit;
	/** Seconds each unit takes to complete its entrance (or one wave cycle). */
	duration: number;
	/** Seconds of delay added per successive unit (the stagger amount). */
	stagger: number;
}

export interface TextStroke {
	enabled: boolean;
	color: string;
	width: number;
}

export interface TextShadow {
	enabled: boolean;
	color: string;
	blur: number;
	offsetX: number;
	offsetY: number;
}

export interface StickerElement extends BaseTimelineElement {
	type: "sticker";
	stickerId: string;
	/** Natural dimensions of the sticker asset, stored at insert time. Used by renderer and preview bounds to avoid split-brain geometry. */
	intrinsicWidth?: number;
	intrinsicHeight?: number;
	hidden?: boolean;
	transform: Transform;
	transform3d?: Transform3D;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
}

export interface GraphicElement extends BaseTimelineElement {
	type: "graphic";
	definitionId: string;
	params: ParamValues;
	hidden?: boolean;
	transform: Transform;
	transform3d?: Transform3D;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
	masks?: Mask[];
}

export interface EffectElement extends BaseTimelineElement {
	type: "effect";
	effectType: string;
	params: ParamValues;
}

export type ElementUpdatePatch =
	| { transform: Transform }
	| { opacity: number }
	| { volume: number }
	| { bookmarks: Bookmark[] };

export type TimelineElement =
	| AudioElement
	| VideoElement
	| ImageElement
	| TextElement
	| StickerElement
	| GraphicElement
	| EffectElement
	| CameraElement;

export type ElementType = TimelineElement["type"];

function elementTypes<T extends ElementType[]>(...types: T): T {
	return types;
}

export const MASKABLE_ELEMENT_TYPES = elementTypes("video", "image", "graphic");

export type MaskableElement = Extract<
	TimelineElement,
	{ type: (typeof MASKABLE_ELEMENT_TYPES)[number] }
>;

export const RETIMABLE_ELEMENT_TYPES = elementTypes("video", "audio");

export type RetimableElement = Extract<
	TimelineElement,
	{ type: (typeof RETIMABLE_ELEMENT_TYPES)[number] }
>;

export const VISUAL_ELEMENT_TYPES = elementTypes(
	"video",
	"image",
	"text",
	"sticker",
	"graphic",
);

export type VisualElement = Extract<
	TimelineElement,
	{ type: (typeof VISUAL_ELEMENT_TYPES)[number] }
>;

export type CreateUploadAudioElement = Omit<UploadAudioElement, "id">;
export type CreateLibraryAudioElement = Omit<LibraryAudioElement, "id">;
export type CreateAudioElement =
	| CreateUploadAudioElement
	| CreateLibraryAudioElement;
export type CreateVideoElement = Omit<VideoElement, "id">;
export type CreateImageElement = Omit<ImageElement, "id">;
export type CreateTextElement = Omit<TextElement, "id">;
export type CreateStickerElement = Omit<StickerElement, "id">;
export type CreateGraphicElement = Omit<GraphicElement, "id">;
export type CreateEffectElement = Omit<EffectElement, "id">;
export type CreateCameraElement = Omit<CameraElement, "id">;
export type CreateTimelineElement =
	| CreateAudioElement
	| CreateVideoElement
	| CreateImageElement
	| CreateTextElement
	| CreateStickerElement
	| CreateGraphicElement
	| CreateEffectElement
	| CreateCameraElement;

export interface ElementDragState {
	isDragging: boolean;
	elementId: string | null;
	dragElementIds: string[];
	dragTimeOffsets: Record<string, number>;
	trackId: string | null;
	startMouseX: number;
	startMouseY: number;
	startElementTime: number;
	clickOffsetTime: number;
	currentTime: number;
	currentMouseY: number;
}

export interface DropTarget {
	trackIndex: number;
	isNewTrack: boolean;
	insertPosition: "above" | "below" | null;
	xPosition: number;
	targetElement: { elementId: string; trackId: string } | null;
}

export interface ComputeDropTargetParams {
	elementType: ElementType;
	mouseX: number;
	mouseY: number;
	tracks: SceneTracks;
	playheadTime: number;
	isExternalDrop: boolean;
	elementDuration: number;
	pixelsPerSecond: number;
	zoomLevel: number;
	verticalDragDirection?: "up" | "down" | null;
	startTimeOverride?: number;
	excludeElementId?: string;
	targetElementTypes?: string[];
}

export interface ClipboardItem {
	trackId: string;
	trackType: TrackType;
	element: CreateTimelineElement;
}
