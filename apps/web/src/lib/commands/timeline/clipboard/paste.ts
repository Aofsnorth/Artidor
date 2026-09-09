import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import {
	getOrderedTracks,
	type SceneTracks,
	type TimelineElement,
} from "@/lib/timeline";
import type { ElementClipboardItem } from "@/lib/clipboard";
import { generateUUID } from "@/utils/id";
import {
	applyPlacement,
	resolveTrackPlacement,
	enforceMainTrackStart,
} from "@/lib/timeline/placement";
import type { PlacementResult } from "@/lib/timeline/placement/types";
import type { TrackType } from "@/lib/timeline";
import { cloneAnimations } from "@/lib/animation";

/**
 * Paste clipboard elements at `time` (absolute timeline ticks).
 *
 * Placement policy:
 * - Single source lane: unchanged "aboveSource" behavior (paste onto the lane
 *   above the source when it fits, else the first available lane, else a new
 *   lane above the source group).
 * - Multiple source lanes: always paste as one contiguous new stack (highest
 *   index per lane type, in the source's visual order). This preserves the
 *   user's lane ordering; it never reuses the first available lane per item,
 *   which previously interleaved copies into existing lanes in reverse.
 *
 * Undo/redo: post-execute state is snapshotted and reused for redo so pasted
 * element IDs stay stable across undo/redo cycles.
 */
export class PasteCommand extends Command {
	private savedState: SceneTracks | null = null;
	/** Immutable snapshot used for redo so element IDs stay stable. */
	private pastedState: SceneTracks | null = null;
	private pastedElements: { trackId: string; elementId: string }[] = [];
	private readonly time: number;
	private readonly clipboardItems: ElementClipboardItem[];

	constructor({
		time,
		clipboardItems,
	}: {
		time: number;
		clipboardItems: ElementClipboardItem[];
	}) {
		super();
		this.time = time;
		this.clipboardItems = clipboardItems;
	}

	execute(): CommandResult | undefined {
		if (this.clipboardItems.length === 0) return undefined;

		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		this.pastedState = null;
		this.pastedElements = [];

		let updatedTracks = this.savedState;
		const itemsByTrackId = groupClipboardItemsByTrackId({
			clipboardItems: this.clipboardItems,
		});
		// Cross-lane timing anchor: earliest start across ALL copied items, so
		// each lane keeps its original offset relative to the copy as a whole.
		const minStart = Math.min(
			...this.clipboardItems.map((item) => item.element.startTime),
		);
		const isMultiLanePaste = itemsByTrackId.size > 1;
		// Iterate bottom-up: `alwaysNew highest` inserts each lane above the
		// previous one, so bottom-up iteration keeps the pasted stack in the
		// source's visual order instead of inverting it.
		const sourceLanes = isMultiLanePaste
			? Array.from(itemsByTrackId.entries()).reverse()
			: Array.from(itemsByTrackId.entries());

		// Remap tables are per-paste (not per-lane) AND precomputed for every
		// lane before any element is built: groupId is a shared opaque tag and
		// parentId points at another element, so both must survive across
		// lanes regardless of placement iteration order. Per-lane maps, or
		// remapping each lane before the others are assigned ids, would lose
		// every cross-track parent/group link.
		const clonedLanes = sourceLanes.map(([trackId, items]) => ({
			trackId,
			trackType: items[0]?.trackType,
			items: structuredClone(items),
		}));
		const sourceIdToPastedId = new Map<string, string>();
		const sourceGroupToPastedGroup = new Map<string, string>();
		for (const lane of clonedLanes) {
			for (const item of lane.items) {
				if (typeof item.element.id === "string") {
					sourceIdToPastedId.set(item.element.id, generateUUID());
				}
				// groupId is opaque (see GroupElementsCommand), not an element id:
				// one fresh tag per source tag, even if no other member of the
				// source group was copied.
				if (
					typeof item.element.groupId === "string" &&
					!sourceGroupToPastedGroup.has(item.element.groupId)
				) {
					sourceGroupToPastedGroup.set(item.element.groupId, generateUUID());
				}
			}
		}

		for (const lane of clonedLanes) {
			const elementsToAdd = buildPastedElements({
				items: lane.items,
				minStart,
				time: this.time,
				sourceIdToPastedId,
				sourceGroupToPastedGroup,
			});
			const trackId = lane.trackId;

			if (elementsToAdd.length === 0) {
				continue;
			}

			const trackType = lane.trackType;
			if (!trackType) {
				continue;
			}
			const sourceTrackIndex = getOrderedTracks(updatedTracks).findIndex(
				(track) => track.id === trackId,
			);

			const placementResult = resolvePlacementForItems({
				tracks: updatedTracks,
				trackType,
				sourceTrackIndex,
				elementsToAdd,
				isMultiLanePaste,
			});
			if (!placementResult) {
				continue;
			}

			let elementsForPlacement = elementsToAdd;
			if (placementResult.kind === "existingTrack") {
				const targetTrack =
					getOrderedTracks(updatedTracks)[placementResult.trackIndex];
				if (targetTrack?.id === updatedTracks.main.id) {
					const earliestElement = elementsToAdd.reduce((earliest, element) =>
						element.startTime < earliest.startTime ? element : earliest,
					);
					const adjustedEarliestStartTime = enforceMainTrackStart({
						tracks: updatedTracks,
						targetTrackId: targetTrack.id,
						requestedStartTime: earliestElement.startTime,
					});
					const delta = adjustedEarliestStartTime - earliestElement.startTime;

					if (delta !== 0) {
						elementsForPlacement = elementsToAdd.map((element) => ({
							...element,
							startTime: Math.max(0, element.startTime + delta),
						}));
					}
				}
			}

			const applied = applyPlacement({
				tracks: updatedTracks,
				placementResult,
				elements: elementsForPlacement,
			});
			if (!applied) {
				continue;
			}

			updatedTracks = applied.updatedTracks;

			for (const element of elementsForPlacement) {
				this.pastedElements.push({
					trackId: applied.targetTrackId,
					elementId: element.id,
				});
			}
		}

		this.pastedState = structuredClone(updatedTracks);
		editor.timeline.updateTracks(updatedTracks);

		if (this.pastedElements.length > 0) {
			return { select: this.pastedElements };
		}
		return undefined;
	}

	redo(): CommandResult | undefined {
		if (this.pastedState) {
			EditorCore.getInstance().timeline.updateTracks(
				structuredClone(this.pastedState),
			);
		}
		return this.pastedElements.length > 0
			? { select: this.pastedElements }
			: undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getPastedElements(): { trackId: string; elementId: string }[] {
		return this.pastedElements;
	}
}

function resolvePlacementForItems({
	tracks,
	trackType,
	sourceTrackIndex,
	elementsToAdd,
	isMultiLanePaste,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
	sourceTrackIndex: number;
	elementsToAdd: TimelineElement[];
	isMultiLanePaste: boolean;
}): PlacementResult | null {
	const timeSpans = elementsToAdd.map((element) => ({
		startTime: element.startTime,
		duration: element.duration,
	}));

	if (isMultiLanePaste || sourceTrackIndex < 0) {
		// Unknown source lane (e.g. cross-scene paste) or a multi-lane copy:
		// create a fresh ordered stack instead of interleaving into lanes.
		return resolveTrackPlacement({
			tracks,
			trackType,
			timeSpans,
			strategy: { type: "alwaysNew", position: "highest" },
		});
	}

	return resolveTrackPlacement({
		tracks,
		trackType,
		timeSpans,
		strategy: { type: "aboveSource", sourceTrackIndex },
	});
}

function groupClipboardItemsByTrackId({
	clipboardItems,
}: {
	clipboardItems: ElementClipboardItem[];
}): Map<string, ElementClipboardItem[]> {
	const groupedItems = new Map<string, ElementClipboardItem[]>();

	for (const item of clipboardItems) {
		const existingItems = groupedItems.get(item.trackId) ?? [];
		groupedItems.set(item.trackId, [...existingItems, item]);
	}

	return groupedItems;
}

/**
 * Build the pasted copies for one lane from precomputed per-paste tables.
 *
 * Remap rules:
 * - parentId points at another element: remap to that element's pasted
 *   clone when the parent was copied; drop when it was NOT copied, so a
 *   pasted clone never stays attached to the original.
 * - groupId is an opaque shared tag (see GroupElementsCommand), NOT an
 *   element id: the caller precomputed one fresh tag per source tag, so
 *   the pasted set stays grouped together.
 *
 * Note: `id` is carried in the clipboard payload as remapping metadata
 * (see ElementsClipboardHandler.copy) and always replaced with the
 * precomputed fresh ID here before insertion.
 */
function buildPastedElements({
	items,
	time,
	minStart,
	sourceIdToPastedId,
	sourceGroupToPastedGroup,
}: {
	items: ElementClipboardItem[];
	time: number;
	/** Earliest start across ALL clipboard items, so lanes keep their
	    cross-lane timing offsets from the original copy. */
	minStart: number;
	/** Per-paste tables precomputed for every lane (see caller). */
	sourceIdToPastedId: Map<string, string>;
	sourceGroupToPastedGroup: Map<string, string>;
}): TimelineElement[] {
	const elementsToAdd: TimelineElement[] = [];

	for (const item of items) {
		const relativeOffset = item.element.startTime - minStart;
		const startTime = Math.max(0, time + relativeOffset);
		const newElementId =
			typeof item.element.id === "string"
				? (sourceIdToPastedId.get(item.element.id) ?? generateUUID())
				: generateUUID();
		const element = { ...item.element, id: newElementId, startTime };
		if (typeof element.groupId === "string") {
			element.groupId = sourceGroupToPastedGroup.get(element.groupId);
		}
		if (typeof element.parentId === "string") {
			element.parentId = sourceIdToPastedId.get(element.parentId) ?? undefined;
		}
		elementsToAdd.push(element);
	}

	for (const element of elementsToAdd) {
		element.animations = cloneAnimations({
			animations: element.animations,
			shouldRegenerateKeyframeIds: true,
		});
	}

	return elementsToAdd;
}
