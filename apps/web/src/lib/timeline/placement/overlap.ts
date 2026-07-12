import type { TimelineElement, TimelineTrack } from "@/lib/timeline";
import type { PlacementTimeSpan } from "./types";

function wouldElementOverlap({
	elements,
	startTime,
	endTime,
	excludeElementId,
}: {
	elements: TimelineElement[];
	startTime: number;
	endTime: number;
	excludeElementId?: string;
}): boolean {
	const EPSILON = 1e-6;
	return elements.some((element) => {
		if (excludeElementId && element.id === excludeElementId) {
			return false;
		}

		const elementEnd = element.startTime + element.duration;
		return (
			startTime < elementEnd - EPSILON && endTime > element.startTime + EPSILON
		);
	});
}

export function canPlaceTimeSpansOnTrack({
	track,
	timeSpans,
}: {
	track: TimelineTrack;
	timeSpans: PlacementTimeSpan[];
}): boolean {
	return timeSpans.every(({ startTime, duration, excludeElementId }) => {
		return !wouldElementOverlap({
			elements: track.elements,
			startTime,
			endTime: startTime + duration,
			excludeElementId,
		});
	});
}
