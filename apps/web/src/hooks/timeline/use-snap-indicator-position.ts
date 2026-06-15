import { useEffect, useState } from "react";
import { timelineTimeToSnappedPixels } from "@/lib/timeline";

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
}: UseSnapIndicatorPositionParams): SnapIndicatorPosition {
	const [scrollLeft, setScrollLeft] = useState(0);

	useEffect(() => {
		const tracksViewport = tracksScrollRef.current;

		if (!tracksViewport) return;

		const handleScroll = () => {
			setScrollLeft(tracksViewport.scrollLeft);
		};

		setScrollLeft(tracksViewport.scrollLeft);

		tracksViewport.addEventListener("scroll", handleScroll);
		return () => tracksViewport.removeEventListener("scroll", handleScroll);
	}, [tracksScrollRef]);

	const timelineContainerHeight = timelineRef.current?.offsetHeight || 400;
	const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

	const timelinePosition = timelineTimeToSnappedPixels({
		time: snapPoint?.time ?? 0,
		zoomLevel,
	});
	const leftPosition = trackLabelsWidth + timelinePosition - scrollLeft;

	return {
		leftPosition,
		topPosition: 0,
		height: totalHeight,
	};
}
