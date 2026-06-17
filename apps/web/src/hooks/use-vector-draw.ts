"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { useToolModeStore } from "@/stores/tool-mode-store";
import { buildGraphicElement } from "@/lib/timeline";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import { pointsToSvgPath, type Point } from "@/lib/graphics/path-utils";

export interface VectorDrawState {
	/** Sequence of anchor points in 512x512 source coords. */
	anchors: Point[];
	/** True while the user is mid-stroke (a click was placed but not
	 *  yet finished via double-click, Enter, or close-on-first-point). */
	isOpen: boolean;
}

export interface UseVectorDrawResult extends VectorDrawState {
	handlePointerDown: (event: React.PointerEvent) => void;
	handlePointerMove: (event: React.PointerEvent) => void;
	handleDoubleClick: (event: React.MouseEvent) => void;
	handleKeyDown: (event: KeyboardEvent) => void;
	reset: () => void;
}

/**
 * Pen-tool style vector drawing hook (à la Alight Motion's Vector /
 * Photoshop's Pen tool). Each click adds an anchor; the path is
 * smoothed via Catmull-Rom → cubic Bezier on commit. Users can:
 *  - click an anchor to add a new one
 *  - click the first anchor to close the path
 *  - press Enter or double-click to finish
 *  - press Escape to cancel
 *
 * The resulting graphic is inserted as a `freehand` definition with
 * the `closed` param derived from the toggle state, so the same
 * renderer is reused (no new graphic definition required).
 */
export function useVectorDraw(): UseVectorDrawResult {
	const editor = useEditor();
	const viewport = usePreviewViewport();
	const drawConfig = useToolModeStore((s) => s.drawConfig);
	const [anchors, setAnchors] = useState<Point[]>([]);
	const lastEventRef = useRef<{
		clientX: number;
		clientY: number;
		pointerId: number;
	} | null>(null);

	const eventToSourceCoords = useCallback(
		(event: React.PointerEvent | React.MouseEvent): Point | null => {
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

	const commit = useCallback(
		(points: Point[], closed: boolean) => {
			if (points.length < 2) return;
			const svgPath = pointsToSvgPath(points, 0, closed);
			if (!svgPath) return;
			const element = buildGraphicElement({
				definitionId: "freehand",
				name: closed ? "Vector Shape" : "Vector Path",
				startTime: editor.playback.getCurrentTime(),
				params: {
					fill:
						closed && drawConfig.fill !== "transparent"
							? drawConfig.fill
							: "rgba(0,0,0,0)",
					stroke: drawConfig.stroke,
					strokeWidth: drawConfig.strokeWidth,
					strokeAlign: "center",
					pathData: svgPath,
					closed,
				},
			});
			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
		},
		[drawConfig, editor],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent) => {
			if (event.button !== 0) return;
			const point = eventToSourceCoords(event);
			if (!point) return;
			event.preventDefault();
			event.stopPropagation();

			lastEventRef.current = {
				clientX: event.clientX,
				clientY: event.clientY,
				pointerId: event.pointerId,
			};

			setAnchors((prev) => {
				// Close the path when clicking near the first anchor.
				if (prev.length >= 2) {
					const first = prev[0];
					if (first) {
						const dx = point.x - first.x;
						const dy = point.y - first.y;
						// 12px in source coords is a comfortable click target
						// given the canvas-zoomed view.
						if (dx * dx + dy * dy < 12 * 12) {
							commit(prev, true);
							return [];
						}
					}
				}
				return [...prev, point];
			});
		},
		[eventToSourceCoords, commit],
	);

	const handlePointerMove = useCallback((event: React.PointerEvent) => {
		// Hover preview could draw a "rubber-band" line from the
		// last anchor to the cursor. Currently a no-op — the
		// overlay already shows the in-progress polyline. Keeping
		// the hook surface stable so the preview can be added
		// later without touching every call site.
		lastEventRef.current = {
			clientX: event.clientX,
			clientY: event.clientY,
			pointerId: event.pointerId,
		};
	}, []);

	const handleDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();
			setAnchors((prev) => {
				if (prev.length >= 2) {
					commit(prev, false);
				}
				return [];
			});
		},
		[commit],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === "Enter") {
				setAnchors((prev) => {
					if (prev.length >= 2) {
						commit(prev, false);
					}
					return [];
				});
			} else if (event.key === "Escape") {
				setAnchors([]);
			} else if (event.key === "Backspace") {
				setAnchors((prev) => prev.slice(0, -1));
			}
		},
		[commit],
	);

	const reset = useCallback(() => setAnchors([]), []);

	return {
		anchors,
		isOpen: anchors.length > 0,
		handlePointerDown,
		handlePointerMove,
		handleDoubleClick,
		handleKeyDown,
		reset,
	};
}
