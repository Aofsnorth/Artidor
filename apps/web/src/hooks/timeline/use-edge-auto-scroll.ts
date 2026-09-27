import { useEffect } from "react";

interface UseEdgeAutoScrollParams {
	isActive: boolean;
	getMouseClientX: () => number;
	rulerScrollRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	contentWidth: number;
	edgeThreshold?: number;
	maxScrollSpeed?: number;
	/**
	 * Shared, non-reactive horizontal scroll offset (see TimelinePlayhead).
	 * The previous implementation re-read `getBoundingClientRect()`,
	 * `clientWidth`, `scrollWidth` and `scrollLeft` from the DOM on every
	 * animation frame of the drag; each read can force a synchronous layout
	 * flush, which turned edge auto-scroll into a per-frame layout-thrash loop
	 * while scrubbing. Viewport geometry cannot change while a drag is active,
	 * so it is cached once per activation and the scroll offset is tracked in
	 * the shared ref (this loop is the sole writer during the drag).
	 */
	scrollLeftRef: React.RefObject<number>;
}

export function useEdgeAutoScroll({
	isActive,
	getMouseClientX,
	rulerScrollRef,
	tracksScrollRef,
	contentWidth,
	edgeThreshold = 100,
	maxScrollSpeed = 15,
	scrollLeftRef,
}: UseEdgeAutoScrollParams): void {
	useEffect(() => {
		if (!isActive) return;

		let rafId: number | null = null;
		let viewportLeft = 0;
		let viewportWidth = 0;
		let scrollMax = 0;
		let geometryReady = false;

		const cacheGeometry = () => {
			const rulerViewport = rulerScrollRef.current;
			const tracksViewport = tracksScrollRef.current;
			if (!rulerViewport || !tracksViewport) return false;
			viewportLeft = rulerViewport.getBoundingClientRect().left;
			viewportWidth = rulerViewport.clientWidth;
			const intrinsicContentWidth = rulerViewport.scrollWidth;
			const effectiveContentWidth = Math.max(
				contentWidth,
				intrinsicContentWidth,
			);
			scrollMax = Math.max(0, effectiveContentWidth - viewportWidth);
			// Adopt the live DOM offset once at drag start so the local tracking
			// starts from the truth even if a previous writer missed a sync.
			scrollLeftRef.current = rulerViewport.scrollLeft;
			return true;
		};

		const step = () => {
			if (!geometryReady) {
				geometryReady = cacheGeometry();
				// Viewports not mounted yet — retry next frame.
				rafId = requestAnimationFrame(step);
				return;
			}

			const mouseXRelative = getMouseClientX() - viewportLeft;
			const scrollLeft = scrollLeftRef.current;

			let scrollSpeed = 0;

			if (mouseXRelative < edgeThreshold && scrollLeft > 0) {
				const edgeDistance = Math.max(0, mouseXRelative);
				const intensity = 1 - edgeDistance / edgeThreshold;
				scrollSpeed = -maxScrollSpeed * intensity;
			} else if (
				mouseXRelative > viewportWidth - edgeThreshold &&
				scrollLeft < scrollMax
			) {
				const edgeDistance = Math.max(0, viewportWidth - mouseXRelative);
				const intensity = 1 - edgeDistance / edgeThreshold;
				scrollSpeed = maxScrollSpeed * intensity;
			}

			if (scrollSpeed !== 0) {
				const newScrollLeft = Math.max(
					0,
					Math.min(scrollMax, scrollLeft + scrollSpeed),
				);
				const rulerViewport = rulerScrollRef.current;
				const tracksViewport = tracksScrollRef.current;
				if (rulerViewport && tracksViewport) {
					rulerViewport.scrollLeft = newScrollLeft;
					tracksViewport.scrollLeft = newScrollLeft;
					scrollLeftRef.current = newScrollLeft;
				}
			}

			rafId = requestAnimationFrame(step);
		};

		rafId = requestAnimationFrame(step);

		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		};
	}, [
		isActive,
		getMouseClientX,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth,
		edgeThreshold,
		maxScrollSpeed,
		scrollLeftRef,
	]);
}
