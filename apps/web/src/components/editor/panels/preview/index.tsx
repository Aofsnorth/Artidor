"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
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
import { registerPreviewCanvas } from "@/stores/preview-canvas-scope";
import { cn } from "@/utils/ui";

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

	useDeepCompareEffect(() => {
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
	}, [tracks, mediaAssets, activeProject?.settings.background, width, height]);

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
			fps: activeProject.settings.fps,
		});
	}, [
		nativeWidth,
		nativeHeight,
		activeProject.settings.fps.numerator,
		activeProject.settings.fps.denominator,
		activeProject.settings.fps,
	]);

	const cssFilter = useSelectedElementCssFilter();

	const render = useCallback(() => {
		if (canvasRef.current && renderTree && !renderingRef.current) {
			const renderTime = Math.min(
				editor.playback.getCurrentTime(),
				editor.timeline.getLastFrameTime(),
			);
			const ticksPerFrame = Math.round(
				(TICKS_PER_SECOND * renderer.fps.denominator) / renderer.fps.numerator,
			);
			const frame = Math.floor(renderTime / ticksPerFrame);

			// Resolution scaling: render the preview at a fraction of project
			// resolution (and cap video decode to match) on weak machines /
			// during playback. The output canvas keeps its native size and the
			// compositor result is stretched up on blit — cheap, and the whole
			// transform pipeline derives from renderer.width/height so it all
			// scales coherently. Decode cap follows the *idle* tier so play/pause
			// never rebuilds the video decoder.
			const isPlaying = editor.playback.getIsPlaying();
			const scale = resolvePreviewScale({
				quality: previewQuality,
				isPlaying,
				gpuDegraded,
			});
			const idleScale = resolvePreviewScale({
				quality: previewQuality,
				isPlaying: false,
				gpuDegraded,
			});
			renderer.setSize({
				width: Math.max(2, Math.round(nativeWidth * scale)),
				height: Math.max(2, Math.round(nativeHeight * scale)),
			});
			renderer.maxSourceDim = resolveDecodeMaxDim({
				renderWidth: nativeWidth,
				renderHeight: nativeHeight,
				scale: idleScale,
			});

			// Re-render the same frame when scale changes (e.g. pause → sharpen).
			if (
				frame !== lastFrameRef.current ||
				renderTree !== lastSceneRef.current ||
				scale !== lastScaleRef.current
			) {
				renderingRef.current = true;
				lastSceneRef.current = renderTree;
				lastFrameRef.current = frame;
				lastScaleRef.current = scale;
				renderer
					.renderToCanvas({
						node: renderTree,
						time: renderTime,
						targetCanvas: canvasRef.current,
					})
					.then(() => {
						renderingRef.current = false;
					})
					.catch(() => {
						// Release the lock on failure (e.g. the GPU is still warming
						// up, or a transient frame/device error) so the next frame
						// retries instead of leaving the preview permanently stuck.
						renderingRef.current = false;
					});
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

	useRafLoop(render);

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
									width={nativeWidth}
									height={nativeHeight}
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
						"h-6 rounded-md px-2 text-[0.62rem] transition hover:bg-white/[0.08] hover:text-white",
						isAtFit ? "bg-white/[0.1] text-white" : "text-white/70",
					)}
				>
					Fit
				</button>
				<button
					type="button"
					onClick={() => setAssetsTab("settings")}
					title="Canvas aspect ratio (open project settings)"
					className="h-6 rounded-md px-2 text-[0.62rem] text-white/70 hover:bg-white/[0.08] hover:text-white"
				>
					{aspectLabel}
				</button>
				<button
					type="button"
					className="grid size-6 place-items-center rounded-md text-white/70 hover:bg-white/[0.08] hover:text-white"
					onClick={onToggleFullscreen}
					aria-label="Fullscreen preview"
				>
					<HugeiconsIcon icon={FullScreenIcon} size={12} />
				</button>
				<button
					type="button"
					onClick={() => setAssetsTab("settings")}
					className="grid size-6 place-items-center rounded-md text-white/70 hover:bg-white/[0.08] hover:text-white"
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
