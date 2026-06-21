import { snappedSeekTime } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { useEffect, useCallback, useRef } from "react";
import { useEdgeAutoScroll } from "@/hooks/timeline/use-edge-auto-scroll";
import { useEditor } from "../use-editor";
import { useShiftKey } from "@/hooks/use-shift-key";
import { findSnapPoints, snapToNearestPoint } from "@/lib/timeline/snap-utils";
import {
	getCenteredLineLeft,
	timelineTimeToPixels,
	timelineTimeToSnappedPixels,
} from "@/lib/timeline";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { TIMELINE_CONTENT_LEFT_INSET_PX } from "@/components/editor/panels/timeline/layout";
import { useTimelineStore } from "@/stores/timeline-store";

// Where the playhead parks horizontally while auto-scroll follows it,
// as a fraction of the tracks viewport width. A true 0.5 (dead-centre of
// the tracks area) reads as "too far right" because the ~230px track-labels
// column shifts the visual centre of the whole timeline to the left. Anchoring
// a little before half (0.42) lands the playhead near the centre of the panel
// and gives a touch of look-ahead room on the right.
const PLAYHEAD_VIEWPORT_ANCHOR = 0.42;

interface UseTimelinePlayheadProps {
	zoomLevel: number;
	rulerRef: React.RefObject<HTMLDivElement | null>;
	rulerScrollRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
	playheadRef?: React.RefObject<HTMLDivElement | null>;
}

type ScrubPointer = Pick<MouseEvent | React.MouseEvent, "clientX">;

export function useTimelinePlayhead({
	zoomLevel,
	rulerRef,
	rulerScrollRef,
	tracksScrollRef,
	playheadRef,
}: UseTimelinePlayheadProps) {
	const editor = useEditor();
	const isScrubbing = useEditor((e) => e.playback.getIsScrubbing());
	const isPlaying = useEditor((e) => e.playback.getIsPlaying());
	const activeProject = editor.project.getActive();
	const duration = editor.timeline.getTotalDuration();
	const isShiftHeldRef = useShiftKey();
	const autoScrollEnabled = useTimelineStore((s) => s.autoScrollEnabled);
	const autoPlayWhileScrubbing = useTimelineStore((s) => s.autoPlayWhileScrubbing);
	// The "Magnet" toolbar toggle. When off, the playhead must not snap to
	// nearby keyframes/clip edges/bookmarks while scrubbing. Held in a ref
	// because `handleScrub` is a long-lived callback that reads it at drag time.
	const magnetEnabled = useTimelineStore((s) => s.snappingEnabled);

	const zoomLevelRef = useRef(zoomLevel);
	const durationRef = useRef(duration);
	const isScrubbingRef = useRef(isScrubbing);
	const isPlayingRef = useRef(isPlaying);
	const autoScrollEnabledRef = useRef(autoScrollEnabled);
	const autoPlayWhileScrubbingRef = useRef(autoPlayWhileScrubbing);
	const magnetEnabledRef = useRef(magnetEnabled);

	useEffect(() => {
		zoomLevelRef.current = zoomLevel;
		durationRef.current = duration;
		isScrubbingRef.current = isScrubbing;
		isPlayingRef.current = isPlaying;
		autoScrollEnabledRef.current = autoScrollEnabled;
		autoPlayWhileScrubbingRef.current = autoPlayWhileScrubbing;
		magnetEnabledRef.current = magnetEnabled;
	}, [zoomLevel, duration, isScrubbing, isPlaying, autoScrollEnabled, autoPlayWhileScrubbing, magnetEnabled]);

	const seek = useCallback(
		({ time }: { time: number }) => editor.playback.seek({ time }),
		[editor.playback],
	);

	const scrubTimeRef = useRef<number | null>(null);
	const isDraggingRulerRef = useRef(false);
	const hasDraggedRulerRef = useRef(false);
	const lastMouseXRef = useRef<number>(0);

	const handleScrub = useCallback(
		({
			event,
			snappingEnabled = true,
		}: {
			event: ScrubPointer;
			snappingEnabled?: boolean;
		}) => {
			const ruler = rulerRef.current;
			if (!ruler) return;
			const rulerRect = ruler.getBoundingClientRect();
			const relativeMouseX = event.clientX - rulerRect.left;

			const timelineContentWidth = timelineTimeToPixels({
				time: duration,
				zoomLevel,
			});

			const clampedMouseX = Math.max(
				0,
				Math.min(timelineContentWidth, relativeMouseX),
			);

			const rawTimeSeconds = Math.max(
				0,
				Math.min(
					duration / TICKS_PER_SECOND,
					clampedMouseX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
				),
			);
			const rawTime = Math.round(rawTimeSeconds * TICKS_PER_SECOND);

			const rate = activeProject.settings.fps;
			const frameTime =
				snappedSeekTime({ time: rawTime, duration, rate }) ?? rawTime;

			const shouldSnap =
				snappingEnabled && magnetEnabledRef.current && !isShiftHeldRef.current;
			const time = (() => {
				if (!shouldSnap) return frameTime;

				const tracks = editor.scenes.getActiveScene().tracks;
				const bookmarks = editor.scenes.getActiveScene()?.bookmarks ?? [];

				const snapPoints = findSnapPoints({
					tracks,
					playheadTime: frameTime,
					bookmarks,
					enablePlayheadSnapping: false,
				});
				const snapResult = snapToNearestPoint({
					targetTime: frameTime,
					snapPoints,
					zoomLevel,
				});
				return snapResult.snapPoint ? snapResult.snappedTime : frameTime;
			})();

			scrubTimeRef.current = time;
			seek({ time });

			lastMouseXRef.current = event.clientX;
		},
		[
			duration,
			zoomLevel,
			seek,
			rulerRef,
			activeProject.settings.fps,
			isShiftHeldRef,
			editor.scenes,
		],
	);

	const pendingScrubRef = useRef<{
		event: ScrubPointer;
		snappingEnabled: boolean;
	} | null>(null);
	const scrubAnimationFrameRef = useRef<number | null>(null);

	const flushPendingScrub = useCallback(() => {
		scrubAnimationFrameRef.current = null;
		const pending = pendingScrubRef.current;
		pendingScrubRef.current = null;
		if (!pending) return;
		handleScrub(pending);
	}, [handleScrub]);

	const scheduleScrub = useCallback(
		({
			event,
			snappingEnabled = true,
		}: {
			event: ScrubPointer;
			snappingEnabled?: boolean;
		}) => {
			pendingScrubRef.current = {
				event: { clientX: event.clientX },
				snappingEnabled,
			};
			if (scrubAnimationFrameRef.current !== null) return;
			scrubAnimationFrameRef.current = requestAnimationFrame(flushPendingScrub);
		},
		[flushPendingScrub],
	);

	const flushScheduledScrub = useCallback(() => {
		if (scrubAnimationFrameRef.current !== null) {
			cancelAnimationFrame(scrubAnimationFrameRef.current);
			scrubAnimationFrameRef.current = null;
		}
		flushPendingScrub();
	}, [flushPendingScrub]);

	useEffect(() => {
		return () => {
			if (scrubAnimationFrameRef.current !== null) {
				cancelAnimationFrame(scrubAnimationFrameRef.current);
			}
		};
	}, []);

	const handlePlayheadMouseDown = useCallback(
		({ event }: { event: React.MouseEvent }) => {
			event.preventDefault();
			event.stopPropagation();

			if (autoPlayWhileScrubbingRef.current) {
				if (!editor.playback.getIsPlaying()) editor.playback.play();
			} else if (editor.playback.getIsPlaying()) {
				editor.playback.pause();
			}

			editor.playback.setScrubbing({ isScrubbing: true });
			handleScrub({ event });
		},
		[handleScrub, editor.playback],
	);

	const handleRulerMouseDown = useCallback(
		({ event }: { event: React.MouseEvent }) => {
			if (event.button !== 0) return;
			if (playheadRef?.current?.contains(event.target as Node)) return;

			event.preventDefault();
			isDraggingRulerRef.current = true;
			hasDraggedRulerRef.current = false;

			if (autoPlayWhileScrubbingRef.current) {
				if (!editor.playback.getIsPlaying()) editor.playback.play();
			} else if (editor.playback.getIsPlaying()) {
				editor.playback.pause();
			}

			editor.playback.setScrubbing({ isScrubbing: true });
			handleScrub({ event, snappingEnabled: false });
		},
		[handleScrub, playheadRef, editor.playback],
	);

	const handlePlayheadMouseDownEvent = useCallback(
		(event: React.MouseEvent) => handlePlayheadMouseDown({ event }),
		[handlePlayheadMouseDown],
	);

	const handleRulerMouseDownEvent = useCallback(
		(event: React.MouseEvent) => handleRulerMouseDown({ event }),
		[handleRulerMouseDown],
	);

	useEdgeAutoScroll({
		isActive: isScrubbing,
		getMouseClientX: () => lastMouseXRef.current,
		rulerScrollRef,
		tracksScrollRef,
		contentWidth: timelineTimeToPixels({ time: duration, zoomLevel }),
	});

	useEffect(() => {
		if (!isScrubbing) return;

		const handleMouseMove = ({ event }: { event: MouseEvent }) => {
			if (isDraggingRulerRef.current) {
				hasDraggedRulerRef.current = true;
			}
			// Always coalesce scrub updates to rAF to prevent audio lag
			// and jank from flooding the main thread with seek events.
			scheduleScrub({ event });
		};

		const handleMouseUp = ({ event }: { event: MouseEvent }) => {
			flushScheduledScrub();
			editor.playback.setScrubbing({ isScrubbing: false });
			const finalTime = scrubTimeRef.current;
			if (finalTime !== null) {
				seek({ time: finalTime });
				editor.project.setTimelineViewState({
					viewState: {
						zoomLevel,
						scrollLeft: tracksScrollRef.current?.scrollLeft ?? 0,
						playheadTime: finalTime,
					},
				});
			}
			scrubTimeRef.current = null;

			if (isDraggingRulerRef.current) {
				isDraggingRulerRef.current = false;
				if (!hasDraggedRulerRef.current) {
					handleScrub({ event, snappingEnabled: false });
				}
				hasDraggedRulerRef.current = false;
			}
		};

		const onMouseMove = (event: MouseEvent) => handleMouseMove({ event });
		const onMouseUp = (event: MouseEvent) => handleMouseUp({ event });

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);
		};
	}, [
		isScrubbing,
		seek,
		handleScrub,
		scheduleScrub,
		flushScheduledScrub,
		editor,
		tracksScrollRef,
		zoomLevel,
	]);

	const updatePlayheadLeft = useCallback(
		(time: number) => {
			const playheadEl = playheadRef?.current;
			if (!playheadEl) return;
			const centerPosition = timelineTimeToSnappedPixels({
				time,
				zoomLevel: zoomLevelRef.current,
			});
			const leftPosition = getCenteredLineLeft({ centerPixel: centerPosition });
			const scrollLeft = rulerScrollRef.current?.scrollLeft ?? 0;
			playheadEl.style.left = `${leftPosition - scrollLeft + TIMELINE_CONTENT_LEFT_INSET_PX}px`;
		},
		[playheadRef, rulerScrollRef],
	);

	useEffect(() => {
		const scrollEl = rulerScrollRef.current;
		if (!scrollEl) return;

		const handleScroll = () => {
			updatePlayheadLeft(editor.playback.getCurrentTime());
		};

		scrollEl.addEventListener("scroll", handleScroll, { passive: true });
		return () => scrollEl.removeEventListener("scroll", handleScroll);
	}, [editor.playback, rulerScrollRef, updatePlayheadLeft]);

	useEffect(() => {
		const handlePlaybackUpdate = (e: Event) => {
			const time = (e as CustomEvent<{ time: number }>).detail.time;
			updatePlayheadLeft(time);

			if (!isPlayingRef.current || isScrubbingRef.current) return;
			const rulerViewport = rulerScrollRef.current;
			const tracksViewport = tracksScrollRef.current;
			if (!rulerViewport || !tracksViewport) return;

			const playheadPixels = timelineTimeToPixels({
				time,
				zoomLevel: zoomLevelRef.current,
			});
			const viewportWidth = rulerViewport.clientWidth;
			const scrollMinimum = 0;
			const scrollMaximum = rulerViewport.scrollWidth - viewportWidth;

			const isAutoScrollOn = autoScrollEnabledRef.current;

			// If auto-scroll is on, always try to keep it centered (within bounds)
			if (isAutoScrollOn) {
				const desiredScroll = Math.max(
					scrollMinimum,
					Math.min(
						scrollMaximum,
						playheadPixels - viewportWidth * PLAYHEAD_VIEWPORT_ANCHOR,
					),
				);
				rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
			} else {
				// Otherwise only scroll if the playhead actually leaves the screen
				const needsScroll =
					playheadPixels < rulerViewport.scrollLeft ||
					playheadPixels > rulerViewport.scrollLeft + viewportWidth;

				if (needsScroll) {
					const desiredScroll = Math.max(
						scrollMinimum,
						Math.min(
							scrollMaximum,
							playheadPixels - viewportWidth * PLAYHEAD_VIEWPORT_ANCHOR,
						),
					);
					rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
				}
			}
		};

		const initialTime = editor.playback.getCurrentTime();
		handlePlaybackUpdate({
			detail: { time: initialTime },
		} as CustomEvent<{ time: number }>);

		window.addEventListener("playback-update", handlePlaybackUpdate);
		window.addEventListener("playback-seek", handlePlaybackUpdate);
		return () => {
			window.removeEventListener("playback-update", handlePlaybackUpdate);
			window.removeEventListener("playback-seek", handlePlaybackUpdate);
		};
	}, [editor.playback, rulerScrollRef, tracksScrollRef, updatePlayheadLeft]);

	// rAF-driven autoscroll follower. `handlePlaybackUpdate` only fires
	// on `playback-update` / `playback-seek` events, which can be
	// throttled or arrive in irregular bursts depending on the playback
	// source. To guarantee the playhead always stays centred while
	// autoscroll is on, this effect kicks in a rAF loop that re-centres
	// the viewport every frame. The Math.abs(>0.5) guard stops the loop
	// from fighting the user's own scroll wheel input.
	useEffect(() => {
		if (!autoScrollEnabled) return;
		const rulerViewport = rulerScrollRef.current;
		const tracksViewport = tracksScrollRef.current;
		if (!rulerViewport || !tracksViewport) return;

		let rafId: number;
		const tick = () => {
			const time = editor.playback.getCurrentTime();
			const playheadPixels = timelineTimeToPixels({
				time,
				zoomLevel: zoomLevelRef.current,
			});
			const viewportWidth = rulerViewport.clientWidth;
			const scrollMax = Math.max(0, rulerViewport.scrollWidth - viewportWidth);
			const desiredScroll = Math.max(
				0,
				Math.min(
					scrollMax,
					playheadPixels - viewportWidth * PLAYHEAD_VIEWPORT_ANCHOR,
				),
			);
			if (Math.abs(rulerViewport.scrollLeft - desiredScroll) > 0.5) {
				rulerViewport.scrollLeft = desiredScroll;
				tracksViewport.scrollLeft = desiredScroll;
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [autoScrollEnabled, editor.playback, rulerScrollRef, tracksScrollRef]);

	return {
		handlePlayheadMouseDown: handlePlayheadMouseDownEvent,
		handleRulerMouseDown: handleRulerMouseDownEvent,
	};
}
