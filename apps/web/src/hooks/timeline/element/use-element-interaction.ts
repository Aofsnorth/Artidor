import {
	useState,
	useCallback,
	useEffect,
	useRef,
	useMemo,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
} from "react";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { TIMELINE_DRAG_THRESHOLD_PX } from "@/components/editor/panels/timeline/interaction";
import { roundToFrame } from "artidor-wasm";
import { computeDropTarget } from "@/components/editor/panels/timeline/drop-target";
import { TIMELINE_CONTENT_LEFT_INSET_PX } from "@/components/editor/panels/timeline/layout";
import { getMouseTimeFromClientX } from "@/lib/timeline/drag-utils";
import { generateUUID } from "@/utils/id";
import { snapElementEdge, type SnapPoint } from "@/lib/timeline/snap-utils";
import { registerCanceller } from "@/lib/cancel-interaction";
import { useTimelineStore } from "@/stores/timeline-store";
import { computeTrackExpansionHeight } from "@/components/editor/panels/timeline/expanded-layout";
import {
	getOrderedTracks,
	type DropTarget,
	type ElementDragState,
	type SceneTracks,
	type TimelineElement,
	type TimelineTrack,
} from "@/lib/timeline";

interface UseElementInteractionProps {
	zoomLevel: number;
	timelineRef: RefObject<HTMLDivElement | null>;
	tracksContainerRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	snappingEnabled: boolean;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

const MOUSE_BUTTON_RIGHT = 2;

const initialDragState: ElementDragState = {
	isDragging: false,
	elementId: null,
	dragElementIds: [],
	dragTimeOffsets: {},
	trackId: null,
	startMouseX: 0,
	startMouseY: 0,
	startElementTime: 0,
	clickOffsetTime: 0,
	currentTime: 0,
	currentMouseY: 0,
};

interface PendingDragState {
	elementId: string;
	trackId: string;
	startMouseX: number;
	startMouseY: number;
	startElementTime: number;
	clickOffsetTime: number;
}

export interface MultiDragRef {
	trackId: string;
	elementId: string;
}

/**
 * Builds the drag set for a timeline move: when the dragged element belongs
 * to a multi-selection, every selected element travels with it, keeping its
 * relative time offset to the primary element. Otherwise the set is just the
 * primary element. Unresolvable refs (stale selection entries) are skipped.
 *
 * Pure so the multi-select offset math can be unit-tested without a DOM.
 */
export function buildMultiDragSet({
	selectedElements,
	primaryTrackId,
	primaryElementId,
	primaryStartTime,
	getElementStartTime,
}: {
	selectedElements: MultiDragRef[];
	primaryTrackId: string;
	primaryElementId: string;
	primaryStartTime: number;
	getElementStartTime: (ref: MultiDragRef) => number | null;
}): {
	dragElementIds: string[];
	dragTimeOffsets: Record<string, number>;
} {
	const primaryInSelection = selectedElements.some(
		(ref) =>
			ref.trackId === primaryTrackId && ref.elementId === primaryElementId,
	);
	if (!primaryInSelection || selectedElements.length < 2) {
		return { dragElementIds: [primaryElementId], dragTimeOffsets: {} };
	}

	const dragElementIds: string[] = [primaryElementId];
	const dragTimeOffsets: Record<string, number> = {};
	for (const ref of selectedElements) {
		if (ref.trackId === primaryTrackId && ref.elementId === primaryElementId) {
			continue;
		}
		const startTime = getElementStartTime(ref);
		if (startTime === null) continue;
		dragElementIds.push(ref.elementId);
		dragTimeOffsets[ref.elementId] = startTime - primaryStartTime;
	}
	return { dragElementIds, dragTimeOffsets };
}

/**
 * Resolves the commit-time moves for a multi-drag: the primary element takes
 * `snappedTime`, every sibling keeps its relative offset (clamped at zero).
 * Siblings always stay on their own track — only the primary may change
 * tracks via the drop target. Pure for unit testing.
 */
export function resolveMultiDragMoves({
	snappedTime,
	dragElementIds,
	primaryElementId,
	dragTimeOffsets,
}: {
	snappedTime: number;
	dragElementIds: string[];
	primaryElementId: string;
	dragTimeOffsets: Record<string, number>;
}): Array<{ elementId: string; newStartTime: number }> {
	const moves: Array<{ elementId: string; newStartTime: number }> = [];
	for (const elementId of dragElementIds) {
		if (elementId === primaryElementId) continue;
		const offset = dragTimeOffsets[elementId] ?? 0;
		moves.push({
			elementId,
			newStartTime: Math.max(0, snappedTime + offset),
		});
	}
	return moves;
}

function getClickOffsetTime({
	clientX,
	elementRect,
	zoomLevel,
}: {
	clientX: number;
	elementRect: DOMRect;
	zoomLevel: number;
}): number {
	const clickOffsetX = clientX - elementRect.left;
	const seconds = clickOffsetX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel);
	return Math.round(seconds * TICKS_PER_SECOND);
}

function getVerticalDragDirection({
	startMouseY,
	currentMouseY,
}: {
	startMouseY: number;
	currentMouseY: number;
}): "up" | "down" | null {
	if (currentMouseY < startMouseY) return "up";
	if (currentMouseY > startMouseY) return "down";
	return null;
}

function getDragDropTarget({
	clientX,
	clientY,
	elementId,
	trackId,
	tracks,
	tracksContainerRef,
	tracksScrollRef,
	headerRef,
	zoomLevel,
	snappedTime,
	verticalDragDirection,
	overrideHeights,
	extraHeights,
}: {
	clientX: number;
	clientY: number;
	elementId: string;
	trackId: string;
	tracks: SceneTracks;
	tracksContainerRef: RefObject<HTMLDivElement | null>;
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	headerRef?: RefObject<HTMLElement | null>;
	zoomLevel: number;
	snappedTime: number;
	verticalDragDirection?: "up" | "down" | null;
	overrideHeights?: Record<string, number>;
	extraHeights?: readonly number[];
}): DropTarget | null {
	const containerRect = tracksContainerRef.current?.getBoundingClientRect();
	const scrollContainer = tracksScrollRef.current;
	if (!containerRect || !scrollContainer) return null;

	const sourceTrack = getOrderedTracks(tracks).find(({ id }) => id === trackId);
	const movingElement = sourceTrack?.elements.find(
		({ id }) => id === elementId,
	);
	if (!movingElement) return null;

	const elementDuration = movingElement.duration;
	const scrollLeft = scrollContainer.scrollLeft;
	const scrollTop = scrollContainer.scrollTop;
	const scrollContainerRect = scrollContainer.getBoundingClientRect();
	const headerHeight = headerRef?.current?.getBoundingClientRect().height ?? 0;
	const mouseX =
		clientX -
		scrollContainerRect.left +
		scrollLeft -
		TIMELINE_CONTENT_LEFT_INSET_PX;
	const mouseY = clientY - scrollContainerRect.top + scrollTop - headerHeight;

	return computeDropTarget({
		elementType: movingElement.type,
		mouseX,
		mouseY,
		tracks,
		playheadTime: snappedTime,
		isExternalDrop: false,
		elementDuration,
		pixelsPerSecond: BASE_TIMELINE_PIXELS_PER_SECOND,
		zoomLevel,
		startTimeOverride: snappedTime,
		excludeElementId: movingElement.id,
		verticalDragDirection,
		overrideHeights,
		extraHeights,
	});
}

interface StartDragParams
	extends Omit<
		ElementDragState,
		| "isDragging"
		| "currentTime"
		| "currentMouseY"
		| "dragElementIds"
		| "dragTimeOffsets"
	> {
	initialCurrentTime: number;
	initialCurrentMouseY: number;
	dragElementIds?: string[];
	dragTimeOffsets?: Record<string, number>;
}

export function useElementInteraction({
	zoomLevel,
	timelineRef,
	tracksContainerRef,
	tracksScrollRef,
	headerRef,
	snappingEnabled,
	onSnapPointChange,
}: UseElementInteractionProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const sceneTracks = editor.scenes.getActiveScene().tracks;
	// Memoize the ordered tracks array so it stays stable across re-renders
	// that don't change the scene's tracks. Without this, the spread creates
	// a new array reference every render, causing the mousemove/mouseup
	// effects to re-subscribe on every dragState update (which fires on
	// every mousemove), making drag interactions unreliable — especially
	// on non-main tracks where the effect re-subscription race causes
	// mouseup to be missed.
	const tracks = useMemo(() => getOrderedTracks(sceneTracks), [sceneTracks]);
	const trackHeights = useTimelineStore((s) => s.trackHeights);
	const expandedElementIds = useTimelineStore((s) => s.expandedElementIds);
	const extraHeights = useMemo(
		() =>
			tracks.map((track) =>
				computeTrackExpansionHeight({ track, expandedElementIds }),
			),
		[tracks, expandedElementIds],
	);
	const {
		selectedElements,
		isElementSelected,
		selectElement,
		handleElementClick: handleSelectionClick,
	} = useElementSelection();

	const [dragState, setDragState] =
		useState<ElementDragState>(initialDragState);
	const [dragDropTarget, setDragDropTarget] = useState<DropTarget | null>(null);
	const [isPendingDrag, setIsPendingDrag] = useState(false);
	const pendingDragRef = useRef<PendingDragState | null>(null);
	const lastMouseXRef = useRef(0);
	const mouseDownLocationRef = useRef<{ x: number; y: number } | null>(null);
	// Document `mousemove` is coalesced to one handler invocation per
	// animation frame: each invocation runs a snap-index rebuild plus track
	// scans, and browsers can fire mousemove well above 60Hz.
	const pendingMouseRef = useRef<{ clientX: number; clientY: number } | null>(
		null,
	);
	const mouseFrameRef = useRef<number | null>(null);
	// Holds the latest move handler. The document listener is mounted once per
	// drag and calls through this ref, so the listener is not torn down and
	// re-added while the drag runs. Takes only the coordinates it reads, so
	// the coalesced payload can be replayed without synthesising a MouseEvent.
	const handleMouseMoveRef = useRef<
		(event: { clientX: number; clientY: number }) => void
	>(() => {});
	// Mirrors `dragState.currentTime` for the drop commit. The coalesced move
	// handler writes it synchronously, so `mouseup` commits the exact released
	// position instead of the previous frame's.
	const currentTimeRef = useRef(0);

	const flushPendingMouseMove = useCallback(() => {
		mouseFrameRef.current = null;
		const pending = pendingMouseRef.current;
		pendingMouseRef.current = null;
		if (!pending) return;
		handleMouseMoveRef.current(pending);
	}, []);

	const startDrag = useCallback(
		({
			elementId,
			trackId,
			startMouseX,
			startMouseY,
			startElementTime,
			clickOffsetTime,
			initialCurrentTime,
			initialCurrentMouseY,
			dragElementIds,
			dragTimeOffsets,
		}: StartDragParams) => {
			currentTimeRef.current = initialCurrentTime;
			setDragState({
				isDragging: true,
				elementId,
				dragElementIds: dragElementIds ?? (elementId ? [elementId] : []),
				dragTimeOffsets: dragTimeOffsets ?? {},
				trackId,
				startMouseX,
				startMouseY,
				startElementTime,
				clickOffsetTime,
				currentTime: initialCurrentTime,
				currentMouseY: initialCurrentMouseY,
			});
		},
		[],
	);

	const endDrag = useCallback(() => {
		setDragState(initialDragState);
		setDragDropTarget(null);
	}, []);

	const cancelCurrentDrag = useCallback(() => {
		pendingDragRef.current = null;
		mouseDownLocationRef.current = null;
		setIsPendingDrag(false);
		endDrag();
		onSnapPointChange?.(null);
	}, [endDrag, onSnapPointChange]);

	useEffect(() => {
		if (!dragState.isDragging && !isPendingDrag) return;

		return registerCanceller({ fn: cancelCurrentDrag });
	}, [dragState.isDragging, isPendingDrag, cancelCurrentDrag]);

	const getDragSnapResult = useCallback(
		({
			frameSnappedTime,
			movingElement,
		}: {
			frameSnappedTime: number;
			movingElement: TimelineElement | null | undefined;
		}) => {
			const shouldSnap = snappingEnabled && !isShiftHeldRef.current;
			if (!shouldSnap || !movingElement) {
				return { snappedTime: frameSnappedTime, snapPoint: null };
			}

			const elementDuration = movingElement.duration;
			const playheadTime = editor.playback.getCurrentTime();
			const liveSceneTracks = editor.scenes.getActiveScene().tracks;

			const startSnap = snapElementEdge({
				targetTime: frameSnappedTime,
				elementDuration,
				tracks: liveSceneTracks,
				playheadTime,
				zoomLevel,
				excludeElementId: movingElement.id,
				snapToStart: true,
			});

			const endSnap = snapElementEdge({
				targetTime: frameSnappedTime,
				elementDuration,
				tracks: liveSceneTracks,
				playheadTime,
				zoomLevel,
				excludeElementId: movingElement.id,
				snapToStart: false,
			});

			const snapResult =
				startSnap.snapDistance <= endSnap.snapDistance ? startSnap : endSnap;
			if (!snapResult.snapPoint) {
				return { snappedTime: frameSnappedTime, snapPoint: null };
			}

			return {
				snappedTime: snapResult.snappedTime,
				snapPoint: snapResult.snapPoint,
			};
		},
		[
			snappingEnabled,
			editor.playback,
			zoomLevel,
			isShiftHeldRef,
			editor.scenes.getActiveScene,
		],
	);

	// Latest drag-move handler, kept in a ref so the document listener below
	// can be mounted once per drag. Re-running this effect only swaps a
	// closure; it never re-binds the listener.
	useEffect(() => {
		handleMouseMoveRef.current = ({
			clientX,
			clientY,
		}: {
			clientX: number;
			clientY: number;
		}) => {
			let startedDragThisEvent = false;
			const timeline = timelineRef.current;
			const scrollContainer = tracksScrollRef.current;
			if (!timeline || !scrollContainer) return;
			lastMouseXRef.current = clientX;

			if (isPendingDrag && pendingDragRef.current) {
				const deltaX = Math.abs(clientX - pendingDragRef.current.startMouseX);
				const deltaY = Math.abs(clientY - pendingDragRef.current.startMouseY);
				if (
					deltaX > TIMELINE_DRAG_THRESHOLD_PX ||
					deltaY > TIMELINE_DRAG_THRESHOLD_PX
				) {
					const activeProject = editor.project.getActive();
					if (!activeProject) return;
					const scrollLeft = scrollContainer.scrollLeft;
					const mouseTime = getMouseTimeFromClientX({
						clientX,
						containerRect: scrollContainer.getBoundingClientRect(),
						zoomLevel,
						scrollLeft,
						contentInset: TIMELINE_CONTENT_LEFT_INSET_PX,
					});
					const adjustedTime = Math.max(
						0,
						mouseTime - pendingDragRef.current.clickOffsetTime,
					);
					const snappedTime =
						roundToFrame({
							time: adjustedTime,
							rate: activeProject.settings.fps,
						}) ?? adjustedTime;
					// Snapshot the multi-select drag set at drag start so the
					// whole group travels with the primary element, keeping
					// relative offsets (CapCut/Premiere group-drag behavior).
					const pending = pendingDragRef.current;
					const liveTracks = getOrderedTracks(
						editor.scenes.getActiveScene().tracks,
					);
					const { dragElementIds, dragTimeOffsets } = buildMultiDragSet({
						selectedElements,
						primaryTrackId: pending.trackId,
						primaryElementId: pending.elementId,
						primaryStartTime: pending.startElementTime,
						getElementStartTime: (ref) =>
							liveTracks
								.find(({ id }) => id === ref.trackId)
								?.elements.find(({ id }) => id === ref.elementId)?.startTime ??
							null,
					});
					startDrag({
						...pending,
						initialCurrentTime: snappedTime,
						initialCurrentMouseY: clientY,
						dragElementIds,
						dragTimeOffsets,
					});
					startedDragThisEvent = true;
					pendingDragRef.current = null;
					setIsPendingDrag(false);
				} else {
					return;
				}
			}

			if (startedDragThisEvent) {
				return;
			}

			if (dragState.elementId && dragState.trackId) {
				const alreadySelected = isElementSelected({
					trackId: dragState.trackId,
					elementId: dragState.elementId,
				});
				if (!alreadySelected) {
					selectElement({
						trackId: dragState.trackId,
						elementId: dragState.elementId,
					});
				}
			}

			const activeProject = editor.project.getActive();
			if (!activeProject) return;

			const scrollLeft = scrollContainer.scrollLeft;
			const mouseTime = getMouseTimeFromClientX({
				clientX,
				containerRect: scrollContainer.getBoundingClientRect(),
				zoomLevel,
				scrollLeft,
				contentInset: TIMELINE_CONTENT_LEFT_INSET_PX,
			});
			const adjustedTime = Math.max(0, mouseTime - dragState.clickOffsetTime);
			const fps = activeProject.settings.fps;
			const frameSnappedTime =
				roundToFrame({ time: adjustedTime, rate: fps }) ?? adjustedTime;

			const liveSceneTracks = editor.scenes.getActiveScene().tracks;
			const liveTracks = getOrderedTracks(liveSceneTracks);
			const sourceTrack = liveTracks.find(({ id }) => id === dragState.trackId);
			const movingElement = sourceTrack?.elements.find(
				({ id }) => id === dragState.elementId,
			);
			const { snappedTime, snapPoint } = getDragSnapResult({
				frameSnappedTime,
				movingElement,
			});
			currentTimeRef.current = snappedTime;
			setDragState((previousDragState) => ({
				...previousDragState,
				currentTime: snappedTime,
				currentMouseY: clientY,
			}));
			onSnapPointChange?.(snapPoint);

			if (dragState.elementId && dragState.trackId) {
				const verticalDragDirection = getVerticalDragDirection({
					startMouseY: dragState.startMouseY,
					currentMouseY: clientY,
				});
				const dropTarget = getDragDropTarget({
					clientX,
					clientY,
					elementId: dragState.elementId,
					trackId: dragState.trackId,
					tracks: liveSceneTracks,
					tracksContainerRef,
					tracksScrollRef,
					headerRef,
					zoomLevel,
					snappedTime,
					verticalDragDirection,
					overrideHeights: trackHeights,
					extraHeights,
				});
				setDragDropTarget(dropTarget ?? null);
			}
		};
	}, [
		dragState.clickOffsetTime,
		dragState.elementId,
		dragState.startMouseY,
		dragState.trackId,
		zoomLevel,
		isElementSelected,
		selectElement,
		editor,
		timelineRef,
		tracksScrollRef,
		tracksContainerRef,
		headerRef,
		isPendingDrag,
		startDrag,
		getDragSnapResult,
		onSnapPointChange,
		trackHeights,
		extraHeights,
		selectedElements,
	]);

	// One document `mousemove` listener per drag, coalesced to a single
	// handler call per animation frame. Same shape as the playhead scrub
	// coalescing in `use-timeline-playhead`.
	useEffect(() => {
		if (!dragState.isDragging && !isPendingDrag) return;

		const handleDocumentMouseMove = ({ clientX, clientY }: MouseEvent) => {
			pendingMouseRef.current = { clientX, clientY };
			if (mouseFrameRef.current !== null) return;
			mouseFrameRef.current = requestAnimationFrame(flushPendingMouseMove);
		};

		document.addEventListener("mousemove", handleDocumentMouseMove);
		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			if (mouseFrameRef.current !== null) {
				cancelAnimationFrame(mouseFrameRef.current);
				mouseFrameRef.current = null;
			}
			pendingMouseRef.current = null;
		};
	}, [dragState.isDragging, isPendingDrag, flushPendingMouseMove]);

	useEffect(() => {
		if (!dragState.isDragging) return;

		const handleMouseUp = ({ clientX, clientY }: MouseEvent) => {
			// Apply the coalesced pointer position first, so the committed drop
			// lands exactly where the clip was released even if the final frame
			// had not run yet.
			if (mouseFrameRef.current !== null) {
				cancelAnimationFrame(mouseFrameRef.current);
			}
			flushPendingMouseMove();

			if (!dragState.elementId || !dragState.trackId) return;

			if (mouseDownLocationRef.current) {
				const deltaX = Math.abs(clientX - mouseDownLocationRef.current.x);
				const deltaY = Math.abs(clientY - mouseDownLocationRef.current.y);
				if (
					deltaX <= TIMELINE_DRAG_THRESHOLD_PX &&
					deltaY <= TIMELINE_DRAG_THRESHOLD_PX
				) {
					mouseDownLocationRef.current = null;
					endDrag();
					onSnapPointChange?.(null);
					return;
				}
			}

			const liveSceneTracks = editor.scenes.getActiveScene().tracks;
			const liveTracks = getOrderedTracks(liveSceneTracks);
			const dropTarget = getDragDropTarget({
				clientX,
				clientY,
				elementId: dragState.elementId,
				trackId: dragState.trackId,
				tracks: liveSceneTracks,
				tracksContainerRef,
				tracksScrollRef,
				headerRef,
				zoomLevel,
				snappedTime: currentTimeRef.current,
				verticalDragDirection: getVerticalDragDirection({
					startMouseY: dragState.startMouseY,
					currentMouseY: clientY,
				}),
				overrideHeights: trackHeights,
				extraHeights,
			});
			if (!dropTarget) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}
			const snappedTime = currentTimeRef.current;

			const sourceTrack = liveTracks.find(({ id }) => id === dragState.trackId);
			if (!sourceTrack) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}
			const movingElement =
				sourceTrack.elements.find(({ id }) => id === dragState.elementId) ??
				null;
			if (
				movingElement &&
				!dropTarget.isNewTrack &&
				liveTracks[dropTarget.trackIndex]?.id === dragState.trackId &&
				snappedTime === movingElement.startTime
			) {
				endDrag();
				onSnapPointChange?.(null);
				return;
			}

			try {
				if (dropTarget.isNewTrack) {
					const newTrackId = generateUUID();

					editor.timeline.moveElement({
						sourceTrackId: dragState.trackId,
						targetTrackId: newTrackId,
						elementId: dragState.elementId,
						newStartTime: snappedTime,
						createTrack: {
							type: sourceTrack.type,
							index: dropTarget.trackIndex,
						},
					});
					selectElement({
						trackId: newTrackId,
						elementId: dragState.elementId,
					});
				} else {
					const targetTrack = liveTracks[dropTarget.trackIndex];
					if (targetTrack) {
						// Move the dragged element. Every other member of the
						// drag set (snapshotted at drag start, see buildMultiDragSet)
						// shifts by the SAME snapped delta on its own track, so the
						// whole group moves together, preserving relative offsets —
						// including siblings on other tracks. Siblings never change
						// tracks; only the primary element may.
						editor.timeline.moveElement({
							sourceTrackId: dragState.trackId,
							targetTrackId: targetTrack.id,
							elementId: dragState.elementId,
							newStartTime: snappedTime,
						});
						if (dragState.elementId) {
							const siblingMoves = resolveMultiDragMoves({
								snappedTime,
								dragElementIds: dragState.dragElementIds,
								primaryElementId: dragState.elementId,
								dragTimeOffsets: dragState.dragTimeOffsets,
							});
							for (const move of siblingMoves) {
								const sibRef = selectedElements.find(
									(ref) => ref.elementId === move.elementId,
								);
								if (!sibRef) continue;
								editor.timeline.moveElement({
									sourceTrackId: sibRef.trackId,
									targetTrackId: sibRef.trackId,
									elementId: move.elementId,
									newStartTime: move.newStartTime,
								});
							}
						}
						if (targetTrack.id !== dragState.trackId) {
							selectElement({
								trackId: targetTrack.id,
								elementId: dragState.elementId,
							});
						}
					}
				}
			} catch (error) {
				// Any move error (e.g. incompatible track, placement not found)
				// should end the drag cleanly instead of leaving the interaction
				// in a broken state.
				if (process.env.NODE_ENV !== "production") {
					console.error("[useElementInteraction] drag move failed:", error);
				}
			}

			endDrag();
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [
		dragState.isDragging,
		dragState.elementId,
		dragState.startMouseY,
		dragState.trackId,
		dragState.dragElementIds,
		dragState.dragTimeOffsets,
		zoomLevel,
		endDrag,
		onSnapPointChange,
		editor,
		tracksContainerRef,
		tracksScrollRef,
		headerRef,
		selectElement,
		selectedElements,
		trackHeights,
		extraHeights,
		flushPendingMouseMove,
	]);

	useEffect(() => {
		if (!isPendingDrag) return;

		const handleMouseUp = () => {
			pendingDragRef.current = null;
			setIsPendingDrag(false);
			onSnapPointChange?.(null);
		};

		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [isPendingDrag, onSnapPointChange]);

	const handleElementMouseDown = useCallback(
		({
			event,
			element,
			track,
		}: {
			event: ReactMouseEvent;
			element: TimelineElement;
			track: TimelineTrack;
		}) => {
			const isRightClick = event.button === MOUSE_BUTTON_RIGHT;

			// right-click: don't stop propagation so ContextMenu can open
			if (isRightClick) {
				const alreadySelected = isElementSelected({
					trackId: track.id,
					elementId: element.id,
				});
				if (!alreadySelected) {
					handleSelectionClick({
						trackId: track.id,
						elementId: element.id,
						isMultiKey: false,
					});
				}
				return;
			}

			event.stopPropagation();
			mouseDownLocationRef.current = { x: event.clientX, y: event.clientY };

			const isMultiSelect = event.metaKey || event.ctrlKey || event.shiftKey;

			if (isMultiSelect) {
				handleSelectionClick({
					trackId: track.id,
					elementId: element.id,
					isMultiKey: true,
				});
			}

			const clickOffsetTime = getClickOffsetTime({
				clientX: event.clientX,
				elementRect: event.currentTarget.getBoundingClientRect(),
				zoomLevel,
			});
			pendingDragRef.current = {
				elementId: element.id,
				trackId: track.id,
				startMouseX: event.clientX,
				startMouseY: event.clientY,
				startElementTime: element.startTime,
				clickOffsetTime,
			};
			setIsPendingDrag(true);
		},
		[zoomLevel, isElementSelected, handleSelectionClick],
	);

	const handleElementClick = useCallback(
		({
			event,
			element,
			track,
		}: {
			event: ReactMouseEvent;
			element: TimelineElement;
			track: TimelineTrack;
		}) => {
			event.stopPropagation();

			if (mouseDownLocationRef.current) {
				const deltaX = Math.abs(event.clientX - mouseDownLocationRef.current.x);
				const deltaY = Math.abs(event.clientY - mouseDownLocationRef.current.y);
				if (
					deltaX > TIMELINE_DRAG_THRESHOLD_PX ||
					deltaY > TIMELINE_DRAG_THRESHOLD_PX
				) {
					mouseDownLocationRef.current = null;
					return;
				}
			}

			// modifier keys already handled in mousedown
			if (event.metaKey || event.ctrlKey || event.shiftKey) return;

			const alreadySelected = isElementSelected({
				trackId: track.id,
				elementId: element.id,
			});
			if (!alreadySelected || selectedElements.length > 1) {
				selectElement({ trackId: track.id, elementId: element.id });
				return;
			}

			editor.selection.clearKeyframeSelection();
		},
		[editor.selection, isElementSelected, selectElement, selectedElements],
	);

	return {
		dragState,
		dragDropTarget,
		handleElementMouseDown,
		handleElementClick,
		lastMouseXRef,
	};
}
