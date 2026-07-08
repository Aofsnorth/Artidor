import { useEffect, useRef } from "react";

/**
 * Run a callback on every animation frame.
 *
 * @param callback - Called each frame with the delta time since the previous frame.
 * @param enabled - When false, the rAF loop is stopped entirely. This is the
 *   most important optimization for the preview canvas: when playback is
 *   paused and no render is pending, stopping the rAF loop avoids ~60
 *   unnecessary callback invocations per second — each of which would do
 *   property reads, scale calculations, and a `setSize` call before
 *   reaching the "nothing changed" early-exit. The `enabled` flag is
 *   reactive: changing it from false→true restarts the loop, true→false
 *   stops it.
 */
export function useRafLoop(
	callback: ({ time }: { time: number }) => void,
	enabled = true,
) {
	const requestRef = useRef<number>(0);
	const previousTimeRef = useRef<number | null>(null);
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		if (!enabled) return;

		const loop = ({ time }: { time: number }) => {
			if (previousTimeRef.current !== null) {
				const deltaTime = time - previousTimeRef.current;
				callbackRef.current({ time: deltaTime });
			}
			previousTimeRef.current = time;
			requestRef.current = requestAnimationFrame((time) => loop({ time }));
		};

		const start = () => {
			previousTimeRef.current = null;
			requestRef.current = requestAnimationFrame((time) => loop({ time }));
		};

		const stop = () => {
			cancelAnimationFrame(requestRef.current);
		};

		// Pause the rAF loop when the tab is hidden to save CPU/battery.
		// The browser already throttles rAF in background tabs, but explicit
		// pausing avoids the backlog of queued frames and the delta-time
		// spike that would otherwise occur when the tab regains focus.
		const onVisibilityChange = () => {
			if (document.hidden) {
				stop();
			} else {
				start();
			}
		};

		start();
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			stop();
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [enabled]);
}
