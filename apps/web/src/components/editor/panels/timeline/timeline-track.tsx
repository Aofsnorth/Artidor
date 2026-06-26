"use client";

import { useCallback } from "react";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { MemoizedTimelineElement as TimelineElement } from "./timeline-element";
import type { TimelineTrack } from "@/lib/timeline";
import type { TimelineElement as TimelineElementType } from "@/lib/timeline";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import { TIMELINE_LAYERS } from "./layers";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import type { ElementDragState } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";

interface TimelineTrackContentProps {
	track: TimelineTrack;
	zoomLevel: number;
	dragState: ElementDragState;
	rulerScrollRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	lastMouseXRef: React.RefObject<number>;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
	onElementMouseDown: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
	}) => void;
	onElementClick: (params: {
		event: React.MouseEvent;
		element: TimelineElementType;
		track: TimelineTrack;
	}) => void;
	onTrackMouseDown?: (event: React.MouseEvent) => void;
	onTrackMouseUp?: (event: React.MouseEvent) => void;
	shouldIgnoreClick?: () => boolean;
	targetElementId?: string | null;
}

export function TimelineTrackContent({
	track,
	zoomLevel,
	dragState,
	rulerScrollRef,
	tracksScrollRef,
	lastMouseXRef,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	targetElementId = null,
}: TimelineTrackContentProps) {
	const { isElementSelected } = useElementSelection();
	const duration = useEditor((e) => e.timeline.getTotalDuration());

	// Stabilize callbacks per-track so React.memo on TimelineElement
	// can skip re-renders when only unrelated elements change.
	const handleElementMouseDown = useCallback(
		(event: React.MouseEvent, element: TimelineElementType) =>
			onElementMouseDown({ event, element, track }),
		[onElementMouseDown, track],
	);
	const handleElementClick = useCallback(
		(event: React.MouseEvent, element: TimelineElementType) =>
			onElementClick({ event, element, track }),
		[onElementClick, track],
	);

	useEdgeAutoScroll({
		isActive: dragState.isDragging,
		getMouseClientX: () => lastMouseXRef.current ?? 0,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth: duration * BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel,
	});

	const hasDraggedElement = track.elements.some((element) =>
		dragState.dragElementIds.includes(element.id),
	);

	return (
		<div className="relative size-full overflow-hidden rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] bg-[length:48px_100%,100%_100%]">
			<button
				type="button"
				// `tabIndex={-1}` keeps the track button out of the tab
				// order and prevents it from being focused on click. Without
				// this, clicking the main track would leave the button
				// focused, and the browser's synthesised `click` on Space
				// would race against the global keybinding handler and
				// hijack the "toggle play" intent (the user would then have
				// to click the timeline area first before Space worked).
				tabIndex={-1}
				className="absolute inset-0 m-0 size-full appearance-none border-0 bg-transparent p-0"
				aria-label={`Select ${track.name} track`}
				onMouseUp={(event) => {
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: empty track area is a pointer-only seek surface */}
			<div
				className="relative h-full min-w-full"
				style={{ zIndex: hasDraggedElement ? TIMELINE_LAYERS.dragLine + 2 : TIMELINE_LAYERS.trackContent }}
				onMouseUp={(event) => {
					if (event.target !== event.currentTarget) return;
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					if (event.target !== event.currentTarget) return;
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			>
				{track.elements.length === 0 ? (
					<div className="pointer-events-none h-full w-full rounded-lg border border-dashed border-white/[0.08] bg-black/[0.12]">
						{/* Pin the label to the visible scroll viewport (sticky left-0
						    + width = scroller clientWidth) so it stays centered on
						    screen regardless of zoom/scroll, instead of drifting with
						    the full timeline width.
						    ponytail: viewport width read from the ref at render — no
						    ResizeObserver. Add one if panel-resize centering drifts. */}
						<div
							className="sticky left-0 flex h-full items-center justify-center text-[0.62rem] uppercase tracking-[0.18em] text-white/18"
							style={{ width: tracksScrollRef.current?.clientWidth ?? "100%" }}
						>
							Drop media
						</div>
					</div>
				) : (
					track.elements.map((element) => {
						const isSelected = isElementSelected({
							trackId: track.id,
							elementId: element.id,
						});

						return (
							<TimelineElement
								key={element.id}
								element={element}
								track={track}
								zoomLevel={zoomLevel}
								isSelected={isSelected}
								onSnapPointChange={onSnapPointChange}
								onResizeStateChange={onResizeStateChange}
								onElementMouseDown={handleElementMouseDown}
								onElementClick={handleElementClick}
								dragState={dragState}
								isDropTarget={element.id === targetElementId}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}
