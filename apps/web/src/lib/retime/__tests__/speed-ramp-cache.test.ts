import { describe, expect, test } from "bun:test";
import {
	buildSpeedRampRetime,
	clipTimeToSourceTime,
	getSpeedCurveFromRetime,
	sampleSpeedCurve,
	type SpeedCurve,
} from "@/lib/retime/speed-ramp";

/**
 * Guards the performance fix in `speed-ramp.ts`: the speed curve is no longer
 * copied and sorted inside the 1024-step integration loop.
 *
 * `clipTimeToSourceTime` is called once per video node per render frame and
 * once per audio sample during mixdown (~480k times for a 10s 48kHz clip), and
 * each call used to allocate and sort 1025 copies of the curve.
 *
 * The reference implementations below are verbatim copies of the pre-fix
 * code. They are duplicated on purpose: an oracle that shared code with the
 * implementation could not catch a change in that shared code.
 */

function referenceSampleSpeedCurve({
	curve,
	t,
}: {
	curve: SpeedCurve;
	t: number;
}): number {
	if (curve.length === 0) return 1;
	if (curve.length === 1) return curve[0].speed;

	const sorted = [...curve].sort((a, b) => a.time - b.time);
	if (t <= sorted[0].time) return sorted[0].speed;
	if (t >= sorted[sorted.length - 1].time) {
		return sorted[sorted.length - 1].speed;
	}

	for (let i = 0; i < sorted.length - 1; i++) {
		const p0 = sorted[i];
		const p1 = sorted[i + 1];
		if (t >= p0.time && t <= p1.time) {
			const ratio = (t - p0.time) / Math.max(1e-6, p1.time - p0.time);
			return p0.speed + (p1.speed - p0.speed) * ratio;
		}
	}
	return sorted[sorted.length - 1].speed;
}

function referenceClipTimeToSourceTime({
	curve,
	clipTime,
	totalDuration,
	samples = 1024,
}: {
	curve: SpeedCurve;
	clipTime: number;
	totalDuration: number;
	samples?: number;
}): number {
	if (curve.length === 0) return clipTime;
	if (totalDuration <= 0) return 0;
	const t = Math.max(0, Math.min(1, clipTime / totalDuration));
	const dt = t / samples;
	let cumulative = 0;
	let prevSpeed = referenceSampleSpeedCurve({ curve, t: 0 });
	for (let i = 1; i <= samples; i++) {
		const ti = dt * i;
		const speed = referenceSampleSpeedCurve({ curve, t: ti });
		const avgSpeed = (prevSpeed + speed) / 2;
		const segmentSource = dt * totalDuration * Math.max(0.001, avgSpeed);
		cumulative += segmentSource;
		prevSpeed = speed;
		if (ti >= t) break;
	}
	return cumulative;
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const EMPTY: SpeedCurve = [];
const SINGLE: SpeedCurve = [{ time: 0.3, speed: 2.5 }];
const TWO_POINTS: SpeedCurve = [
	{ time: 0, speed: 1 },
	{ time: 1, speed: 2 },
];
const EIGHT_POINTS: SpeedCurve = [
	{ time: 0, speed: 1 },
	{ time: 0.1, speed: 4 },
	{ time: 0.25, speed: 0.25 },
	{ time: 0.4, speed: 3 },
	{ time: 0.55, speed: 0.5 },
	{ time: 0.7, speed: 2 },
	{ time: 0.85, speed: 1 },
	{ time: 1, speed: 1.5 },
];
/** Monotonic in time, linear ramp of speed. */
const LINEAR_RAMP: SpeedCurve = [
	{ time: 0, speed: 0.2 },
	{ time: 0.5, speed: 1.8 },
	{ time: 1, speed: 3.2 },
];
/** Speeds go up and down (the "montage" style curve). */
const NON_MONOTONIC_SPEEDS: SpeedCurve = [
	{ time: 0, speed: 0.5 },
	{ time: 0.3, speed: 1.5 },
	{ time: 0.5, speed: 1 },
	{ time: 0.7, speed: 1.8 },
	{ time: 1, speed: 0.5 },
];
/** Deliberately unsorted input, so the sort still has to happen. */
const UNSORTED: SpeedCurve = [
	{ time: 0.7, speed: 1.8 },
	{ time: 0, speed: 0.5 },
	{ time: 1, speed: 0.5 },
	{ time: 0.3, speed: 1.5 },
];
/** Sub-floor speeds, to exercise the `Math.max(0.001, avgSpeed)` clamp. */
const SUB_FLOOR_SPEEDS: SpeedCurve = [
	{ time: 0, speed: 0.0005 },
	{ time: 0.5, speed: 0.002 },
	{ time: 1, speed: 0.0001 },
];
/** Two keys that share a time, so the segment scan has a zero-width span. */
const DUPLICATE_TIMES: SpeedCurve = [
	{ time: 0, speed: 1 },
	{ time: 0.5, speed: 4 },
	{ time: 0.5, speed: 1 },
	{ time: 1, speed: 2 },
];

const CURVES: Array<{ name: string; curve: SpeedCurve }> = [
	{ name: "empty", curve: EMPTY },
	{ name: "single point", curve: SINGLE },
	{ name: "two points", curve: TWO_POINTS },
	{ name: "eight points", curve: EIGHT_POINTS },
	{ name: "linear ramp", curve: LINEAR_RAMP },
	{ name: "non-monotonic speeds", curve: NON_MONOTONIC_SPEEDS },
	{ name: "unsorted input", curve: UNSORTED },
	{ name: "sub-floor speeds", curve: SUB_FLOOR_SPEEDS },
	{ name: "duplicate times", curve: DUPLICATE_TIMES },
];

const CLIP_TIMES = [
	0, 1e-9, 0.001, 0.25, 0.5, 0.75, 0.999, 1, 1.0000001, 2, 10, -1, -0.5,
];

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

describe("sampleSpeedCurve — sorted-curve cache parity", () => {
	test("matches the pre-fix copy-and-sort implementation bit-for-bit", () => {
		let comparisons = 0;
		for (const { curve } of CURVES) {
			for (let step = -20; step <= 120; step++) {
				const t = step / 100;
				expect(sampleSpeedCurve({ curve, t })).toBe(
					referenceSampleSpeedCurve({ curve, t }),
				);
				comparisons++;
			}
		}
		expect(comparisons).toBeGreaterThan(1000);
	});

	test("repeated sampling of one curve stays identical", () => {
		// The cache is keyed on the curve array object, so a long run of
		// samples through the same curve must not drift.
		for (let i = 0; i <= 2000; i++) {
			const t = i / 2000;
			expect(sampleSpeedCurve({ curve: EIGHT_POINTS, t })).toBe(
				referenceSampleSpeedCurve({ curve: EIGHT_POINTS, t }),
			);
		}
	});

	test("an equal-but-distinct curve array is sampled identically", () => {
		const first: SpeedCurve = UNSORTED.map((point) => ({ ...point }));
		const second: SpeedCurve = UNSORTED.map((point) => ({ ...point }));
		for (const t of [0, 0.15, 0.35, 0.65, 0.95, 1.2]) {
			expect(sampleSpeedCurve({ curve: second, t })).toBe(
				referenceSampleSpeedCurve({ curve: first, t }),
			);
		}
	});
});

describe("clipTimeToSourceTime — parity with the pre-fix integration", () => {
	for (const { name, curve } of CURVES) {
		test(`${name}: identical at 0, inside, at totalDuration and beyond`, () => {
			for (const totalDuration of [0.5, 4, 10, 137.25]) {
				for (const clipTime of CLIP_TIMES) {
					expect(
						clipTimeToSourceTime({
							curve,
							clipTime,
							totalDuration,
						}),
					).toBe(
						referenceClipTimeToSourceTime({
							curve,
							clipTime,
							totalDuration,
						}),
					);
				}
			}
		});
	}

	test("non-positive duration still returns 0 for a non-empty curve", () => {
		expect(
			clipTimeToSourceTime({
				curve: EIGHT_POINTS,
				clipTime: 3,
				totalDuration: 0,
			}),
		).toBe(0);
		expect(
			clipTimeToSourceTime({
				curve: EIGHT_POINTS,
				clipTime: 3,
				totalDuration: -5,
			}),
		).toBe(0);
	});

	test("empty curve returns the clip time untouched", () => {
		expect(
			clipTimeToSourceTime({
				curve: EMPTY,
				clipTime: 3.75,
				totalDuration: 10,
			}),
		).toBe(3.75);
	});

	test("a non-default step count is honoured identically", () => {
		for (const samples of [1, 2, 17, 256, 1024, 4096]) {
			for (const clipTime of [0, 0.4, 2.5, 10, 22]) {
				expect(
					clipTimeToSourceTime({
						curve: EIGHT_POINTS,
						clipTime,
						totalDuration: 10,
						samples,
					}),
				).toBe(
					referenceClipTimeToSourceTime({
						curve: EIGHT_POINTS,
						clipTime,
						totalDuration: 10,
						samples,
					}),
				);
			}
		}
	});

	test("a monotonic clip-time sweep is stable across the cached curve", () => {
		// Mirrors the mixdown: many clip times, one curve object.
		for (let i = 0; i <= 1200; i++) {
			const clipTime = i / 240;
			expect(
				clipTimeToSourceTime({
					curve: NON_MONOTONIC_SPEEDS,
					clipTime,
					totalDuration: 10,
				}),
			).toBe(
				referenceClipTimeToSourceTime({
					curve: NON_MONOTONIC_SPEEDS,
					clipTime,
					totalDuration: 10,
				}),
			);
		}
	});
});

describe("getSpeedCurveFromRetime — per-retime memoization", () => {
	test("repeated calls return the identical derived curve array", () => {
		// The sorted-curve cache is keyed on the curve array object, so the
		// derived array has to be stable per retime config for the cache to
		// ever hit through `getSourceTimeAtClipTime`.
		const retime = buildSpeedRampRetime({
			keyframes: NON_MONOTONIC_SPEEDS,
			duration: 10,
		});
		const first = getSpeedCurveFromRetime(retime);
		const second = getSpeedCurveFromRetime(retime);
		const third = getSpeedCurveFromRetime(retime);
		expect(second).toBe(first);
		expect(third).toBe(first);
		expect(first).toEqual(NON_MONOTONIC_SPEEDS);
	});

	test("a distinct retime object gets its own derived curve", () => {
		const first = getSpeedCurveFromRetime(
			buildSpeedRampRetime({ keyframes: TWO_POINTS, duration: 4 }),
		);
		const second = getSpeedCurveFromRetime(
			buildSpeedRampRetime({ keyframes: TWO_POINTS, duration: 4 }),
		);
		expect(second).not.toBe(first);
		expect(second).toEqual(first);
	});

	test("non-curve and undefined retimes still yield an empty curve", () => {
		expect(getSpeedCurveFromRetime(undefined)).toEqual([]);
		expect(getSpeedCurveFromRetime({ rate: 2 })).toEqual([]);
		expect(
			getSpeedCurveFromRetime({
				mode: "curve",
				keyframes: [],
				preservePitch: true,
				rate: 1,
			} as never),
		).toEqual([]);
	});

	test("non-numeric keyframe fields still fall back to defaults", () => {
		const curve = getSpeedCurveFromRetime({
			mode: "curve",
			keyframes: [
				{ time: "x", speed: null },
				{ time: 0.5, speed: 3 },
			],
			preservePitch: true,
			rate: 1,
		} as never);
		expect(curve).toEqual([
			{ time: 0, speed: 1 },
			{ time: 0.5, speed: 3 },
		]);
	});
});
