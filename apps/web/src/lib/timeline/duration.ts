import type { SceneTracks } from "./types";

/**
 * Calculate the total duration of all tracks in the scene. This is the
 * latest end time across all elements on all tracks, rounded to integer
 * ticks because the Rust timeline APIs (formatTimecode, roundToFrame,
 * snappedSeekTime, etc.) all take MediaTime (i64).
 */
export function calculateTotalDuration({
	tracks,
}: {
	tracks: SceneTracks;
}): number {
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];
	if (orderedTracks.length === 0) return 0;

	const trackEndTimes = orderedTracks.map((track) =>
		track.elements.reduce((maxEnd, element) => {
			const elementEnd = element.startTime + element.duration;
			return Math.max(maxEnd, elementEnd);
		}, 0),
	);

	return Math.round(Math.max(...trackEndTimes, 0));
}
