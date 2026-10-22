import { describe, expect, test } from "bun:test";
import { reframeFramesToKeyframes } from "./index-impl";

const frame = (centerX: number, centerY: number) => ({
	timeSeconds: 0,
	centerX,
	centerY,
	cropWidth: 1920,
	cropHeight: 1080,
	scale: 1,
});

describe("reframeFramesToKeyframes", () => {
	test("converts both axes to canvas pixels", () => {
		const [keyframe] = reframeFramesToKeyframes({
			reframes: [frame(0.75, 0.25)],
			canvasWidth: 1920,
			canvasHeight: 1080,
		});
		expect(keyframe?.positionX).toBeCloseTo(480, 6);
		expect(keyframe?.positionY).toBeCloseTo(-270, 6);
	});

	test("does not scale horizontal correction by a hardcoded 100", () => {
		const [keyframe] = reframeFramesToKeyframes({
			reframes: [frame(1, 0.5)],
			canvasWidth: 3840,
			canvasHeight: 2160,
		});
		// Half a 4K canvas is 1920 px, not 50.
		expect(keyframe?.positionX).toBe(1920);
		expect(keyframe?.positionY).toBe(0);
	});
});
