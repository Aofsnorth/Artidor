import { getOrderedTracks } from "@/lib/timeline";
import { PasteCommand } from "@/lib/commands/timeline";
import type { ClipboardHandler } from "../types";

export const ElementsClipboardHandler = {
	type: "elements",

	canCopy({ selectedElements }) {
		return selectedElements.length > 0;
	},

	/**
	 * Copy the selected elements as a deep snapshot.
	 *
	 * Important behavior:
	 * - The copied element `id` is retained in the payload as internal metadata
	 *   so PasteCommand can remap groupId/parentId links between copied clips.
	 *   The paste always assigns fresh IDs before insertion.
	 * - Items are ordered by the tracks' visual order (overlay → main →
	 *   overlayAfter → audio) so multi-lane pastes preserve lane stacking.
	 */
	copy({ editor, selectedElements }) {
		if (selectedElements.length === 0) {
			return null;
		}

		const results = editor.timeline.getElementsWithTracks({
			elements: selectedElements,
		});
		const trackOrder = getOrderedTracks(editor.scenes.getActiveScene().tracks);
		results.sort(
			(left, right) =>
				trackOrder.indexOf(left.track) - trackOrder.indexOf(right.track),
		);

		const items = results.map(({ track, element }) => ({
			trackId: track.id,
			trackType: track.type,
			// Deep clone so later edits to the source clip never mutate the copy.
			element: structuredClone(element),
		}));

		if (items.length === 0) {
			return null;
		}

		return {
			type: "elements",
			items,
		};
	},

	paste(entry, context) {
		if (entry.items.length === 0) {
			return null;
		}

		return new PasteCommand({
			time: context.time,
			clipboardItems: entry.items,
		});
	},
} satisfies ClipboardHandler<"elements">;
