import type { EditorCore } from "@/core";
import type { ElementClipboardItem } from "@/lib/clipboard";
import type { ElementRef } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import type { PresetElementItem, PresetKind, UserPreset } from "./types";

/**
 * Serializes the given timeline elements into a reusable preset. Element ids are
 * stripped (mirrors the clipboard element handler) and start times are stored
 * relative to the earliest element so the preset can be dropped anywhere.
 * Returns null when none of the refs resolve to a real element.
 */
export function buildPresetFromElements({
	editor,
	elements,
	name,
	thumbnail,
}: {
	editor: EditorCore;
	elements: ElementRef[];
	name: string;
	thumbnail: string | null;
}): UserPreset | null {
	const resolved = editor.timeline.getElementsWithTracks({ elements });
	if (resolved.length === 0) {
		return null;
	}

	const minStart = Math.min(
		...resolved.map(({ element }) => element.startTime),
	);
	let maxEnd = 0;
	const items: PresetElementItem[] = resolved.map(({ track, element }) => {
		const { id: _id, ...elementWithoutId } = element;
		maxEnd = Math.max(maxEnd, element.startTime + element.duration);
		return {
			trackType: track.type,
			sourceTrackKey: track.id,
			relativeStartTime: element.startTime - minStart,
			element: elementWithoutId,
		};
	});

	const hasAnimation = resolved.some(
		({ element }) =>
			element.animations &&
			Object.keys(element.animations.channels ?? {}).length > 0,
	);
	const kind: PresetKind =
		resolved.length > 1 ? "group" : hasAnimation ? "animation" : "element";

	return {
		id: generateUUID(),
		name: name.trim() || "Untitled preset",
		kind,
		thumbnail,
		duration: Math.max(0, maxEnd - minStart),
		createdAt: Date.now(),
		items,
	};
}

/**
 * Track types the current paste path can actually place. `canElementGoOnTrack`
 * only accepts video/text/audio/graphic(effect)/image/camera while `add_track`
 * (AI + dialogs) accepts video/text/audio/graphic/effect — i.e. graphic is
 * the shared visual lane and effect/camera/image lanes are created by other
 * flows. A preset that references a lane outside this set (saved by an older
 * build, a cross-version import, or hand-edited storage) previously produced
 * clipboard items the PasteCommand could never place: `PasteCommand.execute`
 * groups by the synthetic trackId, `resolveTrackPlacement` returns null for
 * the unknown trackType, and the lane is skipped silently — an ok:true insert
 * that drops clips. Filter here so callers can report the drop honestly.
 */
export const PRESET_PLACEABLE_TRACK_TYPES: ReadonlySet<string> = new Set([
	"video",
	"text",
	"audio",
	"graphic",
	"image",
	"effect",
	"camera",
]);

/**
 * Converts a stored preset back into clipboard items the PasteCommand can place,
 * re-deriving absolute start times from each element's relative offset. A fresh
 * groupId is minted per insertion so multiple drops of the same multi-element
 * preset stay independently groupable.
 *
 * Items whose trackType is outside PRESET_PLACEABLE_TRACK_TYPES are dropped:
 * the PasteCommand would skip those lanes silently (resolveTrackPlacement
 * returns null for an unknown trackType). Dropping here keeps the survivor
 * count visible to the caller — an all-dropped preset yields [] so the UI
 * can toast a failure instead of an ok:true that pasted nothing.
 */

export function presetToClipboardItems({
	preset,
}: {
	preset: UserPreset;
}): ElementClipboardItem[] {
	const newGroupId = preset.items.length > 1 ? generateUUID() : null;
	// Remap each original track id to one fresh synthetic id so elements that
	// shared a track land back together when pasted.
	const trackIdBySource = new Map<string, string>();
	const resolveTrackId = (sourceTrackKey: string): string => {
		const existing = trackIdBySource.get(sourceTrackKey);
		if (existing) return existing;
		const fresh = generateUUID();
		trackIdBySource.set(sourceTrackKey, fresh);
		return fresh;
	};

	return preset.items
		.filter((item) => PRESET_PLACEABLE_TRACK_TYPES.has(item.trackType))
		.map((item) => {
			const hasGroup =
				newGroupId !== null &&
				typeof (item.element as { groupId?: string }).groupId === "string";

			return {
				trackId: resolveTrackId(item.sourceTrackKey),
				trackType: item.trackType,
				element: {
					...item.element,
					startTime: item.relativeStartTime,
					...(hasGroup ? { groupId: newGroupId } : {}),
				},
			};
		});
}
