"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Realtime editor FPS badge (bottom-left). Measures the browser's animation
 * frame cadence — i.e. how smoothly the editor UI is repainting — not the
 * project/video frame rate. Display is a rolling average updated ~4×/sec so
 * the number doesn't flicker. When the setting is off the component renders
 * null, so no rAF loop runs and there is zero measurement overhead.
 */
export function FpsMonitor() {
	const enabled = useSettingsStore((s) => s.showFpsMonitor);
	const [fps, setFps] = useState<number | null>(null);
	const lastDisplayRef = useRef(0);

	useEffect(() => {
		if (!enabled) {
			setFps(null);
			return;
		}

		let rafId = 0;
		let last = performance.now();
		// Exponential moving average of the per-frame delta (ms).
		let avgDelta = 1000 / 60;

		const tick = (now: number) => {
			const delta = now - last;
			last = now;
			// Ignore background-tab jumps (rAF is throttled when hidden).
			if (delta > 0 && delta < 1000) {
				avgDelta = avgDelta * 0.9 + delta * 0.1;
			}
			if (now - lastDisplayRef.current >= 250) {
				lastDisplayRef.current = now;
				setFps(Math.min(120, Math.round(1000 / avgDelta)));
			}
			rafId = requestAnimationFrame(tick);
		};

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [enabled]);

	if (!enabled || fps === null) return null;

	return (
		<div
			className="pointer-events-none absolute bottom-2 left-2 z-30 select-none rounded-sm border border-white/10 bg-black/55 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white/70 backdrop-blur-sm"
			aria-hidden
		>
			{fps} FPS
		</div>
	);
}
