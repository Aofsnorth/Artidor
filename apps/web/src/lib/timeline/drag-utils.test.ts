import { describe, expect, it } from "bun:test";
import { getMouseTimeFromClientX } from "./drag-utils";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "./scale";
import { TICKS_PER_SECOND } from "../wasm";

function rect(): DOMRect {
	return {
		left: 0,
		top: 0,
		right: 1920,
		bottom: 1080,
		width: 1920,
		height: 1080,
		x: 0,
		y: 0,
		toJSON() {},
	};
}

describe("getMouseTimeFromClientX", () => {
	it("rounds tiny floating-point seconds consistently", () => {
		// 8.5 ticks at the current base scale sits just below the half-tick
		// boundary in floating-point, so without a small epsilon the result
		// rounds down to 8 instead of the expected 9.
		const clientX =
			(8.5 * BASE_TIMELINE_PIXELS_PER_SECOND) / TICKS_PER_SECOND;

		const result = getMouseTimeFromClientX({
			clientX,
			containerRect: rect(),
			zoomLevel: 1,
			scrollLeft: 0,
		});

		expect(result).toBe(9);
	});
});
