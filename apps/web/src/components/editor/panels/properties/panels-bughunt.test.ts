import { describe, expect, test } from "bun:test";
import { parseNumericInput } from "@/components/editor/panels/properties/tabs/transform-tab";

/**
 * Panels bughunt regressions: numeric parsing must never let non-finite
 * values (Infinity / -Infinity / overflow like 1e999) through into commands.
 * Before the fix parseFloat passed them raw — Infinity landed in transform /
 * text fields and poisoned duration math + WASM time conversion downstream.
 */
describe("panels numeric guards", () => {
	test("parseNumericInput rejects non-finite input", () => {
		expect(parseNumericInput({ input: "Infinity" })).toBeNull();
		expect(parseNumericInput({ input: "-Infinity" })).toBeNull();
		expect(parseNumericInput({ input: "1e999" })).toBeNull();
		expect(parseNumericInput({ input: "NaN" })).toBeNull();
	});

	test("parseNumericInput still accepts ordinary numbers", () => {
		expect(parseNumericInput({ input: "12" })).toBe(12);
		expect(parseNumericInput({ input: "-5" })).toBe(-5);
		expect(parseNumericInput({ input: "3.14" })).toBeCloseTo(3.14);
		expect(parseNumericInput({ input: "abc" })).toBeNull();
		expect(parseNumericInput({ input: "" })).toBeNull();
	});
});
