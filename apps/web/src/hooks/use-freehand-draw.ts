"use client";

import { useCallback, useRef, useState } from "react";
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

const MIN_POINT_DISTANCE_SQ = 4; // Skip pointer events closer than 2px to avoid duplicate samples

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

			const canvasWidth = viewport.sceneWidth;
			const canvasHeight = viewport.sceneHeight;
			if (canvasWidth <= 0 || canvasHeight <= 0) return null;

			return {
				x: (canvas.x / canvasWidth) * DEFAULT_GRAPHIC_SOURCE_SIZE,
				y: (canvas.y / canvasHeight) * DEFAULT_GRAPHIC_SOURCE_SIZE,
			};
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

			(event.target as Element).setPointerCapture?.(event.pointerId);
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

	const handlePointerUp = useCallback(
		(event: React.PointerEvent) => {
			if (!isDrawing || pointerIdRef.current !== event.pointerId) return;

			(event.target as Element).releasePointerCapture?.(event.pointerId);
			pointerIdRef.current = null;
			lastPointRef.current = null;
			setIsDrawing(false);

			// Commit the drawing — build the element from the captured path
			const rawPath = currentPathRef.current ?? currentPath;
			setCurrentPath(null);
			if (!rawPath || rawPath.length < 2) return;

			const simplified = simplifyPath(rawPath, 2);
			const svgPath = pointsToSvgPath(simplified, 0, drawConfig.closed);
			if (!svgPath) return;

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
					strokeAlign: "center",
					pathData: svgPath,
					closed: drawConfig.closed,
				},
			});

			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
		},
		[isDrawing, currentPath, drawConfig, editor],
	);

	// Ref to access latest currentPath from handlePointerUp without re-binding
	const currentPathRef = useRef<Point[] | null>(null);
	currentPathRef.current = currentPath;

	return {
		currentPath,
		isDrawing,
		handlePointerDown,
		handlePointerMove,
		handlePointerUp,
	};
}
