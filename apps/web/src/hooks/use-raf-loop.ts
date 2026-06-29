import { useEffect, useRef } from "react";

export function useRafLoop(callback: ({ time }: { time: number }) => void) {
	const requestRef = useRef<number>(0);
	const previousTimeRef = useRef<number | null>(null);
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
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
	}, []);
}
