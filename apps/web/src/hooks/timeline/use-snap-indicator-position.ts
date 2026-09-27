import { useEffect, useState } from "react";
import { timelineTimeToSnappedPixels } from "@/lib/timeline";
import { TIMELINE_CONTENT_LEFT_INSET_PX } from "@/components/editor/panels/timeline/layout";

/** Used until the container has been measured (first paint, or a detached ref). */
const FALLBACK_HEIGHT_PX = 400;
/** Keep the guide clear of the timeline's bottom edge. */
const BOTTOM_INSET_PX = 8;

interface UseSnapIndicatorPositionParams {
	snapPoint: { time: number } | null;
	zoomLevel: number;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	/**
	 * Width of the track labels column in pixels. The snap indicator
	 * sits in the tracks viewport, so its left position is offset by the
	 * labels column. Pass the current value from `usePanelStore` so the
	 * indicator tracks the user's resize.
	 */
	trackLabelsWidth: number;
	/**
	 * Whether the guide is on screen. Scroll tracking is attached only while
	 * it is: a plain timeline scroll must not re-render the indicator.
	 */
	isVisible: boolean;
}

interface SnapIndicatorPosition {
	leftPosition: number;
	topPosition: number;
	height: number;
}

export function useSnapIndicatorPosition({
	snapPoint,
	zoomLevel,
	timelineRef,
	tracksScrollRef,
	trackLabelsWidth,
	isVisible,
}: UseSnapIndicatorPositionParams): SnapIndicatorPosition {
	const [scrollLeft, setScrollLeft] = useState(0);
	// null = not measured yet. Kept in state (not read off the ref during
	// render) so the value is exact and survives a resize.
	const [containerHeight, setContainerHeight] = useState<number | null>(null);

	useEffect(() => {
		const timeline = timelineRef.current;
		const tracks = tracksScrollRef.current;
		const target = timeline ?? tracks;
		if (!target) return;

		const read = () => {
			// Prefer the timeline height, but fall back to the tracks viewport
			// when it reports 0 (not laid out yet) so the guide is never flat.
			const height = timeline?.clientHeight || tracks?.clientHeight || 0;
			setContainerHeight(height || null);
		};

		read();
		// A ResizeObserver replaces the previous `offsetHeight` read during
		// render, which forced a synchronous layout on every snap change (once
		// per drag frame) and returned a stale height after a resize — that is
		// why the guide could stop short of the bottom of the tracks area.
		const observer = new ResizeObserver(read);
		observer.observe(target);
		return () => observer.disconnect();
	}, [timelineRef, tracksScrollRef]);

	useEffect(() => {
		if (!isVisible) return;
		const viewport = tracksScrollRef.current;
		if (!viewport) return;

		let frame: number | null = null;
		const flush = () => {
			frame = null;
			setScrollLeft(viewport.scrollLeft);
		};
		// Coalesced to one update per frame: during a drag with edge auto-scroll
		// the scroll event fires far faster than the display refreshes.
		const handleScroll = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(flush);
		};

		setScrollLeft(viewport.scrollLeft);
		viewport.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
			viewport.removeEventListener("scroll", handleScroll);
		};
	}, [isVisible, tracksScrollRef]);

	const totalHeight = Math.max(
		0,
		(containerHeight ?? FALLBACK_HEIGHT_PX) - BOTTOM_INSET_PX,
	);

	const timelinePosition = timelineTimeToSnappedPixels({
		time: snapPoint?.time ?? 0,
		zoomLevel,
	});
	// The playhead positions itself as `left - scrollLeft + INSET`; without the
	// same inset the guide sat 8px left of the clip edge (and playhead) it was
	// snapping to, which read as "the line is off".
	const leftPosition =
		trackLabelsWidth +
		TIMELINE_CONTENT_LEFT_INSET_PX +
		timelinePosition -
		scrollLeft;

	return {
		leftPosition,
		topPosition: 0,
		height: totalHeight,
	};
}
