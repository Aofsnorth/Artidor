import { describe, expect, test } from "bun:test";
// Evaluate the mask module graph from the top so box-like's params are
// initialised before cinematic-bars references them through the shared
// param-update/masks-index cycle.
import "@/lib/masks";
import { computeBoxMaskParamUpdate } from "@/lib/masks/definitions/box-like";
import type { ElementBounds } from "@/lib/preview/element-bounds";
import type { RectangleMaskParams } from "@/lib/masks/types";

const bounds: ElementBounds = {
	cx: 200,
	cy: 150,
	width: 200,
	height: 100,
	rotation: 0,
};

const canvasSize = { width: 400, height: 300 };

function params(
	overrides: Partial<RectangleMaskParams> = {},
): RectangleMaskParams {
	return {
		feather: 0,
		inverted: false,
		strokeColor: "#ffffff",
		strokeWidth: 0,
		strokeAlign: "center",
		centerX: 0,
		centerY: 0,
		width: 0.5,
		height: 0.5,
		rotation: 0,
		scale: 1,
		...overrides,
	};
}

describe("box-like mask rotation", () => {
	test("uses the pointer angle around the mask centre, not the drag vector", () => {
		// Start above the centre (-90 degrees) and finish to its right
		// (0 degrees): a quarter turn clockwise. The drag vector angle is 45
		// degrees, which is what the old code wrote.
		const update = computeBoxMaskParamUpdate({
			handleId: "rotation",
			startParams: params(),
			deltaX: 150,
			deltaY: 150,
			startCanvasX: 200,
			startCanvasY: 0,
			bounds,
			canvasSize,
		});

		expect(update.rotation).toBeCloseTo(90, 6);
	});

	test("wraps a rotation delta across zero", () => {
		const update = computeBoxMaskParamUpdate({
			handleId: "rotation",
			startParams: params({ rotation: 350 }),
			deltaX: 150 * Math.cos((-70 * Math.PI) / 180),
			deltaY: 150 + 150 * Math.sin((-70 * Math.PI) / 180),
			startCanvasX: 200,
			startCanvasY: 0,
			bounds,
			canvasSize,
		});

		expect(update.rotation).toBeCloseTo(10, 6);
	});
});