import type { TrackType } from "@/lib/timeline";
import {
	KEYFRAME_LANE_HEIGHT_PX,
	TIMELINE_TRACK_GAP_PX,
	TIMELINE_TRACK_HEIGHTS_PX,
} from "./layout";

export function getTrackHeight({
	type,
	overrideHeight,
}: {
	type: TrackType;
	overrideHeight?: number;
}): number {
	// `overrideHeight` lets the user-resizable track height bypass the
	// default per-type height. We clamp the override to a sane range so a
	// stray drag can't collapse a track to 0px or balloon it to fill the
	// whole editor.
	if (typeof overrideHeight === "number" && Number.isFinite(overrideHeight)) {
		return Math.max(20, Math.min(400, Math.round(overrideHeight)));
	}
	return TIMELINE_TRACK_HEIGHTS_PX[type];
}

export function getExpandedTrackHeight({
	type,
	expandedLaneCount,
}: {
	type: TrackType;
	expandedLaneCount: number;
}): number {
	return (
		TIMELINE_TRACK_HEIGHTS_PX[type] +
		expandedLaneCount * KEYFRAME_LANE_HEIGHT_PX
	);
}

export function getCumulativeHeightBefore({
	tracks,
	trackIndex,
	getExtraHeight,
	overrideHeights,
}: {
	tracks: Array<{ type: TrackType; id: string }>;
	trackIndex: number;
	getExtraHeight?: (trackIndex: number) => number;
	overrideHeights?: Record<string, number>;
}): number {
	return tracks.slice(0, trackIndex).reduce(
		(sum, track, i) =>
			sum +
			getTrackHeight({
				type: track.type,
				overrideHeight: overrideHeights?.[track.id],
			}) +
			(getExtraHeight?.(i) ?? 0) +
			TIMELINE_TRACK_GAP_PX,
		0,
	);
}

export function getTotalTracksHeight({
	tracks,
	getExtraHeight,
	overrideHeights,
}: {
	tracks: Array<{ type: TrackType; id: string }>;
	getExtraHeight?: (trackIndex: number) => number;
	overrideHeights?: Record<string, number>;
}): number {
	const tracksHeight = tracks.reduce(
		(sum, track, i) =>
			sum +
			getTrackHeight({
				type: track.type,
				overrideHeight: overrideHeights?.[track.id],
			}) +
			(getExtraHeight?.(i) ?? 0),
		0,
	);
	const gapsHeight = Math.max(0, tracks.length - 1) * TIMELINE_TRACK_GAP_PX;
	return tracksHeight + gapsHeight;
}

export function computeTrackVerticalSpans({
	tracks,
	extraHeights,
	overrideHeights,
}: {
	tracks: Array<{ type: TrackType; id: string }>;
	extraHeights?: readonly number[];
	overrideHeights?: Record<string, number>;
}): Array<{ top: number; height: number }> {
	let top = 0;
	return tracks.map((track, index) => {
		const height =
			getTrackHeight({
				type: track.type,
				overrideHeight: overrideHeights?.[track.id],
			}) + (extraHeights?.[index] ?? 0);
		const span = { top, height };
		top += height + TIMELINE_TRACK_GAP_PX;
		return span;
	});
}
