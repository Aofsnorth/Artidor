import { describe, expect, test } from "bun:test";
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

/** Exact clientX for the start of a given frame at 30fps. */
function frameStartX({
	frame,
	fps = 30,
	zoomLevel,
}: {
	frame: number;
	fps?: number;
	zoomLevel: number;
}): number {
	const seconds = frame / fps;
	return seconds * BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
}

const frameToTicks = (frame: number, fps = 30) =>
	Math.round((frame / fps) * TICKS_PER_SECOND);

describe("getMouseTimeFromClientX at extreme zoom (bughunt R04)", () => {
	test("zoomed far in: click on a frame boundary lands on that frame, not a neighbour", () => {
		for (const frame of [0, 1, 7, 30, 299]) {
			const result = getMouseTimeFromClientX({
				clientX: frameStartX({ frame, zoomLevel: 100 }),
				containerRect: rect(),
				zoomLevel: 100,
				scrollLeft: 0,
			});
			expect(result).toBe(frameToTicks(frame));
		}
	});

	test("zoomed far out: click on a frame boundary lands within one frame", () => {
		// At zoom 0.05 a whole 30fps frame is ~0.08px — sub-pixel. The
		// conversion must still round to the nearest frame, never drift
		// frames away from the cursor.
		for (const frame of [0, 30, 300, 900]) {
			const result = getMouseTimeFromClientX({
				clientX: frameStartX({ frame, zoomLevel: 0.05 }),
				containerRect: rect(),
				zoomLevel: 0.05,
				scrollLeft: 0,
			});
			expect(Math.abs(result - frameToTicks(frame))).toBeLessThanOrEqual(
				frameToTicks(1),
			);
		}
	});

	test("scroll offset is honoured exactly at high zoom", () => {
		const scrollLeft = 12_345;
		const frame = 42;
		const result = getMouseTimeFromClientX({
			clientX: frameStartX({ frame, zoomLevel: 50 }) - scrollLeft,
			containerRect: rect(),
			zoomLevel: 50,
			scrollLeft,
		});
		expect(result).toBe(frameToTicks(frame));
	});

	test("content inset shifts time by exactly the inset", () => {
		const inset = 8;
		const frame = 10;
		const base = getMouseTimeFromClientX({
			clientX: frameStartX({ frame, zoomLevel: 10 }),
			containerRect: rect(),
			zoomLevel: 10,
			scrollLeft: 0,
			contentInset: 0,
		});
		const shifted = getMouseTimeFromClientX({
			clientX: frameStartX({ frame, zoomLevel: 10 }) + inset,
			containerRect: rect(),
			zoomLevel: 10,
			scrollLeft: 0,
			contentInset: inset,
		});
		expect(shifted).toBe(base);
	});
});
