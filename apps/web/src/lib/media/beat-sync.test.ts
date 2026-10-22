import { describe, expect, test } from "bun:test";
import { findNearestBeatTicks, offsetBeatsToTimeline } from "./beat-sync";

const TICKS_PER_SECOND = 120_000;

describe("offsetBeatsToTimeline", () => {
	test("moves clip-local beats onto the timeline", () => {
		const beats = [
			{ timeSeconds: 0, ticks: 0, energy: 1 },
			{ timeSeconds: 0.5, ticks: TICKS_PER_SECOND / 2, energy: 1 },
		];
		const offset = 4 * TICKS_PER_SECOND;
		const shifted = offsetBeatsToTimeline({ beats, offsetTicks: offset });
		expect(shifted[0]?.ticks).toBe(offset);
		expect(shifted[0]?.timeSeconds).toBe(4);
		expect(shifted[1]?.ticks).toBe(offset + TICKS_PER_SECOND / 2);
		expect(shifted[1]?.timeSeconds).toBe(4.5);
	});

	test("is a no-op for a clip that starts at zero", () => {
		const beats = [{ timeSeconds: 0.25, ticks: 30_000, energy: 1 }];
		expect(offsetBeatsToTimeline({ beats, offsetTicks: 0 })).toBe(beats);
	});
});

describe("findNearestBeatTicks", () => {
	test("snaps backwards when the clip starts just after a beat", () => {
		expect(
			findNearestBeatTicks({
				beats: [0, 120_000, 240_000],
				targetTicks: 130_000,
			}),
		).toBe(120_000);
	});

	test("snaps forwards when that beat is closer", () => {
		expect(
			findNearestBeatTicks({
				beats: [0, 120_000, 240_000],
				targetTicks: 190_000,
			}),
		).toBe(240_000);
	});

	test("returns null without beats", () => {
		expect(findNearestBeatTicks({ beats: [], targetTicks: 10 })).toBeNull();
	});
});
