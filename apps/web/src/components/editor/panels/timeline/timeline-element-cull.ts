import { timelineTimeToPixels } from "@/lib/timeline/pixel-utils";
import { TIMELINE_CONTENT_LEFT_INSET_PX } from "./layout";

/**
 * Decides whether a timeline clip should be mounted given the current
 * horizontal scroll window. This is the element-level complement to the
 * track-level (vertical) virtualization already performed by the parent:
 * a single visible track can still hold hundreds of clips in a long
 * project, and each `TimelineElement` runs keyframe/waveform/resize/
 * selection hooks. Mounting off-screen clips makes every timeline
 * re-render scale with project length instead of what's actually visible.
 *
 * The function is intentionally pure so it can be unit-tested in isolation
 * and cheaply evaluated inside a `useMemo` filter.
 */
export function shouldMountTimelineElement(params: {
	elementId: string;
	startTime: number;
	duration: number;
	zoomLevel: number;
	windowLeft: number;
	windowRight: number;
	isSelected: boolean;
}): boolean {
	// Selected clips are always mounted so their selection UI stays correct
	// even while scrolled out of view (and so they render immediately on
	// scroll-back without a flash).
	if (params.isSelected) return true;

	const elLeft =
		timelineTimeToPixels({ time: params.startTime, zoomLevel: params.zoomLevel }) +
		TIMELINE_CONTENT_LEFT_INSET_PX;
	const elRight =
		elLeft + timelineTimeToPixels({ time: params.duration, zoomLevel: params.zoomLevel });

	// Standard AABB overlap test against the (overscanned) visible window.
	return elRight >= params.windowLeft && elLeft <= params.windowRight;
}
