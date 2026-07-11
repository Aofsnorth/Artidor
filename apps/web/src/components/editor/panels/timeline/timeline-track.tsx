"use client";

import { memo, useCallback, useMemo } from "react";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { MemoizedTimelineElement as TimelineElement } from "./timeline-element";
import type { TimelineTrack } from "@/lib/timeline";
import type { TimelineElement as TimelineElementType } from "@/lib/timeline";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import { TIMELINE_LAYERS } from "./layers";
import type { ElementDragState } from "@/lib/timeline";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { timelineTimeToSnappedPixels } from "@/lib/timeline/pixel-utils";
import { shouldMountTimelineElement } from "./timeline-element-cull";
import { Plus } from "lucide-react";

export const HORIZONTAL_OVERSCAN_PX = 600;

const TRANSITION_ADJACENCY_TOLERANCE_TICKS = 2;

interface TimelineTrackContentProps {
	track: TimelineTrack;
	zoomLevel: number;
	dragState: ElementDragState;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	scrollWindow: { left: number; right: number };
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

function TimelineTrackContentInner({
	track,
	zoomLevel,
	dragState,
	tracksScrollRef,
	scrollWindow,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	targetElementId = null,
}: TimelineTrackContentProps) {
	const { isElementSelected, setElementSelection } = useElementSelection();
	const setActiveTab = useAssetsPanelStore((state) => state.setActiveTab);
	const transitionPairs = useMemo(() => {
		if (
			track.type === "audio" ||
			track.type === "effect" ||
			track.type === "camera"
		) {
			return [];
		}

		const sortedElements = [...track.elements].sort(
			(a, b) => a.startTime - b.startTime,
		);
		const pairs: Array<{
			from: TimelineElementType;
			to: TimelineElementType;
			at: number;
		}> = [];

		for (let index = 0; index < sortedElements.length - 1; index += 1) {
			const from = sortedElements[index];
			const to = sortedElements[index + 1];
			if (!from || !to) continue;

			const fromEnd = from.startTime + from.duration;
			if (
				Math.abs(fromEnd - to.startTime) <= TRANSITION_ADJACENCY_TOLERANCE_TICKS
			) {
				pairs.push({ from, to, at: to.startTime });
			}
		}

		return pairs;
	}, [track.elements, track.type]);

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

	// Horizontal scroll window is computed once by the parent
	// (TimelineTrackRows) and shared with every track so each row no
	// longer mounts its own scroll listener and rAF state.

	const hasDraggedElement = track.elements.some((element) =>
		dragState.dragElementIds.includes(element.id),
	);

	return (
		<div className="relative size-full overflow-hidden rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] bg-size-[48px_100%,100%_100%]">
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
				style={{
					zIndex: hasDraggedElement
						? TIMELINE_LAYERS.dragLine + 2
						: TIMELINE_LAYERS.trackContent,
				}}
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
					<div className="pointer-events-none h-full w-full rounded-lg border border-dashed border-white/8 bg-black/12">
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

						// Element-level horizontal cull: while not dragging, skip
						// mounting clips fully outside the visible scroll window.
						// This keeps every timeline re-render O(visible) instead of
						// O(total clips) for long projects. During a drag we mount
						// everything so cross-track drops and the dragged clip
						// itself stay live.
						if (
							!dragState.isDragging &&
							!shouldMountTimelineElement({
								elementId: element.id,
								startTime: element.startTime,
								duration: element.duration,
								zoomLevel,
								windowLeft: scrollWindow.left,
								windowRight: scrollWindow.right,
								isSelected,
							})
						) {
							return null;
						}

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
				{transitionPairs.map((pair) => {
					const left = timelineTimeToSnappedPixels({
						time: pair.at,
						zoomLevel,
					});

					return (
						<button
							key={`${pair.from.id}-${pair.to.id}`}
							type="button"
							className="absolute top-1/2 z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-300/70 bg-cyan-400/90 text-black shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_12px_rgba(34,211,238,0.55)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-cyan-200"
							style={{ left: `${left}px` }}
							aria-label={`Add transition between ${pair.from.name} and ${pair.to.name}`}
							title="Add transition"
							onMouseDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
							onClick={(event) => {
								event.stopPropagation();
								setElementSelection({
									elements: [
										{ trackId: track.id, elementId: pair.from.id },
										{ trackId: track.id, elementId: pair.to.id },
									],
								});
								setActiveTab("transitions");
							}}
						>
							<Plus className="size-3.5" aria-hidden="true" />
						</button>
					);
				})}
			</div>
		</div>
	);
}

function timelineTrackContentAreEqual(
	prev: TimelineTrackContentProps,
	next: TimelineTrackContentProps,
): boolean {
	if (prev.track !== next.track) return false;
	if (prev.zoomLevel !== next.zoomLevel) return false;
	if (prev.tracksScrollRef !== next.tracksScrollRef) return false;
	if (prev.scrollWindow !== next.scrollWindow) {
		if (
			prev.scrollWindow.left !== next.scrollWindow.left ||
			prev.scrollWindow.right !== next.scrollWindow.right
		) {
			return false;
		}
	}
	if (prev.dragState !== next.dragState) {
		if (
			prev.dragState.isDragging !== next.dragState.isDragging ||
			prev.dragState.dragElementIds !== next.dragState.dragElementIds
		) {
			return false;
		}
	}
	if (prev.onSnapPointChange !== next.onSnapPointChange) return false;
	if (prev.onResizeStateChange !== next.onResizeStateChange) return false;
	if (prev.onElementMouseDown !== next.onElementMouseDown) return false;
	if (prev.onElementClick !== next.onElementClick) return false;
	if (prev.onTrackMouseDown !== next.onTrackMouseDown) return false;
	if (prev.onTrackMouseUp !== next.onTrackMouseUp) return false;
	if (prev.shouldIgnoreClick !== next.shouldIgnoreClick) return false;
	if (prev.targetElementId !== next.targetElementId) return false;
	return true;
}

export const TimelineTrackContent = memo(
	TimelineTrackContentInner,
	timelineTrackContentAreEqual,
);
