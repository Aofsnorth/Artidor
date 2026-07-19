import { describe, expect, test } from "bun:test";
import { PreviewQualityGovernor } from "./preview-quality-governor";

describe("PreviewQualityGovernor", () => {
	test("downgrades after sustained slow playback", () => {
		const governor = new PreviewQualityGovernor();
		const input = {
			quality: "auto" as const,
			isPlaying: true,
			avgRenderMs: 25,
			frameBudgetMs: 16.7,
			deviceTier: "high" as const,
		};

		const initial = governor.resolve(input);
		governor.resolve(input);
		const degraded = governor.resolve(input);

		expect(initial).toBe(1);
		expect(degraded).toBeLessThan(initial);
		expect(governor.consumeTierChange()).toBe(true);
		expect(governor.consumeTierChange()).toBe(false);
	});

	test("does not oscillate inside the hysteresis band", () => {
		const governor = new PreviewQualityGovernor();
		const scales = new Set<number>();
		for (let index = 0; index < 120; index++) {
			scales.add(
				governor.resolve({
					quality: "auto",
					isPlaying: true,
					avgRenderMs: index % 2 === 0 ? 15 : 17,
					frameBudgetMs: 16.7,
					deviceTier: "medium",
				}),
			);
		}

		expect(scales.size).toBe(1);
	});

	test("recovers only after a long stable fast window", () => {
		const governor = new PreviewQualityGovernor();
		const slow = {
			quality: "auto" as const,
			isPlaying: true,
			avgRenderMs: 30,
			frameBudgetMs: 16.7,
			deviceTier: "high" as const,
		};
		governor.resolve(slow);
		governor.resolve(slow);
		const degraded = governor.resolve(slow);

		const fast = { ...slow, avgRenderMs: 1 };
		for (let index = 0; index < 89; index++) governor.resolve(fast);
		expect(governor.resolve(fast)).toBeGreaterThan(degraded);
	});

	test("manual quality bypasses adaptation", () => {
		const governor = new PreviewQualityGovernor();
		expect(
			governor.resolve({
				quality: "high",
				isPlaying: true,
				avgRenderMs: 100,
				frameBudgetMs: 16.7,
				deviceTier: "low",
			}),
		).toBe(1);
	});
});
