import { useEffect, useRef } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";

/**
 * `SceneTracks` → `trackId → (elementId → element)` lookup index.
 *
 * `useElementPreview` runs once per timeline clip, so resolving each clip with
 * `findTrackInSceneTracks(...)` followed by `track.elements.find(...)` costs
 * O(clips x tracks) per render pass — O(clips²) for a timeline holding one
 * clip per track, which is the normal case.
 *
 * A `SceneTracks` object is replaced wholesale on every track mutation (the
 * managers are copy-on-write), so keying the index on the object identity makes
 * it self-invalidating: it is rebuilt once per real change and reused for every
 * clip afterwards, making a pass O(clips). Weak keys mean the index is
 * collected together with the tracks it describes.
 *
 * Track lookup order mirrors `findTrackInSceneTracks` (main → overlay →
 * overlayAfter → audio) and keeps the *first* match, so the resolved track is
 * identical for any duplicated track id.
 */
const elementIndexByTracks = new WeakMap<
	SceneTracks,
	Map<string, Map<string, TimelineElement>>
>();

function getElementIndex(tracks: SceneTracks) {
	const cached = elementIndexByTracks.get(tracks);
	if (cached) return cached;

	const index = new Map<string, Map<string, TimelineElement>>();
	const addTrack = (track: {
		id: string;
		elements: readonly TimelineElement[];
	}) => {
		if (index.has(track.id)) return;
		const elementsById = new Map<string, TimelineElement>();
		for (const element of track.elements) {
			elementsById.set(element.id, element);
		}
		index.set(track.id, elementsById);
	};

	addTrack(tracks.main);
	for (const track of tracks.overlay) addTrack(track);
	for (const track of tracks.overlayAfter) addTrack(track);
	for (const track of tracks.audio) addTrack(track);

	elementIndexByTracks.set(tracks, index);
	return index;
}

/**
 * Subscribes to render tracks and returns the live (preview-aware) version of
 * an element alongside helpers for previewing and committing updates.
 *
 * Use this wherever property fields need to reflect in-progress preview state
 * (e.g. a slider being dragged) rather than the last committed value.
 */
export function useElementPreview<T extends TimelineElement>({
	trackId,
	elementId,
	fallback,
}: {
	trackId: string;
	elementId: string;
	fallback: T;
}) {
	const editor = useEditor();
	// Subscribe only to `timeline` and `scenes` — NOT `playback`. The
	// `playback` subsystem fires every animation frame during playback,
	// which would trigger `getSnapshot()` for every timeline clip card
	// even though preview tracks don't change during normal playback.
	// This is the single biggest re-render overhead reduction for the
	// timeline during playback (N clip cards × 1 fewer subscription each).
	//
	// The selector returns THIS CLIP, not the track set, and that matters:
	// `commitPreview()` promotes the very object the preview produced
	// (`afterTracks = this.previewTracks`), so a track-set selector sees a
	// referentially IDENTICAL snapshot before and after the commit and
	// `useEditor` skips the re-render — leaving the field showing the
	// value from before the gesture. Selecting the element makes the
	// snapshot change exactly when the clip's data changes.
	const renderElement = useEditor<T>(
		(e) => {
			const tracks =
				e.timeline.getPreviewTracks() ??
				e.scenes.getActiveSceneOrNull()?.tracks ??
				null;
			const found = tracks
				? (getElementIndex(tracks).get(trackId)?.get(elementId) as
						| T
						| undefined)
				: undefined;
			return found ?? fallback;
		},
		["timeline", "scenes"],
	);

	// Staged-write ownership. A panel that stages a write and then goes away —
	// unmounting, or the selection moving to another clip — must resolve ONLY
	// its own entry. Resolving the scene-wide overlay is what made one clip's
	// interrupted gesture get promoted by the next clip's commit.
	const stagedRef = useRef(false);

	const previewUpdates = (updates: Partial<TimelineElement>) => {
		stagedRef.current = true;
		editor.timeline.previewElements({
			updates: [{ trackId, elementId, updates }],
		});
	};

	const commit = () => {
		if (!stagedRef.current) return;
		stagedRef.current = false;
		editor.timeline.commitPreviewForElement({ trackId, elementId });
	};

	// Cleanup runs both on unmount and when this hook is re-pointed at another
	// clip. The staged value was already rendered, so promoting it keeps what
	// the user saw; leaving it staged would let the next clip's commit carry it.
	useEffect(() => {
		return () => {
			if (!stagedRef.current) return;
			stagedRef.current = false;
			editor.timeline.commitPreviewForElement({ trackId, elementId });
		};
	}, [editor, trackId, elementId]);

	return { renderElement, previewUpdates, commit };
}
