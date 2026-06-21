"use client";

import { useRef } from "react";
import {
	getCenteredLineLeft,
	TIMELINE_INDICATOR_LINE_WIDTH_PX,
	timelineTimeToSnappedPixels,
} from "@/lib/timeline";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { useKeyframeSelection } from "@/hooks/timeline/element/use-keyframe-selection";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { useEditor } from "@/hooks/use-editor";
import { TIMELINE_SCROLLBAR_SIZE_PX, TIMELINE_CONTENT_LEFT_INSET_PX } from "./layout";
import { TIMELINE_LAYERS } from "./layers";

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

	const { handlePlayheadMouseDown } = useTimelinePlayhead({
		zoomLevel,
		rulerRef,
		rulerScrollRef,
		tracksScrollRef,
		playheadRef,
	});

	const timelineContainerHeight =
		timelineRef.current?.clientHeight ??
		tracksScrollRef.current?.clientHeight ??
		400;
	const totalHeight = Math.max(
		0,
		timelineContainerHeight -
			(hasHorizontalScrollbar ? TIMELINE_SCROLLBAR_SIZE_PX - 5 : 0),
	);

	const currentTime = editor.playback.getCurrentTime();
	const centerPosition = timelineTimeToSnappedPixels({
		time: currentTime,
		zoomLevel,
	});
	const scrollLeft = tracksScrollRef.current?.scrollLeft ?? 0;
	const leftPosition =
		getCenteredLineLeft({ centerPixel: centerPosition }) -
		scrollLeft +
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
				left: `${leftPosition}px`,
				top: 0,
				height: `${totalHeight}px`,
				width: `${TIMELINE_INDICATOR_LINE_WIDTH_PX}px`,
				zIndex: TIMELINE_LAYERS.playhead,
			}}
			onKeyDown={handlePlayheadKeyDown}
		>
			<div
				className="bg-primary pointer-events-none absolute left-0 h-full w-0.5"
				style={
					hasSelectedKeyframe
						? { transform: `translateX(${PLAYHEAD_KEYFRAME_NUDGE_PX}px)` }
						: undefined
				}
			/>

			<button
				type="button"
				aria-label="Drag playhead"
				className={`pointer-events-auto absolute top-1 left-1/2 size-3.5 -translate-x-1/2 transform cursor-col-resize rounded-full border-2 shadow-xs ${isSnappingToPlayhead ? "bg-primary border-primary" : "bg-primary border-primary/50"}`}
				onMouseDown={handlePlayheadMouseDown}
			/>
		</div>
	);
}
