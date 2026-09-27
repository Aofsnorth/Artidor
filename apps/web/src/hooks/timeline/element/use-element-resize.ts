import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { roundToFrame } from "artidor-wasm";
import type { SceneTracks, TimelineElement, TimelineTrack } from "@/lib/timeline";
import { useEditor } from "@/hooks/use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import {
	findSnapPoints,
	snapToNearestPoint,
	type SnapPoint,
} from "@/lib/timeline/snap-utils";
import { isRetimableElement } from "@/lib/timeline";
import {
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "@/lib/retime";
import { useTimelineStore } from "@/stores/timeline-store";
import { registerCanceller } from "@/lib/cancel-interaction";

export interface ResizeState {
	elementId: string;
	side: "left" | "right";
	startX: number;
	initialTrimStart: number;
	initialTrimEnd: number;
	initialStartTime: number;
	initialDuration: number;
}

interface UseTimelineElementResizeProps {
	element: TimelineElement;
	track: TimelineTrack;
	zoomLevel: number;
	onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
	onResizeStateChange?: (params: { isResizing: boolean }) => void;
}

/** Unbounded defaults — also what the old per-event scan produced. */
const NO_NEIGHBOR_BOUNDS = {
	rightNeighborBound: Infinity,
	leftNeighborBound: -Infinity,
} as const;

/**
 * Nearest same-track neighbour edges that bound a resize, in one pass:
 * the closest clip starting at or after the dragged clip's initial end
 * (right-edge drags) and the closest clip ending at or before its initial
 * start (left-edge drags). The dragged clip is excluded either way.
 *
 * Pure and side-aware so it can be hoisted out of the mousemove handler: the
 * track's element list cannot change under a resize gesture, so this is
 * computed once per gesture instead of on every event.
 */
export function computeResizeNeighborBounds({
	elements,
	elementId,
	side,
	initialStartTime,
	initialDuration,
}: {
	elements: readonly TimelineElement[];
	elementId: string;
	side: "left" | "right";
	initialStartTime: number;
	initialDuration: number;
}): { rightNeighborBound: number; leftNeighborBound: number } {
	const initialEndTime = initialStartTime + initialDuration;
	let rightNeighborBound = Infinity;
	let leftNeighborBound = -Infinity;
	for (const element of elements) {
		if (element.id === elementId) continue;
		if (side === "right" && element.startTime >= initialEndTime) {
			rightNeighborBound = Math.min(rightNeighborBound, element.startTime);
		}
		if (
			side === "left" &&
			element.startTime + element.duration <= initialStartTime
		) {
			leftNeighborBound = Math.max(
				leftNeighborBound,
				element.startTime + element.duration,
			);
		}
	}
	return { rightNeighborBound, leftNeighborBound };
}

export function useTimelineElementResize({
	element,
	track,
	zoomLevel,
	onSnapPointChange,
	onResizeStateChange,
}: UseTimelineElementResizeProps) {
	const editor = useEditor();
	const isShiftHeldRef = useShiftKey();
	const snappingEnabled = useTimelineStore((state) => state.snappingEnabled);

	const [resizing, setResizing] = useState<ResizeState | null>(null);
	const [currentTrimStart, setCurrentTrimStart] = useState(element.trimStart);
	const [currentTrimEnd, setCurrentTrimEnd] = useState(element.trimEnd);
	const [currentStartTime, setCurrentStartTime] = useState(element.startTime);
	const [currentDuration, setCurrentDuration] = useState(element.duration);
	const currentTrimStartRef = useRef(element.trimStart);
	const currentTrimEndRef = useRef(element.trimEnd);
	const currentStartTimeRef = useRef(element.startTime);
	const currentDurationRef = useRef(element.duration);
	// Snap points for the gesture in progress. `findSnapPoints` is
	// O(clips + keyframes) and allocates two objects per element, so it is
	// cached against the only two things that can change it under a resize
	// gesture: the scene tracks and the playhead (which keeps moving while
	// playback runs). Re-keyed on both, so the result is identical to
	// recomputing per event, but a paused resize builds the set once.
	const snapPointsRef = useRef<{
		tracks: SceneTracks;
		playheadTime: number;
		snapPoints: SnapPoint[];
	} | null>(null);
	// Latest coalesced mousemove, flushed on mouseup so the committed
	// resize is always the exact final pointer position.
	const pendingClientXRef = useRef<number | null>(null);
	const resizeFrameRef = useRef<number | null>(null);

	/** Drop the last coalesced move without applying it (cancel / unmount). */
	const discardPendingResizeMove = useCallback(() => {
		if (resizeFrameRef.current !== null) {
			cancelAnimationFrame(resizeFrameRef.current);
			resizeFrameRef.current = null;
		}
		pendingClientXRef.current = null;
	}, []);

	useEffect(() => {
		return () => {
			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}
		};
	}, []);

	const handleResizeStart = ({
		event,
		elementId,
		side,
	}: {
		event: React.MouseEvent;
		elementId: string;
		side: "left" | "right";
	}) => {
		event.stopPropagation();
		event.preventDefault();

		// Never let a coalesced move from a previous gesture land in the new
		// one: the pending callback closes over the old gesture state.
		discardPendingResizeMove();
		snapPointsRef.current = null;

		setResizing({
			elementId,
			side,
			startX: event.clientX,
			initialTrimStart: element.trimStart,
			initialTrimEnd: element.trimEnd,
			initialStartTime: element.startTime,
			initialDuration: element.duration,
		});

		setCurrentTrimStart(element.trimStart);
		setCurrentTrimEnd(element.trimEnd);
		setCurrentStartTime(element.startTime);
		setCurrentDuration(element.duration);
		currentTrimStartRef.current = element.trimStart;
		currentTrimEndRef.current = element.trimEnd;
		currentStartTimeRef.current = element.startTime;
		currentDurationRef.current = element.duration;
		onResizeStateChange?.({ isResizing: true });
	};

	const canExtendElementDuration = useCallback(() => {
		return element.sourceDuration == null;
	}, [element.sourceDuration]);

	const getSourceDeltaForClipDelta = useCallback(
		(clipDelta: number) => {
			if (!isRetimableElement(element)) {
				return clipDelta;
			}

			return clipDelta >= 0
				? getSourceSpanAtClipTime({
						clipTime: clipDelta,
						retime: element.retime,
					})
				: -getSourceSpanAtClipTime({
						clipTime: Math.abs(clipDelta),
						retime: element.retime,
					});
		},
		[element],
	);

	const getVisibleSourceSpanForDuration = useCallback(
		(duration: number) => {
			if (!isRetimableElement(element)) {
				return duration;
			}

			return getSourceSpanAtClipTime({
				clipTime: duration,
				retime: element.retime,
			});
		},
		[element],
	);

	const getDurationForVisibleSourceSpan = useCallback(
		(sourceSpan: number) => {
			if (!isRetimableElement(element)) {
				return sourceSpan;
			}

			return getTimelineDurationForSourceSpan({
				sourceSpan,
				retime: element.retime,
			});
		},
		[element],
	);

	const getSourceDuration = useCallback(
		({
			trimStart,
			duration,
			trimEnd,
		}: {
			trimStart: number;
			duration: number;
			trimEnd: number;
		}) => {
			if (typeof element.sourceDuration === "number") {
				return element.sourceDuration;
			}

			return trimStart + getVisibleSourceSpanForDuration(duration) + trimEnd;
		},
		[element.sourceDuration, getVisibleSourceSpanForDuration],
	);

	const cancelResize = useCallback(() => {
		if (!resizing) return;

		discardPendingResizeMove();
		setCurrentTrimStart(resizing.initialTrimStart);
		setCurrentTrimEnd(resizing.initialTrimEnd);
		setCurrentStartTime(resizing.initialStartTime);
		setCurrentDuration(resizing.initialDuration);
		currentTrimStartRef.current = resizing.initialTrimStart;
		currentTrimEndRef.current = resizing.initialTrimEnd;
		currentStartTimeRef.current = resizing.initialStartTime;
		currentDurationRef.current = resizing.initialDuration;
		setResizing(null);
		onResizeStateChange?.({ isResizing: false });
		onSnapPointChange?.(null);
	}, [
		resizing,
		discardPendingResizeMove,
		onResizeStateChange,
		onSnapPointChange,
	]);

	useEffect(() => {
		if (!resizing) return;

		return registerCanceller({ fn: cancelResize });
	}, [resizing, cancelResize]);

	/**
	 * Neighbour bounds for the gesture in progress, resolved once per drag.
	 * `resizing` (and `track.elements`) keep a stable identity for the whole
	 * gesture, so the element-list scan no longer runs on every mousemove.
	 */
	const neighborBounds = useMemo(
		() =>
			resizing
				? computeResizeNeighborBounds({
						elements: track.elements,
						elementId: element.id,
						side: resizing.side,
						initialStartTime: resizing.initialStartTime,
						initialDuration: resizing.initialDuration,
					})
				: null,
		[resizing, track.elements, element.id],
	);

	const updateTrimFromMouseMove = useCallback(
		({ clientX }: { clientX: number }) => {
			if (!resizing) return;

			const deltaX = clientX - resizing.startX;
			let deltaTime = Math.round(
				(deltaX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel)) *
					TICKS_PER_SECOND,
			);
			let resizeSnapPoint: SnapPoint | null = null;

			const projectFps = editor.project.getActive().settings.fps;
			const minDuration = Math.round(
				(TICKS_PER_SECOND * projectFps.denominator) / projectFps.numerator,
			);
			const shouldSnap = snappingEnabled && !isShiftHeldRef.current;
			if (shouldSnap) {
				const tracks = editor.scenes.getActiveScene().tracks;
				const playheadTime = editor.playback.getCurrentTime();
				// Re-keyed on the tracks and the playhead — the only inputs
				// that can change the set. A paused resize therefore builds it
				// once, and a resize during playback still tracks the
				// playhead, exactly as the per-event call did.
				let cached = snapPointsRef.current;
				if (
					!cached ||
					cached.tracks !== tracks ||
					cached.playheadTime !== playheadTime
				) {
					cached = {
						tracks,
						playheadTime,
						snapPoints: findSnapPoints({
							tracks,
							playheadTime,
							excludeElementId: element.id,
						}),
					};
					snapPointsRef.current = cached;
				}
				const snapPoints = cached.snapPoints;
				if (resizing.side === "left") {
					const targetStartTime = resizing.initialStartTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetStartTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - resizing.initialStartTime;
					}
				} else {
					const baseEndTime =
						resizing.initialStartTime + resizing.initialDuration;
					const targetEndTime = baseEndTime + deltaTime;
					const snapResult = snapToNearestPoint({
						targetTime: targetEndTime,
						snapPoints,
						zoomLevel,
					});
					resizeSnapPoint = snapResult.snapPoint;
					if (snapResult.snapPoint) {
						deltaTime = snapResult.snappedTime - baseEndTime;
					}
				}
			}
			onSnapPointChange?.(resizeSnapPoint);

			// `neighborBounds` is non-null whenever `resizing` is: the gesture
			// state and the memo are derived from the same inputs, and the
			// fallback is exactly the unbounded default.
			const { rightNeighborBound, leftNeighborBound } =
				neighborBounds ?? NO_NEIGHBOR_BOUNDS;

			if (resizing.side === "left") {
				const sourceDuration = getSourceDuration({
					trimStart: resizing.initialTrimStart,
					duration: resizing.initialDuration,
					trimEnd: resizing.initialTrimEnd,
				});
				const minTrimStartForNeighbor = Number.isFinite(leftNeighborBound)
					? Math.max(
							0,
							resizing.initialTrimStart +
								getSourceDeltaForClipDelta(
									leftNeighborBound - resizing.initialStartTime,
								),
						)
					: 0;
				const maxAllowed =
					sourceDuration -
					resizing.initialTrimEnd -
					getVisibleSourceSpanForDuration(minDuration);
				const calculated =
					resizing.initialTrimStart + getSourceDeltaForClipDelta(deltaTime);

				if (calculated >= 0 && calculated <= maxAllowed) {
					const newTrimStart =
						roundToFrame({
							time: Math.min(
								maxAllowed,
								Math.max(minTrimStartForNeighbor, calculated),
							),
							rate: projectFps,
						}) ??
						Math.min(maxAllowed, Math.max(minTrimStartForNeighbor, calculated));
					const visibleSourceSpan = Math.max(
						0,
						sourceDuration - newTrimStart - resizing.initialTrimEnd,
					);
					const newDuration =
						roundToFrame({
							time: getDurationForVisibleSourceSpan(visibleSourceSpan),
							rate: projectFps,
						}) ?? getDurationForVisibleSourceSpan(visibleSourceSpan);
					const trimDelta = resizing.initialDuration - newDuration;
					const newStartTime =
						roundToFrame({
							time: resizing.initialStartTime + trimDelta,
							rate: projectFps,
						}) ?? resizing.initialStartTime + trimDelta;

					setCurrentTrimStart(newTrimStart);
					setCurrentStartTime(newStartTime);
					setCurrentDuration(newDuration);
					currentTrimStartRef.current = newTrimStart;
					currentStartTimeRef.current = newStartTime;
					currentDurationRef.current = newDuration;
				} else if (calculated < 0) {
					if (canExtendElementDuration()) {
						const extensionAmount = Math.abs(calculated);
						const maxExtension = resizing.initialStartTime;
						const actualExtension = Math.max(
							0,
							Number.isFinite(leftNeighborBound)
								? Math.min(
										extensionAmount,
										maxExtension,
										resizing.initialStartTime - leftNeighborBound,
									)
								: Math.min(extensionAmount, maxExtension),
						);
						const newStartTime =
							roundToFrame({
								time: resizing.initialStartTime - actualExtension,
								rate: projectFps,
							}) ?? resizing.initialStartTime - actualExtension;
						const newDuration =
							roundToFrame({
								time: resizing.initialDuration + actualExtension,
								rate: projectFps,
							}) ?? resizing.initialDuration + actualExtension;

						setCurrentTrimStart(0);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = 0;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					} else {
						const leftBound = Number.isFinite(leftNeighborBound)
							? leftNeighborBound
							: 0;
						const trimDeltaFromTrimStart =
							minTrimStartForNeighbor - resizing.initialTrimStart;
						const trimDeltaFromStartTime = getSourceDeltaForClipDelta(
							leftBound - resizing.initialStartTime,
						);
						const trimDelta = Math.max(
							trimDeltaFromTrimStart,
							trimDeltaFromStartTime,
						);
						const newTrimStart = resizing.initialTrimStart + trimDelta;
						const visibleSourceSpan = Math.max(
							0,
							sourceDuration - newTrimStart - resizing.initialTrimEnd,
						);
						const newDuration =
							roundToFrame({
								time: getDurationForVisibleSourceSpan(visibleSourceSpan),
								rate: projectFps,
							}) ?? getDurationForVisibleSourceSpan(visibleSourceSpan);
						const newStartTime =
							roundToFrame({
								time:
									resizing.initialStartTime +
									(resizing.initialDuration - newDuration),
								rate: projectFps,
							}) ??
							resizing.initialStartTime +
								(resizing.initialDuration - newDuration);

						setCurrentTrimStart(newTrimStart);
						setCurrentStartTime(newStartTime);
						setCurrentDuration(newDuration);
						currentTrimStartRef.current = newTrimStart;
						currentStartTimeRef.current = newStartTime;
						currentDurationRef.current = newDuration;
					}
				}
			} else {
				const sourceDuration = getSourceDuration({
					trimStart: resizing.initialTrimStart,
					duration: resizing.initialDuration,
					trimEnd: resizing.initialTrimEnd,
				});
				const newTrimEnd =
					resizing.initialTrimEnd - getSourceDeltaForClipDelta(deltaTime);
				const maxAllowedDuration = Number.isFinite(rightNeighborBound)
					? rightNeighborBound - resizing.initialStartTime
					: Infinity;

				if (newTrimEnd < 0) {
					if (canExtendElementDuration()) {
						const extensionNeeded = Math.abs(newTrimEnd);
						const baseDuration =
							resizing.initialDuration + resizing.initialTrimEnd;
						const newDuration =
							roundToFrame({
								time: Math.min(
									baseDuration + extensionNeeded,
									maxAllowedDuration,
								),
								rate: projectFps,
							}) ??
							Math.min(baseDuration + extensionNeeded, maxAllowedDuration);

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					} else {
						const unclampedDuration = getDurationForVisibleSourceSpan(
							Math.max(0, sourceDuration - resizing.initialTrimStart),
						);
						const newDuration =
							roundToFrame({
								time: Math.min(unclampedDuration, maxAllowedDuration),
								rate: projectFps,
							}) ?? Math.min(unclampedDuration, maxAllowedDuration);

						setCurrentDuration(newDuration);
						setCurrentTrimEnd(0);
						currentDurationRef.current = newDuration;
						currentTrimEndRef.current = 0;
					}
				} else {
					const minTrimEndForNeighbor = Number.isFinite(maxAllowedDuration)
						? Math.max(
								0,
								sourceDuration -
									resizing.initialTrimStart -
									getVisibleSourceSpanForDuration(maxAllowedDuration),
							)
						: 0;
					const maxTrimEnd =
						sourceDuration -
						resizing.initialTrimStart -
						getVisibleSourceSpanForDuration(minDuration);
					const clampedTrimEnd = Math.min(
						maxTrimEnd,
						Math.max(minTrimEndForNeighbor, newTrimEnd),
					);
					const finalTrimEnd =
						roundToFrame({ time: clampedTrimEnd, rate: projectFps }) ??
						clampedTrimEnd;
					const visibleSourceSpan = Math.max(
						0,
						sourceDuration - resizing.initialTrimStart - finalTrimEnd,
					);
					const newDuration =
						roundToFrame({
							time: getDurationForVisibleSourceSpan(visibleSourceSpan),
							rate: projectFps,
						}) ?? getDurationForVisibleSourceSpan(visibleSourceSpan);

					setCurrentTrimEnd(finalTrimEnd);
					setCurrentDuration(newDuration);
					currentTrimEndRef.current = finalTrimEnd;
					currentDurationRef.current = newDuration;
				}
			}
		},
		[
			resizing,
			zoomLevel,
			snappingEnabled,
			editor,
			element.id,
			neighborBounds,
			onSnapPointChange,
			canExtendElementDuration,
			getDurationForVisibleSourceSpan,
			getSourceDeltaForClipDelta,
			getSourceDuration,
			getVisibleSourceSpanForDuration,
			isShiftHeldRef,
		],
	);

	// Mousemoves arrive faster than the display can paint (and each one used
	// to do a snap-point rebuild plus four setStates), so they are coalesced
	// into one update per animation frame. Mirrors the scrub coalescing in
	// use-timeline-playhead. The final frame is flushed synchronously on
	// mouseup, so the committed trim is the exact final pointer position.
	const flushPendingResizeMove = useCallback(() => {
		resizeFrameRef.current = null;
		const pendingClientX = pendingClientXRef.current;
		pendingClientXRef.current = null;
		if (pendingClientX === null) return;
		updateTrimFromMouseMove({ clientX: pendingClientX });
	}, [updateTrimFromMouseMove]);

	const scheduleResizeMove = useCallback(
		({ clientX }: { clientX: number }) => {
			pendingClientXRef.current = clientX;
			if (resizeFrameRef.current !== null) return;
			resizeFrameRef.current = requestAnimationFrame(flushPendingResizeMove);
		},
		[flushPendingResizeMove],
	);

	/** Run the last coalesced move now (mouseup) so the commit is exact. */
	const flushScheduledResizeMove = useCallback(() => {
		if (resizeFrameRef.current !== null) {
			cancelAnimationFrame(resizeFrameRef.current);
			resizeFrameRef.current = null;
		}
		flushPendingResizeMove();
	}, [flushPendingResizeMove]);

	const handleResizeEnd = useCallback(() => {
		if (!resizing) return;

		// Apply the final coalesced mousemove before reading the committed
		// values, otherwise a fast drag would commit the second-to-last
		// pointer position.
		flushScheduledResizeMove();

		const finalTrimStart = currentTrimStartRef.current;
		const finalTrimEnd = currentTrimEndRef.current;
		const finalStartTime = currentStartTimeRef.current;
		const finalDuration = currentDurationRef.current;
		const trimStartChanged = finalTrimStart !== resizing.initialTrimStart;
		const trimEndChanged = finalTrimEnd !== resizing.initialTrimEnd;
		const startTimeChanged = finalStartTime !== resizing.initialStartTime;
		const durationChanged = finalDuration !== resizing.initialDuration;

		if (
			trimStartChanged ||
			trimEndChanged ||
			startTimeChanged ||
			durationChanged
		) {
			editor.timeline.updateElementTrim({
				elementId: element.id,
				trimStart: finalTrimStart,
				trimEnd: finalTrimEnd,
				startTime: startTimeChanged ? finalStartTime : undefined,
				duration: durationChanged ? finalDuration : undefined,
			});
		}

		setResizing(null);
		onResizeStateChange?.({ isResizing: false });
		onSnapPointChange?.(null);
	}, [
		resizing,
		editor.timeline,
		element.id,
		flushScheduledResizeMove,
		onResizeStateChange,
		onSnapPointChange,
	]);

	useEffect(() => {
		if (!resizing) return;

		const handleDocumentMouseMove = ({ clientX }: MouseEvent) => {
			scheduleResizeMove({ clientX });
		};

		const handleDocumentMouseUp = () => {
			handleResizeEnd();
		};

		document.addEventListener("mousemove", handleDocumentMouseMove);
		document.addEventListener("mouseup", handleDocumentMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			document.removeEventListener("mouseup", handleDocumentMouseUp);
		};
	}, [resizing, handleResizeEnd, scheduleResizeMove]);

	return {
		resizing,
		isResizing: resizing !== null,
		handleResizeStart,
		currentTrimStart,
		currentTrimEnd,
		currentStartTime,
		currentDuration,
	};
}
