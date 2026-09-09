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
	TimelineElement,
	VideoElement,
} from "@/lib/timeline/types";
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
		const sourceElement = sourceTrack.elements.find(
			(element) => element.id === this.params.elementId,
		) as TimelineElement | undefined;
		if (sourceElement?.type !== "video") {
			return;
		}
		const videoElement: VideoElement = sourceElement;

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
	const sourceElement = getOrderedTracks(tracks)
		.flatMap((track) => track.elements)
		.find((element) => element.id === sourceElementId) as
		| VideoElement
		| undefined;
	if (!sourceElement) {
		return tracks;
	}

	return {
		...tracks,
		audio: tracks.audio
			.map((track) => ({
				...track,
				elements: track.elements.filter((element) => {
					if (element.type !== "audio") return true;
					const detached = element as TimelineElement & {
						sourceElementId?: string;
						mediaId?: string;
					};
					if (detached.sourceElementId !== sourceElementId) return true;
					// Still pristine? (same media, same placement). Otherwise keep it.
					const isUnchanged =
						detached.mediaId === sourceElement.mediaId &&
						detached.startTime === sourceElement.startTime &&
						detached.duration === sourceElement.duration;
					return !isUnchanged;
				}),
			}))
			.filter((track) => track.elements.length > 0),
	};
}
