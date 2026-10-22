import { describe, expect, test } from "bun:test";
import { resolveVoiceoverDurationTicks } from "./voiceover-duration";

const TICKS_PER_SECOND = 1000;

describe("resolveVoiceoverDurationTicks", () => {
	test("prefers the decoded asset duration over the measured elapsed time", () => {
		expect(
			resolveVoiceoverDurationTicks({
				recordedSeconds: 3.2,
				elapsedMs: 250,
				ticksPerSecond: TICKS_PER_SECOND,
			}),
		).toBe(3200);
	});

	test("falls back to the elapsed wall-clock time when decoding has no duration", () => {
		expect(
			resolveVoiceoverDurationTicks({
				recordedSeconds: Number.NaN,
				elapsedMs: 2500,
				ticksPerSecond: TICKS_PER_SECOND,
			}),
		).toBe(2500);
	});

	test("a real recording is never collapsed to the 0.25s minimum", () => {
		// Regression: `state.durationMs` was captured at start() (always 0),
		// so a multi-second take was inserted as a quarter-second clip.
		expect(
			resolveVoiceoverDurationTicks({
				recordedSeconds: undefined,
				elapsedMs: 8_000,
				ticksPerSecond: TICKS_PER_SECOND,
			}),
		).toBe(8_000);
	});

	test("keeps the quarter-second floor for empty / zero-length recordings", () => {
		expect(
			resolveVoiceoverDurationTicks({
				elapsedMs: 0,
				ticksPerSecond: TICKS_PER_SECOND,
			}),
		).toBe(250);
	});
});
