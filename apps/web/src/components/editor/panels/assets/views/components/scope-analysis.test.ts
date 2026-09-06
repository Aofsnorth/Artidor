import { expect, test } from "bun:test";
import {
	analyzeScopeSample,
	getParadeChannelBounds,
	getVectorscopePoint,
	type ScopeSampleData,
} from "./scope-analysis";

function buildScopeSample({
	pixels,
	columns,
	rows,
}: {
	pixels: number[];
	columns: number;
	rows: number;
}): ScopeSampleData {
	return {
		pixels: new Uint8ClampedArray(pixels),
		columns,
		rows,
		width: 1920,
		height: 1080,
	};
}

test("@fast scope statistics report frame luma and channel balance", () => {
	const sample = buildScopeSample({
		columns: 2,
		rows: 1,
		pixels: [0, 0, 0, 255, 255, 255, 255, 255],
	});

	const statistics = analyzeScopeSample(sample);

	expect(statistics.sampleCount).toBe(2);
	expect(statistics.lumaLow).toBe(0);
	expect(statistics.lumaAverage).toBeCloseTo(50, 5);
	expect(statistics.lumaHigh).toBeCloseTo(100, 5);
	expect(statistics.redAverage).toBe(127.5);
	expect(statistics.greenAverage).toBe(127.5);
	expect(statistics.blueAverage).toBe(127.5);
	expect(statistics.chromaAverage).toBeCloseTo(0, 5);
});

test("@fast vectorscope points stay centered for neutrals and bounded for saturated colors", () => {
	const neutral = getVectorscopePoint({
		red: 128,
		green: 128,
		blue: 128,
		centerX: 200,
		centerY: 120,
		radius: 80,
	});
	const blue = getVectorscopePoint({
		red: 0,
		green: 0,
		blue: 255,
		centerX: 200,
		centerY: 120,
		radius: 80,
	});

	expect(neutral.x).toBeCloseTo(200, 5);
	expect(neutral.y).toBeCloseTo(120, 5);
	expect(blue.x).toBeGreaterThan(200);
	expect(Math.hypot(blue.x - 200, blue.y - 120)).toBeCloseTo(80, 5);
});

test("@fast parade channels occupy distinct horizontal thirds", () => {
	const red = getParadeChannelBounds({
		channel: 0,
		left: 12,
		width: 300,
		gap: 6,
	});
	const green = getParadeChannelBounds({
		channel: 1,
		left: 12,
		width: 300,
		gap: 6,
	});
	const blue = getParadeChannelBounds({
		channel: 2,
		left: 12,
		width: 300,
		gap: 6,
	});

	expect(red.left + red.width).toBeLessThan(green.left);
	expect(green.left + green.width).toBeLessThan(blue.left);
	expect(red.width).toBe(green.width);
	expect(green.width).toBe(blue.width);
	expect(blue.left + blue.width).toBeCloseTo(312, 5);
});

test("@fast parade bounds remain finite when the plot is narrower than its gap", () => {
	for (const channel of [0, 1, 2] as const) {
		const bounds = getParadeChannelBounds({
			channel,
			left: 17,
			width: 2,
			gap: 4,
		});

		expect(Number.isFinite(bounds.left)).toBe(true);
		expect(bounds.width).toBeGreaterThanOrEqual(0);
	}
});
