import { useCallback, useState } from "react";
import { useResizeObserver } from "./use-resize-observer";

export interface ContainerSize {
	width: number;
	height: number;
}

/**
 * Next state for a ResizeObserver tick.
 *
 * ResizeObserver fires far more often than the box actually changes (every
 * layout pass while an ancestor animates, every drag that does not move this
 * element, …). Returning `previous` unchanged keeps both the re-render AND
 * the object's identity stable, so downstream `memo`/`useEffect` deps keyed
 * on the size object are not invalidated by a no-op tick.
 *
 * Pure and exported for unit testing — the hook itself needs a DOM.
 */
export function nextContainerSize(
	previous: ContainerSize,
	width: number,
	height: number,
): ContainerSize {
	if (previous.width === width && previous.height === height) {
		return previous;
	}
	return { width, height };
}

export function useContainerSize({
	containerRef,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

	const onResize = useCallback((entry: ResizeObserverEntry) => {
		const { width, height } = entry.contentRect;
		setSize((previous) => nextContainerSize(previous, width, height));
	}, []);

	useResizeObserver({ ref: containerRef, onResize });

	return size;
}
