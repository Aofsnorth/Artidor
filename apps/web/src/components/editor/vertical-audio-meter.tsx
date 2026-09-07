"use client";

import { memo, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";
import { timelineHasAudio } from "@/lib/media/audio";
import { cn } from "@/utils/ui";

/**
 * Bounds for the user-resizable audio meter column. The lower bound keeps
 * both L/R channel bars labelled; the upper bound prevents the meter
 * from consuming more than a third of the properties panel width.
 */
export const AUDIO_METER_WIDTH_MIN_PX = 56;
export const AUDIO_METER_WIDTH_MAX_PX = 220;
export const AUDIO_METER_WIDTH_DEFAULT_PX = 64;

const VIS_BAR_COUNT = 24;
const VIS_BARS = Array.from({ length: VIS_BAR_COUNT }, (_, index) => index);

const CLIP_THRESHOLD_PCT = 98;
const CLIP_HOLD_MS = 1500;
const CLIP_DECAY_PER_FRAME = 2;

export const VerticalAudioMeter = memo(function VerticalAudioMeter({
	width: controlledWidth,
	onResize,
}: {
	width?: number;
	onResize?: (nextWidth: number) => void;
} = {}) {
	const editor = useEditor();
	const isPlaying = useEditor((e) => e.playback.getIsPlaying(), ["playback"]);
	// Whether the timeline currently has any audible candidate. When
	// false (e.g. a video with no audio track, or all elements/tracks
	// muted), the meter must stay flat instead of reading the analyser
	// — which can report a non-silent baseline even for silent content.
	// The selector returns a primitive boolean, so `useEditor`'s
	// shallow-equality memoization prevents re-renders unless the value
	// actually flips.
	const hasAudio = useEditor((e) => {
		const scene = e.scenes.getActiveSceneOrNull();
		if (!scene) return false;
		return timelineHasAudio({
			tracks: scene.tracks,
			mediaAssets: e.media.getAssets(),
		});
	});
	const isVisualizer = useUiOverlayStore(
		(state) => state.audioMeterMode === "visualizer",
	);
	const toggleMode = useUiOverlayStore((state) => state.toggleAudioMeterMode);
	const setAudioVisualizerOpen = useUiOverlayStore(
		(state) => state.setAudioVisualizerOpen,
	);
	// Width is stored unconstrained but clamped on every update so a
	// stray drag (or a future programmatic call) can never collapse
	// the column to nothing or push it past the properties panel.
	const [internalWidth, setInternalWidthRaw] = useState(
		AUDIO_METER_WIDTH_DEFAULT_PX,
	);
	const setInternalWidth = (next: number) => {
		setInternalWidthRaw(
			Math.max(
				AUDIO_METER_WIDTH_MIN_PX,
				Math.min(AUDIO_METER_WIDTH_MAX_PX, Math.round(next)),
			),
		);
	};
	const width = controlledWidth === undefined ? internalWidth : controlledWidth;
	const setWidth =
		controlledWidth === undefined ? setInternalWidth : (onResize ?? (() => {}));

	// Direct DOM refs. Each channel is one <div> with height set via
	// inline style. We update the style imperatively inside the rAF
	// loop, so React never re-renders this component during playback.
	const leftBarRef = useRef<HTMLDivElement>(null);
	const rightBarRef = useRef<HTMLDivElement>(null);
	const leftPeakRef = useRef<HTMLDivElement>(null);
	const rightPeakRef = useRef<HTMLDivElement>(null);
	const leftClipRef = useRef<HTMLDivElement>(null);
	const rightClipRef = useRef<HTMLDivElement>(null);
	const leftContainerRef = useRef<HTMLDivElement>(null);
	const rightContainerRef = useRef<HTMLDivElement>(null);

	// Only the active display reads analyser data and updates its DOM refs.
	const visBarRefs = useRef<Array<HTMLDivElement | null>>([]);

	// Animation state lives entirely in a ref to avoid the React
	// render cycle. Values are read in the rAF loop and written straight
	// to the DOM via the refs above.
	const stateRef = useRef({
		left: 0,
		right: 0,
		peakLeft: 0,
		peakRight: 0,
		clipLeft: 0,
		clipLeftAt: 0,
		clipRight: 0,
		clipRightAt: 0,
		visLevels: Array.from({ length: VIS_BAR_COUNT }, () => 0),
	});

	useEffect(() => {
		let frameId = 0;
		let leftData: Uint8Array<ArrayBuffer> | null = null;
		let rightData: Uint8Array<ArrayBuffer> | null = null;
		let frequencyData: Uint8Array<ArrayBuffer> | null = null;
		const tick = () => {
			frameId = 0;
			if (document.hidden) return;
			const state = stateRef.current;
			let { left: leftAnalyser, right: rightAnalyser } =
				editor.audio.getAnalysers();
			// When the timeline has no audible candidate (e.g. a video
			// with no audio track, or all elements/tracks muted), do not
			// read the analyser at all — it can report a non-silent
			// baseline even for silent content, making the meter light
			// up. Treat both channels as absent so the bars decay to 0.
			if (!hasAudio || !isPlaying) {
				leftAnalyser = null;
				rightAnalyser = null;
			}
			// Prefer the left channel for the visual but fall back to the
			// right if left isn't wired up. If neither is present, the bars
			// just decay toward 0 — we don't want to crash on a fresh load.
			const analyser = leftAnalyser ?? rightAnalyser ?? null;
			const bins = analyser ? analyser.frequencyBinCount : 0;
			if (isVisualizer && analyser) {
				if (frequencyData?.length !== bins)
					frequencyData = new Uint8Array(bins);
				analyser.getByteFrequencyData(frequencyData);
			}

			// 1. dB-meter bars (L + R): compute time-domain peak → height %.
			if (!isVisualizer && leftAnalyser) {
				if (leftData?.length !== leftAnalyser.fftSize)
					leftData = new Uint8Array(leftAnalyser.fftSize);
				leftAnalyser.getByteTimeDomainData(leftData);
				let maxL = 0;
				for (let i = 0; i < leftData.length; i++) {
					const v = Math.abs((leftData[i] - 128) / 128);
					if (v > maxL) maxL = v;
				}
				state.left = state.left + (Math.sqrt(maxL) * 100 - state.left) * 0.85;
			} else {
				state.left = Math.max(0, state.left - 1.6);
			}
			if (!isVisualizer && rightAnalyser) {
				if (rightData?.length !== rightAnalyser.fftSize)
					rightData = new Uint8Array(rightAnalyser.fftSize);
				rightAnalyser.getByteTimeDomainData(rightData);
				let maxR = 0;
				for (let i = 0; i < rightData.length; i++) {
					const v = Math.abs((rightData[i] - 128) / 128);
					if (v > maxR) maxR = v;
				}
				state.right =
					state.right + (Math.sqrt(maxR) * 100 - state.right) * 0.85;
			} else {
				state.right = Math.max(0, state.right - 1.6);
			}
			state.peakLeft = Math.max(state.left, state.peakLeft - 0.55);
			state.peakRight = Math.max(state.right, state.peakRight - 0.55);

			const now = performance.now();
			if (state.left >= CLIP_THRESHOLD_PCT) {
				state.clipLeft = 100;
				state.clipLeftAt = now;
			} else if (now - state.clipLeftAt > CLIP_HOLD_MS) {
				state.clipLeft = Math.max(0, state.clipLeft - CLIP_DECAY_PER_FRAME);
			}
			if (state.right >= CLIP_THRESHOLD_PCT) {
				state.clipRight = 100;
				state.clipRightAt = now;
			} else if (now - state.clipRightAt > CLIP_HOLD_MS) {
				state.clipRight = Math.max(0, state.clipRight - CLIP_DECAY_PER_FRAME);
			}

			// 2. Visualizer bars: split frequency bins into N chunks.
			if (isVisualizer && analyser && frequencyData) {
				for (let i = 0; i < VIS_BAR_COUNT; i++) {
					let sum = 0;
					const start = Math.floor((i * bins) / VIS_BAR_COUNT);
					const end = Math.floor(((i + 1) * bins) / VIS_BAR_COUNT);
					for (let j = start; j < end; j++) sum += frequencyData[j];
					const target = Math.sqrt(sum / Math.max(1, end - start) / 255);
					state.visLevels[i] =
						state.visLevels[i] + (target - state.visLevels[i]) * 0.3;
				}
			} else {
				for (let i = 0; i < VIS_BAR_COUNT; i++) {
					state.visLevels[i] = state.visLevels[i] * 0.85;
				}
			}

			// Direct DOM write — no React re-render in either view.
			// Bar is now a dark mask: height = (100 - level)%, so level 100% → mask 0% (fully revealed).
			// Gradient layer only visible when there's actual audio signal.
			if (leftBarRef.current) {
				leftBarRef.current.style.transform = `scaleY(${1 - state.left / 100})`;
			}
			if (rightBarRef.current) {
				rightBarRef.current.style.transform = `scaleY(${1 - state.right / 100})`;
			}
			if (leftContainerRef.current) {
				const grad = leftContainerRef.current
					.firstElementChild as HTMLDivElement | null;
				if (grad) grad.style.opacity = state.left > 1 ? "1" : "0";
			}
			if (rightContainerRef.current) {
				const grad = rightContainerRef.current
					.firstElementChild as HTMLDivElement | null;
				if (grad) grad.style.opacity = state.right > 1 ? "1" : "0";
			}
			if (leftPeakRef.current) {
				leftPeakRef.current.style.transform = `translateY(-${state.peakLeft}%)`;
			}
			if (rightPeakRef.current) {
				rightPeakRef.current.style.transform = `translateY(-${state.peakRight}%)`;
			}
			if (leftClipRef.current) {
				leftClipRef.current.style.opacity = (state.clipLeft / 100).toString();
			}
			if (rightClipRef.current) {
				rightClipRef.current.style.opacity = (state.clipRight / 100).toString();
			}
			for (let i = 0; i < VIS_BAR_COUNT; i++) {
				const ref = visBarRefs.current[i];
				if (ref) {
					const pct = Math.min(100, Math.max(4, state.visLevels[i] * 100));
					ref.style.transform = `scaleY(${pct / 100})`;
				}
			}
			// Let a stopped meter settle, then do no frame work until playback resumes.
			let visualizerSettling = false;
			for (const level of state.visLevels) {
				if (level > 0.001) {
					visualizerSettling = true;
					break;
				}
			}
			const settling =
				state.peakLeft > 0 ||
				state.peakRight > 0 ||
				state.clipLeft > 0 ||
				state.clipRight > 0 ||
				visualizerSettling;
			if ((isPlaying && hasAudio) || settling)
				frameId = requestAnimationFrame(tick);
		};
		const onVisibilityChange = () => {
			cancelAnimationFrame(frameId);
			frameId = document.hidden ? 0 : requestAnimationFrame(tick);
		};
		onVisibilityChange();
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			cancelAnimationFrame(frameId);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [editor, isVisualizer, isPlaying, hasAudio]);

	return (
		<section
			id="side-audio-meter"
			aria-label="Audio monitor"
			data-mode={isVisualizer ? "visualizer" : "meter"}
			className={cn(
				"relative flex min-h-0 flex-1 flex-col items-stretch gap-1.5 overflow-hidden rounded-lg",
				"border border-border bg-background p-1.5 select-none",
			)}
			style={{ width: `${width}px` }}
		>
			<AudioMeterResizeHandle currentWidth={width} onResize={setWidth} />

			<div className="flex items-center justify-between px-0.5 pt-0.5">
				<span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-white/40">
					{isVisualizer ? "Spectrum" : "Meter"}
				</span>
				<button
					type="button"
					onClick={() => setAudioVisualizerOpen(false)}
					className="flex size-4 cursor-pointer items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					title="Hide audio visualizer"
					aria-label="Hide audio visualizer"
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
				</button>
			</div>

			{isVisualizer ? (
				<VisualizerCard barRefs={visBarRefs} />
			) : (
				<MeterView
					leftBarRef={leftBarRef}
					rightBarRef={rightBarRef}
					leftPeakRef={leftPeakRef}
					rightPeakRef={rightPeakRef}
					leftClipRef={leftClipRef}
					rightClipRef={rightClipRef}
					leftContainerRef={leftContainerRef}
					rightContainerRef={rightContainerRef}
				/>
			)}
			<button
				type="button"
				onClick={toggleMode}
				aria-label={
					isVisualizer ? "Switch to audio meter" : "Switch to audio visualizer"
				}
				aria-pressed={isVisualizer}
				title={
					isVisualizer ? "Switch to audio meter" : "Switch to audio visualizer"
				}
				className="h-7 w-full shrink-0 rounded bg-secondary text-[0.6rem] font-semibold tracking-wider text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:min-h-11"
			>
				{isVisualizer ? "VIS" : "DIM"}
			</button>
		</section>
	);
});

/** Default view: two broadcast-style dB bars (L + R) with peak ticks. */
function MeterView({
	leftBarRef,
	rightBarRef,
	leftPeakRef,
	rightPeakRef,
	leftClipRef,
	rightClipRef,
	leftContainerRef,
	rightContainerRef,
}: {
	leftBarRef: React.RefObject<HTMLDivElement | null>;
	rightBarRef: React.RefObject<HTMLDivElement | null>;
	leftPeakRef: React.RefObject<HTMLDivElement | null>;
	rightPeakRef: React.RefObject<HTMLDivElement | null>;
	leftClipRef: React.RefObject<HTMLDivElement | null>;
	rightClipRef: React.RefObject<HTMLDivElement | null>;
	leftContainerRef: React.RefObject<HTMLDivElement | null>;
	rightContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
	return (
		<>
			<div className="flex min-h-0 flex-1 items-stretch gap-1">
				<ChannelBar
					barRef={leftBarRef}
					peakRef={leftPeakRef}
					clipRef={leftClipRef}
					containerRef={leftContainerRef}
					label="L"
				/>
				<ChannelBar
					barRef={rightBarRef}
					peakRef={rightPeakRef}
					clipRef={rightClipRef}
					containerRef={rightContainerRef}
					label="R"
				/>
			</div>

			<div className="flex items-center justify-center gap-1 pt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.04em] text-white/35">
				<span className="w-3 text-center">L</span>
				<span className="w-3 text-center">R</span>
			</div>
		</>
	);
}

/** Frequency spectrum in the same column as the meter, never a floating panel. */
function VisualizerCard({
	barRefs,
}: {
	barRefs: React.RefObject<Array<HTMLDivElement | null>>;
}) {
	return (
		<>
			<div
				className="flex min-h-0 flex-1 items-end gap-px overflow-hidden rounded border border-border bg-background p-1"
				aria-hidden="true"
			>
				{VIS_BARS.map((i) => (
					<div
						key={i}
						ref={(el) => {
							barRefs.current[i] = el;
						}}
						className="h-full min-w-0 flex-1 origin-bottom rounded-t-[1px] bg-linear-to-t from-emerald-500 via-yellow-400 to-red-500"
						style={{ transform: "scaleY(0.04)" }}
					/>
				))}
			</div>

			<div className="flex items-center justify-between gap-1 pt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.16em] text-white/35">
				<span className="flex-1 text-center">VIS</span>
			</div>
		</>
	);
}

function ChannelBar({
	barRef,
	peakRef,
	clipRef,
	containerRef,
	label: _label,
}: {
	barRef: React.RefObject<HTMLDivElement | null>;
	peakRef: React.RefObject<HTMLDivElement | null>;
	clipRef: React.RefObject<HTMLDivElement | null>;
	containerRef: React.RefObject<HTMLDivElement | null>;
	label: string;
}) {
	const labels = DB_LABELS.map((label) => (
		<span key={label} className="px-0.5 text-right tabular-nums">
			{label}
		</span>
	)).reverse();

	return (
		<div
			ref={containerRef}
			className="relative flex-1 overflow-hidden rounded-md border border-white/5 bg-black/70"
		>
			{/* Gradient layer — hidden when idle, revealed by mask when audio plays */}
			<div className="absolute inset-0 z-0 rounded-md bg-linear-to-t from-emerald-500 via-yellow-400 to-red-500 opacity-0 transition-opacity duration-200" />

			{/* Dark mask that covers the unrevealed portion, sliding up as level rises */}
			<div
				ref={barRef}
				className="absolute inset-0 z-10 origin-top bg-black/70 transition-transform duration-75 ease-out"
				style={{ transform: "scaleY(1)" }}
			/>

			{/* Clip indicator: latches red at 0dB for ~1.5s, then decays. */}
			<div
				ref={clipRef}
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 bg-red-500 opacity-0 transition-opacity duration-75 shadow-[0_0_6px_2px_rgba(239,68,68,0.7)]"
			/>

			{/* Peak tick: latches at the highest recent value. */}
			<div
				ref={peakRef}
				className="pointer-events-none absolute inset-x-0 z-20 h-px bg-white/65 transition-transform duration-75"
				style={{
					transform: "translateY(0%)",
					bottom: 0,
				}}
			/>

			{/* dB scale ticks. */}
			<div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between py-px text-[0.42rem] font-semibold text-white/25">
				{labels}
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
		<button
			type="button"
			aria-label="Resize audio meter"
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
