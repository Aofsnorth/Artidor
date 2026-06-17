/**
 * Utilities for converting raw pointer samples into smooth SVG path data.
 *
 * Pipeline:
 *   1. Ramer-Douglas-Peucker simplification — removes redundant points while
 *      preserving the overall shape. Reduces a 200-point scribble to ~20-40
 *      significant vertices.
 *   2. Catmull-Rom → cubic Bezier conversion — produces smooth C1-continuous
 *      curves through every remaining point.
 *   3. SVG path `d` string generation — the final output is a standard SVG
 *      path string that can be fed directly into `new Path2D(d)`.
 */

export interface Point {
	x: number;
	y: number;
}

// ---------------------------------------------------------------------------
// Ramer-Douglas-Peucker simplification
// ---------------------------------------------------------------------------

function perpendicularDistance(
	point: Point,
	lineStart: Point,
	lineEnd: Point,
): number {
	const dx = lineEnd.x - lineStart.x;
	const dy = lineEnd.y - lineStart.y;
	const lengthSq = dx * dx + dy * dy;

	if (lengthSq === 0) {
		// lineStart and lineEnd are the same point
		const ex = point.x - lineStart.x;
		const ey = point.y - lineStart.y;
		return Math.sqrt(ex * ex + ey * ey);
	}

	const t =
		((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSq;
	const clampedT = Math.max(0, Math.min(1, t));
	const projX = lineStart.x + clampedT * dx;
	const projY = lineStart.y + clampedT * dy;
	const ex = point.x - projX;
	const ey = point.y - projY;
	return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Simplify a polyline using the Ramer-Douglas-Peucker algorithm.
 * @param points - Raw pointer samples
 * @param epsilon - Tolerance in pixels. Larger = fewer points. 2-3 is a good
 *   default for pen input; 1 for precision work.
 */
export function simplifyPath(points: Point[], epsilon = 2): Point[] {
	if (points.length <= 2) return points.slice();

	// Find the point with the maximum distance from the line between first and last
	let maxDist = 0;
	let maxIndex = 0;
	const first = points[0];
	const last = points[points.length - 1];

	for (let i = 1; i < points.length - 1; i++) {
		const d = perpendicularDistance(points[i], first, last);
		if (d > maxDist) {
			maxDist = d;
			maxIndex = i;
		}
	}

	if (maxDist > epsilon) {
		// Recursively simplify both halves
		const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon);
		const right = simplifyPath(points.slice(maxIndex), epsilon);
		return [...left.slice(0, -1), ...right];
	}

	// All intermediate points are within tolerance — drop them
	return [first, last];
}

// ---------------------------------------------------------------------------
// Catmull-Rom → cubic Bezier conversion
// ---------------------------------------------------------------------------

/**
 * Convert a sequence of points to a smooth cubic Bezier SVG path string.
 * Uses Catmull-Rom interpolation so the curve passes through every point.
 *
 * @param points - Simplified points (from `simplifyPath`)
 * @param tension - Curve tension. 0 = Catmull-Rom (default), higher = tighter
 * @param closed - Whether to close the path (loop back to start)
 * @returns SVG path `d` attribute string
 */
export function pointsToSvgPath(
	points: Point[],
	tension = 0,
	closed = false,
): string {
	if (points.length === 0) return "";
	if (points.length === 1) {
		return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
	}
	if (points.length === 2) {
		return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[1].x)} ${fmt(points[1].y)}`;
	}

	const n = points.length;
	const parts: string[] = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`];

	// alpha controls the tension: 0 = Catmull-Rom, 1 = straight lines
	const alpha = 1 - tension;

	for (let i = 0; i < n - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[Math.min(n - 1, i + 1)];
		const p3 = points[Math.min(n - 1, i + 2)];

		// Control point 1: tangent at p1
		const cp1x = p1.x + ((p2.x - p0.x) * alpha) / 6;
		const cp1y = p1.y + ((p2.y - p0.y) * alpha) / 6;

		// Control point 2: tangent at p2
		const cp2x = p2.x - ((p3.x - p1.x) * alpha) / 6;
		const cp2y = p2.y - ((p3.y - p1.y) * alpha) / 6;

		parts.push(
			`C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`,
		);
	}

	if (closed) {
		parts.push("Z");
	}

	return parts.join(" ");
}

/**
 * Round to 2 decimal places to keep SVG path strings compact.
 */
function fmt(n: number): string {
	return (Math.round(n * 100) / 100).toString();
}
