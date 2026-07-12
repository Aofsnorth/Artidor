"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	getCenteredLineLeft,
	TIMELINE_INDICATOR_LINE_WIDTH_PX,
	timelineTimeToSnappedPixels,
} from "@/lib/timeline";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { useKeyframeSelection } from "@/hooks/timeline/element/use-keyframe-selection";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { frameRateToFloat } from "@/lib/fps/utils";
import { useEditor } from "@/hooks/use-editor";
import { useRafLoop } from "@/hooks/use-raf-loop";
import {
	TIMELINE_SCROLLBAR_SIZE_PX,
	TIMELINE_CONTENT_LEFT_INSET_PX,
} from "./layout";
import { TIMELINE_LAYERS } from "./layers";

// Movement (px) under which a pointer down→up on the handle counts as a click
// (toggles the time bubble) rather than a scrub-drag.
const PLAYHEAD_CLICK_SLOP_PX = 4;

/** Formats playhead ticks as MM:SS:FF for the time bubble. */
function formatPlayheadTime({
	ticks,
	fps,
}: {
	ticks: number;
	fps: number;
}): string {
	const totalSeconds = ticks / TICKS_PER_SECOND;
	const safeFps = fps > 0 ? fps : 30;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	const frames = Math.floor((totalSeconds * safeFps) % safeFps);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

// Horizontal offset (px) applied to the playhead line ONLY while a keyframe is
// selected, to visually centre the 2px line on the slim keyframe diamond.
//   Positive = nudge RIGHT, negative = nudge LEFT.
// Tune this in small 0.5px steps until the line sits dead-centre on the diamond.
const PLAYHEAD_KEYFRAME_NUDGE_PX = 1;

interface TimelinePlayheadProps {
	zoomLevel: number;
	hasHorizontalScrollbar: boolean;
	rulerRef: React.RefObject<HTMLDivElement | null>;
	rulerScrollRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	playheadRef?: React.RefObject<HTMLDivElement | null>;
	isSnappingToPlayhead?: boolean;
}

export function TimelinePlayhead({
	zoomLevel,
	hasHorizontalScrollbar,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	timelineRef,
	playheadRef: externalPlayheadRef,
	isSnappingToPlayhead = false,
}: TimelinePlayheadProps) {
	const editor = useEditor();
	const duration = editor.timeline.getTotalDuration();
	// When a keyframe is selected the playhead seeks to its exact time, but the
	// 2px line renders a hair left of the (now slimmer) diamond's visual centre.
	// Nudge the line right so it reads as centred on the selected keyframe.
	const { selectedKeyframes } = useKeyframeSelection();
	const hasSelectedKeyframe = selectedKeyframes.length > 0;
	const internalPlayheadRef = useRef<HTMLDivElement>(null);
	const playheadRef = externalPlayheadRef || internalPlayheadRef;

	const [showTimeBubble, setShowTimeBubble] = useState(false);
	const [isHandlePressed, setIsHandlePressed] = useState(false);
	const downPosRef = useRef<{ x: number; y: number } | null>(null);
	const wasDragRef = useRef(false);
	const preDragBubbleRef = useRef(false);

	const { handlePlayheadMouseDown } = useTimelinePlayhead({
		zoomLevel,
		rulerRef,
		rulerScrollRef,
		tracksScrollRef,
		playheadRef,
	});

	const fpsFloat = frameRateToFloat(editor.project.getActive().settings.fps);

	// Live playhead time for the bubble. Only subscribed while the bubble is
	// visible so we don't re-render the playhead on every frame otherwise.
	const [bubbleTicks, setBubbleTicks] = useState(() =>
		editor.playback.getCurrentTime(),
	);
	useEffect(() => {
		if (!showTimeBubble) return;
		setBubbleTicks(editor.playback.getCurrentTime());
		const onUpdate = (e: Event) => {
			const time = (e as CustomEvent<{ time: number }>).detail?.time;
			if (typeof time === "number") setBubbleTicks(time);
		};
		window.addEventListener("playback-update", onUpdate);
		window.addEventListener("playback-seek", onUpdate);
		return () => {
			window.removeEventListener("playback-update", onUpdate);
			window.removeEventListener("playback-seek", onUpdate);
		};
	}, [showTimeBubble, editor.playback]);

	const handleHandleMouseDown = (event: React.MouseEvent) => {
		downPosRef.current = { x: event.clientX, y: event.clientY };
		wasDragRef.current = false;
		preDragBubbleRef.current = showTimeBubble;
		setIsHandlePressed(true);
		handlePlayheadMouseDown(event);
	};

	// Global listeners to distinguish click (toggle) from drag (hold).
	useEffect(() => {
		if (!isHandlePressed) return;

		const onMove = (e: MouseEvent) => {
			const down = downPosRef.current;
			if (!down || wasDragRef.current) return;
			const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
			if (moved > PLAYHEAD_CLICK_SLOP_PX) {
				wasDragRef.current = true;
				setShowTimeBubble(true);
			}
		};

		const onUp = () => {
			setIsHandlePressed(false);
			downPosRef.current = null;
			if (!wasDragRef.current) {
				// Click — toggle persistent bubble state
				setShowTimeBubble((prev) => !prev);
			} else {
				// Drag ended — restore pre-drag state
				setShowTimeBubble(preDragBubbleRef.current);
			}
			wasDragRef.current = false;
		};

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
		};
	}, [isHandlePressed]);

	// While the bubble is shown, Tab drops a marker (bookmark) at the playhead
	// instead of moving focus. Restores default Tab behaviour when hidden.
	useEffect(() => {
		if (!showTimeBubble) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			e.preventDefault();
			e.stopPropagation();
			try {
				editor.scenes.toggleBookmark({
					time: editor.playback.getCurrentTime(),
				});
				toast.success("Marker toggled at playhead");
			} catch {
				toast.error("Could not toggle marker");
			}
		};
		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [showTimeBubble, editor.scenes, editor.playback]);

	const timelineContainerHeight =
		timelineRef.current?.clientHeight ??
		tracksScrollRef.current?.clientHeight ??
		400;
	const totalHeight = Math.max(
		0,
		timelineContainerHeight -
			(hasHorizontalScrollbar ? TIMELINE_SCROLLBAR_SIZE_PX - 5 : 0),
	);

	// Playhead position is updated via direct DOM manipulation in a rAF loop
	// instead of React re-renders. This avoids a full React reconciliation
	// (5-16ms jank) every frame during playback — the playhead just sets
	// `style.left` directly on the DOM element, which is <0.1ms. The initial
	// position is set in the render for the first frame, then the rAF loop
	// takes over.

	// Compute the current playhead position (used for initial render + rAF).
	const updatePlayheadPosition = useCallback(() => {
		const el = playheadRef.current;
		if (!el) return;
		const time = editor.playback.getCurrentTime();
		const center = timelineTimeToSnappedPixels({ time, zoomLevel });
		const scrollLeft = tracksScrollRef.current?.scrollLeft ?? 0;
		const left =
			getCenteredLineLeft({ centerPixel: center }) -
			scrollLeft +
			TIMELINE_CONTENT_LEFT_INSET_PX;
		el.style.left = `${left}px`;
	}, [editor.playback, zoomLevel, tracksScrollRef, playheadRef]);

	// rAF loop to update playhead position directly on the DOM element.
	// Only runs during playback (enabled flag) — when paused, position
	// updates happen via the scroll listener and the initial render.
	const isPlaying = useEditor((e) => e.playback.getIsPlaying(), ["playback"]);
	useRafLoop(updatePlayheadPosition, isPlaying);

	// Update position on scroll (when paused, the rAF loop isn't running).
	useEffect(() => {
		const scrollEl = tracksScrollRef.current;
		if (!scrollEl) return;
		let rafId: number | null = null;
		const onScroll = () => {
			if (rafId !== null) return;
			rafId = requestAnimationFrame(() => {
				rafId = null;
				updatePlayheadPosition();
			});
		};
		scrollEl.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			scrollEl.removeEventListener("scroll", onScroll);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, [tracksScrollRef, updatePlayheadPosition]);

	// Also update when playback pauses (to catch the final position after
	// playback stops). zoomLevel changes are covered by updatePlayheadPosition's
	// own dependency array.
	// biome-ignore lint/correctness/useExhaustiveDependencies: isPlaying is intentionally included to trigger a position update when playback state changes (play→pause catches the final frame).
	useEffect(() => {
		updatePlayheadPosition();
	}, [isPlaying, updatePlayheadPosition]);

	// Initial position for first render (before rAF starts).
	const currentTime = editor.playback.getCurrentTime();
	const initialCenter = timelineTimeToSnappedPixels({
		time: currentTime,
		zoomLevel,
	});
	const initialScrollLeft = tracksScrollRef.current?.scrollLeft ?? 0;
	const initialLeft =
		getCenteredLineLeft({ centerPixel: initialCenter }) -
		initialScrollLeft +
		TIMELINE_CONTENT_LEFT_INSET_PX;

	const handlePlayheadKeyDown = (
		event: React.KeyboardEvent<HTMLDivElement>,
	) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

		event.preventDefault();
		const fps = editor.project.getActive().settings.fps;
		const ticksPerFrame = Math.round(
			(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
		);
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const now = editor.playback.getCurrentTime();
		const nextTime = Math.max(
			0,
			Math.min(duration, now + direction * ticksPerFrame),
		);

		editor.playback.seek({ time: nextTime });
	};

	return (
		<div
			ref={playheadRef}
			role="slider"
			aria-label="Timeline playhead"
			aria-valuemin={0}
			aria-valuemax={duration}
			aria-valuenow={currentTime}
			tabIndex={0}
			className="pointer-events-none absolute"
			style={{
				left: `${initialLeft}px`,
				top: 0,
				height: `${totalHeight}px`,
				width: `${TIMELINE_INDICATOR_LINE_WIDTH_PX}px`,
				zIndex: TIMELINE_LAYERS.playhead,
			}}
			onKeyDown={handlePlayheadKeyDown}
		>
			<div
				className="pointer-events-none absolute left-0 h-full w-0.5"
				style={
					hasSelectedKeyframe
						? { transform: `translateX(${PLAYHEAD_KEYFRAME_NUDGE_PX}px)` }
						: undefined
				}
			>
				<div className="bg-primary h-full w-full" />

				<button
					type="button"
					aria-label="Drag playhead (click to show time)"
					className={`pointer-events-auto absolute top-1 left-1/2 h-4 w-2.5 -translate-x-1/2 cursor-col-resize rounded-[6px] border shadow-sm transition-colors ${isSnappingToPlayhead ? "border-gray-300 bg-white" : "border-gray-300 bg-white"}`}
					onMouseDown={handleHandleMouseDown}
				/>

				{showTimeBubble && (
					<div
						className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] font-medium text-black shadow-lg"
						style={{
							// Asymmetric "ticket" corners: sharp top-right + bottom-left,
							// rounded top-left + bottom-right.
							borderRadius: "8px 0 8px 0",
						}}
					>
						{formatPlayheadTime({ ticks: bubbleTicks, fps: fpsFloat })}
					</div>
				)}
			</div>
		</div>
	);
}
