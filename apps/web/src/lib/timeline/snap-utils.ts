import {
	getOrderedTracks,
	type Bookmark,
	type SceneTracks,
} from "@/lib/timeline";
import type { AnimationPath } from "@/lib/animation/types";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { getElementKeyframes } from "@/lib/animation";
import { TICKS_PER_SECOND } from "@/lib/wasm";

export interface SnapPoint {
	time: number;
	type: "element-start" | "element-end" | "playhead" | "bookmark" | "keyframe";
	elementId?: string;
	trackId?: string;
	propertyPath?: AnimationPath;
	keyframeId?: string;
}

export interface SnapResult {
	snappedTime: number;
	snapPoint: SnapPoint | null;
	snapDistance: number;
}

const DEFAULT_SNAP_THRESHOLD_PX = 10;

export function findSnapPoints({
	tracks,
	playheadTime,
	excludeElementId,
	bookmarks = [],
	excludeBookmarkTime,
	enableElementSnapping = true,
	enablePlayheadSnapping = true,
	enableBookmarkSnapping = true,
	enableKeyframeSnapping = true,
}: {
	tracks: SceneTracks;
	playheadTime: number;
	excludeElementId?: string;
	bookmarks?: Array<Bookmark>;
	excludeBookmarkTime?: number;
	enableElementSnapping?: boolean;
	enablePlayheadSnapping?: boolean;
	enableBookmarkSnapping?: boolean;
	enableKeyframeSnapping?: boolean;
}): SnapPoint[] {
	const snapPoints: SnapPoint[] = [];
	const orderedTracks = getOrderedTracks(tracks);

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			if (element.id === excludeElementId) continue;

			if (enableElementSnapping) {
				snapPoints.push(
					{
						time: element.startTime,
						type: "element-start",
						elementId: element.id,
						trackId: track.id,
					},
					{
						time: element.startTime + element.duration,
						type: "element-end",
						elementId: element.id,
						trackId: track.id,
					},
				);
			}

			if (enableKeyframeSnapping) {
				for (const keyframe of getElementKeyframes({
					animations: element.animations,
				})) {
					snapPoints.push({
						time: element.startTime + keyframe.time,
						type: "keyframe",
						elementId: element.id,
						trackId: track.id,
						propertyPath: keyframe.propertyPath,
						keyframeId: keyframe.id,
					});
				}
			}
		}
	}

	if (enablePlayheadSnapping) {
		snapPoints.push({ time: playheadTime, type: "playhead" });
	}

	if (enableBookmarkSnapping) {
		for (const bookmark of bookmarks) {
			if (
				excludeBookmarkTime != null &&
				bookmark.time === excludeBookmarkTime
			) {
				continue;
			}
			snapPoints.push({ time: bookmark.time, type: "bookmark" });
		}
	}

	return snapPoints;
}

/**
 * Build snap points whose values stay constant during a pointer gesture.
 * Callers can retain this result for one drag and avoid rebuilding the entire
 * clip/keyframe index on every animation frame.
 */
export function buildStaticSnapPoints({
	tracks,
	bookmarks = [],
	excludeElementId,
	excludeBookmarkTime,
}: {
	tracks: SceneTracks;
	bookmarks?: Array<Bookmark>;
	excludeElementId?: string;
	excludeBookmarkTime?: number;
}): SnapPoint[] {
	return findSnapPoints({
		tracks,
		playheadTime: 0,
		excludeElementId,
		bookmarks,
		excludeBookmarkTime,
		enablePlayheadSnapping: false,
	});
}

export function snapToNearestPoint({
	targetTime,
	snapPoints,
	zoomLevel,
	snapThreshold = DEFAULT_SNAP_THRESHOLD_PX,
}: {
	targetTime: number;
	snapPoints: Array<SnapPoint>;
	zoomLevel: number;
	snapThreshold?: number;
}): SnapResult {
	const pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
	const thresholdInTicks = (snapThreshold / pixelsPerSecond) * TICKS_PER_SECOND;

	let closestSnapPoint: SnapPoint | null = null;
	let closestDistance = Infinity;

	for (const snapPoint of snapPoints) {
		const distance = Math.abs(targetTime - snapPoint.time);
		if (distance < thresholdInTicks && distance < closestDistance) {
			closestDistance = distance;
			closestSnapPoint = snapPoint;
		}
	}

	return {
		snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
		snapPoint: closestSnapPoint,
		snapDistance: closestDistance,
	};
}

/**
 * Find the nearest clip edge (start or end of any element) to a target time.
 *
 * This is the underlying primitive for the playhead "auto-aim" feature: when
 * the user clicks/drags the playhead with auto-aim enabled, we want the
 * playhead to jump to the closest clip edge instead of landing wherever
 * the cursor happened to be.
 *
 * - `thresholdPx` mirrors the snap threshold used elsewhere; if the nearest
 *   edge is further than that, `snappedTime` falls back to `targetTime`.
 * - The function is symmetrical across tracks: it doesn't prefer a track
 *   over another, just whichever edge happens to be closer in time.
 */
export function findNearestClipEdge({
	targetTime,
	tracks,
	zoomLevel,
	snapThreshold = DEFAULT_SNAP_THRESHOLD_PX,
}: {
	targetTime: number;
	tracks: SceneTracks;
	zoomLevel: number;
	snapThreshold?: number;
}): SnapResult {
	const pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
	const thresholdInTicks = (snapThreshold / pixelsPerSecond) * TICKS_PER_SECOND;
	const orderedTracks = getOrderedTracks(tracks);

	let bestEdge: {
		time: number;
		type: "element-start" | "element-end";
		elementId: string;
		trackId: string;
	} | null = null;
	let bestDistance = Infinity;

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			const startTime = element.startTime;
			const endTime = element.startTime + element.duration;

			const startDist = Math.abs(targetTime - startTime);
			if (startDist < bestDistance) {
				bestDistance = startDist;
				bestEdge = {
					time: startTime,
					type: "element-start",
					elementId: element.id,
					trackId: track.id,
				};
			}

			const endDist = Math.abs(targetTime - endTime);
			if (endDist < bestDistance) {
				bestDistance = endDist;
				bestEdge = {
					time: endTime,
					type: "element-end",
					elementId: element.id,
					trackId: track.id,
				};
			}
		}
	}

	if (!bestEdge || bestDistance > thresholdInTicks) {
		return {
			snappedTime: targetTime,
			snapPoint: null,
			snapDistance: bestDistance,
		};
	}

	return {
		snappedTime: bestEdge.time,
		snapPoint: { ...bestEdge, type: bestEdge.type },
		snapDistance: bestDistance,
	};
}

export function snapElementEdge({
	targetTime,
	elementDuration,
	tracks,
	playheadTime,
	zoomLevel,
	excludeElementId,
	snapToStart = true,
	bookmarks = [],
}: {
	targetTime: number;
	elementDuration: number;
	tracks: SceneTracks;
	playheadTime: number;
	zoomLevel: number;
	excludeElementId?: string;
	snapToStart?: boolean;
	bookmarks?: Array<Bookmark>;
}): SnapResult {
	const snapPoints = findSnapPoints({
		tracks,
		playheadTime,
		excludeElementId,
		bookmarks,
	});

	const effectiveTargetTime = snapToStart
		? targetTime
		: targetTime + elementDuration;

	const snapResult = snapToNearestPoint({
		targetTime: effectiveTargetTime,
		snapPoints,
		zoomLevel,
	});

	if (!snapToStart && snapResult.snapPoint) {
		snapResult.snappedTime = snapResult.snappedTime - elementDuration;
	}

	return snapResult;
}
