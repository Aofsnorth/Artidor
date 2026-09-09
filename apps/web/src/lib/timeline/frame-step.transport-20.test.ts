import { expect, mock, test } from "bun:test";
import * as wasm from "artidor-wasm";

// Keep every export; only roundToFrame needs the unavailable WASM runtime.
const round = mock(({ time, rate }: { time: number; rate: { numerator: number; denominator: number } }) => {
	const frame = 120_000 * rate.denominator / rate.numerator;
	return Math.round(time / frame) * frame;
});
mock.module("artidor-wasm", () => ({ ...wasm, roundToFrame: round }));
const { ticksPerFrame, stepTimeByFrame, handlePlayheadArrow } = await import("./frame-step");
const fps = { numerator: 30, denominator: 1 };

test("R06 exact rational frame sizes and invalid-rate guards", () => {
	expect(ticksPerFrame({ fps })).toBe(4_000);
	expect(ticksPerFrame({ fps: { numerator: 24_000, denominator: 1_001 } })).toBe(5_005);
	expect(ticksPerFrame({ fps: { numerator: 7, denominator: 1 } })).toBeNull();
	expect(ticksPerFrame({ fps: { numerator: 0, denominator: 1 } })).toBeNull();
	expect(ticksPerFrame({ fps: { numerator: 30, denominator: Number.MAX_SAFE_INTEGER } })).toBeNull();
	expect(stepTimeByFrame({ time: Number.NaN, fps, direction: 1 })).toBe(0);
});

test("R13 arrows round current time before stepping, Shift jumps once", () => {
	expect(stepTimeByFrame({ time: 10_900, fps, direction: 1 })).toBe(16_000);
	expect(round).toHaveBeenCalledWith({ time: 10_900, rate: fps });
	expect(stepTimeByFrame({ time: 8_100, fps, direction: -1 })).toBe(4_000);
	const seek = mock();
	const event = { key: "ArrowRight", shiftKey: true, altKey: false, ctrlKey: false, metaKey: false, preventDefault: mock(), stopPropagation: mock() };
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
