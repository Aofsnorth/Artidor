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
 * Conditional render, not CSS-hide: callers return `null` for culled
 * clips (see `timeline-track.tsx`), so culled clips mount zero DOM nodes
 * and run zero hooks. Verified by `timeline-element-cull.test.ts` plus
 * the visible-count round in `react-perf-100-pass-owned.test.ts`.
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
		timelineTimeToPixels({
			time: params.startTime,
			zoomLevel: params.zoomLevel,
		}) + TIMELINE_CONTENT_LEFT_INSET_PX;
	const elRight =
		elLeft +
		timelineTimeToPixels({
			time: params.duration,
			zoomLevel: params.zoomLevel,
		});

	// Standard AABB overlap test against the (overscanned) visible window.
	return elRight >= params.windowLeft && elLeft <= params.windowRight;
}
