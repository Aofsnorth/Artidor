import { describe, expect, test } from "bun:test";
import { PreviewRenderMetrics } from "./preview-render-metrics";

const timing = {
	resolveMs: 4,
	descriptorMs: 2,
	compositeMs: 3,
	blitMs: 1,
	totalMs: 10,
};

describe("PreviewRenderMetrics", () => {
	test("publishes averages after the configured sample window", () => {
		const metrics = new PreviewRenderMetrics(2);

		expect(metrics.record(timing)).toBeNull();
		expect(metrics.record(timing)).toEqual({ ...timing, samples: 2 });
	});

	test("resets after publishing a window", () => {
		const metrics = new PreviewRenderMetrics(1);

		expect(metrics.record(timing)?.samples).toBe(1);
		expect(metrics.record({ ...timing, totalMs: 20 })?.totalMs).toBe(20);
	});

	test("rejects an invalid sample window", () => {
		expect(() => new PreviewRenderMetrics(0)).toThrow(
			"PreviewRenderMetrics sample window must be positive",
		);
	});
});
