import { expect, test } from "bun:test";
import { createMarqueeAnimation } from "./marquee-text-animation";

test("@fast marquee travels at the requested speed regardless of overflow length", () => {
	for (const overflow of [2, 15, 90, 600]) {
		const cycle = createMarqueeAnimation({ overflow, pxPerSecond: 30 });
		expect(cycle).not.toBeNull();
		if (!cycle) throw new Error("Expected an overflowing title to animate");
		const hold = cycle.keyframes.at(1)?.offset ?? 0;
		const end = cycle.keyframes.at(2)?.offset ?? 0;
		const duration = Number(cycle.options.duration);
		expect((end - hold) * duration).toBeCloseTo((overflow / 30) * 1_000);
		expect(hold * duration).toBeGreaterThanOrEqual(1_000);
		expect(cycle.options.easing).toBe("linear");
		expect(cycle.keyframes.at(-1)?.transform).toBe("translateX(0px)");
	}
});

test("@fast fitting and invalid widths do not animate", () => {
	for (const overflow of [-10, 0, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
		expect(createMarqueeAnimation({ overflow })).toBeNull();
	}
});

test("@fast invalid speeds and pause ratios use finite safe timings", () => {
	for (const pxPerSecond of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
		const cycle = createMarqueeAnimation({ overflow: 90, pxPerSecond, pauseRatio: Number.NaN });
		expect(cycle).toEqual(createMarqueeAnimation({ overflow: 90 }));
	}
	const noPause = createMarqueeAnimation({ overflow: 90, pauseRatio: 0 });
	expect(noPause?.options.duration).toBe(6_000);
	const clampedPause = createMarqueeAnimation({ overflow: 90, pauseRatio: 10 });
	expect(clampedPause).toEqual(createMarqueeAnimation({ overflow: 90, pauseRatio: 0.8 }));
});
