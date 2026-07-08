"use client";

/**
 * Audio visualizer — both the small "toggle" pill that sits to the left
 * of the timecode in the preview toolbar, and the larger overlay panel
 * that opens on the right when toggled.
 *
 * Both components read the same AnalyserNode pair from
 * `editor.audio.getAnalysers()` and update their bars via direct DOM
 * writes inside a requestAnimationFrame loop, so the audio level never
 * triggers a React re-render. The rAF loop is started on mount and
 * cancelled on unmount (or, for the large one, when the panel closes).
 *
 * State (open / closed) is shared between the two via
 * `useUiOverlayStore` so the pill can reflect whether the panel is
 * open and the panel can close itself.
 */

import { memo, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, AudioWave01Icon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { cn } from "@/utils/ui";

const MINI_BAR_COUNT = 5;
const MINI_BAR_WIDTH_PX = 2;
const MINI_BAR_GAP_PX = 2;
const MINI_HEIGHT_PX = 20;
const MINI_BAR_MIN_PX = 3;

const LARGE_BAR_COUNT = 56;
const LARGE_PANEL_WIDTH_PX = 308;

/**
 * A short hook that runs an rAF loop reading the audio analysers and
 * exposing per-bar level updates through a ref. We avoid React state
 * for the level values because the bars are updated at ~60-144 Hz
 * and re-rendering the whole component that often would tank perf.
 */
function useAudioBars(barCount: number) {
	const editor = useEditor();
	const refs = useRef<Array<HTMLDivElement | null>>([]);
	const isPlaying = useEditor(
		(e) => e.playback.getIsPlaying(),
		["playback"],
	);
	const playingRef = useRef(isPlaying);
	playingRef.current = isPlaying;

	useEffect(() => {
		let frameId: number;
		let analyser: AnalyserNode | null = null;
		let data: Uint8Array<ArrayBuffer> | null = null;

		const tick = () => {
			// The audio context is created lazily when playback starts,
			// while this button is mounted long before that. Re-read the
			// analyser every frame so the toolbar pill locks onto the
			// same live source as the right-side meter as soon as music
			// starts.
			const { left, right } = editor.audio.getAnalysers();
			const nextAnalyser = left ?? right;
			if (nextAnalyser !== analyser) {
				analyser = nextAnalyser ?? null;
				data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
			}

			const playing = playingRef.current;
			if (data && analyser && playing) {
				analyser.getByteFrequencyData(data);
				const bins = analyser.frequencyBinCount;
				const chunkSize = Math.max(1, Math.floor(bins / barCount));
				for (let i = 0; i < barCount; i++) {
					const ref = refs.current[i];
					if (!ref) continue;
					let sum = 0;
					const start = i * chunkSize;
					const end = i === barCount - 1 ? bins : start + chunkSize;
					for (let j = start; j < end; j++) sum += data[j];
					const avg = sum / (end - start) / 255;
					const level = Math.max(Math.sqrt(avg), 0.04);
					const pct = Math.min(100, Math.max(6, level * 100));
					ref.style.height = `${pct}%`;
				}
			} else {
				for (let i = 0; i < barCount; i++) {
					const ref = refs.current[i];
					if (!ref) continue;
					ref.style.height = "60%";
				}
			}
			frameId = requestAnimationFrame(tick);
		};
		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, [editor, barCount]);

	return refs;
}

/**
 * Small audio-visualizer pill rendered to the left of the timecode.
 *
 * Clicking toggles `isAudioVisualizerOpen` in the overlay store, which
 * either reveals or hides the `LargeAudioVisualizer` panel on the
 * right. The pill is itself a live visualizer — its 5 bars are the
 * same kind of frequency bins as the large panel, just compressed.
 */
export const MiniAudioVisualizer = memo(function MiniAudioVisualizer() {
	const isOpen = useUiOverlayStore((s) => s.isAudioVisualizerOpen);
	const toggle = useUiOverlayStore((s) => s.toggleAudioVisualizer);
	const barRefs = useAudioBars(MINI_BAR_COUNT);
	const isPlaying = useEditor(
		(e) => e.playback.getIsPlaying(),
		["playback"],
	);

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			aria-pressed={isOpen}
			title={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			className={cn(
				"flex h-7 items-center justify-center rounded-md border px-2 transition-all cursor-pointer overflow-hidden",
				isOpen
					? "border-white/20 bg-white/[0.12] text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]"
					: "border-transparent text-white/55 hover:bg-white/[0.06] hover:text-white",
			)}
		>
			<div
				className={cn(
					"flex items-end",
					!isPlaying && !isOpen && "mini-bars-idle",
				)}
				style={{
					height: `${MINI_HEIGHT_PX}px`,
					gap: `${MINI_BAR_GAP_PX}px`,
				}}
			>
				{Array.from({ length: MINI_BAR_COUNT }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static count
						key={i}
						ref={(el) => {
							barRefs.current[i] = el;
						}}
						className="rounded-[1px] bg-current"
						style={{
							width: `${MINI_BAR_WIDTH_PX}px`,
							height: "16%",
							minHeight: `${MINI_BAR_MIN_PX}px`,
						}}
					/>
				))}
			</div>
		</button>
	);
});

/**
 * The large visualizer panel shown on the right when the mini pill is
 * toggled on. Composed of two layers:
 *
 *  - a row of frequency bars (the same data as the mini pill but with
 *    56 bars so individual frequencies are visible)
 *  - a waveform canvas underneath, using the time-domain data from
 *    the same analyser
 *
 * Position: `fixed` overlay on the right edge, below the header and
 * above the footer. Closes itself via the X button or by clicking the
 * mini pill again.
 */
export const LargeAudioVisualizer = memo(function LargeAudioVisualizer() {
	const isOpen = useUiOverlayStore((s) => s.isAudioVisualizerOpen);
	const setOpen = useUiOverlayStore((s) => s.setAudioVisualizerOpen);
	const barRefs = useAudioBars(LARGE_BAR_COUNT);
	const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const editor = useEditor();

	// Waveform canvas draw loop. Same rAF cadence as the bars so the two
	// stay in sync.
	useEffect(() => {
		if (!isOpen) return;
		const canvas = waveCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Match the canvas backing store to its CSS size for crisp lines
		// on high-DPI screens. We re-sample on resize too.
		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			const rect = canvas.getBoundingClientRect();
			canvas.width = Math.max(1, Math.floor(rect.width * dpr));
			canvas.height = Math.max(1, Math.floor(rect.height * dpr));
			ctx.scale(dpr, dpr);
		};
		resize();
		const ro = new ResizeObserver(resize);
		ro.observe(canvas);

		let frameId: number;
		const tick = () => {
			const { left, right } = editor.audio.getAnalysers();
			const analyser = left ?? right ?? null;
			const cssWidth = canvas.clientWidth;
			const cssHeight = canvas.clientHeight;
			ctx.clearRect(0, 0, cssWidth, cssHeight);

			if (analyser && cssWidth > 0) {
				const timeData = new Uint8Array(analyser.fftSize);
				analyser.getByteTimeDomainData(timeData);
				// Map 0..255 (centered at 128) to -1..1 vertically
				const step = timeData.length / cssWidth;
				ctx.lineWidth = 1.25;
				ctx.strokeStyle = "rgba(255,255,255,0.7)";
				ctx.beginPath();
				for (let x = 0; x < cssWidth; x++) {
					const idx = Math.min(timeData.length - 1, Math.floor(x * step));
					const v = (timeData[idx] - 128) / 128;
					const y = (1 - v) * (cssHeight / 2);
					if (x === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.stroke();
			}
			frameId = requestAnimationFrame(tick);
		};
		frameId = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frameId);
			ro.disconnect();
		};
	}, [editor, isOpen]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-label="Audio visualizer"
			className="pointer-events-auto fixed top-20 bottom-32 z-40 flex flex-col rounded-2xl border border-white/10 bg-[#0d0d10]/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
			style={{ right: "0.75rem", width: `${LARGE_PANEL_WIDTH_PX}px` }}
		>
			<header className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<HugeiconsIcon
						icon={AudioWave01Icon}
						className="size-4 text-white/60"
						aria-hidden="true"
					/>
					<h3 className="text-sm font-semibold tracking-tight text-white">
						Audio visualizer
					</h3>
				</div>
				<button
					type="button"
					onClick={() => setOpen(false)}
					aria-label="Close audio visualizer"
					className="flex size-6 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
				</button>
			</header>

			<div
				className="mb-3 flex flex-1 items-end justify-between rounded-lg border border-white/[0.05] bg-black/40 p-2"
				style={{ minHeight: "180px" }}
			>
				<div
					className="flex h-full w-full items-end justify-between"
					style={{ gap: "2px" }}
				>
					{Array.from({ length: LARGE_BAR_COUNT }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static count
							key={i}
							ref={(el) => {
								barRefs.current[i] = el;
							}}
							className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
							style={{ height: "4%", minHeight: "2px" }}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">
					Waveform
				</span>
				<div className="h-16 overflow-hidden rounded-md border border-white/[0.05] bg-black/40">
					<canvas
						ref={waveCanvasRef}
						className="block h-full w-full"
						aria-label="Audio waveform"
					/>
				</div>
			</div>
		</div>
	);
});
