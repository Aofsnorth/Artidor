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

// Drags from outside the timeline (asset panel tiles, OS file drops) carry
// no dragged-clip edge under the cursor, so the 10px move/resize threshold
// feels dead on a zoomed-out timeline. ponytail: fixed value, revisit only
// if users report drops jumping from too far away.
export const DROP_SNAP_THRESHOLD_PX = 64;

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
	const EPSILON = 1e-6;

	for (const snapPoint of snapPoints) {
		const distance = Math.abs(targetTime - snapPoint.time);
		if (distance < thresholdInTicks + EPSILON && distance < closestDistance) {
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

/**
 * Snap an imported clip start to a preceding clip end when it lands just to
 * the right of that end. Unlike move/resize snapping, imports use a wider
 * radius because the cursor is not attached to the dragged clip's edge.
 */
export function snapImportStartToPreviousEnd({
	targetTime,
	tracks,
	zoomLevel,
	snapThreshold = DROP_SNAP_THRESHOLD_PX,
}: {
	targetTime: number;
	tracks: SceneTracks;
	zoomLevel: number;
	snapThreshold?: number;
}): SnapResult {
	const orderedTracks = getOrderedTracks(tracks);
	const isInsideClip = orderedTracks.some((track) =>
		track.elements.some(
			(element) =>
				element.startTime < targetTime &&
				targetTime < element.startTime + element.duration,
		),
	);
	if (isInsideClip) {
		return { snappedTime: targetTime, snapPoint: null, snapDistance: Infinity };
	}

	const thresholdInTicks =
		(snapThreshold / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel)) *
		TICKS_PER_SECOND;
	let best: SnapPoint | null = null;
	let bestDistance = Infinity;

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			const endTime = element.startTime + element.duration;
			const distance = targetTime - endTime;
			if (distance >= 0 && distance < bestDistance) {
				bestDistance = distance;
				best = {
					time: endTime,
					type: "element-end",
					elementId: element.id,
					trackId: track.id,
				};
			}
		}
	}

	if (!best || bestDistance > thresholdInTicks) {
		return {
			snappedTime: targetTime,
			snapPoint: null,
			snapDistance: bestDistance,
		};
	}

	return {
		snappedTime: best.time,
		snapPoint: best,
		snapDistance: bestDistance,
	};
}
