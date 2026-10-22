import { TICKS_PER_SECOND } from "@/lib/wasm";
import type { DetectedBeat } from "./beat-detection-types";

/**
 * Shift beat times from clip-local to timeline coordinates.
 *
 * Beat analysis trims the source to the clip's `trimStart`, so a returned beat
 * at 0 s is the clip's first sample, not the timeline start. Snapping with the
 * raw values placed every element at the beginning of the project.
 */
export function offsetBeatsToTimeline({
	beats,
	offsetTicks,
}: {
	beats: DetectedBeat[];
	offsetTicks: number;
}): DetectedBeat[] {
	if (offsetTicks === 0) return beats;
	return beats.map((beat) => ({
		...beat,
		// Keep ticks as integers; timeSeconds is derived from them so the two
		// representations cannot disagree after the offset.
		ticks: beat.ticks + offsetTicks,
		timeSeconds: (beat.ticks + offsetTicks) / TICKS_PER_SECOND,
	}));
}

/**
 * Return the beat closest to `targetTicks`, or null when there are no beats.
 * Using the nearest beat (instead of the next one at/after the target) also
 * snaps clips that sit slightly after a beat backwards onto it.
 */
export function findNearestBeatTicks({
	beats,
	targetTicks,
}: {
	beats: readonly number[];
	targetTicks: number;
}): number | null {
	let nearest: number | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;
	for (const beatTicks of beats) {
		const distance = Math.abs(beatTicks - targetTicks);
		if (distance < nearestDistance) {
			nearest = beatTicks;
			nearestDistance = distance;
		}
	}
	return nearest;
}
