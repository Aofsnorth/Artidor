import type { Point } from "@/lib/graphics/path-utils";

export interface NormalizedFreehand {
	/** Points recentred into the source square (0..sourceSize). */
	localPoints: Point[];
	/** Element scale (1/k) that undoes any shrink applied to fit the source. */
	elementScale: number;
	/** Stroke-width multiplier (k) so apparent width is unchanged after scale. */
	strokeScale: number;
	/** Element canvas position (logical px) so it renders where it was drawn. */
	position: { x: number; y: number };
}

function bbox(points: Point[]) {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	for (const p of points) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	return { minX, minY, maxX, maxY };
}

/**
 * Recentre a freehand path (in 512² source coords) so its bbox sits at the
 * source centre, shrinking only if it overflows the source. Returns the local
 * path plus the element transform that places it back exactly where it was
 * drawn. This is what stops edge strokes on a non-square canvas from being
 * clipped by the fixed-size source buffer.
 */
export function normalizeStandaloneFreehand({
	points,
	sourceSize,
	strokeWidth,
	canvasWidth,
	canvasHeight,
}: {
	points: Point[];
	sourceSize: number;
	strokeWidth: number;
	canvasWidth: number;
	canvasHeight: number;
}): NormalizedFreehand {
	const half = sourceSize / 2;
	const padding = strokeWidth / 2;
	const b = bbox(points);
	const pathCx = (b.minX + b.maxX) / 2;
	const pathCy = (b.minY + b.maxY) / 2;
	const extent = Math.max(
		b.maxX - b.minX + padding * 2,
		b.maxY - b.minY + padding * 2,
		1,
	);
	const k = extent > sourceSize ? (sourceSize * 0.95) / extent : 1;
	const localPoints = points.map((p) => ({
		x: (p.x - pathCx) * k + half,
		y: (p.y - pathCy) * k + half,
	}));
	const containScale =
		canvasWidth > 0 && canvasHeight > 0
			? Math.min(canvasWidth, canvasHeight) / sourceSize
			: 1;
	return {
		localPoints,
		elementScale: 1 / k,
		strokeScale: k,
		position: {
			x: (pathCx - half) * containScale,
			y: (pathCy - half) * containScale,
		},
	};
}
