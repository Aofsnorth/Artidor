import { describe, expect, test } from "bun:test";
import {
	clampNumberFieldScrubValue,
	resolveNumberFieldDisplayValue,
	resolveNumberFieldReadOnly,
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

describe("resolveNumberFieldReadOnly", () => {
	// Regression: PrimaryBarsSection passed `value` with no `onChange`, so React
	// logged "value without onChange" and rendered a field the user could not
	// type into. A scrub-only field is read-only by design and must say so.
	test("a value with no onChange is read-only, not a dead controlled field", () => {
		expect(resolveNumberFieldReadOnly({ onChange: undefined })).toBe(true);
	});

	test("a field with onChange is editable", () => {
		expect(
			resolveNumberFieldReadOnly({ onChange: () => undefined }),
		).toBe(false);
	});

	test("an explicit readOnly wins over the presence of onChange", () => {
		expect(
			resolveNumberFieldReadOnly({ onChange: () => undefined, readOnly: true }),
		).toBe(true);
	});
});
