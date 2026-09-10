import { describe, expect, test } from "bun:test";
import {
	getNextBookmarkTime,
	getPreviousBookmarkTime,
	getNextBookmarkTimeWithin,
	getPreviousBookmarkTimeWithin,
} from "./bookmarks";
import type { Bookmark } from "@/lib/timeline";

const SEC = 120_000; // test-local ticks-per-second
const bm = (seconds: number): Bookmark => ({ time: seconds * SEC });

describe("bookmark prev/next navigation (bughunt R11)", () => {
	const unordered = [bm(3), bm(1), bm(2)];

	test("next walks forward in time order regardless of array order", () => {
		expect(getNextBookmarkTime({ bookmarks: unordered, time: 0 })).toBe(SEC);
		expect(getNextBookmarkTime({ bookmarks: unordered, time: SEC })).toBe(
			2 * SEC,
		);
		expect(getNextBookmarkTime({ bookmarks: unordered, time: 2 * SEC })).toBe(
			3 * SEC,
		);
	});

	test("next on a bookmark skips it (repeated presses walk forward)", () => {
		expect(getNextBookmarkTime({ bookmarks: unordered, time: 2 * SEC })).toBe(
			3 * SEC,
		);
	});

	test("next past the last bookmark returns null (no wrap)", () => {
		expect(getNextBookmarkTime({ bookmarks: unordered, time: 3 * SEC })).toBe(
			null,
		);
		expect(getNextBookmarkTime({ bookmarks: unordered, time: 99 * SEC })).toBe(
			null,
		);
	});

	test("previous walks backward in time order", () => {
		expect(
			getPreviousBookmarkTime({ bookmarks: unordered, time: 4 * SEC }),
		).toBe(3 * SEC);
		expect(
			getPreviousBookmarkTime({ bookmarks: unordered, time: 2 * SEC }),
		).toBe(SEC);
	});

	test("previous on a bookmark skips it (repeated presses walk backward)", () => {
		expect(
			getPreviousBookmarkTime({ bookmarks: unordered, time: 3 * SEC }),
		).toBe(2 * SEC);
	});

	test("previous before the first bookmark returns null (no wrap)", () => {
		expect(getPreviousBookmarkTime({ bookmarks: unordered, time: SEC })).toBe(
			null,
		);
		expect(getPreviousBookmarkTime({ bookmarks: unordered, time: 0 })).toBe(
			null,
		);
	});

	test("within-window variants stay silent outside the window", () => {
		const windowTicks = Math.round(SEC / 2);
		expect(
			getNextBookmarkTimeWithin({
				bookmarks: unordered,
				time: 0,
				windowTicks,
			}),
		).toBe(null);
		expect(
			getPreviousBookmarkTimeWithin({
				bookmarks: unordered,
				time: 4 * SEC,
				windowTicks,
			}),
		).toBe(null);
	});

	test("within-window variants fire inside the window", () => {
		const windowTicks = 2 * SEC;
		expect(
			getNextBookmarkTimeWithin({
				bookmarks: unordered,
				time: 0.5 * SEC,
				windowTicks,
			}),
		).toBe(SEC);
		expect(
			getPreviousBookmarkTimeWithin({
				bookmarks: unordered,
				time: 2.5 * SEC,
				windowTicks,
			}),
		).toBe(2 * SEC);
	});
});
