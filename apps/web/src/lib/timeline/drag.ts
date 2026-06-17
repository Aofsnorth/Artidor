import type { MaskableElement, VisualElement } from "./types";
import type { ParamValues } from "@/lib/params";

interface BaseDragData {
	id: string;
	name: string;
}

export interface MediaDragData extends BaseDragData {
	type: "media";
	mediaType: "image" | "video" | "audio";
	targetElementTypes?: MaskableElement["type"][];
}

export interface TextDragData extends BaseDragData {
	type: "text";
	content: string;
	/** Optional preset id so the drop handler can look up the full
	 *  styled preset instead of rebuilding from a plain content string. */
	presetId?: string;
}

export interface StickerDragData extends BaseDragData {
	type: "sticker";
	stickerId: string;
}

export interface GraphicDragData extends BaseDragData {
	type: "graphic";
	definitionId: string;
	params: Partial<ParamValues>;
}

export interface EffectDragData extends BaseDragData {
	type: "effect";
	effectType: string;
	targetElementTypes: VisualElement["type"][];
}

/**
 * Drag payload for user-saved presets (a single layer, a group, or an
 * animated layer captured via "Save to preset" on a timeline element).
 * The drop handler reads the preset from IndexedDB by id and inserts
 * the layer(s) at the drop time using the existing `PasteCommand`
 * pipeline — so style / transform / animation / effect / timing all
 * round-trip without re-encoding.
 */
export interface PresetDragData extends BaseDragData {
	type: "preset";
	presetId: string;
}

export type TimelineDragData =
	| MediaDragData
	| TextDragData
	| StickerDragData
	| GraphicDragData
	| EffectDragData
	| PresetDragData;
