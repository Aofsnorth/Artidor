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
	const [element, setElement] = useState<HTMLDivElement | null>(null);

	// Resolve the scroll element defensively: when the track rows mount in
	// the same commit as the ScrollArea that owns the ref, this child's
	// layout effect runs BEFORE the parent's host ref is assigned, so
	// `tracksScrollRef.current` is still null here. Returning early in that
	// case would silently skip the scroll listener AND the ResizeObserver
	// forever — the culling window stayed `[-OVERSCAN, +OVERSCAN]` (width 0),
	// which unmounted every clip past ~600px the moment it lost selection
	// and never remounted it on scroll. Retry on rAF until the ref is live;
	// this settles within a frame or two of mount.
	useLayoutEffect(() => {
		const existing = tracksScrollRef.current;
		if (existing) {
			setElement(existing);
			return;
		}
		let frame = 0;
		const tick = () => {
			const node = tracksScrollRef.current;
			if (node) {
				setElement(node);
				return;
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [tracksScrollRef]);

	useLayoutEffect(() => {
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
	}, [element]);

	return viewport;
}
