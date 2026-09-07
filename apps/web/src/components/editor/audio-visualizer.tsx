"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { cn } from "@/utils/ui";

const MINI_BARS = [0, 1, 2, 3, 4] as const;
/** Natural symmetric audio wave silhouette for idle / paused state */
const BASE_BAR_SCALES = [0.35, 0.65, 1.0, 0.65, 0.35] as const;

/**
 * 5 perceptual frequency bands spanning musical and speech energy (~60 Hz - 10 kHz).
 * Each band defines bin ranges for 128-bin FFT (256 fftSize @ 48kHz).
 */
const FREQ_BANDS = [
	{ start: 1, end: 4 }, // Sub-bass & Bass (~60 - 250 Hz)
	{ start: 4, end: 10 }, // Low Mids (~250 - 600 Hz)
	{ start: 10, end: 24 }, // Mids (~600 - 1500 Hz)
	{ start: 24, end: 50 }, // High Mids (~1500 - 4000 Hz)
	{ start: 50, end: 90 }, // Treble (~4000 - 10000 Hz)
] as const;

/** A live toolbar toggle for the inline side meter with animated wave response. */
export const MiniAudioVisualizer = memo(function MiniAudioVisualizer() {
	const isOpen = useUiOverlayStore((state) => state.isAudioVisualizerOpen);
	const toggle = useUiOverlayStore((state) => state.toggleAudioVisualizer);
	const editor = useEditor();
	const isPlaying = useEditor(
		(core) => core.playback.getIsPlaying(),
		["playback"],
	);
	const barRefs = useRef<Array<HTMLDivElement | null>>([]);
	const currentScalesRef = useRef<number[]>([...BASE_BAR_SCALES]);
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduceMotion(query.matches);
		const onChange = () => setReduceMotion(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		let frameId = 0;
		let data: Uint8Array<ArrayBuffer> | null = null;

		const applyScales = (scales: number[]) => {
			for (let i = 0; i < MINI_BARS.length; i++) {
				const bar = barRefs.current[i];
				if (bar) {
					bar.style.transform = `scaleY(${scales[i].toFixed(3)})`;
				}
			}
		};

		// Idle / paused (or reduced motion): park the bars on the symmetric
		// silhouette and let the `mini-bars-idle` CSS keyframes drive the
		// staggered left-to-right wave (animasi commit Juli). No rAF loop
		// here so inline writes never fight the CSS animation — the keyframes
		// win over inline transform while the class is applied, and the rAF
		// tick below takes over the moment playback starts.
		if (!isPlaying || reduceMotion) {
			currentScalesRef.current = [...BASE_BAR_SCALES];
			applyScales(currentScalesRef.current);
			return;
		}

		// When playing, run continuous dynamic wave animation
		const tick = () => {
			frameId = 0;
			if (document.hidden) return;

			const now = performance.now() / 1000;
			const { left, right } = editor.audio.getAnalysers();
			const analyser = left ?? right;

			let hasAudioSignal = false;
			const targetScales: number[] = [0, 0, 0, 0, 0];

			if (analyser) {
				const bins = analyser.frequencyBinCount;
				if (data?.length !== bins) data = new Uint8Array(bins);
				analyser.getByteFrequencyData(data);

				let totalEnergy = 0;
				for (let i = 0; i < FREQ_BANDS.length; i++) {
					const { start, end } = FREQ_BANDS[i];
					const clampedStart = Math.min(start, bins);
					const clampedEnd = Math.min(end, bins);
					const count = Math.max(1, clampedEnd - clampedStart);

					let sum = 0;
					for (let b = clampedStart; b < clampedEnd; b++) {
						sum += data[b];
					}
					const level = Math.sqrt(sum / count / 255);
					totalEnergy += level;
					// Subtle wave ripple modulation so bars move organically together
					const waveMod = 0.08 * Math.sin(now * 7 + i * 1.15);
					targetScales[i] = Math.min(
						1.0,
						Math.max(0.18, level * 1.35 + waveMod),
					);
				}
				hasAudioSignal = totalEnergy > 0.03;
			}

			// If there is no real audio signal (silent clip, no audio track, or analyser uninitialized),
			// drive a fluid travelling wave so the button visibly animates during playback.
			if (!hasAudioSignal) {
				for (let i = 0; i < MINI_BARS.length; i++) {
					const wave = 0.2 + 0.65 * (0.5 + 0.5 * Math.sin(now * 6.5 + i * 1.1));
					targetScales[i] = Math.min(1.0, Math.max(0.15, wave));
				}
			}

			// Smooth damping towards targets
			for (let i = 0; i < MINI_BARS.length; i++) {
				currentScalesRef.current[i] +=
					(targetScales[i] - currentScalesRef.current[i]) * 0.35;
			}
			applyScales(currentScalesRef.current);

			frameId = requestAnimationFrame(tick);
		};

		const onVisibilityChange = () => {
			cancelAnimationFrame(frameId);
			frameId = document.hidden ? 0 : requestAnimationFrame(tick);
		};

		frameId = requestAnimationFrame(tick);
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			cancelAnimationFrame(frameId);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [editor, isPlaying, reduceMotion]);

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			aria-pressed={isOpen}
			aria-controls={isOpen ? "side-audio-meter" : undefined}
			title={isOpen ? "Hide audio visualizer" : "Show audio visualizer"}
			className={cn(
				"flex h-7 cursor-pointer items-center justify-center overflow-hidden rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:min-h-11 pointer-coarse:min-w-11",
				isOpen
					? "border-secondary-border bg-secondary text-foreground shadow-xs"
					: "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
			)}
		>
			<div
				aria-hidden="true"
				className={cn(
					"flex h-4 items-end gap-0.5",
					!isPlaying && !reduceMotion && "mini-bars-idle",
				)}
			>
				{MINI_BARS.map((index) => (
					<div
						key={index}
						ref={(element) => {
							barRefs.current[index] = element;
						}}
						className="h-full w-0.5 origin-bottom rounded-[1px] bg-current"
						style={{ transform: `scaleY(${BASE_BAR_SCALES[index]})` }}
					/>
				))}
			</div>
		</button>
	);
});
