import { describe, expect, test } from "bun:test";
import { findNearestKeyframe, type GOPIndex } from "./gop-index";

function makeGOP(times: number[], duration = 100): GOPIndex {
	return {
		mediaId: "test",
		keyframeTimes: times,
		duration,
	};
}

describe("findNearestKeyframe", () => {
	test("returns null for empty index", () => {
		const index = makeGOP([]);
		expect(findNearestKeyframe(5, index)).toBeNull();
	});

	test("returns null when target is before first keyframe", () => {
		const index = makeGOP([0, 5, 10, 15]);
		expect(findNearestKeyframe(-1, index)).toBeNull();
	});

	test("returns first keyframe when target equals first keyframe", () => {
		const index = makeGOP([0, 5, 10, 15]);
		expect(findNearestKeyframe(0, index)).toBe(0);
	});

	test("returns last keyframe when target is at or after last keyframe", () => {
		const index = makeGOP([0, 5, 10, 15]);
		expect(findNearestKeyframe(15, index)).toBe(15);
		expect(findNearestKeyframe(99, index)).toBe(15);
		expect(findNearestKeyframe(Infinity, index)).toBe(15);
	});

	test("returns nearest preceding keyframe for mid-video seek", () => {
		const index = makeGOP([0, 5, 10, 15, 20, 25]);
		expect(findNearestKeyframe(7, index)).toBe(5);
		expect(findNearestKeyframe(12, index)).toBe(10);
		expect(findNearestKeyframe(17, index)).toBe(15);
		expect(findNearestKeyframe(22, index)).toBe(20);
	});

	test("returns exact keyframe when target matches", () => {
		const index = makeGOP([0, 5, 10, 15, 20, 25]);
		expect(findNearestKeyframe(10, index)).toBe(10);
		expect(findNearestKeyframe(25, index)).toBe(25);
	});

	test("handles large index efficiently (binary search)", () => {
		// Simulate a 15-minute video with 5-second GOP = 180 keyframes
		const times: number[] = [];
		for (let i = 0; i < 180; i++) times.push(i * 5);
		const index = makeGOP(times, 900);

		// Seek to 13 minutes = 780s → nearest keyframe at 780 (156th)
		expect(findNearestKeyframe(780, index)).toBe(780);

		// Seek to 13:03 = 783s → nearest keyframe at 780
		expect(findNearestKeyframe(783, index)).toBe(780);

		// Seek to 0:01 = 1s → nearest keyframe at 0
		expect(findNearestKeyframe(1, index)).toBe(0);
	});

	test("handles single-keyframe video", () => {
		const index = makeGOP([0], 10);
		expect(findNearestKeyframe(0, index)).toBe(0);
		expect(findNearestKeyframe(5, index)).toBe(0);
		expect(findNearestKeyframe(10, index)).toBe(0);
	});
});
