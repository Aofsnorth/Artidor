"use client";

import { useEditor } from "@/hooks/use-editor";

import { useEffect, useRef } from "react";

function formatElapsed({ seconds }: { seconds: number }): string {
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Footer strip with project metadata. The "Worked on HH:MM:SS" counter
 * updates every second via direct DOM mutation (not React state) so the
 * surrounding footer chrome — fps / canvas size / aspect / stereo — never
 * re-renders. State-based ticker would force the whole tree to reconcile
 * once per second even though only one text node changed.
 */
export function EditorFooter() {
	const project = useEditor((e) => e.project.getActive());
	const fps = project?.settings.fps
		? Math.round(
				project.settings.fps.numerator / project.settings.fps.denominator,
			)
		: 30;
	const canvas = project?.settings.canvasSize;
	const aspect = canvas ? formatCanvasAspect(canvas) : "16:9";

	const createdAtMs = project?.metadata.createdAt?.getTime() ?? 0;
	const counterRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const node = counterRef.current;
		if (!node) return;
		// No createdAt yet — show dashes and bail until the project loads.
		if (!createdAtMs) {
			node.textContent = "--:--:--";
			return;
		}
		const tick = () => {
			if (!node.isConnected) return;
			node.textContent = formatElapsed({
				seconds: Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000)),
			});
		};
		tick();
		const interval = window.setInterval(tick, 1000);
		return () => window.clearInterval(interval);
	}, [createdAtMs]);

	return (
		<div className="z-50 flex h-9 w-full shrink-0 items-center justify-between border-t border-white/[0.08] bg-[linear-gradient(180deg,#111114_0%,#08080a_100%)] px-4 text-[0.62rem] text-white/[0.48] shadow-[0_-8px_28px_rgba(0,0,0,0.55)]">
			<div className="flex min-w-0 items-center gap-3 font-medium tracking-wide">
				<div
					className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 shadow-inner shadow-white/[0.02]"
					title="Total time you have been working on this project."
				>
					<span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white/[0.32]">
						Worked on
					</span>
					<span
						ref={counterRef}
						className="font-mono text-white/[0.82]"
						suppressHydrationWarning
					>
						--:--:--
					</span>
				</div>
			</div>

			<div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-300/[0.16] bg-cyan-300/[0.055] px-3 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.2em] text-cyan-100/[0.72] shadow-[0_0_18px_rgba(34,211,238,0.08)]">
				<span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]" />
			</div>

			<div className="flex items-center gap-2 sm:gap-3">
				<span>{canvas?.height ?? 1080}p</span>
				<span className="text-white/[0.22]">•</span>
				<span>{fps} fps</span>
				<span className="hidden text-white/[0.22] sm:inline">•</span>
				<span className="hidden sm:inline">{aspect}</span>
				<span className="hidden text-white/[0.22] md:inline">•</span>
				<span className="hidden md:inline">Stereo</span>
			</div>
		</div>
	);
}

function formatCanvasAspect({
	width,
	height,
}: {
	width: number;
	height: number;
}): string {
	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const divisor = gcd(width, height) || 1;
	return `${width / divisor}:${height / divisor}`;
}
