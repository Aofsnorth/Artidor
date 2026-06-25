import { describe, expect, test } from "bun:test";
import {
	clampDb,
	dBToLinear,
	linearToDb,
	resolveEffectiveAudioGain,
} from "@/lib/timeline/audio-state";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import type { TimelineElement } from "@/lib/timeline/types";

function makeAudioElement({
	volume,
	muted,
	fadeInDuration,
	fadeOutDuration,
}: {
	volume?: number;
	muted?: boolean;
	fadeInDuration?: number;
	fadeOutDuration?: number;
}): TimelineElement {
	return {
		id: "el-1",
		startTime: 0,
		duration: 1000 * 60 * 60, // 1 hour of ticks, just "long"
		type: "audio",
		sourceType: "library",
		sourceUrl: "memory://fake",
		name: "fake",
		volume: volume ?? 0,
		muted: muted ?? false,
		fadeInDuration,
		fadeOutDuration,
		pan: 0,
		transform: {
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		},
		opacity: 1,
		effects: [],
	} as unknown as TimelineElement;
}

describe("clampDb", () => {
	test("clamps below VOLUME_DB_MIN", () => {
		expect(clampDb(-999)).toBe(VOLUME_DB_MIN);
	});

	test("clamps above VOLUME_DB_MAX", () => {
		expect(clampDb(999)).toBe(VOLUME_DB_MAX);
	});

	test("passes through values inside range", () => {
		expect(clampDb(0)).toBe(0);
		expect(clampDb(-30)).toBe(-30);
		expect(clampDb(15)).toBe(15);
	});

	test("returns 0 for NaN input", () => {
		expect(clampDb(NaN)).toBe(0);
	});
});

describe("dBToLinear / linearToDb round-trip", () => {
	test("0 dB == 1.0 linear", () => {
		expect(dBToLinear(0)).toBeCloseTo(1, 5);
	});

	test("linearToDb(dBToLinear(x)) ≈ x in range", () => {
		for (const db of [-60, -30, -6, 0, 6, 20]) {
			expect(linearToDb(dBToLinear(db))).toBeCloseTo(db, 4);
		}
	});

	test("linearToDb of 0 / negative returns MIN dB", () => {
		expect(linearToDb(0)).toBe(VOLUME_DB_MIN);
		expect(linearToDb(-1)).toBe(VOLUME_DB_MIN);
	});
});

describe("track slider (%) × element volume (dB) combination", () => {
	// The track slider is a linear percentage (0–100, default 100). The
	// element's volume is in dB. Final gain = dBToLinear(elementDb) *
	// (sliderPercent / 100).
	test("slider 100% (default), element 0 dB → 1.0 linear", () => {
		const sliderPercent = 100;
		const elementDb = 0;
		const gain = dBToLinear(elementDb) * (sliderPercent / 100);
		expect(gain).toBeCloseTo(1, 5);
	});

	test("slider 50%, element 0 dB → 0.5 linear", () => {
		const sliderPercent = 50;
		const elementDb = 0;
		const gain = dBToLinear(elementDb) * (sliderPercent / 100);
		expect(gain).toBeCloseTo(0.5, 5);
	});

	test("slider 0% (muted), element 0 dB → 0 linear", () => {
		const sliderPercent = 0;
		const elementDb = 0;
		const gain = dBToLinear(elementDb) * (sliderPercent / 100);
		expect(gain).toBe(0);
	});

	test("slider 100%, element -20 dB → 0.1 linear", () => {
		const sliderPercent = 100;
		const elementDb = -20;
		const gain = dBToLinear(elementDb) * (sliderPercent / 100);
		expect(gain).toBeCloseTo(0.1, 4);
	});

	test("slider 50%, element -20 dB → 0.05 linear", () => {
		const sliderPercent = 50;
		const elementDb = -20;
		const gain = dBToLinear(elementDb) * (sliderPercent / 100);
		expect(gain).toBeCloseTo(0.05, 4);
	});
});

describe("resolveEffectiveAudioGain", () => {
	test("returns 0 when muted (track or element)", () => {
		const element = makeAudioElement({ volume: 0 });
		expect(
			resolveEffectiveAudioGain({ element, trackMuted: true, localTime: 0 }),
		).toBe(0);
		expect(
			resolveEffectiveAudioGain({
				element: makeAudioElement({ muted: true, volume: 0 }),
				localTime: 0,
			}),
		).toBe(0);
	});

	test("returns 0 at element start when fadeInDuration is set", () => {
		const element = makeAudioElement({
			volume: 0,
			fadeInDuration: 1,
		});
		// localTime = 0, fadeIn = 1: gain = baseGain * (0 / 1) = 0
		expect(
			resolveEffectiveAudioGain({ element, localTime: 0 }),
		).toBeCloseTo(0, 5);
	});

	test("returns full base gain past fadeInDuration", () => {
		const element = makeAudioElement({
			volume: 0,
			fadeInDuration: 1,
		});
		// localTime = 2, fadeIn = 1: gain = baseGain * 1 = 1
		expect(
			resolveEffectiveAudioGain({ element, localTime: 2 }),
		).toBeCloseTo(1, 5);
	});

	test("ignoreFades skips fade-in/out multiplication", () => {
		const element = makeAudioElement({
			volume: 0,
			fadeInDuration: 1,
			fadeOutDuration: 1,
		});
		// localTime = 0 with fadeIn would normally give 0, but ignoreFades
		// returns the base gain instead.
		expect(
			resolveEffectiveAudioGain({
				element,
				localTime: 0,
				ignoreFades: true,
			}),
		).toBeCloseTo(1, 5);
		// Mid-clip should also return base gain regardless of fadeOut.
		expect(
			resolveEffectiveAudioGain({
				element,
				localTime: 10,
				ignoreFades: true,
			}),
		).toBeCloseTo(1, 5);
	});
});