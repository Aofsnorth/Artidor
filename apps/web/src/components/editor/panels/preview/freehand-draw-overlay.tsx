"use client";

import { useMemo } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import { pointsToSvgPath, simplifyPath } from "@/lib/graphics/path-utils";
import type { Point } from "@/lib/graphics/path-utils";

export interface FreehandDrawOverlayProps {
	points: Point[];
	/**
	 * Stroke colour the user has picked for this stroke. Mirrors the
	 * freehand-graphic element's `stroke` param so the live preview
	 * matches the shape that will be committed on pointer up.
	 */
	stroke?: string;
	/**
	 * Stroke width the user has picked (in source coords). Mirrors the
	 * `strokeWidth` param on the freehand graphic.
	 */
	strokeWidth?: number;
}

/**
 * Live SVG preview of an in-progress freehand stroke. Renders directly
 * on top of the preview canvas, transforming 512x512 source coordinates
 * back to screen coordinates using the same viewport math as the main
 * canvas — so the live preview aligns pixel-perfect with the eventual
 * committed graphic.
 *
 * Also renders a small anchor dot at the most recent pointer position
 * so the user gets immediate visual feedback the moment they touch the
 * canvas (before they've even dragged far enough to commit a stroke).
 * Without this, single-clicks and slow drags look like a black flicker
 * because the canvas-underneath is briefly exposed through the empty
 * overlay.
 */
export function FreehandDrawOverlay({
	points,
	stroke = "#ffffff",
	strokeWidth = 4,
}: FreehandDrawOverlayProps) {
	const viewport = usePreviewViewport();

	const { path, cursor } = useMemo(() => {
		if (points.length < 1) return { path: "", cursor: null };
		// Simplify + smooth the same way the committed path will be, so
		// the live preview matches the final shape 1:1.
		const simplified = points.length > 4 ? simplifyPath(points, 2) : points;
		const d = pointsToSvgPath(simplified);
		return { path: d, cursor: points[points.length - 1] };
	}, [points]);

	if (points.length < 1) return null;

	// Position the SVG over the canvas, sized to match the canvas in screen
	// pixels so the 512x512 source coords map to the visible area.
	const scale = viewport.getDisplayScale();
	const width = viewport.sceneWidth * scale.x;
	const height = viewport.sceneHeight * scale.y;
	const left = viewport.sceneLeft;
	const top = viewport.sceneTop;

	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute"
			style={{
				left,
				top,
				width,
				height,
				overflow: "visible",
			}}
			viewBox={`0 0 ${DEFAULT_GRAPHIC_SOURCE_SIZE} ${DEFAULT_GRAPHIC_SOURCE_SIZE}`}
			preserveAspectRatio="none"
		>
			<title>Freehand stroke preview</title>
			{path && (
				<path
					d={path}
					fill="none"
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeLinejoin="round"
					opacity={0.9}
				/>
			)}
			{cursor && (
				<circle
					cx={cursor.x}
					cy={cursor.y}
					r={Math.max(2, strokeWidth / 2)}
					fill={stroke}
					opacity={0.9}
				/>
			)}
		</svg>
	);
}
