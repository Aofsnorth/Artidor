import { describe, expect, test } from "bun:test";
import {
	MAX_SEGMENTS,
	MIN_FRAMES_PER_SEGMENT,
	buildSegmentPlans,
	planSegmentCount,
} from "./segment-plan";

describe("planSegmentCount", () => {
	test("returns 1 for an empty timeline", () => {
		expect(planSegmentCount(0, 8)).toBe(1);
	});

	test("returns 1 when the timeline is too short to split", () => {
		// Fewer than 2 * MIN_FRAMES_PER_SEGMENT frames → not worth parallelizing.
		expect(planSegmentCount(MIN_FRAMES_PER_SEGMENT, 8)).toBe(1);
		expect(planSegmentCount(MIN_FRAMES_PER_SEGMENT * 2 - 1, 8)).toBe(1);
	});

	test("scales with core count up to the cap", () => {
		const longTimeline = MIN_FRAMES_PER_SEGMENT * 100;
		expect(planSegmentCount(longTimeline, 2)).toBe(2);
		expect(planSegmentCount(longTimeline, 3)).toBe(3);
		expect(planSegmentCount(longTimeline, 4)).toBe(4);
		expect(planSegmentCount(longTimeline, 8)).toBe(8);
		// Never exceeds the cap, even with many cores.
		expect(planSegmentCount(longTimeline, 32)).toBe(MAX_SEGMENTS);
	});

	test("is limited by timeline length", () => {
		// Long enough for exactly 3 segments, even on an 8-core machine.
		expect(planSegmentCount(MIN_FRAMES_PER_SEGMENT * 3, 8)).toBe(3);
	});

	test("falls back to a safe core count for bad inputs", () => {
		const longTimeline = MIN_FRAMES_PER_SEGMENT * 100;
		// Bad core counts fall back to 4 (capped by MAX_SEGMENTS).
		expect(planSegmentCount(longTimeline, 0)).toBe(4);
		expect(planSegmentCount(longTimeline, Number.NaN)).toBe(4);
	});
});

describe("buildSegmentPlans", () => {
	const ticksPerSecond = 120_000;
	const ticksPerFrame = 4000; // 30 fps

	const params = (totalFrames: number, count: number) => ({
		totalFrames,
		count,
		ticksPerFrame,
		ticksPerSecond,
	});

	test("covers the whole range with no gap or overlap", () => {
		const plans = buildSegmentPlans(params(100, 4));
		expect(plans).toHaveLength(4);
		expect(plans[0]?.startFrame).toBe(0);
		expect(plans[plans.length - 1]?.endFrame).toBe(100);
		for (let i = 0; i < plans.length - 1; i++) {
			// Contiguous: each segment ends exactly where the next begins.
			expect(plans[i]?.endFrame).toBe(plans[i + 1]?.startFrame ?? -1);
		}
	});

	test("frame counts sum to the total and differ by at most one", () => {
		const plans = buildSegmentPlans(params(103, 4));
		const total = plans.reduce((acc, p) => acc + p.frames, 0);
		expect(total).toBe(103);
		const counts = plans.map((p) => p.frames);
		expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
		// 103 / 4 → [26, 26, 26, 25] (remainder spread across leading segments).
		expect(counts).toEqual([26, 26, 26, 25]);
	});

	test("each segment's frame count matches its range width", () => {
		const plans = buildSegmentPlans(params(97, 3));
		for (const plan of plans) {
			expect(plan.frames).toBe(plan.endFrame - plan.startFrame);
		}
	});

	test("startSeconds equals the exact global start time", () => {
		const plans = buildSegmentPlans(params(90, 3));
		// 90 / 3 = 30 frames each. At 30 fps a segment is 1 second.
		expect(plans[0]?.startSeconds).toBeCloseTo(0, 9);
		expect(plans[1]?.startSeconds).toBeCloseTo(1, 9);
		expect(plans[2]?.startSeconds).toBeCloseTo(2, 9);
	});

	test("offsetting local timestamps reproduces uniform global spacing", () => {
		// The key correctness property for seamless stitching: for every global
		// frame i, (segment.startSeconds + localTime) must equal the serial
		// export's timestamp for that frame, i.e. i * ticksPerFrame / ticksPerSecond.
		const totalFrames = 100;
		const plans = buildSegmentPlans(params(totalFrames, 4));
		const frameDur = ticksPerFrame / ticksPerSecond;
		for (const plan of plans) {
			for (let local = 0; local < plan.frames; local++) {
				const globalFrame = plan.startFrame + local;
				const stitched = plan.startSeconds + local * frameDur;
				const expected = (globalFrame * ticksPerFrame) / ticksPerSecond;
				expect(stitched).toBeCloseTo(expected, 9);
			}
		}
	});

	test("handles a single segment", () => {
		const plans = buildSegmentPlans(params(50, 1));
		expect(plans).toHaveLength(1);
		expect(plans[0]?.startFrame).toBe(0);
		expect(plans[0]?.endFrame).toBe(50);
		expect(plans[0]?.frames).toBe(50);
	});
});
