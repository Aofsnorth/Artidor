import { expect, mock, test } from "bun:test";

// Match the sibling media tests' fixed-tick mock: the real WASM runtime is
// unavailable under bun:test, so stub the same known exports instead of
// spreading the uninitialized module.
const round = mock(
	({
		time,
		rate,
	}: {
		time: number;
		rate: { numerator: number; denominator: number };
	}) => {
		const frame = (120_000 * rate.denominator) / rate.numerator;
		return Math.round(time / frame) * frame;
	},
);
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: round,
	snappedSeekTime: ({ time }: { time: number }) => time,
	initializeGpu: () => Promise.resolve(),
	destroyGpu: () => {},
	applyEffectPasses: () => [0, 0, 0],
	applyMaskFeather: () => [0, 0, 0],
}));
const { ticksPerFrame, stepTimeByFrame, handlePlayheadArrow } = await import(
	"./frame-step"
);
const fps = { numerator: 30, denominator: 1 };

test("R06 exact rational frame sizes and invalid-rate guards", () => {
	expect(ticksPerFrame({ fps })).toBe(4_000);
	expect(
		ticksPerFrame({ fps: { numerator: 24_000, denominator: 1_001 } }),
	).toBe(5_005);
	expect(ticksPerFrame({ fps: { numerator: 7, denominator: 1 } })).toBeNull();
	expect(ticksPerFrame({ fps: { numerator: 0, denominator: 1 } })).toBeNull();
	expect(
		ticksPerFrame({
			fps: { numerator: 30, denominator: Number.MAX_SAFE_INTEGER },
		}),
	).toBeNull();
	expect(stepTimeByFrame({ time: Number.NaN, fps, direction: 1 })).toBe(0);
});

test("R13 arrows snap off-grid time forward to the next boundary, Shift jumps once", () => {
	// Mid-frame time snaps to the NEXT boundary (12_000) — NOT one frame
	// past it (16_000), matching the sibling frame-step suite's contract.
	expect(stepTimeByFrame({ time: 10_900, fps, direction: 1 })).toBe(12_000);
	expect(stepTimeByFrame({ time: 8_100, fps, direction: -1 })).toBe(8_000);
	const seek = mock();
	const event = {
		key: "ArrowRight",
		shiftKey: true,
		altKey: false,
		ctrlKey: false,
		metaKey: false,
		preventDefault: mock(),
		stopPropagation: mock(),
	};
	handlePlayheadArrow({ event, time: 120_000, duration: 900_000, fps, seek });
	expect(seek).toHaveBeenCalledTimes(1);
	expect(seek).toHaveBeenCalledWith({ time: 720_000 });
	expect(event.stopPropagation).toHaveBeenCalledTimes(1);
	event.key = "ArrowLeft";
	handlePlayheadArrow({ event, time: 120_000, duration: 900_000, fps, seek });
	expect(seek).toHaveBeenLastCalledWith({ time: 0 });
	event.altKey = true;
	handlePlayheadArrow({ event, time: 120_000, duration: 900_000, fps, seek });
	expect(seek).toHaveBeenCalledTimes(2);
});
