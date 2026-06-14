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
 * Designed for **real-time live view**: state and DOM are both written
 * directly inside a single `requestAnimationFrame` loop, so the bar
 * position is updated at the display's native refresh rate (typically
 * 60-144 Hz) without any React re-renders in between. This avoids the
 * lag that happens when state setters are batched and the React
 * commit phase takes a few ms to push the new style to the DOM.
 *
 * Layout: a single rounded glass card on the right side of the editor
 * canvas, above the Export button. A "DIM" toggle at the bottom drops
 * the opacity so the meter does not steal attention while mixing.
 */
export function VerticalAudioMeter() {
	const editor = useEditor();
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const [dimmed, setDimmed] = useState(false);

	// Direct DOM refs. Each channel is one <div> with height set via
	// inline style. We update the style imperatively inside the rAF
	// loop, so React never re-renders this component during playback.
	const leftBarRef = useRef<HTMLDivElement>(null);
	const rightBarRef = useRef<HTMLDivElement>(null);
	const leftPeakRef = useRef<HTMLDivElement>(null);
	const rightPeakRef = useRef<HTMLDivElement>(null);

	// Animation state lives entirely in a ref to avoid the React
	// render cycle. Values are read in the rAF loop and written straight
	// to the DOM via the refs above.
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

			// Perceptual-loudness curve. sqrt makes the meter feel
			// analog: a -6 dB signal sits at 0.5 of the bar instead of
			// the literal 0.5 amplitude.
			const targetL = Math.sqrt(maxL) * 100;
			const targetR = Math.sqrt(maxR) * 100;

			// Fast attack, gentle decay. A 144 Hz display refreshes every
			// ~7 ms, so the per-frame delta of 0.85 attack / 1.6 decay
			// reaches steady state in well under 100 ms while still
			// looking smooth.
			if (targetL > state.left) {
				state.left = state.left + (targetL - state.left) * 0.85;
			} else {
				state.left = Math.max(0, state.left - 1.6);
			}
			if (targetR > state.right) {
				state.right = state.right + (targetR - state.right) * 0.85;
			} else {
				state.right = Math.max(0, state.right - 1.6);
			}

			// Peak hold: latch the highest recent value, then release.
			// Faster release than attack so peaks track the audio's
			// envelope closely without lingering too long after silence.
			state.peakLeft = Math.max(state.left, state.peakLeft - 0.55);
			state.peakRight = Math.max(state.right, state.peakRight - 0.55);

			// Direct DOM write — no React render in between.
			if (leftBarRef.current) {
				leftBarRef.current.style.height = `${state.left}%`;
			}
			if (rightBarRef.current) {
				rightBarRef.current.style.height = `${state.right}%`;
			}
			if (leftPeakRef.current) {
				leftPeakRef.current.style.transform = `translateY(-${state.peakLeft}%)`;
			}
			if (rightPeakRef.current) {
				rightPeakRef.current.style.transform = `translateY(-${state.peakRight}%)`;
			}

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
				<ChannelBar barRef={leftBarRef} peakRef={leftPeakRef} label="L" />
				<ChannelBar barRef={rightBarRef} peakRef={rightPeakRef} label="R" />
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

function ChannelBar({
	barRef,
	peakRef,
	label: _label,
}: {
	barRef: React.RefObject<HTMLDivElement | null>;
	peakRef: React.RefObject<HTMLDivElement | null>;
	label: string;
}) {
	return (
		<div className="relative flex-1 overflow-hidden rounded-[1.5px] border border-white/5 bg-black/70">
			{/* The level fill. Three-stop broadcast gradient. */}
			<div
				ref={barRef}
				className="absolute inset-x-0 bottom-0 transition-[height] duration-75 ease-out"
				style={{
					height: "0%",
					background:
						"linear-gradient(to top, #22c55e 0%, #22c55e 55%, #eab308 78%, #ef4444 100%)",
				}}
			/>

			{/* Peak tick: latches at the highest recent value. */}
			<div
				ref={peakRef}
				className="pointer-events-none absolute inset-x-0 h-px bg-white/65 transition-transform duration-75"
				style={{
					transform: "translateY(0%)",
					bottom: 0,
				}}
			/>

			{/* dB scale ticks. */}
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
