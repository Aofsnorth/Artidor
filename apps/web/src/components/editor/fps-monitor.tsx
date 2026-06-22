"use client";

import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Realtime editor FPS badge. Inline pill meant to sit in the footer next to
 * the "Worked on" card. Measures the browser's animation frame cadence — i.e.
 * how smoothly the editor UI is repainting — not the project/video frame rate.
 * Display is a rolling average updated ~4×/sec so the number doesn't flicker.
 * When the setting is off the component renders null, so no rAF loop runs and
 * there is zero measurement overhead.
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
			className="pointer-events-none flex select-none items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 shadow-inner shadow-white/[0.02]"
			title="Realtime editor repaint rate (UI frames per second)."
		>
			<span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/[0.32]">
				FPS
			</span>
			<span className="font-mono tabular-nums text-white/[0.82]">{fps}</span>
		</div>
	);
}
