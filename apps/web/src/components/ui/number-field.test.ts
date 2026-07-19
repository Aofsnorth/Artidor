import { describe, expect, test } from "bun:test";
import {
	clampNumberFieldScrubValue,
	resolveNumberFieldDisplayValue,
} from "./number-field";

describe("NumberField scrub display", () => {
	test("shows the live scrub value instead of the stale controlled value", () => {
		expect(
			resolveNumberFieldDisplayValue({
				value: "0.0",
				scrubValue: -12.5,
			}),
		).toBe(-12.5);
	});

	test("clamps live scrub values before displaying and previewing them", () => {
		expect(
			clampNumberFieldScrubValue({ value: -80, min: -60, max: 20 }),
		).toBe(-60);
		expect(
			clampNumberFieldScrubValue({ value: 25, min: -60, max: 20 }),
		).toBe(20);
	});
});
