import { describe, expect, test } from "bun:test";
import {
	getModelMarqueeDuration,
	MODEL_MARQUEE_PIXELS_PER_SECOND,
} from "./model-marquee";

describe("model marquee speed", () => {
	test("keeps travel speed constant for every label width @fast @regression", () => {
		const shortDistance = 96;
		const longDistance = 240;

		expect(getModelMarqueeDuration({ distance: shortDistance })).toBe(
			shortDistance / MODEL_MARQUEE_PIXELS_PER_SECOND,
		);
		expect(getModelMarqueeDuration({ distance: longDistance })).toBe(
			longDistance / MODEL_MARQUEE_PIXELS_PER_SECOND,
		);
	});

	test("does not animate an invalid distance @fast", () => {
		expect(getModelMarqueeDuration({ distance: 0 })).toBe(0);
		expect(getModelMarqueeDuration({ distance: Number.NaN })).toBe(0);
	});
});
