import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import {
	buildSeparatedAudioElement,
	canExtractSourceAudio,
	isSourceAudioSeparated,
} from "@/lib/timeline/audio-separation";
import { buildEmptyTrack } from "@/lib/timeline/placement";
import { updateElementInSceneTracks } from "@/lib/timeline/track-element-update";
import { getOrderedTracks } from "@/lib/timeline";
import type {
	AudioTrack,
	SceneTracks,
	TimelineTrack,
	VideoElement,
} from "@/lib/timeline";
import { generateUUID } from "@/utils/id";

export class ToggleSourceAudioSeparationCommand extends Command {
	private savedState: SceneTracks | null = null;

	constructor(
		private readonly params: {
			trackId: string;
			elementId: string;
		},
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const sourceTrack = getOrderedTracks(this.savedState).find(
			(track) => track.id === this.params.trackId,
		);
		if (!sourceTrack) {
			return;
		}
		const sourceElement = findElementOnTrack({
			track: sourceTrack,
			elementId: this.params.elementId,
		});
		if (sourceElement?.type !== "video") {
			return;
		}
		const videoElement = sourceElement;

		if (isSourceAudioSeparated({ element: videoElement })) {
			// Recover = re-enable the video's own audio AND remove the detached
			// audio layer this separation created; leaving it in place doubled
			// the audio. Only the layer whose back-reference still matches this
			// element and whose placement is untouched is removed — a user-moved
			// or re-trimmed copy is left alone (they may have edited it).
			editor.timeline.updateTracks(
				updateSourceAudioEnabled({
					tracks: removeDetachedAudioLayer({
						tracks: this.savedState,
						sourceElementId: this.params.elementId,
					}),
					trackId: this.params.trackId,
					elementId: this.params.elementId,
					isSourceAudioEnabled: true,
				}),
			);
			return;
		}

		const mediaAsset = editor.media
			.getAssets()
			.find((asset) => asset.id === videoElement.mediaId);
		if (!canExtractSourceAudio(videoElement, mediaAsset)) {
			return;
		}
		if (videoElement.duration <= 0) {
			return;
		}

		const separatedAudioElement = {
			...buildSeparatedAudioElement({
				sourceElement: videoElement,
			}),
			id: generateUUID(),
		};
		const newAudioTrack = {
			...buildEmptyTrack({
				id: generateUUID(),
				type: "audio",
			}),
			elements: [separatedAudioElement],
		} as AudioTrack;

		editor.timeline.updateTracks(
			updateSourceAudioEnabled({
				tracks: {
					...this.savedState,
					audio: [...this.savedState.audio, newAudioTrack],
				},
				trackId: this.params.trackId,
				elementId: this.params.elementId,
				isSourceAudioEnabled: false,
			}),
		);
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}

function updateSourceAudioEnabled({
	tracks,
	trackId,
	elementId,
	isSourceAudioEnabled,
}: {
	tracks: SceneTracks;
	trackId: string;
	elementId: string;
	isSourceAudioEnabled: boolean;
}): SceneTracks {
	return updateElementInSceneTracks({
		tracks,
		trackId,
		elementId,
		elementPredicate: (element): element is VideoElement =>
			element.type === "video",
		update: (element) => ({
			...element,
			isSourceAudioEnabled,
		}),
	});
}

/**
 * Remove the audio layer that was detached from the video element with id
 * `sourceElementId` — but only if it still matches the state the separation
 * created (same media, same start, same duration). Anything the user has
 * since moved or re-trimmed is kept: silently deleting an edited layer would
 * destroy user work.
 */
function removeDetachedAudioLayer({
	tracks,
	sourceElementId,
}: {
	tracks: SceneTracks;
	sourceElementId: string;
}): SceneTracks {
	const sourceElement = findVideoElement({
		tracks,
		elementId: sourceElementId,
	});
	if (!sourceElement) {
		return tracks;
	}

	// Lanes this removal empties are dropped; lanes that were ALREADY empty
	// before the removal are left alone (pruning those would delete lanes
	// the user created deliberately as a side effect of a recover toggle).
	const emptiedLaneIds = new Set<string>();
	const nextAudio = tracks.audio.map((track) => ({
		...track,
		elements: track.elements.filter((element) => {
			if (element.sourceElementId !== sourceElementId) return true;
			// Still pristine? (same media, same placement). Otherwise keep it.
			const detachedMediaId =
				element.sourceType === "upload" ? element.mediaId : undefined;
			const isUnchanged =
				detachedMediaId === sourceElement.mediaId &&
				element.startTime === sourceElement.startTime &&
				element.duration === sourceElement.duration;
			if (isUnchanged) emptiedLaneIds.add(track.id);
			return !isUnchanged;
		}),
	}));

	return {
		...tracks,
		audio: nextAudio.filter(
			(track) => track.elements.length > 0 || !emptiedLaneIds.has(track.id),
		),
	};
}

/**
 * Per-track-type element lookup: the track discriminant narrows
 * `track.elements` to that lane's element type, so the find result is
 * already typed (no cross-union cast of `track.elements`, no `unknown`).
 */
function findElementOnTrack({
	track,
	elementId,
}: {
	track: TimelineTrack;
	elementId: string;
}): TimelineTrack["elements"][number] | undefined {
	return track.elements.find((element) => element.id === elementId);
}
function findVideoElement({
	tracks,
	elementId,
}: {
	tracks: SceneTracks;
	elementId: string;
}): VideoElement | undefined {
	for (const track of getOrderedTracks(tracks)) {
		if (track.type !== "video") continue;
		const found = track.elements.find((element) => element.id === elementId);
		if (!found) continue;
		return found.type === "video" ? found : undefined;
	}
	return undefined;
}
