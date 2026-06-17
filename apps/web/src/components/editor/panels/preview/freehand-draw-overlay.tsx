"use client";

import { useMemo } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import { pointsToSvgPath, simplifyPath } from "@/lib/graphics/path-utils";
import type { Point } from "@/lib/graphics/path-utils";

export interface FreehandDrawOverlayProps {
	points: Point[];
}

/**
 * Live SVG preview of an in-progress freehand stroke. Renders directly
 * on top of the preview canvas, transforming 512x512 source coordinates
 * back to screen coordinates using the same viewport math as the main
 * canvas — so the live preview aligns pixel-perfect with the eventual
 * committed graphic.
 */
export function FreehandDrawOverlay({ points }: FreehandDrawOverlayProps) {
	const viewport = usePreviewViewport();

	const { path, viewBox } = useMemo(() => {
		if (points.length < 1) {
			return { path: "", viewBox: "0 0 1 1" };
		}

		// Simplify + smooth the same way the committed path will be, so
		// the live preview matches the final shape 1:1.
		const simplified =
			points.length > 4 ? simplifyPath(points, 2) : points;
		const d = pointsToSvgPath(simplified);

		// Compute the path's bounding box for a tight viewBox
		let minX = simplified[0].x;
		let minY = simplified[0].y;
		let maxX = simplified[0].x;
		let maxY = simplified[0].y;
		for (const p of simplified) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
		}
		const padding = 8;
		return {
			path: d,
			viewBox: `${minX - padding} ${minY - padding} ${
				Math.max(maxX - minX, 1) + padding * 2
			} ${Math.max(maxY - minY, 1) + padding * 2}`,
		};
	}, [points]);

	if (!path) return null;

	// Position the SVG over the canvas, sized to match the canvas in screen
	// pixels so the 512x512 source coords map to the visible area.
	const scale = viewport.getDisplayScale();
	const width = viewport.sceneWidth * scale.x;
	const height = viewport.sceneHeight * scale.y;
	const left = viewport.sceneLeft;
	const top = viewport.sceneTop;

	return (
		<svg
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
			<path
				d={path}
				fill="none"
				stroke="#ffffff"
				strokeWidth={4}
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={0.9}
			/>
		</svg>
	);
}
