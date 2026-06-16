/**
 * Shared client-side hook that respects the user's
 * `prefers-reduced-motion` setting.
 *
 * The landing page uses motion/react for the entrance animations.
 * Users who have requested reduced motion get the same final layout
 * without the slide-in or pulse — they just see the page already
 * settled. This is both an a11y win and a small perf win (the
 * animation work is skipped on those devices).
 */

"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(mql.matches);
		const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);
	return reduced;
}
