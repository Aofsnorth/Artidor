"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useToolModeStore } from "@/stores/tool-mode-store";
import { buildGraphicElement } from "@/lib/timeline";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import {
	pointsToSvgPath,
	simplifyPath,
	type Point,
} from "@/lib/graphics/path-utils";
import { canvasLogicalToGraphicSource } from "@/lib/preview/preview-coords";
import { normalizeStandaloneFreehand } from "@/lib/graphics/freehand-normalize";
import { useColorPaletteStore } from "@/stores/color-palette-store";

const MIN_POINT_DISTANCE_SQ = 4; // Skip pointer events closer than 2px to avoid duplicate samples

function computeBoundingBox({
	points,
}: {
	points: Point[];
}): { minX: number; minY: number; maxX: number; maxY: number } {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const point of points) {
		if (point.x < minX) minX = point.x;
		if (point.y < minY) minY = point.y;
		if (point.x > maxX) maxX = point.x;
		if (point.y > maxY) maxY = point.y;
	}
	return { minX, minY, maxX, maxY };
}

export interface FreehandDrawState {
	/** Currently-being-drawn path (in 512x512 source coords). null when idle. */
	currentPath: Point[] | null;
	/** True while the user is actively drawing (pointer down). */
	isDrawing: boolean;
}

export interface UseFreehandDrawResult extends FreehandDrawState {
	handlePointerDown: (event: React.PointerEvent) => void;
	handlePointerMove: (event: React.PointerEvent) => void;
	handlePointerUp: (event: React.PointerEvent) => void;
}

/**
 * Freehand vector drawing hook. Captures pointer events on the preview
 * canvas, converts screen → canvas → 512x512 source coordinates, accumulates
 * path points, and on pointer up creates a new GraphicElement using the
 * "freehand" graphic definition with the smoothed SVG path as `pathData`.
 *
 * The path is simplified (Ramer-Douglas-Peucker) and smoothed (Catmull-Rom
 * → cubic Bezier) before being stored, so even a rough scribble becomes a
 * clean vector path with few control points.
 *
 * Stroke colour, width, and (when closed) fill are read from the tool
 * mode store so the committed shape matches the live preview the user
 * has been tweaking in the right-hand config panel.
 */
export function useFreehandDraw(): UseFreehandDrawResult {
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const drawConfig = useToolModeStore((s) => s.drawConfig);
	const addRecentColor = useColorPaletteStore((s) => s.addRecentColor);
	const [currentPath, setCurrentPath] = useState<Point[] | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const pointerIdRef = useRef<number | null>(null);
	const lastPointRef = useRef<Point | null>(null);

	/**
	 * Convert a pointer event's client coordinates to the 512x512 source
	 * coordinate space used by graphic definitions. Returns null when the
	 * event is outside the canvas.
	 */
	const eventToSourceCoords = useCallback(
		(event: React.PointerEvent): Point | null => {
			const canvas = viewport.screenToCanvas({
				clientX: event.clientX,
				clientY: event.clientY,
			});
			if (!canvas) return null;

			const scale = viewport.getDisplayScale();
			const canvasWidth = scale.x > 0 ? viewport.sceneWidth / scale.x : 0;
			const canvasHeight = scale.y > 0 ? viewport.sceneHeight / scale.y : 0;
			if (canvasWidth <= 0 || canvasHeight <= 0) return null;

			return canvasLogicalToGraphicSource({
				canvasX: canvas.x,
				canvasY: canvas.y,
				canvasWidth,
				canvasHeight,
				sourceSize: DEFAULT_GRAPHIC_SOURCE_SIZE,
			});
		},
		[viewport],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			if (event.button !== 0) return;
			const point = eventToSourceCoords(event);
			if (!point) return;

			event.preventDefault();
			event.stopPropagation();

			try {
				(event.target as Element).setPointerCapture?.(event.pointerId);
			} catch {
				// Pointer capture can fail if the pointer is no longer active
				// (e.g. touch released before the handler ran). Drawing still
				// works without capture — pointerup just may not bubble here.
			}
			pointerIdRef.current = event.pointerId;
			lastPointRef.current = point;
			setIsDrawing(true);
			setCurrentPath([point]);
		},
		[eventToSourceCoords],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent) => {
			if (!isDrawing || pointerIdRef.current !== event.pointerId) return;
			const point = eventToSourceCoords(event);
			if (!point) return;

			// Skip points too close to the previous one to keep the polyline
			// sparse (prevents 100s of duplicate samples on slow drags).
			const last = lastPointRef.current;
			if (last) {
				const dx = point.x - last.x;
				const dy = point.y - last.y;
				if (dx * dx + dy * dy < MIN_POINT_DISTANCE_SQ) return;
			}

			lastPointRef.current = point;
			setCurrentPath((prev) => (prev ? [...prev, point] : [point]));
		},
		[isDrawing, eventToSourceCoords],
	);

	// Ref to access latest currentPath from handlePointerUp without re-binding
	const currentPathRef = useRef<Point[] | null>(null);
	currentPathRef.current = currentPath;

	/**
	 * Commit the current drawing to the timeline. Extracted from
	 * handlePointerUp so it can also be called from the document-level
	 * pointerup fallback listener below.
	 */
	const commitDrawing = useCallback(() => {
		const rawPath = currentPathRef.current;
		if (!rawPath || rawPath.length < 2) return false;

		try {
			const simplified = simplifyPath(rawPath, 2);
			const svgPath = pointsToSvgPath(simplified, 0, drawConfig.closed);
			if (!svgPath) return false;

			// Remember the colours actually used so the palette's recents row
			// reflects the user's drawing history.
			addRecentColor(drawConfig.stroke);
			if (drawConfig.closed && drawConfig.fill !== "transparent") {
				addRecentColor(drawConfig.fill);
			}

			const selectedElements = editor.selection.getSelectedElements();
			const selectedElement =
				selectedElements.length === 1 ? selectedElements[0] : null;
			const selectedTrack = selectedElement
				? editor.timeline.getTrackById({ trackId: selectedElement.trackId })
				: null;
			const selected =
				selectedTrack?.elements.find(
					(trackElement) => trackElement.id === selectedElement?.elementId,
				) ?? null;

			const project = editor.project.getActive();
			const canvasSize = project?.settings.canvasSize;
			const canvasWidth = canvasSize?.width ?? 0;
			const canvasHeight = canvasSize?.height ?? 0;

			let drawingPath = svgPath;
			if (
				selected &&
				(selected.type === "image" || selected.type === "video") &&
				canvasWidth > 0 &&
				canvasHeight > 0
			) {
				const media = editor.media
					.getAssets()
					.find((asset) => asset.id === selected.mediaId);
				const mediaWidth = media?.width ?? 0;
				const mediaHeight = media?.height ?? 0;
				if (mediaWidth > 0 && mediaHeight > 0) {
					const sourceSize = DEFAULT_GRAPHIC_SOURCE_SIZE;
					const elementWidth = mediaWidth * selected.transform.scaleX;
					const elementHeight = mediaHeight * selected.transform.scaleY;
					const elementCenterSourceX =
						(selected.transform.position.x / canvasWidth) * sourceSize +
						sourceSize / 2;
					const elementCenterSourceY =
						(selected.transform.position.y / canvasHeight) * sourceSize +
						sourceSize / 2;
					const pointsForLocal = simplified.map((point) => ({
						x: point.x - elementCenterSourceX,
						y: point.y - elementCenterSourceY,
					}));
					const localBoundingBox = computeBoundingBox({ points: pointsForLocal });
					const padding = drawConfig.strokeWidth / 2;
					const boundingWidth =
						localBoundingBox.maxX - localBoundingBox.minX + padding * 2;
					const boundingHeight =
						localBoundingBox.maxY - localBoundingBox.minY + padding * 2;
					const scaleX = boundingWidth > 0 ? elementWidth / boundingWidth : 1;
					const scaleY =
						boundingHeight > 0 ? elementHeight / boundingHeight : 1;
					const localSvg = pointsToSvgPath(pointsForLocal, 0, drawConfig.closed);
					if (localSvg) {
						drawingPath = localSvg;
					}
					const element = buildGraphicElement({
						definitionId: "freehand",
						name: drawConfig.closed ? "Shape" : "Drawing",
						startTime: editor.playback.getCurrentTime(),
						params: {
							fill:
								drawConfig.closed && drawConfig.fill !== "transparent"
									? drawConfig.fill
									: "rgba(0,0,0,0)",
							stroke: drawConfig.stroke,
							strokeWidth: drawConfig.strokeWidth,
							strokeOpacity: drawConfig.opacity,
							strokeAlign: drawConfig.strokeAlign,
							strokeDash: drawConfig.strokeDash,
							strokeTaper: drawConfig.strokeTaper,
							pathData: drawingPath,
							closed: drawConfig.closed,
						},
					});
					element.parentId = selected.id;
					element.transform = {
						...element.transform,
						position: {
							x: selected.transform.position.x,
							y: selected.transform.position.y,
						},
						scaleX,
						scaleY,
					};
					editor.timeline.insertElement({
						placement: { mode: "auto" },
						element,
					});
					return true;
				}
			}

			// Standalone (not media-parented) drawing. The drawn points are in
			// 512² source coords mapped via a contain-fit (min(w,h)/512). On a
			// non-square canvas the left/right (or top/bottom) margins fall
			// OUTSIDE [0,512], so a stroke drawn near an edge would be clipped by
			// the 512² offscreen buffer and vanish. Recenter the path into the
			// source and place/scale the element so it renders where it was drawn.
			const normalized = normalizeStandaloneFreehand({
				points: simplified,
				sourceSize: DEFAULT_GRAPHIC_SOURCE_SIZE,
				strokeWidth: drawConfig.strokeWidth,
				canvasWidth,
				canvasHeight,
			});
			const localSvgPath =
				pointsToSvgPath(normalized.localPoints, 0, drawConfig.closed) ??
				drawingPath;

			const element = buildGraphicElement({
				definitionId: "freehand",
				name: drawConfig.closed ? "Shape" : "Drawing",
				startTime: editor.playback.getCurrentTime(),
				params: {
					fill:
						drawConfig.closed && drawConfig.fill !== "transparent"
							? drawConfig.fill
							: "rgba(0,0,0,0)",
					stroke: drawConfig.stroke,
					// Stroke is in source units; multiply by k so apparent width is
					// unchanged after the element is scaled back by 1/k.
					strokeWidth: drawConfig.strokeWidth * normalized.strokeScale,
					strokeOpacity: drawConfig.opacity,
					strokeAlign: drawConfig.strokeAlign,
					strokeDash: drawConfig.strokeDash,
					strokeTaper: drawConfig.strokeTaper,
					pathData: localSvgPath,
					closed: drawConfig.closed,
				},
			});
			element.transform = {
				...element.transform,
				position: normalized.position,
				scaleX: normalized.elementScale,
				scaleY: normalized.elementScale,
			};

			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
			return true;
		} catch (error) {
			console.error("[useFreehandDraw] Failed to commit drawing:", error);
			return false;
		}
	}, [drawConfig, editor, addRecentColor]);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent) => {
			if (!isDrawing || pointerIdRef.current !== event.pointerId) return;

			try {
				(event.target as Element).releasePointerCapture?.(event.pointerId);
			} catch {
				// Release can throw if the pointer was already released.
			}
			pointerIdRef.current = null;
			lastPointRef.current = null;
			setIsDrawing(false);
			setCurrentPath(null);

			commitDrawing();
		},
		[isDrawing, commitDrawing],
	);

	/**
	 * Document-level fallback: if pointer capture causes the pointerup event
	 * to bypass the React handler entirely, this native listener at the
	 * document root still catches it. Without this, certain browser /
	 * trackpad combos silently drop the React pointerup after a fast drag,
	 * leaving the overlay stuck in "drawing" state until the next click.
	 */
	useEffect(() => {
		if (!isDrawing) return;

		const onDocPointerUp = (event: PointerEvent) => {
			if (pointerIdRef.current !== event.pointerId) return;
			pointerIdRef.current = null;
			lastPointRef.current = null;
			setIsDrawing(false);
			setCurrentPath(null);
			commitDrawing();
		};

		document.addEventListener("pointerup", onDocPointerUp);
		document.addEventListener("pointercancel", onDocPointerUp);
		return () => {
			document.removeEventListener("pointerup", onDocPointerUp);
			document.removeEventListener("pointercancel", onDocPointerUp);
		};
	}, [isDrawing, commitDrawing]);

	return {
		currentPath,
		isDrawing,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}
