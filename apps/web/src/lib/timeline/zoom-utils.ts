import {
	BASE_TIMELINE_PIXELS_PER_SECOND,
	TIMELINE_ZOOM_MAX,
	TIMELINE_ZOOM_MIN,
} from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const PADDING_MAX_RATIO = 0.75;
const PADDING_MIN_RATIO = 0.15;
const PADDING_MIN_AT_ZOOM_PERCENT = 0.2;

export function getTimelineZoomMin({
	duration,
	containerWidth,
}: {
	duration: number;
	containerWidth: number | null | undefined;
}): number {
	const safeDurationSeconds = Math.max(duration / TICKS_PER_SECOND, 1);
	const safeContainerWidth = containerWidth ?? 1000;
	const contentRatioAtMinZoom = 1 - PADDING_MAX_RATIO;
	const availableWidth = safeContainerWidth * contentRatioAtMinZoom;
	const zoomToFit =
		availableWidth / (safeDurationSeconds * BASE_TIMELINE_PIXELS_PER_SECOND);

	// The fit calculation has no lower bound of its own: a long timeline in a
	// narrow container would otherwise push the zoom below the documented
	// domain (and into sub-pixel-per-minute territory). Keep the result inside
	// [TIMELINE_ZOOM_MIN, TIMELINE_ZOOM_MAX], including for invalid inputs.
	if (!Number.isFinite(zoomToFit)) return TIMELINE_ZOOM_MIN;
	return Math.min(TIMELINE_ZOOM_MAX, Math.max(TIMELINE_ZOOM_MIN, zoomToFit));
}

/**
 * Clamp a zoom level into the usable slider domain. Used by the timeline zoom
 * hook so a duration/container change that moves `minZoom` can never leave the
 * current zoom outside [minZoom, TIMELINE_ZOOM_MAX].
 */
export function clampTimelineZoom({
	zoomLevel,
	minZoom,
	maxZoom = TIMELINE_ZOOM_MAX,
}: {
	zoomLevel: number;
	minZoom: number;
	maxZoom?: number;
}): number {
	const lowerBound = Number.isFinite(minZoom)
		? Math.min(minZoom, maxZoom)
		: TIMELINE_ZOOM_MIN;
	if (!Number.isFinite(zoomLevel)) return lowerBound;
	return Math.max(lowerBound, Math.min(maxZoom, zoomLevel));
}

export function getTimelinePaddingPx({
	containerWidth,
	zoomLevel,
	minZoom,
}: {
	containerWidth: number;
	zoomLevel: number;
	minZoom: number;
}): number {
	const zoomPercent = getZoomPercent({ zoomLevel, minZoom });
	const paddingTransitionPercent = Math.min(
		zoomPercent / PADDING_MIN_AT_ZOOM_PERCENT,
		1,
	);
	const paddingRatio =
		PADDING_MAX_RATIO -
		(PADDING_MAX_RATIO - PADDING_MIN_RATIO) * paddingTransitionPercent;

	return containerWidth * paddingRatio;
}

export function getZoomPercent({
	zoomLevel,
	minZoom,
}: {
	zoomLevel: number;
	minZoom: number;
}): number {
	const span = TIMELINE_ZOOM_MAX - minZoom;
	// A zoom range can collapse (minZoom === max, or a caller passing a bad
	// value). Dividing by that span produced Infinity/NaN which then leaked
	// into padding and clip positions, so report "no range" as 0%.
	if (!Number.isFinite(span) || span <= 0) return 0;

	const zoomPercent = (zoomLevel - minZoom) / span;
	if (!Number.isFinite(zoomPercent)) return 0;
	return Math.max(0, Math.min(1, zoomPercent));
}

/**
 * convert linear slider position (0-1) to exponential zoom level.
 * at low slider values, zoom changes are small. at high values, changes are large.
 */
export function sliderToZoom({
	sliderPosition,
	minZoom,
	maxZoom = TIMELINE_ZOOM_MAX,
}: {
	sliderPosition: number;
	minZoom: number;
	maxZoom?: number;
}): number {
	const clampedPosition = Math.max(0, Math.min(1, sliderPosition));
	return minZoom * (maxZoom / minZoom) ** clampedPosition;
}

/**
 * convert exponential zoom level to linear slider position (0-1).
 */
export function zoomToSlider({
	zoomLevel,
	minZoom,
	maxZoom = TIMELINE_ZOOM_MAX,
}: {
	zoomLevel: number;
	minZoom: number;
	maxZoom?: number;
}): number {
	const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
	return Math.log(clampedZoom / minZoom) / Math.log(maxZoom / minZoom);
}
