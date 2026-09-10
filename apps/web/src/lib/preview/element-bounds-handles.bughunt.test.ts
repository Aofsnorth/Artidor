import { describe, expect, test } from "bun:test";
import {
	getCornerPosition,
	getEdgeHandlePosition,
	ROTATION_HANDLE_OFFSET,
	type ElementBounds,
} from "./element-bounds";

function bounds(rotation: number): ElementBounds {
	return { cx: 500, cy: 300, width: 200, height: 100, rotation };
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
	Math.hypot(a.x - b.x, a.y - b.y);

describe("transform handle placement vs rotated bounds (bughunt R06)", () => {
	for (const rotation of [0, 45, 90, 135, 180, 270]) {
		test(`rotation ${rotation}°: opposite corners stay symmetric about the centre`, () => {
			const b = bounds(rotation);
			const center = { x: b.cx, y: b.cy };
			const tl = getCornerPosition({ bounds: b, corner: "top-left" });
			const br = getCornerPosition({ bounds: b, corner: "bottom-right" });
			const tr = getCornerPosition({ bounds: b, corner: "top-right" });
			const bl = getCornerPosition({ bounds: b, corner: "bottom-left" });
			// Midpoints of both diagonals coincide with the centre.
			expect((tl.x + br.x) / 2).toBeCloseTo(center.x, 9);
			expect((tl.y + br.y) / 2).toBeCloseTo(center.y, 9);
			expect((tr.x + bl.x) / 2).toBeCloseTo(center.x, 9);
			expect((tr.y + bl.y) / 2).toBeCloseTo(center.y, 9);
			// All four corners are equidistant from the centre.
			const d = dist(tl, center);
			for (const corner of [br, tr, bl]) {
				expect(dist(corner, center)).toBeCloseTo(d, 9);
			}
		});
	}

	test("edges sit at the midpoint of their corner pairs", () => {
		const b = bounds(30);
		const corners = {
			tl: getCornerPosition({ bounds: b, corner: "top-left" }),
			tr: getCornerPosition({ bounds: b, corner: "top-right" }),
			br: getCornerPosition({ bounds: b, corner: "bottom-right" }),
			bl: getCornerPosition({ bounds: b, corner: "bottom-left" }),
		};
		const right = getEdgeHandlePosition({ bounds: b, edge: "right" });
		const left = getEdgeHandlePosition({ bounds: b, edge: "left" });
		const bottom = getEdgeHandlePosition({ bounds: b, edge: "bottom" });
		expect(right.x).toBeCloseTo((corners.tr.x + corners.br.x) / 2, 9);
		expect(right.y).toBeCloseTo((corners.tr.y + corners.br.y) / 2, 9);
		expect(left.x).toBeCloseTo((corners.tl.x + corners.bl.x) / 2, 9);
		expect(left.y).toBeCloseTo((corners.tl.y + corners.bl.y) / 2, 9);
		expect(bottom.x).toBeCloseTo((corners.bl.x + corners.br.x) / 2, 9);
		expect(bottom.y).toBeCloseTo((corners.bl.y + corners.br.y) / 2, 9);
	});

	test("rotation handle sits outside the top edge along the rotated up-axis", () => {
		for (const rotation of [0, 45, 90, 180]) {
			const b = bounds(rotation);
			const angleRad = (rotation * Math.PI) / 180;
			// Same derivation as transform-handles.tsx: top-centre of the
			// rotated rect, then ROTATION_HANDLE_OFFSET further out.
			const topCenterLocalY = -b.height / 2;
			const topCenter = {
				x: b.cx - topCenterLocalY * Math.sin(angleRad),
				y: b.cy + topCenterLocalY * Math.cos(angleRad),
			};
			const handle = {
				x: topCenter.x + Math.sin(angleRad) * ROTATION_HANDLE_OFFSET,
				y: topCenter.y - Math.cos(angleRad) * ROTATION_HANDLE_OFFSET,
			};
			const center = { x: b.cx, y: b.cy };
			// The handle must be further from the centre than the top edge.
			expect(dist(handle, center)).toBeGreaterThan(dist(topCenter, center));
			// And offset from the top edge by exactly the handle gap.
			expect(dist(handle, topCenter)).toBeCloseTo(ROTATION_HANDLE_OFFSET, 9);
		}
	});

	test("zero rotation keeps axis-aligned handle positions", () => {
		const b = bounds(0);
		expect(getCornerPosition({ bounds: b, corner: "top-left" })).toEqual({
			x: 400,
			y: 250,
		});
		expect(getEdgeHandlePosition({ bounds: b, edge: "right" })).toEqual({
			x: 600,
			y: 300,
		});
		expect(getEdgeHandlePosition({ bounds: b, edge: "bottom" })).toEqual({
			x: 500,
			y: 350,
		});
	});
});
