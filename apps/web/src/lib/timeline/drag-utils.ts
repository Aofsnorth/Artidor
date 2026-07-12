import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const EPSILON = 1e-6;

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
	const seconds = Math.max(
		0,
		mouseX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
	);
	return Math.round((seconds + EPSILON) * TICKS_PER_SECOND);
}
