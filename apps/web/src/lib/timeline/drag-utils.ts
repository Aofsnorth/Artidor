import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";

/**
 * Floating-point guard for pointer→tick rounding, expressed in tick units
 * (≈0.12 ticks). It is large enough to absorb double-precision error at an
 * exact half-tick boundary and small enough not to move a real cursor.
 */
const ROUNDING_EPSILON_TICKS = 1e-6 * TICKS_PER_SECOND;

/**
 * Convert a horizontal timeline pixel offset into ticks.
 *
 * This is the single conversion used by pointer hit-testing and drop-target
 * placement, so both paths agree on clamping (never negative), rounding and
 * zero/degenerate-scale handling. `pixelsPerSecond` defaults to the base
 * timeline scale for callers that only have a zoom level.
 */
export function getTimelineTimeFromPixels({
	pixelX,
	zoomLevel,
	pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND,
}: {
	pixelX: number;
	zoomLevel: number;
	pixelsPerSecond?: number;
}): number {
	const scaledPixelsPerSecond = pixelsPerSecond * zoomLevel;
	if (!Number.isFinite(scaledPixelsPerSecond) || scaledPixelsPerSecond <= 0) {
		return 0;
	}

	const clampedPixelX = Math.max(0, pixelX);
	return Math.round(
		(clampedPixelX / scaledPixelsPerSecond) * TICKS_PER_SECOND +
			ROUNDING_EPSILON_TICKS,
	);
}

export function getMouseTimeFromClientX({
	clientX,
	containerRect,
	zoomLevel,
	scrollLeft,
	contentInset = 0,
}: {
	clientX: number;
	containerRect: DOMRect;
	zoomLevel: number;
	scrollLeft: number;
	contentInset?: number;
}): number {
	const mouseX = clientX - containerRect.left + scrollLeft - contentInset;
	return getTimelineTimeFromPixels({ pixelX: mouseX, zoomLevel });
}
