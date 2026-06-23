"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Camera01Icon,
	Delete02Icon,
	Image01Icon,
	MagicWand05Icon,
	MusicNote03Icon,
	RefreshIcon,
	TaskAdd02Icon,
	TextIcon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { OcShapesIcon, OcVideoIcon } from "@/components/icons";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTimelineZoom } from "@/hooks/timeline/use-timeline-zoom";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { ElementDragState, DropTarget } from "@/lib/timeline";
import { TimelineTrackContent } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { SelectionBox } from "@/lib/selection/selection-box";
import { useBoxSelect } from "@/lib/selection/hooks/use-box-select";
import { SnapIndicator } from "./snap-indicator";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import type { TimelineTrack } from "@/lib/timeline";
import {
	TIMELINE_SCROLLBAR_SIZE_PX,
	TIMELINE_CONTENT_TOP_PADDING_PX,
	TIMELINE_CONTENT_LEFT_INSET_PX,
	TIMELINE_TRACK_GAP_PX,
	KEYFRAME_LANE_HEIGHT_PX,
} from "./layout";
import { usePanelStore } from "@/stores/panel-store";
import { useElementInteraction } from "@/hooks/timeline/element/use-element-interaction";
import {
	canTrackHaveAudio,
	canTrackBeHidden,
	getTimelineZoomMin,
	getTimelinePaddingPx,
} from "@/lib/timeline";
import { timelineTimeToPixels } from "@/lib/timeline/pixel-utils";
import {
	getTrackHeight,
	getCumulativeHeightBefore,
	getTotalTracksHeight,
} from "./track-layout";
import {
	SELECTED_TRACK_ROW_CLASS,
	getTrackTypeAccent,
	TRACK_COLOR_PRESETS,
} from "./theme";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";

function TrackNameInput({ track }: { track: TimelineTrack }) {
	const editor = useEditor();
	const [isEditing, setIsEditing] = useState(false);
	const [value, setValue] = useState(track.name);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!isEditing) {
			setValue(track.name);
		}
	}, [track.name, isEditing]);

	const save = () => {
		setIsEditing(false);
		if (value.trim() && value !== track.name) {
			editor.timeline.updateTrack({
				trackId: track.id,
				updates: { name: value.trim() },
			});
		} else {
			setValue(track.name);
		}
	};

	if (!isEditing) {
		return (
			<button
				type="button"
				className="min-w-0 cursor-text truncate border-0 bg-transparent p-0 text-left text-[0.68rem] font-semibold text-white/78 transition hover:text-white"
				title={track.name}
				onClick={(e) => e.stopPropagation()}
				onDoubleClick={(e) => {
					e.stopPropagation();
					setIsEditing(true);
					setTimeout(() => inputRef.current?.focus(), 0);
				}}
			>
				{track.name}
			</button>
		);
	}

	return (
		<input
			ref={inputRef}
			className="min-w-0 rounded bg-black/25 px-1 text-[0.68rem] font-semibold text-white outline-none ring-1 ring-white/20"
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onBlur={save}
			onKeyDown={(e) => {
				if (e.key === "Enter") save();
				if (e.key === "Escape") {
					setValue(track.name);
					setIsEditing(false);
				}
			}}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
		/>
	);
}

function TrackColorPicker({ track }: { track: TimelineTrack }) {
	const editor = useEditor();
	const accent = getTrackTypeAccent({
		type: track.type,
		customColor: track.color,
	});

	const handleColorSelect = (color: string) => {
		editor.timeline.updateTrack({
			trackId: track.id,
			updates: { color },
		});
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="size-2.5 shrink-0 rounded-full ring-1 ring-white/15 transition-transform hover:scale-125 focus:outline-none"
					style={{ backgroundColor: accent.accent }}
					title="Change track color"
					onClick={(e) => e.stopPropagation()}
				/>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="start"
				sideOffset={6}
				className="w-auto rounded-lg border border-white/10 bg-[#1a1a1e] p-2 shadow-2xl"
			>
				<div className="flex flex-col gap-1.5">
					<span className="px-0.5 text-[0.58rem] uppercase tracking-widest text-white/35">
						Track color
					</span>
					<div className="flex flex-wrap gap-1.5">
						{TRACK_COLOR_PRESETS.map((color) => {
							const isSelected =
								track.color === color || (!track.color && color === "#ffffff");
							return (
								<button
									key={color}
									type="button"
									className={cn(
										"size-5 rounded-full ring-1 ring-white/15 transition-all hover:scale-110 hover:ring-white/40 focus:outline-none",
										isSelected && "ring-2 ring-white/80 scale-110",
									)}
									style={{ backgroundColor: color }}
									title={color === "#ffffff" ? "Reset to default" : color}
									onClick={(e) => {
										e.stopPropagation();
										handleColorSelect(color);
									}}
								/>
							);
						})}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

import {
	computeTrackExpansionHeight,
	getTrackExpandedRows,
	getPropertyLabel,
	type ExpandedRow,
} from "./expanded-layout";
import { TIMELINE_HORIZONTAL_WHEEL_STEP_PX } from "./interaction";
import { TimelineToolbar } from "./timeline-toolbar";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useTimelineSeek } from "@/hooks/timeline/use-timeline-seek";
import { useTimelineDragDrop } from "@/hooks/timeline/use-timeline-drag-drop";
import { TimelineRuler } from "./timeline-ruler";
import { TimelineBookmarksRow } from "./bookmarks";
import { useBookmarkDrag } from "@/hooks/timeline/use-bookmark-drag";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import { useInitialScrollBottom } from "@/hooks/timeline/use-initial-scroll-bottom";
import { useTimelineStore } from "@/stores/timeline-store";
import { useEditor } from "@/hooks/use-editor";
import { useTimelinePlayhead } from "@/hooks/timeline/use-timeline-playhead";
import { DragLine } from "./drag-line";
import { TIMELINE_LAYERS } from "./layers";
import { invokeAction } from "@/lib/actions";
import { resolveTimelineElementIntersections } from "./selection-hit-testing";
import { cn } from "@/utils/ui";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const TRACKS_CONTAINER_MAX_HEIGHT = 800;
const FALLBACK_CONTAINER_WIDTH = 1000;
const TRACKS_CONTAINER_HEIGHT = { min: 0, max: TRACKS_CONTAINER_MAX_HEIGHT };
const TRACK_ICONS: Record<TimelineTrack["type"], ReactNode> = {
	video: <OcVideoIcon className="text-muted-foreground size-4 shrink-0" />,
	text: (
		<HugeiconsIcon
			icon={TextIcon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	audio: (
		<HugeiconsIcon
			icon={MusicNote03Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	graphic: <OcShapesIcon className="text-muted-foreground size-4 shrink-0" />,
	effect: (
		<HugeiconsIcon
			icon={MagicWand05Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	image: (
		<HugeiconsIcon
			icon={Image01Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
	camera: (
		<HugeiconsIcon
			icon={Camera01Icon}
			className="text-muted-foreground size-4 shrink-0"
		/>
	),
};

export function Timeline() {
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const {
		selectedElements,
		clearElementSelection,
		setElementSelection,
		mergeElementsIntoSelection,
	} = useElementSelection();
	const editor = useEditor();
	const timeline = editor.timeline;
	const scene = useEditor((currentEditor) =>
		currentEditor.scenes.getActiveSceneOrNull(),
	);
	const tracks = useMemo<TimelineTrack[]>(
		() =>
			scene
				? [...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio]
				: [],
		[scene],
	);
	const mainTrackId = scene?.tracks.main.id ?? null;
	const seek = (time: number) => editor.playback.seek({ time });

	const timelineRef = useRef<HTMLDivElement>(null);
	const timelineHeaderRef = useRef<HTMLDivElement>(null);
	const rulerRef = useRef<HTMLDivElement>(null);
	const rulerScrollRef = useRef<HTMLDivElement>(null);
	const tracksContainerRef = useRef<HTMLDivElement>(null);
	const tracksScrollRef = useRef<HTMLDivElement>(null);
	const trackLabelsRef = useRef<HTMLDivElement>(null);
	const playheadRef = useRef<HTMLDivElement>(null);
	const trackLabelsScrollRef = useRef<HTMLDivElement>(null);

	const [isResizing, setIsResizing] = useState(false);
	const [currentSnapPoint, setCurrentSnapPoint] = useState<SnapPoint | null>(
		null,
	);

	const handleSnapPointChange = useCallback((snapPoint: SnapPoint | null) => {
		setCurrentSnapPoint(snapPoint);
	}, []);
	const handleResizeStateChange = useCallback(
		({ isResizing: nextIsResizing }: { isResizing: boolean }) => {
			setIsResizing(nextIsResizing);
			if (!nextIsResizing) {
				setCurrentSnapPoint(null);
			}
		},
		[],
	);

	const timelineDuration = timeline.getTotalDuration() || 0;
	const minZoomLevel = getTimelineZoomMin({
		duration: timelineDuration,
		containerWidth: tracksContainerRef.current?.clientWidth,
	});

	const savedViewState = editor.project.getTimelineViewState();

	const { zoomLevel, setZoomLevel, handleWheel, saveScrollPosition } =
		useTimelineZoom({
			containerRef: timelineRef,
			minZoom: minZoomLevel,
			initialZoom: savedViewState?.zoomLevel,
			initialScrollLeft: savedViewState?.scrollLeft,
			initialPlayheadTime: savedViewState?.playheadTime,
			tracksScrollRef,
			rulerScrollRef,
		});

	// Listen for the `timeline-fit-to-screen` window event dispatched
	// by the toolbar's `fit-to-screen` action. The event lives in
	// window scope (rather than the store) because fitting requires
	// the live viewport width from `tracksContainerRef`, which is
	// scoped to this component. We compute the zoom that makes the
	// total duration just fit the visible width and re-apply it,
	// with a 10% headroom so the last clip doesn't sit flush against
	// the right edge of the panel.
	//
	// This effect must come *after* `useTimelineZoom` because the
	// effect closure captures `setZoomLevel`; declaring it earlier
	// triggers a temporal dead zone error at render time.
	useEffect(() => {
		const handler = () => {
			const viewportWidth = tracksContainerRef.current?.clientWidth;
			if (!viewportWidth) return;
			const fitZoom = getTimelineZoomMin({
				duration: timeline.getTotalDuration() || 0,
				containerWidth: viewportWidth,
			});
			setZoomLevel(Math.max(minZoomLevel, fitZoom * 0.9));
			toast.success("Timeline fit to view", { id: "fit-to-screen" });
		};
		window.addEventListener("timeline-fit-to-screen", handler);
		return () => window.removeEventListener("timeline-fit-to-screen", handler);
		// We intentionally don't depend on `minZoomLevel` here — using
		// its current value in the closure would force a re-bind every
		// time the duration changes, which is fine for correctness but
		// adds churn. The handler reads the live ref value instead.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeline, setZoomLevel, minZoomLevel]);

	const expandedElementIds = useTimelineStore((s) => s.expandedElementIds);

	const getTrackExpansionHeight = useCallback(
		(trackIndex: number) => {
			const track = tracks[trackIndex];
			if (!track) return 0;
			return computeTrackExpansionHeight({ track, expandedElementIds });
		},
		[tracks, expandedElementIds],
	);

	// `setZoomLevel`, `saveScrollPosition`, and `minZoomLevel` are
	// now stable (see `useTimelineZoom` which memoises its return
	// object), so we can use them directly inside the wheel/fit-to-screen
	// effects below without ref-syncing. The previous 3 ref-sync
	// `useEffect`s were a workaround for unstable callbacks and
	// caused an extra render every time the deps changed.

	// Pushes tracks scroll position to the two overflow:hidden followers
	// (ruler and track labels). Called from the wheel handler (before paint,
	// zero lag) and from onScroll on the tracks area (covers scrollbar drag).
	const syncFollowers = useCallback(() => {
		const tracks = tracksScrollRef.current;
		if (!tracks) return;
		if (rulerScrollRef.current) {
			rulerScrollRef.current.scrollLeft = tracks.scrollLeft;
		}
		if (trackLabelsScrollRef.current) {
			trackLabelsScrollRef.current.scrollTop = tracks.scrollTop;
		}
	}, []);

	// Single non-passive capture listener owns all wheel input. Prevents any
	// native scroll or browser zoom from firing inside the timeline.
	useEffect(() => {
		const container = timelineRef.current;
		if (!container) return;

		let pendingZoomDelta = 0;
		let zoomRafId: ReturnType<typeof requestAnimationFrame> | null = null;

		const onWheel = (e: WheelEvent) => {
			const isZoom = e.ctrlKey || e.metaKey;

			if (isZoom) {
				e.preventDefault();
				const normalizedDelta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
				pendingZoomDelta += normalizedDelta;

				if (zoomRafId === null) {
					zoomRafId = requestAnimationFrame(() => {
						const frameRawDelta = pendingZoomDelta;
						const cappedDelta =
							Math.sign(frameRawDelta) * Math.min(Math.abs(frameRawDelta), 30);
						const zoomFactor = Math.exp(-cappedDelta / 300);
						setZoomLevel((prev) => prev * zoomFactor);
						pendingZoomDelta = 0;
						zoomRafId = null;
					});
				}
				return;
			}

			const tracks = tracksScrollRef.current;
			if (!tracks) return;

			const isHorizontal =
				e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

			e.preventDefault();

			if (isHorizontal) {
				const raw =
					Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
				const clamped =
					Math.sign(raw) *
					Math.min(Math.abs(raw), TIMELINE_HORIZONTAL_WHEEL_STEP_PX);
				tracks.scrollLeft = Math.max(0, tracks.scrollLeft + clamped);
			} else {
				tracks.scrollTop = Math.max(0, tracks.scrollTop + e.deltaY);
			}

			syncFollowers();
			saveScrollPosition();
		};

		container.addEventListener("wheel", onWheel, {
			passive: false,
			capture: true,
		});
		return () => {
			container.removeEventListener("wheel", onWheel, { capture: true });
			if (zoomRafId !== null) cancelAnimationFrame(zoomRafId);
		};
	}, [syncFollowers, saveScrollPosition, setZoomLevel]);

	useInitialScrollBottom({
		tracksScrollRef,
		trackLabelsScrollRef,
		onAfterScroll: () => saveScrollPosition(),
		isReady: tracks.length > 0,
	});

	const {
		dragState,
		dragDropTarget,
		handleElementMouseDown,
		handleElementClick,
		lastMouseXRef,
	} = useElementInteraction({
		zoomLevel,
		timelineRef,
		tracksContainerRef,
		tracksScrollRef,
		snappingEnabled,
		onSnapPointChange: handleSnapPointChange,
	});

	const {
		dragState: bookmarkDragState,
		handleBookmarkMouseDown,
		lastMouseXRef: bookmarkLastMouseXRef,
	} = useBookmarkDrag({
		zoomLevel,
		scrollRef: tracksScrollRef,
		snappingEnabled,
		onSnapPointChange: handleSnapPointChange,
	});

	const { handleRulerMouseDown: handlePlayheadRulerMouseDown } =
		useTimelinePlayhead({
			zoomLevel,
			rulerRef,
			rulerScrollRef,
			tracksScrollRef,
			playheadRef,
		});

	const { isDragOver, dropTarget, dragElementType, dragProps } =
		useTimelineDragDrop({
			containerRef: tracksContainerRef,
			tracksScrollRef,
			zoomLevel,
		});

	const {
		selectionBox,
		handleMouseDown: handleSelectionMouseDown,
		isSelecting,
		shouldIgnoreClick,
	} = useBoxSelect({
		containerRef: tracksContainerRef,
		selectedIds: selectedElements,
		anchorId: null,
		getIsAdditiveSelection: (event) =>
			event.shiftKey || event.ctrlKey || event.metaKey,
		resolveIntersections: ({ startPos, currentPos }) => {
			if (!tracksContainerRef.current) {
				return [];
			}

			return resolveTimelineElementIntersections({
				container: tracksContainerRef.current,
				scrollContainer: tracksScrollRef.current,
				tracks,
				zoomLevel,
				startPos,
				currentPos,
			});
		},
		onSelectionChange: ({ intersectedIds, isAdditive }) => {
			if (isAdditive) {
				mergeElementsIntoSelection({ elements: intersectedIds });
			} else {
				setElementSelection({ elements: intersectedIds });
			}
		},
	});

	const containerWidth =
		tracksContainerRef.current?.clientWidth || FALLBACK_CONTAINER_WIDTH;
	const contentWidth = timelineTimeToPixels({
		time: timelineDuration,
		zoomLevel,
	});
	const paddingPx = getTimelinePaddingPx({
		containerWidth,
		zoomLevel,
		minZoom: minZoomLevel,
	});
	const dynamicTimelineWidth = Math.max(
		contentWidth + paddingPx,
		containerWidth,
	);
	const tracksViewportWidth =
		tracksScrollRef.current?.clientWidth ??
		tracksContainerRef.current?.clientWidth ??
		containerWidth;
	const hasHorizontalScrollbar = dynamicTimelineWidth > tracksViewportWidth;

	useEdgeAutoScroll({
		isActive: bookmarkDragState.isDragging,
		getMouseClientX: () => bookmarkLastMouseXRef.current,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth: dynamicTimelineWidth,
	});

	const showSnapIndicator =
		snappingEnabled &&
		currentSnapPoint !== null &&
		(dragState.isDragging || bookmarkDragState.isDragging || isResizing);

	const {
		handleTracksMouseDown,
		handleTracksClick,
		handleRulerMouseDown,
		handleRulerClick,
	} = useTimelineSeek({
		playheadRef,
		trackLabelsRef,
		rulerScrollRef,
		tracksScrollRef,
		zoomLevel,
		duration: timeline.getTotalDuration(),
		isSelecting,
		clearSelectedElements: clearElementSelection,
		seek,
	});

	const timelineHeaderHeight =
		(timelineHeaderRef.current?.getBoundingClientRect().height ?? 0) +
			TIMELINE_CONTENT_TOP_PADDING_PX || 0;

	return (
		<section
			className="panel glass-strong relative flex h-full flex-col overflow-hidden rounded-[2px] border border-white/10 bg-transparent"
			{...dragProps}
			aria-label="Timeline"
		>
			<TimelineToolbar
				zoomLevel={zoomLevel}
				minZoom={minZoomLevel}
				setZoomLevel={({ zoom }) => setZoomLevel(zoom)}
			/>

			<div
				className="relative flex flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.032)_0,transparent_1px)] bg-[length:100%_23px]"
				ref={timelineRef}
			>
				<TrackLabelsPanel
					trackLabelsRef={trackLabelsRef}
					trackLabelsScrollRef={trackLabelsScrollRef}
					timelineHeaderHeight={timelineHeaderHeight}
					hasHorizontalScrollbar={hasHorizontalScrollbar}
					getTrackExpansionHeight={getTrackExpansionHeight}
				/>

				<div
					className="relative isolate flex flex-1 flex-col overflow-hidden"
					ref={tracksContainerRef}
				>
					<SelectionBox
						startPos={selectionBox?.startPos || null}
						currentPos={selectionBox?.currentPos || null}
						containerRef={tracksContainerRef}
						isActive={selectionBox?.isActive || false}
					/>
					<DragLine
						dropTarget={dropTarget}
						tracks={tracks}
						isVisible={isDragOver && !dropTarget?.targetElement}
						headerHeight={timelineHeaderHeight}
						dragElementType={dragElementType}
					/>
					<DragLine
						dropTarget={dragDropTarget}
						tracks={tracks}
						isVisible={dragState.isDragging}
						headerHeight={timelineHeaderHeight}
					/>

					<div ref={rulerScrollRef} className="shrink-0 overflow-hidden">
						<div
							ref={timelineHeaderRef}
							className="flex flex-col"
							style={{
								width: `${dynamicTimelineWidth}px`,
								paddingLeft: `${TIMELINE_CONTENT_LEFT_INSET_PX}px`,
							}}
						>
							<TimelineRuler
								zoomLevel={zoomLevel}
								dynamicTimelineWidth={dynamicTimelineWidth}
								rulerRef={rulerRef}
								tracksScrollRef={rulerScrollRef}
								handleWheel={handleWheel}
								handleTimelineContentClick={handleRulerClick}
								handleRulerTrackingMouseDown={handleRulerMouseDown}
								handleRulerMouseDown={handlePlayheadRulerMouseDown}
							/>
							<TimelineBookmarksRow
								zoomLevel={zoomLevel}
								dynamicTimelineWidth={dynamicTimelineWidth}
								dragState={bookmarkDragState}
								onBookmarkMouseDown={handleBookmarkMouseDown}
								handleWheel={handleWheel}
								handleTimelineContentClick={handleRulerClick}
								handleRulerTrackingMouseDown={handleRulerMouseDown}
								handleRulerMouseDown={handlePlayheadRulerMouseDown}
							/>
						</div>
					</div>

					<ScrollArea
						className="flex-1"
						ref={tracksScrollRef}
						onScroll={() => {
							syncFollowers();
							saveScrollPosition();
						}}
					>
						<div
							className="flex min-h-full flex-col"
							style={{
								width: `${dynamicTimelineWidth}px`,
								paddingLeft: `${TIMELINE_CONTENT_LEFT_INSET_PX}px`,
							}}
						>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: canvas seek surface; keyboard seeking is handled by the global keybindings system */}
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: canvas seek surface; keyboard seeking is handled by the global keybindings system */}
							<div
								className="relative shrink-0"
								style={{
									height: `${
										Math.max(
											TRACKS_CONTAINER_HEIGHT.min,
											Math.min(
												TRACKS_CONTAINER_HEIGHT.max,
												getTotalTracksHeight({
													tracks,
													getExtraHeight: getTrackExpansionHeight,
												}),
											),
										) + TIMELINE_CONTENT_TOP_PADDING_PX
									}px`,
								}}
								onMouseDown={(event) => {
									const isDirectTarget = event.target === event.currentTarget;
									if (!isDirectTarget) return;
									event.stopPropagation();
									handleTracksMouseDown(event);
									handleSelectionMouseDown(event);
								}}
								onClick={(event) => {
									const isDirectTarget = event.target === event.currentTarget;
									if (!isDirectTarget) return;
									event.stopPropagation();
									handleTracksClick(event);
								}}
							>
								{tracks.length > 0 && (
									<TimelineTrackRows
										mainTrackId={mainTrackId}
										zoomLevel={zoomLevel}
										dragState={dragState}
										tracksScrollRef={tracksScrollRef}
										lastMouseXRef={lastMouseXRef}
										onSnapPointChange={handleSnapPointChange}
										onResizeStateChange={handleResizeStateChange}
										onElementMouseDown={handleElementMouseDown}
										onElementClick={handleElementClick}
										onTrackMouseDown={(event) => {
											handleSelectionMouseDown(event);
											handleTracksMouseDown(event);
										}}
										onTrackMouseUp={handleTracksClick}
										shouldIgnoreClick={shouldIgnoreClick}
										isDragOver={isDragOver}
										dropTarget={dropTarget}
									/>
								)}
							</div>
							<TimelineGutter
								onMouseDown={(event) => {
									handleTracksMouseDown(event);
									handleSelectionMouseDown(event);
								}}
								onClick={handleTracksClick}
							/>
						</div>
					</ScrollArea>

					<TimelinePlayhead
						zoomLevel={zoomLevel}
						hasHorizontalScrollbar={hasHorizontalScrollbar}
						rulerRef={rulerRef}
						rulerScrollRef={rulerScrollRef}
						tracksScrollRef={tracksScrollRef}
						timelineRef={timelineRef}
						playheadRef={playheadRef}
						isSnappingToPlayhead={
							showSnapIndicator && currentSnapPoint?.type === "playhead"
						}
					/>
				</div>
				<SnapIndicator
					snapPoint={currentSnapPoint}
					zoomLevel={zoomLevel}
					timelineRef={timelineRef}
					tracksScrollRef={tracksScrollRef}
					isVisible={showSnapIndicator}
				/>
			</div>
		</section>
	);
}

export function TimelineStatusFooter() {
	const project = useEditor((e) => e.project.getActive());
	const duration = useEditor((e) => e.timeline.getTotalDuration());
	const seconds = Math.max(0, Math.round(duration / TICKS_PER_SECOND));
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	const durationLabel = `${hours.toString().padStart(2, "0")}:${minutes
		.toString()
		.padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	const fps = project?.settings.fps
		? Math.round(
				project.settings.fps.numerator / project.settings.fps.denominator,
			)
		: 30;
	const canvas = project?.settings.canvasSize;
	const aspect = canvas ? formatCanvasAspect(canvas) : "16:9";

	return (
		<div className="flex h-7 shrink-0 items-center justify-between border-t border-white/10 bg-[#111112] px-3 text-[0.62rem] text-white/[0.42] z-20">
			<div className="font-medium text-white/60">
				Project duration: {durationLabel}
			</div>
			<div className="flex items-center gap-3">
				<span>{canvas?.height ?? 1080}p</span>
				<span>{fps}fps</span>
				<span>{aspect}</span>
				<span>Stereo</span>
			</div>
		</div>
	);
}

function formatCanvasAspect({
	width,
	height,
}: {
	width: number;
	height: number;
}): string {
	const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
	const divisor = gcd(width, height) || 1;
	return `${width / divisor}:${height / divisor}`;
}

const _ADD_TRACK_OPTIONS: Array<{
	label: string;
	type: TimelineTrack["type"];
}> = [
	{ label: "Video track", type: "video" },
	{ label: "Text track", type: "text" },
	{ label: "Audio track", type: "audio" },
	{ label: "Effect track", type: "effect" },
];

function TrackLabelsPanel({
	trackLabelsRef,
	trackLabelsScrollRef,
	timelineHeaderHeight,
	hasHorizontalScrollbar,
	getTrackExpansionHeight,
}: {
	trackLabelsRef: React.RefObject<HTMLDivElement | null>;
	trackLabelsScrollRef: React.RefObject<HTMLDivElement | null>;
	timelineHeaderHeight: number;
	hasHorizontalScrollbar: boolean;
	getTrackExpansionHeight: (trackIndex: number) => number;
}) {
	// Pull the resizable labels-column width from the panel store. The
	// value is persisted, clamped, and also used by the snap indicator
	// hook so all timeline surfaces agree on the offset.
	const trackLabelsWidth = usePanelStore((s) => s.trackLabelsWidth);
	const setTrackLabelsWidth = usePanelStore((s) => s.setTrackLabelsWidth);
	const resetTrackLabelsWidth = usePanelStore((s) => s.resetTrackLabelsWidth);
	const editor = useEditor();
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const mainTrackId = scene?.tracks.main.id ?? null;
	const tracks = useMemo<TimelineTrack[]>(
		() =>
			scene
				? [...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio]
				: [],
		[scene],
	);
	const { selectedElements } = useElementSelection();
	const tracksWithSelection = useMemo(
		() => new Set(selectedElements.map((el) => el.trackId)),
		[selectedElements],
	);

	const expandedElementIds = useTimelineStore((s) => s.expandedElementIds);
	const trackExpandedRowsMap = useMemo(
		() =>
			tracks.map((track) =>
				getTrackExpandedRows({ track, expandedElementIds }),
			),
		[tracks, expandedElementIds],
	);

	// Redesign fields
	const lockedTrackIds = useTimelineStore((s) => s.lockedTrackIds);
	const toggleTrackLock = useTimelineStore((s) => s.toggleTrackLock);
	const trackSliders = useTimelineStore((s) => s.trackSliders);
	const setTrackSlider = useTimelineStore((s) => s.setTrackSlider);
	const trackOpacity = useTimelineStore((s) => s.trackOpacity);
	const setTrackOpacity = useTimelineStore((s) => s.setTrackOpacity);
	// Per-track row height overrides. Read here so the track labels
	// column (rendered separately) can match the height of the actual
	// track row when the user has dragged it taller or shorter.
	const trackHeights = useTimelineStore((s) => s.trackHeights);
	const _resetTrackHeight = useTimelineStore((s) => s.resetTrackHeight);

	const trackPrefixes = useMemo(() => {
		if (!scene) return new Map<string, string>();
		const prefixes = new Map<string, string>();

		const overlayTracks = scene.tracks.overlay;
		const mainTrack = scene.tracks.main;

		let textCount = 0;
		let videoCount = 0;
		let cameraCount = 0;

		const allVisualTracks = [...overlayTracks, mainTrack];
		for (const t of allVisualTracks) {
			if (t.type === "text") textCount++;
			else if (t.type === "camera") cameraCount++;
			else videoCount++;
		}

		let textIdx = textCount;
		let videoIdx = videoCount;
		let cameraIdx = cameraCount;

		for (const t of overlayTracks) {
			if (t.type === "text") {
				prefixes.set(t.id, `T${textIdx--}`);
			} else if (t.type === "camera") {
				prefixes.set(t.id, `C${cameraIdx--}`);
			} else {
				prefixes.set(t.id, `V${videoIdx--}`);
			}
		}

		if (!prefixes.has(mainTrack.id)) {
			prefixes.set(mainTrack.id, `V1`);
		}

		let audioIdx = 1;
		for (const t of scene.tracks.audio) {
			prefixes.set(t.id, `A${audioIdx++}`);
		}

		return prefixes;
	}, [scene]);

	return (
		<div
			className="relative flex shrink-0 flex-col bg-[#0d0d0f] shadow-[inset_-18px_0_42px_rgba(0,0,0,0.22)]"
			style={{ width: `${trackLabelsWidth}px` }}
		>
			<TrackLabelsResizeHandle
				currentWidth={trackLabelsWidth}
				onResize={setTrackLabelsWidth}
				onDoubleClick={resetTrackLabelsWidth}
			/>
			<div
				className="flex shrink-0 items-end justify-between bg-linear-to-b from-white/[0.04] to-transparent px-3 pb-2 text-[0.62rem] uppercase tracking-[0.16em] text-white/35"
				style={{ height: timelineHeaderHeight || 48 }}
			>
				<span>Tracks</span>
			</div>
			<div ref={trackLabelsRef} className="flex-1 overflow-hidden">
				<div ref={trackLabelsScrollRef} className="size-full overflow-hidden">
					{tracks.length > 0 && (
						<div
							className="flex flex-col"
							style={{ gap: `${TIMELINE_TRACK_GAP_PX}px` }}
						>
							{tracks.map((track, index) => {
								const expandedRows = trackExpandedRowsMap[index];
								const baseHeight = getTrackHeight({
									type: track.type,
									overrideHeight: trackHeights[track.id],
								});
								const isLocked = lockedTrackIds.has(track.id);
								const _sliderValue = trackSliders[track.id] ?? 100;

								const isHidden =
									track.type === "audio" ? track.muted : track.hidden;
								const toggleVisibility = () => {
									if (track.type === "audio") {
										editor.timeline.toggleTrackMute({ trackId: track.id });
									} else {
										editor.timeline.toggleTrackVisibility({
											trackId: track.id,
										});
									}
								};

								const handleLockToggle = (e: React.MouseEvent) => {
									e.stopPropagation();
									toggleTrackLock(track.id);
								};

								const handleTrackDelete = (e: React.MouseEvent) => {
									e.stopPropagation();
									editor.timeline.removeTrack({ trackId: track.id });
								};

								const handleOpacityChange = (
									e: React.ChangeEvent<HTMLInputElement>,
								) => {
									const val = Number(e.target.value);
									setTrackOpacity(track.id, val);

									const newOpacity = val / 100;
									const trackElements = track.elements;
									if (trackElements && trackElements.length > 0) {
										const updates = trackElements.map((el) => ({
											trackId: track.id,
											elementId: el.id,
											patch: { opacity: newOpacity },
										}));
										editor.timeline.updateElements({
											updates,
											pushHistory: false,
										});
									}
								};

								const handleVolumeChange = (
									e: React.ChangeEvent<HTMLInputElement>,
								) => {
									const val = Number(e.target.value);
									setTrackSlider(track.id, val);

									const newVolume = val / 100;
									const trackElements = track.elements;
									if (trackElements && trackElements.length > 0) {
										const updates = trackElements.map((el) => ({
											trackId: track.id,
											elementId: el.id,
											patch: { volume: newVolume },
										}));
										editor.timeline.updateElements({
											updates,
											pushHistory: false,
										});
									}
								};

								const opacityValue = trackOpacity[track.id] ?? 100;
								const volumeValue = ["audio", "video", "main"].includes(
									track.type,
								)
									? (trackSliders[track.id] ?? 100)
									: null;

								const trackAccent = getTrackTypeAccent({
									type: track.type,
									customColor: track.color,
								});
								return (
									<div
										key={track.id}
										className={cn(
											"group relative mx-2 flex flex-col overflow-hidden rounded-xl border border-white/[0.05] bg-linear-to-br from-white/[0.045] via-white/[0.02] to-black/[0.18] shadow-[0_4px_18px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.035)] transition-[color,border-color,opacity] hover:border-white/[0.1]",
											tracksWithSelection.has(track.id) &&
												SELECTED_TRACK_ROW_CLASS,
											// Dim a hidden/muted lane so the eye-toggle has an
											// obvious effect in the label column at a glance.
											isHidden && "opacity-45",
										)}
										style={{
											height: `${baseHeight + getTrackExpansionHeight(index)}px`,
											borderColor: track.color
												? trackAccent.accentSoft
												: undefined,
										}}
									>
										{track.color ? (
											<div
												aria-hidden="true"
												className="pointer-events-none absolute inset-0 z-10 rounded-xl"
												style={{
													borderLeft: `3px solid ${trackAccent.accent}`,
												}}
											/>
										) : null}
										<div
											className={cn(
												"flex shrink-0 flex-col justify-center gap-1.5 border-b border-white/[0.045] px-3",
												isLocked && "opacity-70",
											)}
											style={{ height: `${baseHeight}px` }}
										>
											{/* Top row: Eye, Prefix + Name, Lock, Target */}
											<div className="flex w-full items-center justify-between gap-2">
												<div className="flex min-w-0 items-center gap-1.5 flex-1">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															toggleVisibility();
														}}
														className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-md text-white/42 transition hover:bg-white/[0.08] hover:text-white focus:outline-none"
														title={isHidden ? "Show track" : "Hide track"}
													>
														<HugeiconsIcon
															icon={isHidden ? ViewOffSlashIcon : ViewIcon}
															className="size-3.5"
														/>
													</button>
													<TrackColorPicker track={track} />
													<span className="w-6 shrink-0 select-none rounded-md border border-white/[0.08] bg-black/25 px-1 py-0.5 text-center text-[0.6rem] font-bold text-white/50">
														{trackPrefixes.get(track.id) || "V"}
													</span>
													<TrackNameInput track={track} />
												</div>
												<div className="flex shrink-0 items-center gap-1.5">
													<button
														type="button"
														onClick={handleLockToggle}
														className="grid size-5 shrink-0 cursor-pointer place-items-center rounded-md transition hover:bg-white/[0.08] focus:outline-none"
														title={isLocked ? "Unlock track" : "Lock track"}
													>
														{isLocked ? (
															<svg
																aria-hidden="true"
																className="size-3.5 text-white/80"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2.2"
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<rect
																	x="3"
																	y="11"
																	width="18"
																	height="11"
																	rx="2"
																	ry="2"
																	fill="currentColor"
																	fillOpacity="0.25"
																/>
																<path d="M7 11V7a5 5 0 0 1 10 0v4" />
															</svg>
														) : (
															<svg
																aria-hidden="true"
																className="size-3.5 text-white/25 hover:text-white/60 transition-colors"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2.2"
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<rect
																	x="3"
																	y="11"
																	width="18"
																	height="11"
																	rx="2"
																	ry="2"
																/>
																<path d="M7 11V7a5 5 0 0 1 9.9-1" />
															</svg>
														)}
													</button>
													<button
														type="button"
														onClick={handleTrackDelete}
														className={cn(
															"grid size-5 shrink-0 cursor-pointer place-items-center rounded-md text-white/25 transition hover:bg-red-500/15 hover:text-red-300 focus:outline-none",
															// The delete (X) button can't apply to the main
															// track — it's the implicit default lane and can't
															// be removed — so hide it there.
															track.id === mainTrackId && "hidden",
														)}
														title="Delete track"
													>
														<svg
															aria-hidden="true"
															className="size-3.5 transition"
															viewBox="0 0 24 24"
															fill="none"
															stroke="currentColor"
															strokeWidth="2.2"
															strokeLinecap="round"
															strokeLinejoin="round"
														>
															<path d="M6 6l12 12" />
															<path d="M18 6L6 18" />
														</svg>
													</button>
												</div>
											</div>
											{/* Bottom rows: Opacity (no fill) and optional Volume (with fill) */}
											<div className="flex flex-col gap-1 pl-[30px] pr-1 overflow-hidden">
												{/* Opacity slider — no fill line (not applicable to audio tracks) */}
												{track.type !== "audio" && (
													<div className="flex w-full items-center gap-2">
														<span className="text-[0.52rem] tabular-nums text-white/30 w-7 shrink-0">
															O
														</span>
														<input
															type="range"
															min="0"
															max="100"
															value={opacityValue}
															onChange={handleOpacityChange}
															disabled={isLocked}
															title={`Track opacity: ${opacityValue}%`}
															className="flex-1 min-w-0 h-px bg-white/10 appearance-none cursor-pointer accent-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 transition-all focus:outline-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:bg-transparent"
															style={{
																background: `linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) ${opacityValue}%, rgba(255,255,255,0.15) ${opacityValue}%, rgba(255,255,255,0.15) 100%)`,
															}}
														/>
														<span className="text-[0.52rem] tabular-nums text-white/30 w-6 shrink-0 text-right">
															{opacityValue}%
														</span>
													</div>
												)}
												{/* Volume slider — on audio, video, and main tracks, with fill line */}
												{["audio", "video", "main"].includes(track.type) &&
													volumeValue !== null && (
														<div className="flex w-full items-center gap-2">
															<span className="text-[0.52rem] tabular-nums text-white/30 w-7 shrink-0">
																V
															</span>
															<input
																type="range"
																min="0"
																max="100"
																value={volumeValue}
																onChange={handleVolumeChange}
																disabled={isLocked}
																title={`Track volume: ${volumeValue}%`}
																className="flex-1 min-w-0 h-px bg-white/10 appearance-none cursor-pointer accent-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 transition-all focus:outline-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:bg-transparent"
																style={{
																	background: `linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) ${volumeValue}%, rgba(255,255,255,0.15) ${volumeValue}%, rgba(255,255,255,0.15) 100%)`,
																}}
															/>
															<span className="text-[0.52rem] tabular-nums text-white/30 w-6 shrink-0 text-right">
																{volumeValue}%
															</span>
														</div>
													)}
											</div>
										</div>
										{expandedRows.length > 0 && (
											<PropertyTree rows={expandedRows} />
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
			<div className="shrink-0 px-2 py-1.5" />
			<div
				className="shrink-0 bg-black/35"
				style={{
					height: hasHorizontalScrollbar ? TIMELINE_SCROLLBAR_SIZE_PX : 0,
				}}
			/>
		</div>
	);
}

function TimelineTrackRows({
	mainTrackId,
	zoomLevel,
	dragState,
	tracksScrollRef,
	lastMouseXRef,
	onSnapPointChange,
	onResizeStateChange,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	isDragOver,
	dropTarget,
}: {
	mainTrackId: string | null;
	zoomLevel: number;
	dragState: ElementDragState;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	lastMouseXRef: React.RefObject<number>;
	onSnapPointChange: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange: (params: { isResizing: boolean }) => void;
	onElementMouseDown: React.ComponentProps<
		typeof TimelineTrackContent
	>["onElementMouseDown"];
	onElementClick: React.ComponentProps<
		typeof TimelineTrackContent
	>["onElementClick"];
	onTrackMouseDown: (event: React.MouseEvent) => void;
	onTrackMouseUp: (event: React.MouseEvent) => void;
	shouldIgnoreClick: () => boolean;
	isDragOver: boolean;
	dropTarget: DropTarget | null;
}) {
	const timeline = useEditor((e) => e.timeline);
	const scene = useEditor((e) => e.scenes.getActiveSceneOrNull());
	// Per-track height overrides live in the timeline store; reading
	// them here (and passing them to getTrackHeight + getCumulativeHeightBefore)
	// keeps every track row vertically aligned with its track-label
	// counterpart when the user drags a row to resize.
	const trackHeights = useTimelineStore((s) => s.trackHeights);
	const resetTrackHeight = useTimelineStore((s) => s.resetTrackHeight);
	const tracks = useMemo<TimelineTrack[]>(
		() =>
			scene
				? [...scene.tracks.overlay, scene.tracks.main, ...scene.tracks.audio]
				: [],
		[scene],
	);
	const { selectedElements } = useElementSelection();
	const tracksWithSelection = useMemo(
		() => new Set(selectedElements.map((el) => el.trackId)),
		[selectedElements],
	);

	const expandedElementIds = useTimelineStore((s) => s.expandedElementIds);

	const getTrackExpansionHeight = useCallback(
		(trackIndex: number) => {
			const track = tracks[trackIndex];
			if (!track) return 0;
			return computeTrackExpansionHeight({ track, expandedElementIds });
		},
		[tracks, expandedElementIds],
	);

	const sortedTracks = useMemo(() => {
		const draggingElementIds = new Set(dragState.dragElementIds);
		return [...tracks]
			.map((track, index) => ({ track, index }))
			.sort((a, b) => {
				const aHasDragged = a.track.elements.some((element) =>
					draggingElementIds.has(element.id),
				);
				const bHasDragged = b.track.elements.some((element) =>
					draggingElementIds.has(element.id),
				);
				if (aHasDragged) return 1;
				if (bHasDragged) return -1;
				return 0;
			});
	}, [tracks, dragState.dragElementIds]);

	return (
		<>
			{sortedTracks.map(({ track, index }) => {
				const hasDraggedElement = track.elements.some((element) =>
					dragState.dragElementIds.includes(element.id),
				);
				const trackAccent = getTrackTypeAccent({
					type: track.type,
					customColor: track.color,
				});
				const trackRowHeight =
					getTrackHeight({
						type: track.type,
						overrideHeight: trackHeights[track.id],
					}) + getTrackExpansionHeight(index);
				return (
					<ContextMenu key={track.id}>
						<ContextMenuTrigger asChild>
							<div
								className={cn(
									"group absolute left-0 right-0 rounded-xl border border-white/[0.04] bg-white/[0.014] shadow-[0_4px_18px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-white/[0.08]",
									hasDraggedElement ? "overflow-visible" : "overflow-hidden",
									tracksWithSelection.has(track.id) && SELECTED_TRACK_ROW_CLASS,
								)}
								style={{
									top: `${TIMELINE_CONTENT_TOP_PADDING_PX + getCumulativeHeightBefore({ tracks, trackIndex: index, getExtraHeight: getTrackExpansionHeight, overrideHeights: trackHeights })}px`,
									height: `${trackRowHeight}px`,
									zIndex: hasDraggedElement
										? TIMELINE_LAYERS.dragLine + 1
										: undefined,
									// Track colour used to tint the whole row, which
									// muddied the clip thumbnails. The accent now
									// lives on a thin left stripe (rendered below
									// as an absolute child) so the tile image
									// stays clean while the colour cue is still
									// visible at a glance.
									borderColor: track.color ? trackAccent.accentSoft : undefined,
								}}
							>
								{track.color ? (
									<div
										aria-hidden="true"
										className="pointer-events-none absolute inset-0 z-20 rounded-xl"
										style={{ borderLeft: `3px solid ${trackAccent.accent}` }}
									/>
								) : null}
								<TimelineTrackContent
									track={track}
									zoomLevel={zoomLevel}
									dragState={dragState}
									rulerScrollRef={tracksScrollRef}
									tracksScrollRef={tracksScrollRef}
									lastMouseXRef={lastMouseXRef}
									onSnapPointChange={onSnapPointChange}
									onResizeStateChange={onResizeStateChange}
									onElementMouseDown={onElementMouseDown}
									onElementClick={onElementClick}
									onTrackMouseDown={onTrackMouseDown}
									onTrackMouseUp={onTrackMouseUp}
									shouldIgnoreClick={shouldIgnoreClick}
									targetElementId={
										isDragOver
											? (dropTarget?.targetElement?.elementId ?? null)
											: null
									}
								/>
								<TrackHeightHandle
									trackId={track.id}
									currentHeight={trackRowHeight}
								/>
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent className="w-40">
							<ContextMenuItem
								icon={<HugeiconsIcon icon={TaskAdd02Icon} />}
								onClick={(event: React.MouseEvent) => {
									event.stopPropagation();
									invokeAction("paste-copied");
								}}
							>
								Paste elements
							</ContextMenuItem>
							{trackHeights[track.id] !== undefined && (
								<ContextMenuItem
									icon={<HugeiconsIcon icon={RefreshIcon} />}
									onClick={(event: React.MouseEvent) => {
										event.stopPropagation();
										resetTrackHeight(track.id);
									}}
								>
									Reset track height
								</ContextMenuItem>
							)}
							<ContextMenuItem
								icon={<HugeiconsIcon icon={VolumeHighIcon} />}
								onClick={(event: React.MouseEvent) => {
									event.stopPropagation();
									timeline.toggleTrackMute({ trackId: track.id });
								}}
							>
								{canTrackHaveAudio(track) && track.muted
									? "Unmute track"
									: "Mute track"}
							</ContextMenuItem>
							<ContextMenuItem
								icon={<HugeiconsIcon icon={ViewIcon} />}
								onClick={(event: React.MouseEvent) => {
									event.stopPropagation();
									timeline.toggleTrackVisibility({ trackId: track.id });
								}}
							>
								{canTrackBeHidden(track) && track.hidden
									? "Show track"
									: "Hide track"}
							</ContextMenuItem>
							{track.id !== mainTrackId && (
								<ContextMenuItem
									icon={<HugeiconsIcon icon={Delete02Icon} />}
									onClick={(event: React.MouseEvent) => {
										event.stopPropagation();
										timeline.removeTrack({ trackId: track.id });
									}}
									variant="destructive"
								>
									Delete track
								</ContextMenuItem>
							)}
						</ContextMenuContent>
					</ContextMenu>
				);
			})}
		</>
	);
}

function TimelineGutter({
	onMouseDown,
	onClick,
}: {
	onMouseDown: (event: React.MouseEvent) => void;
	onClick: (event: React.MouseEvent) => void;
}) {
	// biome-ignore lint/a11y/noStaticElementInteractions: canvas seek surface; keyboard seeking is handled by the global keybindings system
	// biome-ignore lint/a11y/useKeyWithClickEvents: canvas seek surface; keyboard seeking is handled by the global keybindings system
	return <div className="flex-1" onMouseDown={onMouseDown} onClick={onClick} />;
}

/**
 * Drag-to-resize handle for the track labels column.
 *
 * Sits on the right edge of the labels column as a thin vertical strip.
 * Mousedown records the start X + start width, then we listen on the
 * window for mousemove / mouseup so the drag keeps tracking even when
 * the cursor leaves the column.
 *
 * The store's `setTrackLabelsWidth` clamps to a sane range (140–480px)
 * so a stray drag can't collapse the column to nothing or stretch it
 * past the editor.
 */
/**
 * Drag-to-resize handle for the track labels column.
 *
 * Sits on the right edge of the labels column as a thin vertical strip.
 * Mousedown records the start X + start width, then we listen on the
 * window for mousemove / mouseup so the drag keeps tracking even when
 * the cursor leaves the column.
 *
 * The store's `setTrackLabelsWidth` clamps to a sane range (140–480px)
 * so a stray drag can't collapse the column to nothing or stretch it
 * past the editor.
 */
function TrackLabelsResizeHandle({
	currentWidth,
	onResize,
	onDoubleClick,
}: {
	currentWidth: number;
	onResize: (widthPx: number) => void;
	onDoubleClick: () => void;
}) {
	const startRef = useRef<{ x: number; width: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);

	useEffect(() => {
		if (!isResizing) return;
		const handleMove = (event: MouseEvent) => {
			const start = startRef.current;
			if (!start) return;
			const nextWidth = start.width + (event.clientX - start.x);
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
			aria-label="Resize track labels column"
			title={
				currentWidth
					? `Drag to resize (currently ${Math.round(currentWidth)}px — double-click to reset)`
					: "Drag to resize track labels column"
			}
			onMouseDown={(event) => {
				event.stopPropagation();
				event.preventDefault();
				startRef.current = { x: event.clientX, width: currentWidth };
				setIsResizing(true);
				document.body.style.cursor = "ew-resize";
				document.body.style.userSelect = "none";
			}}
			onDoubleClick={(event) => {
				event.stopPropagation();
				onDoubleClick();
			}}
			// Replaces the old hard 1px divider on the labels column: a
			// slightly-wider accent seam plus a chevron pull-tab so the
			// resize affordance is obvious. Lives on the track side only —
			// the timeline side of the seam is left clean.
			className={cn(
				"group/resize absolute top-0 right-0 z-30 h-full w-2 cursor-ew-resize",
			)}
		>
			{/* A-bit-wider accent line (was a 1px border). Subtle at rest,
			   brightens on hover / while dragging. */}
			<div
				aria-hidden="true"
				className={cn(
					"absolute right-0 top-0 h-full w-0.5 bg-white/[0.07] transition-colors",
					"group-hover/resize:bg-white/25",
					isResizing && "bg-white/35",
				)}
			/>
			{/* Chevron pull-tab anchored to the seam at the vertical centre. */}
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute right-0 top-1/2 grid h-9 w-3.5 -translate-y-1/2 place-items-center rounded-l-md border border-r-0 border-white/10 bg-[#161619] text-white/40 shadow-md transition-colors",
					"group-hover/resize:border-white/25 group-hover/resize:text-white/85",
					isResizing && "border-white/40 text-white",
				)}
			>
				<svg
					aria-hidden="true"
					className="size-3"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M9 6l6 6-6 6" />
				</svg>
			</div>
		</button>
	);
}

function _TrackIcon({ track }: { track: TimelineTrack }) {
	return <>{TRACK_ICONS[track.type]}</>;
}

function _TrackToggleIcon({
	isOff,
	icons,
	onClick,
}: {
	isOff: boolean;
	icons: {
		on: IconSvgElement;
		off: IconSvgElement;
	};
	onClick: () => void;
}) {
	return (
		<>
			{isOff ? (
				<HugeiconsIcon
					icon={icons.off}
					className="size-3.5 cursor-pointer text-white/25 transition hover:text-white/70"
					onClick={onClick}
				/>
			) : (
				<HugeiconsIcon
					icon={icons.on}
					className="size-3.5 cursor-pointer text-white/40 transition hover:text-white/80"
					onClick={onClick}
				/>
			)}
		</>
	);
}

function PropertyTree({ rows }: { rows: ExpandedRow[] }) {
	return (
		<div className="flex flex-col overflow-hidden">
			{rows.map((row, _index) => (
				<div
					key={row.propertyPath}
					className={cn("flex shrink-0 items-center px-3 bg-muted/50")}
					style={{ height: `${KEYFRAME_LANE_HEIGHT_PX}px` }}
				>
					<span className="text-muted-foreground truncate text-xs leading-none">
						{getPropertyLabel(row.propertyPath)}
					</span>
				</div>
			))}
		</div>
	);
}

/**
 * Drag-to-resize handle for a single track row.
 *
 * Sits as an absolutely-positioned strip across the bottom of the track
 * row. On mousedown we record the start Y + start height, then listen
 * on the window for mousemove / mouseup so the drag keeps tracking even
 * when the cursor leaves the row.
 *
 * The store's `setTrackHeight` clamps to a sane range (20–400px) so a
 * stray drag can't collapse a track to 0px or balloon it past the
 * editor.
 */
function TrackHeightHandle({
	trackId,
	currentHeight,
}: {
	trackId: string;
	currentHeight: number;
}) {
	const setTrackHeight = useTimelineStore((s) => s.setTrackHeight);
	const resetTrackHeight = useTimelineStore((s) => s.resetTrackHeight);
	const startRef = useRef<{ y: number; height: number } | null>(null);
	const [isResizing, setIsResizing] = useState(false);

	useEffect(() => {
		if (!isResizing) return;
		const handleMove = (event: MouseEvent) => {
			const start = startRef.current;
			if (!start) return;
			const nextHeight = start.height + (event.clientY - start.y);
			setTrackHeight(trackId, nextHeight);
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
	}, [isResizing, trackId, setTrackHeight]);

	return (
		<button
			type="button"
			aria-label="Resize track height"
			title={
				currentHeight
					? `Drag to resize (currently ${Math.round(currentHeight)}px — double-click to reset)`
					: "Drag to resize track height"
			}
			onMouseDown={(event) => {
				event.stopPropagation();
				event.preventDefault();
				startRef.current = { y: event.clientY, height: currentHeight };
				setIsResizing(true);
				document.body.style.cursor = "ns-resize";
				document.body.style.userSelect = "none";
			}}
			onDoubleClick={(event) => {
				event.stopPropagation();
				resetTrackHeight(trackId);
			}}
			// No visible strip — the cursor + tooltip are the only
			// affordance. Reduces visual clutter in the track row.
			className={cn(
				"absolute bottom-0 left-0 right-0 z-20 h-1.5 cursor-ns-resize",
			)}
		/>
	);
}
