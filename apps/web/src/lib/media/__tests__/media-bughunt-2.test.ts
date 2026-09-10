import { describe, expect, mock, test } from "bun:test";

// processing.ts imports sonner (DOM CSS injection at import time) — stub it
// so this suite stays DOM-free. getThumbnailTimeForDuration is pure.
mock.module("sonner", () => ({
	toast: { error: () => {}, warning: () => {}, success: () => {} },
}));

const { getThumbnailTimeForDuration } = await import("../processing");

/**
 * media-bughunt-2 R01/R18: thumbnail + progress helpers.
 * Pure helpers stay DOM-free so bun:test needs no browser stubs.
 */
describe("getThumbnailTimeForDuration", () => {
	test("R01: sub-second clip samples at half duration, never past 1s", () => {
		expect(getThumbnailTimeForDuration({ durationSeconds: 0.4 })).toBeCloseTo(
			0.2,
		);
	});

	test("R01: long clip clamps to 1s (no black-frame seek)", () => {
		expect(getThumbnailTimeForDuration({ durationSeconds: 120 })).toBe(1);
	});

	test("R18: unknown/zero duration falls back to 0s", () => {
		expect(getThumbnailTimeForDuration({ durationSeconds: 0 })).toBe(0);
		expect(getThumbnailTimeForDuration({ durationSeconds: Number.NaN })).toBe(
			0,
		);
		expect(
			getThumbnailTimeForDuration({
				durationSeconds: Number.POSITIVE_INFINITY,
			}),
		).toBe(0);
	});
});
