"use client";

import { useEditor } from "@/hooks/use-editor";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/ui";

const DB_LABELS = [
	"0",
	"-6",
	"-12",
	"-18",
	"-24",
	"-30",
	"-36",
	"-42",
	"-48",
	"-54",
	"-60",
];

/**
 * Vertical audio level meter shown next to the preview.
 *
 * Reads the live AnalyserNodes from the AudioManager and animates two
 * vertical bars (L / R) with a peak-hold tick that decays back down.
 *
 * Layout: a single rounded glass card on the right side of the editor
 * canvas, above the Export button. A small "DIM" toggle at the bottom
 * drops the opacity so it does not steal attention while mixing.
 */
export function VerticalAudioMeter() {
	const editor = useEditor();
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const [levels, setLevels] = useState({ left: 0, right: 0 });
	const [peaks, setPeaks] = useState({ left: 0, right: 0 });
	const [dimmed, setDimmed] = useState(false);

	const stateRef = useRef({
		left: 0,
		right: 0,
		peakLeft: 0,
		peakRight: 0,
		isPlaying: false,
	});

	useEffect(() => {
		stateRef.current.isPlaying = isPlaying;
	}, [isPlaying]);

	useEffect(() => {
		let frameId: number;

		const tick = () => {
			const state = stateRef.current;
			const { left: leftAnalyser, right: rightAnalyser } =
				editor.audio.getAnalysers();

			// Pull peak amplitude from each channel's time-domain data. The
			// audio manager only creates the analysers while playback is
			// running, so when stopped we simply decay toward silence.
			let maxL = 0;
			let maxR = 0;

			if (state.isPlaying) {
				if (leftAnalyser) {
					const data = new Uint8Array(leftAnalyser.fftSize);
					leftAnalyser.getByteTimeDomainData(data);
					for (let i = 0; i < data.length; i++) {
						const v = Math.abs((data[i] - 128) / 128);
						if (v > maxL) maxL = v;
					}
				}
				if (rightAnalyser) {
					const data = new Uint8Array(rightAnalyser.fftSize);
					rightAnalyser.getByteTimeDomainData(data);
					for (let i = 0; i < data.length; i++) {
						const v = Math.abs((data[i] - 128) / 128);
						if (v > maxR) maxR = v;
					}
				}
			}

			// Perceived-loudness curve (sqrt) for a more readable meter.
			const targetL = Math.sqrt(maxL) * 100;
			const targetR = Math.sqrt(maxR) * 100;

			// Fast attack, gentle decay for a smooth analog feel.
			if (targetL > state.left) {
				state.left = state.left + (targetL - state.left) * 0.7;
			} else {
				state.left = Math.max(0, state.left - 1.4);
			}
			if (targetR > state.right) {
				state.right = state.right + (targetR - state.right) * 0.7;
			} else {
				state.right = Math.max(0, state.right - 1.4);
			}

			// Peak hold: latch the highest recent value, then release.
			state.peakLeft = Math.max(state.left, state.peakLeft - 0.6);
			state.peakRight = Math.max(state.right, state.peakRight - 0.6);

			setLevels({ left: state.left, right: state.right });
			setPeaks({ left: state.peakLeft, right: state.peakRight });

			frameId = requestAnimationFrame(tick);
		};

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, [editor]);

	return (
		<div
			className={cn(
				"flex w-12 shrink-0 flex-col items-stretch gap-1.5 rounded-lg",
				"border border-white/[0.08] bg-black/40 p-1.5 select-none",
				"transition-opacity duration-200",
				dimmed ? "opacity-25 hover:opacity-70" : "opacity-100",
			)}
		>
			<div className="flex flex-1 items-stretch gap-1">
				<ChannelBar level={levels.left} peak={peaks.left} />
				<ChannelBar level={levels.right} peak={peaks.right} />
			</div>

			<div className="flex items-center justify-center gap-1 pt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-white/35">
				<span className="w-2.5 text-center">L</span>
				<span className="w-2.5 text-center">R</span>
			</div>

			<button
				type="button"
				onClick={() => setDimmed((value) => !value)}
				aria-pressed={dimmed}
				title={dimmed ? "Show meter" : "Dim meter"}
				className={cn(
					"h-4 rounded text-[0.55rem] font-bold uppercase tracking-[0.16em] transition-colors",
					dimmed
						? "bg-white/15 text-white"
						: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70",
				)}
			>
				DIM
			</button>
		</div>
	);
}

function ChannelBar({ level, peak }: { level: number; peak: number }) {
	const safeLevel = Math.max(0, Math.min(100, level));
	const safePeak = Math.max(0, Math.min(100, peak));
	const isActive = level > 0.5;
	const isClipping = level >= 99;

	return (
		<div
			className={cn(
				"relative flex-1 overflow-hidden rounded-[1.5px] border bg-black/70",
				isClipping
					? "border-red-400/40"
					: isActive
						? "border-white/10"
						: "border-white/5",
			)}
		>
			{/* The level fill. Three-stop gradient that mirrors broadcast convention. */}
			<div
				className="absolute inset-x-0 bottom-0 transition-[height] duration-75 ease-out"
				style={{
					height: `${safeLevel}%`,
					background:
						"linear-gradient(to top, #22c55e 0%, #22c55e 55%, #eab308 78%, #ef4444 100%)",
					boxShadow: isActive ? "0 0 6px rgba(255, 255, 255, 0.18)" : "none",
				}}
			/>

			{/* Peak tick: a small bar that holds at the highest recent value. */}
			{safePeak > 1 && (
				<div
					className={cn(
						"pointer-events-none absolute inset-x-0 h-px transition-transform duration-75",
						safePeak > 90
							? "bg-red-300/90"
							: safePeak > 70
								? "bg-amber-200/80"
								: "bg-white/55",
					)}
					style={{
						transform: `translateY(-${safePeak}%)`,
						bottom: 0,
					}}
				/>
			)}

			{/* dB scale ticks. Faint, but precise enough to read off a level. */}
			<div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-px text-[0.42rem] font-semibold text-white/25">
				{DB_LABELS.map((label) => (
					<span key={label} className="px-0.5 text-right tabular-nums">
						{label}
					</span>
				)).reverse()}
			</div>
		</div>
	);
}
