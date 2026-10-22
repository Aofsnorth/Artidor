import { describe, expect, test } from "bun:test";
import { dimensionToAspectRatio } from "../geometry";

describe("dimensionToAspectRatio", () => {
	test("reduces common dimensions", () => {
		expect(dimensionToAspectRatio({ width: 1920, height: 1080 })).toBe("16:9");
		expect(dimensionToAspectRatio({ width: 1080, height: 1080 })).toBe("1:1");
	});

	test("returns 1:1 for zero dimensions instead of NaN:NaN", () => {
		expect(dimensionToAspectRatio({ width: 0, height: 0 })).toBe("1:1");
		expect(dimensionToAspectRatio({ width: 0, height: 1080 })).toBe("1:1");
		expect(dimensionToAspectRatio({ width: 1920, height: 0 })).toBe("1:1");
	});

	test("returns 1:1 for negative or non-finite dimensions", () => {
		expect(dimensionToAspectRatio({ width: -1920, height: 1080 })).toBe("1:1");
		expect(dimensionToAspectRatio({ width: Number.NaN, height: 1080 })).toBe(
			"1:1",
		);
		expect(
			dimensionToAspectRatio({ width: Number.POSITIVE_INFINITY, height: 1 }),
		).toBe("1:1");
	});
});
