"use client";

import { useMemo } from "react";
import { usePreviewViewport } from "@/components/editor/panels/preview/preview-viewport";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import { pointsToSvgPath, type Point } from "@/lib/graphics/path-utils";

export interface VectorDrawOverlayProps {
	anchors: Point[];
	/** Current pointer position in source coords (for the rubber-band
	 *  preview line that follows the cursor between anchor clicks). */
	cursor: Point | null;
	stroke: string;
	strokeWidth: number;
}

/**
 * Live overlay for the pen-tool style vector draw. Renders the
 * polyline connecting all placed anchors plus a thin "rubber-band"
 * line from the last anchor to the current cursor position so the
 * user can see where the next segment will land.
 *
 * The first anchor is highlighted with a slightly larger filled
 * circle to communicate "click here to close the path".
 */
export function VectorDrawOverlay({
	anchors,
	cursor,
	stroke,
	strokeWidth,
}: VectorDrawOverlayProps) {
	const viewport = usePreviewViewport();

	const path = useMemo(() => {
		if (anchors.length === 0) return "";
		const preview = cursor ? [...anchors, cursor] : anchors;
		return pointsToSvgPath(preview, 0, false);
	}, [anchors, cursor]);

	const scale = viewport.getDisplayScale();
	const width = viewport.sceneWidth * scale.x;
	const height = viewport.sceneHeight * scale.y;
	const left = viewport.sceneLeft;
	const top = viewport.sceneTop;

	if (anchors.length === 0 && !cursor) return null;

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
			<title>Vector path preview</title>
			{path && (
				<path
					d={path}
					fill="none"
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeLinejoin="round"
					opacity={cursor ? 0.55 : 0.9}
				/>
			)}
			{anchors.map((anchor, index) => {
				const isFirst = index === 0;
				const r = isFirst ? 6 : 4;
				return (
					<g key={`${anchor.x.toFixed(2)}-${anchor.y.toFixed(2)}`}>
						<rect
							x={anchor.x - r}
							y={anchor.y - r}
							width={r * 2}
							height={r * 2}
							fill={isFirst ? stroke : "rgba(0,0,0,0)"}
							stroke={stroke}
							strokeWidth={1.5}
							opacity={0.9}
						/>
					</g>
				);
			})}
			{cursor && (
				<circle cx={cursor.x} cy={cursor.y} r={2} fill={stroke} opacity={0.7} />
			)}
		</svg>
	);
}
