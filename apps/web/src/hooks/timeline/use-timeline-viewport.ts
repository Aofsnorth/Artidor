import { type RefObject, useLayoutEffect, useState } from "react";

export const HORIZONTAL_OVERSCAN_PX = 600;

/** One scroll/resize subscription for all virtualized track rows. */
export function useTimelineViewport(
	tracksScrollRef: RefObject<HTMLDivElement | null>,
) {
	const [viewport, setViewport] = useState({
		top: 0,
		height: 800,
		left: 0,
		width: 0,
	});

	useLayoutEffect(() => {
		const element = tracksScrollRef.current;
		if (!element) return;

		const update = () => {
			const top = element.scrollTop;
			const height = element.clientHeight;
			const left = element.scrollLeft;
			const width = element.clientWidth;
			setViewport((previous) =>
				previous.top === top &&
				previous.height === height &&
				previous.left === left &&
				previous.width === width
					? previous
					: { top, height, left, width },
			);
		};

		update();
		const observer = new ResizeObserver(update);
		observer.observe(element);
		element.addEventListener("scroll", update, { passive: true });
		return () => {
			observer.disconnect();
			element.removeEventListener("scroll", update);
		};
	}, [tracksScrollRef]);

	return viewport;
}
