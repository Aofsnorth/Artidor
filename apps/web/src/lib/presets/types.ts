import type { CreateTimelineElement, TrackType } from "@/lib/timeline";

/**
 * A reusable user-saved preset. Captures one or more timeline elements
 * (a single shape, a styled layer, or a whole group such as a spinning coin
 * built from several elements + keyframe animations) so they can be dropped
 * back into any project later.
 *
 * Element ids are stripped on save (mirrors the clipboard's element handler);
 * fresh ids are minted when the preset is inserted. `relativeStartTime` keeps
 * the elements' timing relative to the earliest element so a multi-element
 * preset reconstructs its internal layout regardless of where it is dropped.
 */
export interface PresetElementItem {
	trackType: TrackType;
	/** Original track id, used only to regroup elements that shared a track when
	 * the preset is re-inserted (remapped to a fresh synthetic id per insert). */
	sourceTrackKey: string;
	/** Element start time relative to the preset's earliest element (ticks). */
	relativeStartTime: number;
	element: CreateTimelineElement;
}

export type PresetKind = "element" | "group" | "animation";

export interface UserPreset {
	id: string;
	name: string;
	kind: PresetKind;
	/** Data-URL PNG thumbnail rendered from the timeline at save time. */
	thumbnail: string | null;
	/** Total timeline span the preset occupies (ticks). */
	duration: number;
	createdAt: number;
	items: PresetElementItem[];
}

export type UserPresetMetadata = Omit<UserPreset, "items">;
