"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { useRafLoop } from "@/hooks/use-raf-loop";
import { useContainerSize } from "@/hooks/use-container-size";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import { buildScene } from "@/services/renderer/scene-builder";
import { PreviewInteractionOverlay } from "./preview-interaction-overlay";
import { BookmarkNoteOverlay } from "./bookmark-note-overlay";
import { GuideOverlay } from "./guide-overlay";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { PreviewContextMenu } from "./context-menu";
import { PreviewToolbar } from "./toolbar";
import { MediaAssetPreview } from "./media-asset-preview";
import { useSelectedElementCssFilter } from "@/hooks/use-selected-element-css-filter";
import { FullScreenIcon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	PreviewViewportProvider,
	usePreviewViewportState,
	usePreviewViewport,
} from "./preview-viewport";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { usePreviewStore } from "@/stores/preview-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
	resolveDecodeMaxDim,
	resolvePreviewScale,
} from "@/lib/perf/preview-quality";
import { RenderPerfTracker } from "@/lib/perf/render-perf-tracker";
import { PreviewQualityGovernor } from "@/lib/perf/preview-quality-governor";
import { resizePreviewCanvasBackingStore } from "@/lib/perf/preview-canvas-size";
import {
	cachePreviewFrame,
	clearPreviewFrameCache,
	type PreviewFrameCacheEntry,
} from "@/lib/perf/preview-frame-cache";
import { shouldQueuePreviewRender } from "@/lib/perf/preview-render-scheduling";
import {
	PreviewRenderMetrics,
	publishPreviewRenderMeasure,
} from "@/lib/perf/preview-render-metrics";
import { registerPreviewCanvas } from "@/stores/preview-canvas-scope";
import { cn } from "@/utils/ui";
import { Spinner } from "@/components/ui/spinner";

function usePreviewSize() {
	const canvasSize = useEditor(
		(e) => e.project.getActive()?.settings.canvasSize,
	);

	return {
		width: canvasSize?.width,
		height: canvasSize?.height,
	};
}

function normalizeWheelDelta({
	delta,
	deltaMode,
	pageSize,
}: {
	delta: number;
	deltaMode: number;
	pageSize: number;
}): number {
	if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
		return delta * 16;
	}

	if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
		return delta * pageSize;
	}

	return delta;
}

export function PreviewPanel() {
	const containerRef = useRef<HTMLDivElement>(null);
	const { toggleFullscreen } = useFullscreen({ containerRef });

	return (
		<div
			ref={containerRef}
			className="panel glass-strong relative flex size-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/10"
		>
			<PreviewCanvas
				containerRef={containerRef}
				onToggleFullscreen={toggleFullscreen}
			/>
			<RenderTreeController />
		</div>
	);
}

function RenderTreeController() {
	const editor = useEditor();
	const tracks = useEditor(
		(e) => e.timeline.getPreviewTracks() ?? e.scenes.getActiveScene().tracks,
	);
	const mediaAssets = useEditor((e) => e.media.getAssets());
	const activeProject = useEditor((e) => e.project.getActive());

	const { width, height } = usePreviewSize();

	useEffect(() => {
		if (!activeProject) return;

		const duration = editor.timeline.getTotalDuration();
		const renderTree = buildScene({
			tracks,
			mediaAssets,
			duration,
			canvasSize: { width, height },
			background: activeProject.settings.background,
			isPreview: true,
		});

		editor.renderer.setRenderTree({ renderTree });
	}, [
		tracks,
		mediaAssets,
		activeProject,
		editor.timeline.getTotalDuration,
		editor.renderer.setRenderTree,
		width,
		height,
	]);

	return null;
}

function PreviewCanvas({
	containerRef,
	onToggleFullscreen,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
	onToggleFullscreen: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const lastFrameRef = useRef(-1);
	const lastSceneRef = useRef<RootNode | null>(null);
	const lastScaleRef = useRef(-1);
	const renderingRef = useRef(false);
	const pendingRenderRef = useRef(false);
	const activeRenderFrameRef = useRef(-1);
	const activeRenderSceneRef = useRef<RootNode | null>(null);
	const activeRenderScaleInputsRef = useRef("");
	const renderTokenRef = useRef(0);
	const renderStartRef = useRef(0);
	// Track whether playback was playing before a render froze it,
	// so we can resume after the render completes.
	const wasPlayingBeforeRenderRef = useRef(false);
	const perfTrackerRef = useRef(new RenderPerfTracker());
	const qualityGovernorRef = useRef(new PreviewQualityGovernor());
	const performanceContextRef = useRef("");
	const phaseMetricsRef = useRef(new PreviewRenderMetrics());
	// Loading overlay: toggled via direct DOM class manipulation instead of
	// React state. Setting React state inside the requestAnimationFrame render
	// loop triggers a full re-render (5-16ms jank) every time a slow frame
	// exceeds the threshold. Direct DOM toggle is <0.1ms and never touches
	// React's reconciliation.
	const loadingOverlayRef = useRef<HTMLDivElement | null>(null);
	const isLoadingRef = useRef(false);
	// Cache scale inputs to skip recalculation for manual quality tiers.
	const lastScaleInputsRef = useRef("");
	const idleScaleRef = useRef(0);
	// Composited frame cache for paused scrubbing. Playback frames are never
	// snapshotted: creating a GPU-backed ImageBitmap every frame adds a copy to
	// the hot path and can retain hundreds of megabytes. Entries use the scaled
	// compositor dimensions and a fixed memory budget.
	const frameCacheRef = useRef<Map<string, PreviewFrameCacheEntry>>(new Map());
	const previewQuality = useSettingsStore((s) => s.previewQuality);
	const gpuDegraded = useEditor((e) => e.renderer.isDegraded);
	const { width: nativeWidth, height: nativeHeight } = usePreviewSize();
	const viewportSize = useContainerSize({ containerRef: viewportRef });
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const renderTree = useEditor((e) => e.renderer.getRenderTree());
	const { overlays } = usePreviewStore();
	const viewport = usePreviewViewportState({
		canvasHeight: nativeHeight,
		canvasWidth: nativeWidth,
		viewportHeight: viewportSize.height,
		viewportRef,
		viewportWidth: viewportSize.width,
	});

	const renderer = useMemo(() => {
		return new CanvasRenderer({
			width: nativeWidth,
			height: nativeHeight,
			// Output starts at canvas size; renderer.setSize() downscales
			// it for preview quality below. The transform pipeline uses
			// canvasSize for positions so the downscale is purely a
			// blit-time concern.
			canvasSize: { width: nativeWidth, height: nativeHeight },
			fps: activeProject.settings.fps,
			measurePerformance: process.env.NODE_ENV === "development",
		});
	}, [
		nativeWidth,
		nativeHeight,
		activeProject.settings.fps.numerator,
		activeProject.settings.fps.denominator,
		activeProject.settings.fps,
	]);

	const cssFilter = useSelectedElementCssFilter();

	// Track whether a render is needed when paused. The rAF loop is only
	// enabled when playing OR when a render is pending — stopping it when
	// paused and idle eliminates ~60 unnecessary callback invocations per
	// second, each of which would do property reads, scale calculations,
	// and a setSize call before reaching the "nothing changed" early-exit.
	const isPlaying = useEditor((e) => e.playback.getIsPlaying(), ["playback"]);
	const [needsRender, setNeedsRender] = useState(true); // start true to render the first frame
	const rafEnabled = isPlaying || needsRender;

	const render = useCallback(() => {
		// Read playback state once at the start so the finally block can
		// decide whether to keep the rAF loop alive.
		const isPlaying = editor.playback.getIsPlaying();
		try {
			if (!canvasRef.current || !renderTree) return;

			// Loading overlay check: if a render is in flight and has exceeded
			// the 80 ms threshold, show the overlay via direct DOM manipulation
			// (NOT React state — setState inside rAF causes re-render jank).
			const LOADING_THRESHOLD_MS = 80;
			if (
				renderingRef.current &&
				renderStartRef.current > 0 &&
				performance.now() - renderStartRef.current > LOADING_THRESHOLD_MS
			) {
				if (!isLoadingRef.current && loadingOverlayRef.current) {
					isLoadingRef.current = true;
					loadingOverlayRef.current.style.opacity = "1";
				}
			}

			const renderTime = Math.min(
				editor.playback.getCurrentTime(),
				editor.timeline.getLastFrameTime(),
			);
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * renderer.fps.denominator) / renderer.fps.numerator,
			);
			const frame = Math.floor(renderTime / ticksPerFrame);
			const scaleInputs = `${previewQuality}|${isPlaying}|${gpuDegraded}`;

			if (renderingRef.current) {
				pendingRenderRef.current = shouldQueuePreviewRender({
					activeFrame: activeRenderFrameRef.current,
					requestedFrame: frame,
					activeScene: activeRenderSceneRef.current,
					requestedScene: renderTree,
					activeScaleInputs: activeRenderScaleInputsRef.current,
					requestedScaleInputs: scaleInputs,
				});
				return;
			}

			// Delta-frame skip: if the frame index, render tree, scale, AND
			// playback state are all unchanged from the last successful render,
			// the composited output is identical — skip the entire pipeline
			// (resolve → build descriptor → texture upload → GPU render). This
			// is the single biggest per-frame optimization for paused playback:
			// when the user is not playing and not scrubbing, the rAF loop runs
			// but produces zero GPU work. It also catches the case where
			// playback reached the end of the timeline (frame stays the same).
			//
			// The frame cache check below handles the case where the frame IS
			// different but was recently rendered (backward scrub). This check
			// handles the case where nothing changed at all.
			if (
				frame === lastFrameRef.current &&
				renderTree === lastSceneRef.current &&
				lastScaleRef.current > 0 &&
				scaleInputs === lastScaleInputsRef.current
			) {
				return;
			}

			// Resolution scaling: render the preview at a fraction of project
			// resolution (and cap video decode to match) on weak machines /
			// during playback. The output canvas keeps its native size and the
			// compositor result is stretched up on blit — cheap, and the whole
			// transform pipeline derives from renderer.width/height so it all
			// scales coherently. Decode cap follows the *idle* tier so play/pause
			// never rebuilds the video decoder.
			const fps = renderer.fps.numerator / renderer.fps.denominator || 30;
			const frameBudgetMs = 1000 / fps;
			const avgRenderMs = perfTrackerRef.current.getAverageRenderMs();
			// For manual quality tiers, the scale is deterministic from
			// (quality, isPlaying, gpuDegraded) — skip the recalculation when
			// those inputs haven't changed. Auto mode always recalculates
			// because avgRenderMs changes every frame.
			// (scaleInputs is already computed above for the delta-frame skip.)
			let scale: number;
			let idleScale: number;
			if (
				previewQuality !== "auto" &&
				scaleInputs === lastScaleInputsRef.current &&
				idleScaleRef.current > 0
			) {
				scale = lastScaleRef.current;
				idleScale = idleScaleRef.current;
			} else {
				scale = qualityGovernorRef.current.resolve({
					quality: previewQuality,
					isPlaying,
					gpuDegraded,
					avgRenderMs: avgRenderMs || undefined,
					frameBudgetMs,
				});
				if (qualityGovernorRef.current.consumeTierChange()) {
					perfTrackerRef.current.reset();
				}
				idleScale = resolvePreviewScale({
					quality: previewQuality,
					isPlaying: false,
					gpuDegraded,
				});
				idleScaleRef.current = idleScale;
				lastScaleInputsRef.current = scaleInputs;
			}
			renderer.setSize({
				width: Math.max(2, Math.round(nativeWidth * scale)),
				height: Math.max(2, Math.round(nativeHeight * scale)),
				// canvasSize stays at the project canvas so the transform
				// pipeline keeps computing positions in canvas coords.
				// The scale pass in CanvasRenderer.render() then maps the
				// resulting frame down to the (output) buffer size.
				canvasSize: { width: nativeWidth, height: nativeHeight },
			});
			resizePreviewCanvasBackingStore({
				canvas: canvasRef.current,
				width: renderer.width,
				height: renderer.height,
			});
			renderer.maxSourceDim = resolveDecodeMaxDim({
				renderWidth: nativeWidth,
				renderHeight: nativeHeight,
				scale: idleScale,
			});

			// Re-render the same frame when scale changes (e.g. pause → sharpen).
			// Check the composited frame cache first — if we already rendered this
			// exact (frame, scale) combination, blit the cached bitmap instead of
			// re-running the full pipeline. This makes backward scrubbing and
			// re-seeks to recently-visited frames instant (0ms vs 5-80ms).
			const cacheKey = `${frame}:${scale.toFixed(3)}`;
			if (
				frame !== lastFrameRef.current ||
				renderTree !== lastSceneRef.current ||
				scale !== lastScaleRef.current
			) {
				// Check the frame cache before committing to a full render.
				const cached = frameCacheRef.current.get(cacheKey);
				if (cached && renderTree === lastSceneRef.current) {
					// Cache hit — blit the cached bitmap to the canvas. This is
					// ~0.5ms (a single drawImage) vs 5-80ms for a full re-render.
					const ctx = canvasRef.current.getContext("2d");
					if (ctx) {
						ctx.drawImage(
							cached.bitmap,
							0,
							0,
							canvasRef.current.width,
							canvasRef.current.height,
						);
						lastSceneRef.current = renderTree;
						lastFrameRef.current = frame;
						lastScaleRef.current = scale;
						// Move to end (most recently used) for LRU.
						frameCacheRef.current.delete(cacheKey);
						frameCacheRef.current.set(cacheKey, cached);
						return;
					}
				}

				renderingRef.current = true;
				pendingRenderRef.current = false;
				activeRenderFrameRef.current = frame;
				activeRenderSceneRef.current = renderTree;
				activeRenderScaleInputsRef.current = scaleInputs;
				renderStartRef.current = performance.now();
				const token = ++renderTokenRef.current;

				// Freeze: if playback is playing AND this is a scene/scale
				// change (not a routine frame advance), pause playback so the
				// video stays on the current frame instead of advancing with a
				// stale visual. Resume after.
				//
				// Only freeze for scene/scale changes — not for every frame
				// during normal playback. Freezing on every frame causes rapid
				// pause/play cycles that stutter audio (each pause stops audio
				// playback, each play re-inits the audio context + re-decodes).
				const isSceneChange =
					renderTree !== lastSceneRef.current || scale !== lastScaleRef.current;
				if (isPlaying && isSceneChange) {
					wasPlayingBeforeRenderRef.current = true;
					editor.playback.pause();
				}

				renderer
					.renderToCanvas({
						node: renderTree,
						time: renderTime,
						targetCanvas: canvasRef.current,
					})
					.then((timing) => {
						if (timing) {
							const averages = phaseMetricsRef.current.record(timing);
							if (averages) publishPreviewRenderMeasure(averages);
						}
						if (token === renderTokenRef.current && !pendingRenderRef.current) {
							lastSceneRef.current = renderTree;
							lastFrameRef.current = frame;
							lastScaleRef.current = scale;
							// Cache only settled paused/scrubbed frames. During playback the
							// sequential video cache already handles nearby frames; snapshotting
							// every composited frame adds GPU copies and memory pressure.
							if (!isPlaying && typeof createImageBitmap === "function") {
								const sourceCanvas = renderer.getOutputCanvas();
								const key = `${frame}:${scale.toFixed(3)}`;
								createImageBitmap(sourceCanvas)
									.then((bitmap) => {
										if (token !== renderTokenRef.current) {
											bitmap.close();
											return;
										}
										cachePreviewFrame({
											cache: frameCacheRef.current,
											key,
											entry: { bitmap, frame, scale },
										});
									})
									.catch(() => {
										// Large or resource-constrained canvases may reject snapshots.
									});
							}
						}
					})
					.catch(() => {
						// Release the lock on failure (e.g. the GPU is still warming
						// up, or a transient frame/device error) so the next frame
						// retries instead of leaving the preview permanently stuck.
					})
					.finally(() => {
						const duration = performance.now() - renderStartRef.current;
						perfTrackerRef.current.recordRender(duration);
						renderingRef.current = false;
						if (isLoadingRef.current && loadingOverlayRef.current) {
							isLoadingRef.current = false;
							loadingOverlayRef.current.style.opacity = "0";
						}
						// Resume playback if we froze it for this render.
						if (wasPlayingBeforeRenderRef.current) {
							wasPlayingBeforeRenderRef.current = false;
							editor.playback.play();
						}
					});
			}
		} finally {
			if (!isPlaying && !pendingRenderRef.current) {
				setNeedsRender(false);
			}
		}
	}, [
		renderer,
		renderTree,
		editor.playback,
		editor.timeline.getLastFrameTime,
		previewQuality,
		gpuDegraded,
		nativeWidth,
		nativeHeight,
	]);

	useRafLoop(render, rafEnabled);

	const performanceContextKey = [
		activeProject.metadata.id,
		activeProject.settings.fps.numerator,
		activeProject.settings.fps.denominator,
		nativeWidth,
		nativeHeight,
		gpuDegraded,
	].join("|");
	useEffect(() => {
		if (performanceContextRef.current === performanceContextKey) return;
		performanceContextRef.current = performanceContextKey;
		qualityGovernorRef.current.reset();
		perfTrackerRef.current.reset();
		lastScaleInputsRef.current = "";
		idleScaleRef.current = 0;
		lastScaleRef.current = -1;
		setNeedsRender(true);
	}, [performanceContextKey]);

	// Mark a render as needed when the render tree changes (e.g. user edits
	// the timeline, adds an effect, changes background). This re-enables the
	// rAF loop for one frame, which renders and then clears the flag.
	// Also invalidate the composited frame cache — cached frames belong to
	// the old render tree and must not be re-blitted after an edit.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional; this effect must run whenever the renderTree identity changes so the cached frame bitmaps are invalidated, even though the value itself is not read inside the body.
	useEffect(() => {
		setNeedsRender(true);
		clearPreviewFrameCache(frameCacheRef.current);
	}, [renderTree, setNeedsRender]);

	useEffect(() => {
		return () => clearPreviewFrameCache(frameCacheRef.current);
	}, []);

	// Mark a render as needed when the canvas size changes (panel resize).
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional; this effect must run whenever the canvas size changes to request a fresh render, even though the dimensions are not read inside the body.
	useEffect(() => {
		setNeedsRender(true);
	}, [nativeWidth, nativeHeight, setNeedsRender]);

	// When paused, listen for playback-seek events (scrubbing) and mark a
	// render as needed so the rAF loop re-enables for one frame. During
	// playback, the rAF loop is already enabled and doesn't need this.
	useEffect(() => {
		if (isPlaying) return;
		const onSeek = () => {
			setNeedsRender(true);
		};
		window.addEventListener("playback-seek", onSeek);
		window.addEventListener("playback-update", onSeek);
		return () => {
			window.removeEventListener("playback-seek", onSeek);
			window.removeEventListener("playback-update", onSeek);
		};
	}, [isPlaying]);

	// Loading overlay threshold check is now merged into the main render
	// callback (see the LOADING_THRESHOLD_MS check below). This eliminates
	// the second rAF loop that ran alongside the render loop, reducing
	// per-frame overhead by one rAF callback + one performance.now() call.

	// Register the live canvas with the global scope sampler so the
	// Scopes sub-tab in the Advanced card can read pixels from it.
	// The handle is updated on every size change and torn down on
	// unmount so scopes show the empty silhouette when the preview
	// isn't mounted (e.g. in a fullscreen pop-out).
	useEffect(() => {
		registerPreviewCanvas({
			canvas: canvasRef.current,
			width: nativeWidth,
			height: nativeHeight,
		});
		return () => {
			registerPreviewCanvas({ canvas: null, width: 0, height: 0 });
		};
	}, [nativeWidth, nativeHeight]);

	useEffect(() => {
		const container = viewportRef.current;
		if (!container) return;

		let pendingZoomDelta = 0;
		let pendingPanDeltaX = 0;
		let pendingPanDeltaY = 0;
		let zoomRafId: ReturnType<typeof requestAnimationFrame> | null = null;
		let panRafId: ReturnType<typeof requestAnimationFrame> | null = null;

		const onWheel = (event: WheelEvent) => {
			const normalizedDeltaX = normalizeWheelDelta({
				delta: event.deltaX,
				deltaMode: event.deltaMode,
				pageSize: container.clientWidth,
			});
			const normalizedDeltaY = normalizeWheelDelta({
				delta: event.deltaY,
				deltaMode: event.deltaMode,
				pageSize: container.clientHeight,
			});
			const isZoomGesture = event.ctrlKey || event.metaKey;
			if (isZoomGesture) {
				event.preventDefault();
				pendingZoomDelta += normalizedDeltaY;

				if (zoomRafId === null) {
					zoomRafId = requestAnimationFrame(() => {
						const cappedDelta =
							Math.sign(pendingZoomDelta) *
							Math.min(Math.abs(pendingZoomDelta), 30);
						const zoomFactor = Math.exp(-cappedDelta / 300);

						viewport.scaleZoom({ factor: zoomFactor });
						pendingZoomDelta = 0;
						zoomRafId = null;
					});
				}

				return;
			}

			if (!viewport.canPan) {
				return;
			}

			if (normalizedDeltaX === 0 && normalizedDeltaY === 0) {
				return;
			}

			event.preventDefault();
			pendingPanDeltaX += normalizedDeltaX;
			pendingPanDeltaY += normalizedDeltaY;

			if (panRafId === null) {
				panRafId = requestAnimationFrame(() => {
					viewport.panByScreenDelta({
						deltaX: pendingPanDeltaX,
						deltaY: pendingPanDeltaY,
					});
					pendingPanDeltaX = 0;
					pendingPanDeltaY = 0;
					panRafId = null;
				});
			}
		};

		container.addEventListener("wheel", onWheel, {
			capture: true,
			passive: false,
		});

		return () => {
			container.removeEventListener("wheel", onWheel, {
				capture: true,
			});
			if (zoomRafId !== null) {
				cancelAnimationFrame(zoomRafId);
			}
			if (panRafId !== null) {
				cancelAnimationFrame(panRafId);
			}
		};
	}, [viewport.canPan, viewport.panByScreenDelta, viewport.scaleZoom]);

	useEffect(() => {
		const handleToggle = () => {
			onToggleFullscreen();
		};
		window.addEventListener("oc:toggle-preview-fullscreen", handleToggle);
		return () => {
			window.removeEventListener("oc:toggle-preview-fullscreen", handleToggle);
		};
	}, [onToggleFullscreen]);

	return (
		<PreviewViewportProvider value={viewport}>
			<PreviewZoomBridge />
			<div className="flex size-full min-h-0 min-w-0 flex-col bg-transparent">
				<div className="flex min-h-0 min-w-0 flex-1 px-1 pt-1.5">
					<ContextMenu>
						<ContextMenuTrigger asChild>
							<div
								ref={viewportRef}
								className="group relative flex size-full min-h-0 min-w-0 items-center justify-center rounded-xl bg-[#070708] shadow-inner shadow-black/80 overflow-hidden"
							>
								<PreviewOverlayControls
									onToggleFullscreen={onToggleFullscreen}
								/>
								<canvas
									ref={canvasRef}
									className="absolute block rounded-md border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.72)]"
									style={{
										left: viewport.sceneLeft,
										top: viewport.sceneTop,
										width: viewport.sceneWidth,
										height: viewport.sceneHeight,
										filter: cssFilter === "none" ? undefined : cssFilter,
										background:
											activeProject.settings.background.type === "blur"
												? "transparent"
												: activeProject?.settings.background.color,
									}}
								/>
								{/* Loading overlay — toggled via direct DOM manipulation (ref)
								    to avoid React re-renders inside the rAF render loop. */}
								<div
									ref={loadingOverlayRef}
									aria-hidden
									className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-150 opacity-0"
								>
									<div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
										<Spinner className="size-3.5 text-white/80" />
										<span className="text-[0.7rem] font-medium text-white/80">
											Rendering…
										</span>
									</div>
								</div>
								<GuideOverlay />
								<MediaAssetPreview />
								<PreviewInteractionOverlay />
								{overlays.bookmarks && <BookmarkNoteOverlay />}
							</div>
						</ContextMenuTrigger>
						<PreviewContextMenu
							onToggleFullscreen={onToggleFullscreen}
							containerRef={containerRef}
						/>
					</ContextMenu>
				</div>
				<PreviewToolbar onToggleFullscreen={onToggleFullscreen} />
			</div>
		</PreviewViewportProvider>
	);
}

function PreviewOverlayControls({
	onToggleFullscreen,
}: {
	onToggleFullscreen: () => void;
}) {
	const { isAtFit, fitToScreen } = usePreviewViewport();
	const setAssetsTab = useAssetsPanelStore((s) => s.setActiveTab);
	const project = useEditor((e) => e.project.getActiveOrNull());
	const canvas = project?.settings.canvasSize;
	const aspectLabel = canvas ? formatAspectRatio(canvas) : "16:9";

	return (
		<div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-end gap-3">
			<div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-0.5 opacity-0 shadow-xl shadow-black/40 backdrop-blur-xl transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
				<button
					type="button"
					onClick={fitToScreen}
					className={cn(
						"h-6 rounded-md px-2 text-[0.62rem] transition hover:bg-white/8 hover:text-white",
						isAtFit ? "bg-white/10 text-white" : "text-white/70",
					)}
				>
					Fit
				</button>
				<button
					type="button"
					onClick={() => setAssetsTab("settings")}
					title="Canvas aspect ratio (open project settings)"
					className="h-6 rounded-md px-2 text-[0.62rem] text-white/70 hover:bg-white/8 hover:text-white"
				>
					{aspectLabel}
				</button>
				<button
					type="button"
					className="grid size-6 place-items-center rounded-md text-white/70 hover:bg-white/8 hover:text-white"
					onClick={onToggleFullscreen}
					aria-label="Fullscreen preview"
				>
					<HugeiconsIcon icon={FullScreenIcon} size={12} />
				</button>
				<button
					type="button"
					onClick={() => setAssetsTab("settings")}
					className="grid size-6 place-items-center rounded-md text-white/70 hover:bg-white/8 hover:text-white"
					aria-label="More preview tools"
				>
					<HugeiconsIcon icon={MoreHorizontalIcon} size={12} />
				</button>
			</div>
		</div>
	);
}

function formatAspectRatio({
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

/**
 * Bridges the editor header zoom dropdown (outside the viewport provider)
 * with the preview viewport via window events.
 */
function PreviewZoomBridge() {
	const { zoomPercent, isAtFit, setViewportPercent, fitToScreen } =
		usePreviewViewport();

	useEffect(() => {
		const onSet = (e: Event) => {
			const detail = (e as CustomEvent<{ percent?: number; fit?: boolean }>)
				.detail;
			if (detail?.fit) {
				fitToScreen();
			} else if (detail?.percent) {
				setViewportPercent({ percent: detail.percent });
			}
		};
		window.addEventListener("oc:set-preview-zoom", onSet);
		return () => window.removeEventListener("oc:set-preview-zoom", onSet);
	}, [fitToScreen, setViewportPercent]);

	useEffect(() => {
		window.dispatchEvent(
			new CustomEvent("oc:preview-zoom-changed", {
				detail: { zoomPercent, isAtFit },
			}),
		);
	}, [zoomPercent, isAtFit]);

	return null;
}
