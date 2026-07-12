import type { SceneTracks, TrackType } from "@/lib/timeline";

const MAIN_TRACK_COUNT = 1;

function getMainTrackIndex(tracks: SceneTracks): number {
	return tracks.overlay.length;
}

function getOverlayAfterStartIndex(tracks: SceneTracks): number {
	return getMainTrackIndex(tracks) + MAIN_TRACK_COUNT;
}

function getAudioStartIndex(tracks: SceneTracks): number {
	return getOverlayAfterStartIndex(tracks) + tracks.overlayAfter.length;
}

function getTrackCount(tracks: SceneTracks): number {
	return (
		tracks.overlay.length +
		MAIN_TRACK_COUNT +
		tracks.overlayAfter.length +
		tracks.audio.length
	);
}

/**
 * Returns the ordered-track index where a new track of the given type should
 * be inserted when the caller has no explicit preference.
 *
 * Text and effects are placed at the top of the overlay stack so they are
 * visible above the main video. Audio goes below the visual tracks, and other
 * visual track types default to the overlay-after section.
 */
export function getDefaultInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
}): number {
	if (trackType === "audio") {
		return getAudioStartIndex(tracks) + tracks.audio.length;
	}

	if (trackType === "text" || trackType === "effect") {
		return 0;
	}

	return getOverlayAfterStartIndex(tracks) + tracks.overlayAfter.length;
}

export function getHighestInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
}): number {
	if (trackType === "audio") {
		return getOverlayAfterStartIndex(tracks);
	}

	return 0;
}

export function resolvePreferredNewTrackPlacement({
	tracks,
	trackType,
	preferredIndex,
	direction,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
	preferredIndex: number;
	direction: "above" | "below";
}): { insertIndex: number; insertPosition: "above" | "below" | null } {
	const trackCount = getTrackCount(tracks);
	if (trackCount === 0) {
		return {
			insertIndex: 0,
			insertPosition: trackType === "audio" ? "below" : null,
		};
	}

	const safePreferredIndex = Math.min(
		Math.max(preferredIndex, 0),
		trackCount - 1,
	);

	if (trackType === "audio") {
		const audioStartIndex = getAudioStartIndex(tracks);
		if (safePreferredIndex < audioStartIndex) {
			return {
				insertIndex: audioStartIndex,
				insertPosition: "below",
			};
		}

		return {
			insertIndex:
				direction === "above" ? safePreferredIndex : safePreferredIndex + 1,
			insertPosition: direction,
		};
	}

	const insertIndex =
		direction === "above" ? safePreferredIndex : safePreferredIndex + 1;
	const audioStartIndex = getAudioStartIndex(tracks);

	return {
		insertIndex: Math.min(insertIndex, audioStartIndex),
		insertPosition: direction,
	};
}
