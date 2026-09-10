import { describe, expect, test } from "bun:test";
import { recommendSegmentCount } from "./export-performance";

describe("recommendSegmentCount", () => {
	test("returns 1 for empty or invalid timelines", () => {
		const base = { width: 1920, height: 1080, cores: 8 };
		expect(recommendSegmentCount({ ...base, totalFrames: 0 })).toBe(1);
		expect(recommendSegmentCount({ ...base, totalFrames: -10 })).toBe(1);
		expect(recommendSegmentCount({ ...base, totalFrames: Number.NaN })).toBe(1);
	});

	test("keeps short 1080p exports on a single worker", () => {
		// Mirrors segment-plan.ts: 150 1080p frames cannot amortize 2 workers.
		expect(
			recommendSegmentCount({
				totalFrames: 150,
				width: 1920,
				height: 1080,
				cores: 8,
			}),
		).toBe(1);
	});

	test("recommends 2 segments where the plan allows 2 but rejects 4", () => {
		// segment-plan.test.ts pins: 300 1080p frames allow 2 workers, reject 4.
		expect(
			recommendSegmentCount({
				totalFrames: 300,
				width: 1920,
				height: 1080,
				cores: 8,
			}),
		).toBe(2);
	});

	test("scales a long 1080p timeline to a handful of segments", () => {
		const count = recommendSegmentCount({
			totalFrames: 1800,
			width: 1920,
			height: 1080,
			cores: 8,
		});
		expect(count).toBeGreaterThan(1);
		expect(count).toBeLessThanOrEqual(8);
	});

	test("never exceeds the worker cap on huge timelines", () => {
		expect(
			recommendSegmentCount({
				totalFrames: 100_000,
				width: 7680,
				height: 4320,
				cores: 64,
			}),
		).toBe(16);
	});

	test("is capped by core count, not just workload", () => {
		const manyFrames = {
			totalFrames: 10_000,
			width: 1920,
			height: 1080,
		};
		const dual = recommendSegmentCount({ ...manyFrames, cores: 2 });
		const octa = recommendSegmentCount({ ...manyFrames, cores: 8 });
		expect(dual).toBeLessThanOrEqual(2);
		expect(octa).toBeGreaterThan(dual);
	});

	test("is deterministic and NaN-core safe", () => {
		const params = {
			totalFrames: 900,
			width: 1920,
			height: 1080,
			cores: 8,
		};
		expect(recommendSegmentCount(params)).toBe(
			recommendSegmentCount({ ...params }),
		);
		expect(recommendSegmentCount({ ...params, cores: Number.NaN })).toBe(1);
	});
});
