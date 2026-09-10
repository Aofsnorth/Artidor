import { describe, expect, test } from "bun:test";
import { clampBookmarkDragTime } from "./use-bookmark-drag";

describe("clampBookmarkDragTime (bughunt R12)", () => {
	test("passes through a mid-timeline time", () => {
		expect(clampBookmarkDragTime({ time: 60_000, duration: 120_000 })).toBe(
			60_000,
		);
	});

	test("clamps a post-snap overshoot back to the duration", () => {
		// Frame-snapping rounds UP to the next frame; a bookmark dragged to
		// the last frame boundary can snap 1 tick past the timeline end.
		expect(clampBookmarkDragTime({ time: 120_001, duration: 120_000 })).toBe(
			120_000,
		);
	});

	test("clamps negative times to zero", () => {
		expect(clampBookmarkDragTime({ time: -500, duration: 120_000 })).toBe(0);
	});

	test("allows a bookmark exactly at the timeline end", () => {
		expect(clampBookmarkDragTime({ time: 120_000, duration: 120_000 })).toBe(
			120_000,
		);
	});

	test("empty timeline clamps everything to zero", () => {
		expect(clampBookmarkDragTime({ time: 999, duration: 0 })).toBe(0);
	});
});
