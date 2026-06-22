import { describe, expect, test } from "bun:test";
import { normalizeStandaloneFreehand } from "../freehand-normalize";
import { canvasLogicalToGraphicSource } from "@/lib/preview/preview-coords";

const SOURCE = 512;

/**
 * Maps a local source-space point back to canvas-logical pixels the way the
 * renderer does: contain-fit (min(w,h)/512) scale, times element scale, plus
 * the element's canvas position (which is relative to canvas center).
 */
function localSourceToCanvas({
	local,
	elementScale,
	position,
	canvasWidth,
	canvasHeight,
}: {
	local: { x: number; y: number };
	elementScale: number;
	position: { x: number; y: number };
	canvasWidth: number;
	canvasHeight: number;
}) {
	const containScale = Math.min(canvasWidth, canvasHeight) / SOURCE;
	const half = SOURCE / 2;
	// element center in canvas px
	const cx = canvasWidth / 2 + position.x;
	const cy = canvasHeight / 2 + position.y;
	return {
		x: cx + (local.x - half) * containScale * elementScale,
		y: cy + (local.y - half) * containScale * elementScale,
	};
}

describe("normalizeStandaloneFreehand round-trip", () => {
	// 16:9 canvas — the case where edges overflow the contain square.
	const canvasWidth = 1920;
	const canvasHeight = 1080;

	function sourcePointFromCanvas(cx: number, cy: number) {
		const p = canvasLogicalToGraphicSource({
			canvasX: cx,
			canvasY: cy,
			canvasWidth,
			canvasHeight,
			sourceSize: SOURCE,
		});
		if (!p) throw new Error("null source point");
		return p;
	}

	test("center stroke round-trips to where it was drawn", () => {
		// a small scribble near canvas center
		const canvasPts = [
			{ x: 960, y: 540 },
			{ x: 1000, y: 560 },
			{ x: 980, y: 600 },
		];
		const points = canvasPts.map((p) => sourcePointFromCanvas(p.x, p.y));
		const n = normalizeStandaloneFreehand({
			points,
			sourceSize: SOURCE,
			strokeWidth: 8,
			canvasWidth,
			canvasHeight,
		});
		n.localPoints.forEach((local, i) => {
			const back = localSourceToCanvas({
				local,
				elementScale: n.elementScale,
				position: n.position,
				canvasWidth,
				canvasHeight,
			});
			expect(back.x).toBeCloseTo(canvasPts[i].x, 1);
			expect(back.y).toBeCloseTo(canvasPts[i].y, 1);
		});
	});

	test("far-left-edge stroke round-trips (regression: used to vanish)", () => {
		// near the extreme left — OUTSIDE the central contain square
		const canvasPts = [
			{ x: 20, y: 520 },
			{ x: 60, y: 540 },
			{ x: 40, y: 580 },
		];
		const points = canvasPts.map((p) => sourcePointFromCanvas(p.x, p.y));
		// raw source X is negative here — proves the clipping precondition
		expect(points[0].x).toBeLessThan(0);

		const n = normalizeStandaloneFreehand({
			points,
			sourceSize: SOURCE,
			strokeWidth: 8,
			canvasWidth,
			canvasHeight,
		});
		// after normalize, every local point must be inside the source buffer
		for (const local of n.localPoints) {
			expect(local.x).toBeGreaterThanOrEqual(0);
			expect(local.x).toBeLessThanOrEqual(SOURCE);
			expect(local.y).toBeGreaterThanOrEqual(0);
			expect(local.y).toBeLessThanOrEqual(SOURCE);
		}
		// and it still renders exactly where the user drew it
		n.localPoints.forEach((local, i) => {
			const back = localSourceToCanvas({
				local,
				elementScale: n.elementScale,
				position: n.position,
				canvasWidth,
				canvasHeight,
			});
			expect(back.x).toBeCloseTo(canvasPts[i].x, 1);
			expect(back.y).toBeCloseTo(canvasPts[i].y, 1);
		});
	});

	test("oversized drawing is shrunk to fit the source buffer", () => {
		// a stroke spanning almost the whole width → bbox bigger than source
		const canvasPts = [
			{ x: 20, y: 540 },
			{ x: 1900, y: 540 },
		];
		const points = canvasPts.map((p) => sourcePointFromCanvas(p.x, p.y));
		const n = normalizeStandaloneFreehand({
			points,
			sourceSize: SOURCE,
			strokeWidth: 8,
			canvasWidth,
			canvasHeight,
		});
		expect(n.elementScale).toBeGreaterThan(1); // scaled the element up
		for (const local of n.localPoints) {
			expect(local.x).toBeGreaterThanOrEqual(0);
			expect(local.x).toBeLessThanOrEqual(SOURCE);
		}
		n.localPoints.forEach((local, i) => {
			const back = localSourceToCanvas({
				local,
				elementScale: n.elementScale,
				position: n.position,
				canvasWidth,
				canvasHeight,
			});
			expect(back.x).toBeCloseTo(canvasPts[i].x, 0);
		});
	});
});
