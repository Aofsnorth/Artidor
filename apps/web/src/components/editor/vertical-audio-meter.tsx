"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AudioWave01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { cn } from "@/utils/ui";

/**
 * Bounds for the user-resizable audio meter column. The lower bound keeps
 * both L/R channel bars labelled; the upper bound prevents the meter
 * from consuming more than a third of the properties panel width.
 */
const AUDIO_METER_WIDTH_MIN_PX = 40;
const AUDIO_METER_WIDTH_MAX_PX = 220;
const AUDIO_METER_WIDTH_DEFAULT_PX = 48;

const VIS_BAR_COUNT = 24;
const VIS_HEIGHT_PX = 96;

export function VerticalAudioMeter() {
	const editor = useEditor();
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const [dimmed, setDimmed] = useState(false);
	// `isAudioVisualizerOpen` is the global toggle in the preview
	// toolbar. When on, the meter swaps its dB bars for a compact
	// visualizer card (spectrum + waveform) — same AnalyserNode
	// data, same audio source, just rendered inline.
	const isVisualizerOpen = useUiOverlayStore((s) => s.isAudioVisualizerOpen);
	// Width is stored unconstrained but clamped on every update so a
	// stray drag (or a future programmatic call) can never collapse
	// the column to nothing or push it past the properties panel.
	const [width, setWidthRaw] = useState(AUDIO_METER_WIDTH_DEFAULT_PX);
	const setWidth = (next: number) => {
		setWidthRaw(
			Math.max(
				AUDIO_METER_WIDTH_MIN_PX,
				Math.min(AUDIO_METER_WIDTH_MAX_PX, Math.round(next)),
			),
		);
	};

	// Direct DOM refs. Each channel is one <div> with height set via
	// inline style. We update the style imperatively inside the rAF
	// loop, so React never re-renders this component during playback.
	const leftBarRef = useRef<HTMLDivElement>(null);
	const rightBarRef = useRef<HTMLDivElement>(null);
	const leftPeakRef = useRef<HTMLDivElement>(null);
	const rightPeakRef = useRef<HTMLDivElement>(null);

	// Visualizer card refs (only updated when isVisualizerOpen is true).
	const visBarRefs = useRef<Array<HTMLDivElement | null>>([]);

	// Animation state lives entirely in a ref to avoid the React
	// render cycle. Values are read in the rAF loop and written straight
	// to the DOM via the refs above.
	const stateRef = useRef({
		left: 0,
		right: 0,
		peakLeft: 0,
		peakRight: 0,
		visLevels: new Array<number>(VIS_BAR_COUNT).fill(0),
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
			// Prefer the left channel for the visual but fall back to the
			// right if left isn't wired up. If neither is present, the bars
			// just decay toward 0 — we don't want to crash on a fresh load.
			const analyser = leftAnalyser ?? rightAnalyser ?? null;
			const bins = analyser ? analyser.frequencyBinCount : 0;
			const data = analyser ? new Uint8Array(bins) : null;
			if (data && analyser) {
				analyser.getByteFrequencyData(data);
			}

			// 1. dB-meter bars (L + R): compute time-domain peak → height %.
			if (leftAnalyser) {
				const timeData = new Uint8Array(leftAnalyser.fftSize);
				leftAnalyser.getByteTimeDomainData(timeData);
				let maxL = 0;
				for (let i = 0; i < timeData.length; i++) {
					const v = Math.abs((timeData[i] - 128) / 128);
					if (v > maxL) maxL = v;
				}
				state.left = state.left + (Math.sqrt(maxL) * 100 - state.left) * 0.85;
			} else {
				state.left = Math.max(0, state.left - 1.6);
			}
			if (rightAnalyser) {
				const timeData = new Uint8Array(rightAnalyser.fftSize);
				rightAnalyser.getByteTimeDomainData(timeData);
				let maxR = 0;
				for (let i = 0; i < timeData.length; i++) {
					const v = Math.abs((timeData[i] - 128) / 128);
					if (v > maxR) maxR = v;
				}
				state.right =
					state.right + (Math.sqrt(maxR) * 100 - state.right) * 0.85;
			} else {
				state.right = Math.max(0, state.right - 1.6);
			}
			state.peakLeft = Math.max(state.left, state.peakLeft - 0.55);
			state.peakRight = Math.max(state.right, state.peakRight - 0.55);

			// 2. Visualizer bars: split frequency bins into N chunks.
			if (data) {
				const chunkSize = Math.max(1, Math.floor(bins / VIS_BAR_COUNT));
				for (let i = 0; i < VIS_BAR_COUNT; i++) {
					let sum = 0;
					const start = i * chunkSize;
					const end = i === VIS_BAR_COUNT - 1 ? bins : start + chunkSize;
					for (let j = start; j < end; j++) sum += data[j];
					const avg = sum / (end - start) / 255;
					const level = Math.sqrt(avg);
					const target = state.isPlaying ? Math.max(level, 0.04) : level * 0.3;
					state.visLevels[i] =
						state.visLevels[i] + (target - state.visLevels[i]) * 0.3;
				}
			} else {
				for (let i = 0; i < VIS_BAR_COUNT; i++) {
					state.visLevels[i] = state.visLevels[i] * 0.85;
				}
			}

			// Direct DOM write — no React re-render in either view.
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
			for (let i = 0; i < VIS_BAR_COUNT; i++) {
				const ref = visBarRefs.current[i];
				if (ref) {
					const pct = Math.min(100, Math.max(4, state.visLevels[i] * 100));
					ref.style.height = `${pct}%`;
				}
			}
			frameId = requestAnimationFrame(tick);
		};
		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	}, [editor]);

	return (
		<div
			className={cn(
				"relative flex shrink-0 flex-col items-stretch gap-1.5 rounded-lg",
				"border border-white/[0.08] bg-black/40 p-1.5 select-none",
				"transition-opacity duration-200",
				dimmed ? "opacity-25 hover:opacity-70" : "opacity-100",
			)}
			style={{ width: `${width}px` }}
		>
			<AudioMeterResizeHandle currentWidth={width} onResize={setWidth} />

			{isVisualizerOpen ? (
				<VisualizerCard
					barRefs={visBarRefs}
					width={width}
					onClose={() =>
						useUiOverlayStore.getState().setAudioVisualizerOpen(false)
					}
				/>
			) : (
				<MeterView
					leftBarRef={leftBarRef}
					rightBarRef={rightBarRef}
					leftPeakRef={leftPeakRef}
					rightPeakRef={rightPeakRef}
					dimmed={dimmed}
					onToggleDim={() => setDimmed((value) => !value)}
					onOpenVisualizer={() =>
						useUiOverlayStore.getState().setAudioVisualizerOpen(true)
					}
				/>
			)}
		</div>
	);
}

/**
 * Default view: two broadcast-style dB bars (L + R) with peak ticks
 * and a "DIM" toggle at the bottom.
 */
function MeterView({
	leftBarRef,
	rightBarRef,
	leftPeakRef,
	rightPeakRef,
	dimmed,
	onToggleDim,
	onOpenVisualizer,
}: {
	leftBarRef: React.RefObject<HTMLDivElement | null>;
	rightBarRef: React.RefObject<HTMLDivElement | null>;
	leftPeakRef: React.RefObject<HTMLDivElement | null>;
	rightPeakRef: React.RefObject<HTMLDivElement | null>;
	dimmed: boolean;
	onToggleDim: () => void;
	onOpenVisualizer: () => void;
}) {
	return (
		<>
			<div className="flex flex-1 items-stretch gap-1">
				<ChannelBar barRef={leftBarRef} peakRef={leftPeakRef} label="L" />
				<ChannelBar barRef={rightBarRef} peakRef={rightPeakRef} label="R" />
			</div>

			<div className="flex items-center justify-center gap-1 pt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-white/35">
				<span className="w-2.5 text-center">L</span>
				<span className="w-2.5 text-center">R</span>
			</div>

			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onToggleDim}
					aria-pressed={dimmed}
					title={dimmed ? "Show meter" : "Dim meter"}
					className={cn(
						"h-4 flex-1 rounded text-[0.55rem] font-bold uppercase tracking-[0.16em] transition-colors",
						dimmed
							? "bg-white/15 text-white"
							: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70",
					)}
				>
					DIM
				</button>
				<button
					type="button"
					onClick={onOpenVisualizer}
					aria-label="Open audio visualizer"
					title="Open audio visualizer (also: visualizer pill in the preview toolbar)"
					className="grid h-4 w-4 shrink-0 place-items-center rounded bg-white/[0.04] text-white/45 transition-colors hover:bg-white/[0.1] hover:text-white"
				>
					<HugeiconsIcon
						icon={AudioWave01Icon}
						className="size-2.5"
					/>
				</button>
			</div>
		</>
	);
}

/**
 * Inline audio visualizer card. Replaces the dB bars when the user
 * toggles the audio visualizer (via the preview-toolbar pill).
 * Reuses the same AnalyserNode pair the meter uses, so the two
 * views are always in sync.
 */
function VisualizerCard({
	barRefs,
	width,
	onClose,
}: {
	barRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
	width: number;
	onClose: () => void;
}) {
	// Approximate bar width so the row scales with the meter column.
	const barWidth = Math.max(2, Math.floor((width - 16) / VIS_BAR_COUNT) - 1);
	return (
		<>
			<div
				className="flex flex-1 items-end justify-between rounded-[2px] border border-white/[0.06] bg-black/50 p-1"
				style={{ minHeight: `${VIS_HEIGHT_PX}px`, gap: "1px" }}
			>
				{Array.from({ length: VIS_BAR_COUNT }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static count
						key={i}
						ref={(el) => {
							barRefs.current[i] = el;
						}}
						className="rounded-t-[1.5px] bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
						style={{
							width: `${barWidth}px`,
							height: "4%",
							minHeight: "2px",
						}}
					/>
				))}
			</div>

			<div className="flex items-center justify-between gap-1 pt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-white/35">
				<span className="flex-1 text-center">VIS</span>
			</div>

			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onClose}
					aria-label="Close audio visualizer"
					title="Close audio visualizer (back to meter)"
					className="h-4 flex-1 rounded bg-white/[0.04] text-[0.55rem] font-bold uppercase tracking-[0.16em] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
				>
					METER
				</button>
			</div>
		</>
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
 * Drag-to-resize handle for the audio meter column.
 *
 * Sits as a thin vertical strip on the left edge. Mousedown records
 * the start X + start width, then we listen on the window for
 * mousemove / mouseup so the drag keeps tracking even when the cursor
 * leaves the column.
 *
 * The parent's setWidth clamps to AUDIO_METER_WIDTH_MIN_PX..MAX so a
 * stray drag can't collapse the meter to nothing.
 */
function AudioMeterResizeHandle({
	currentWidth,
	onResize,
}: {
	currentWidth: number;
	onResize: (widthPx: number) => void;
}) {
	const startRef = useRef<{ x: number; width: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);

	useEffect(() => {
		if (!isResizing) return;
		const handleMove = (event: MouseEvent) => {
			const start = startRef.current;
			if (!start) return;
			const nextWidth = start.width - (event.clientX - start.x);
			onResize(nextWidth);
		};
		const handleUp = () => {
			setIsResizing(false);
			startRef.current = null;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};
		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}, [isResizing, onResize]);

	return (
		<div
			role="separator"
			aria-label="Resize audio meter"
			aria-orientation="vertical"
			title={
				currentWidth
					? `Drag to resize (currently ${Math.round(currentWidth)}px)`
					: "Drag to resize audio meter"
			}
			onMouseDown={(event) => {
				event.stopPropagation();
				event.preventDefault();
				startRef.current = { x: event.clientX, width: currentWidth };
				setIsResizing(true);
				document.body.style.cursor = "ew-resize";
				document.body.style.userSelect = "none";
			}}
			// Invisible handle — the cursor + tooltip are the only
			// affordance. Keeps the meter looking like a clean widget
			// without a floating drag strip.
			className={cn("absolute top-0 left-0 z-20 h-full w-1.5 cursor-ew-resize")}
		/>
	);
}
