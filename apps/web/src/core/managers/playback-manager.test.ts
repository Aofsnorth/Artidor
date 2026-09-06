import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import type { EditorCore } from "@/core";
import { PlaybackManager } from "./playback-manager";

let clock = 0;
let nextFrameId = 0;
let duration = 1_200_000;
const frames = new Map<number, FrameRequestCallback>();
const originalRequest = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
const originalCancel = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");
let restoreClock = () => {};

function createPlayback() {
	const editor = {
		timeline: { getTotalDuration: () => duration },
		project: { getActive: () => null },
	};
	// Real playback clock; media/GPU and FPS quantization are outside this test.
	return new PlaybackManager(editor as unknown as EditorCore);
}

beforeEach(() => {
	clock = 0;
	nextFrameId = 0;
	duration = 1_200_000;
	frames.clear();
	const now = spyOn(performance, "now").mockImplementation(() => clock);
	restoreClock = () => now.mockRestore();
	Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: (callback: FrameRequestCallback) => {
		const id = nextFrameId++;
		frames.set(id, callback);
		return id;
	} });
	Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: (id: number) => frames.delete(id) });
});

afterEach(() => {
	restoreClock();
	for (const [key, descriptor] of [["requestAnimationFrame", originalRequest], ["cancelAnimationFrame", originalCancel]] as const) {
		if (descriptor) Object.defineProperty(globalThis, key, descriptor);
		else Reflect.deleteProperty(globalThis, key);
	}
	frames.clear();
});

describe("playback boundaries @fast @regression", () => {
	test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])("ignores invalid seek and volume values (%s)", (invalid) => {
		const playback = createPlayback();
		playback.seek({ time: 120_000 });
		playback.setVolume({ volume: 0.5 });
		playback.seek({ time: invalid });
		playback.setVolume({ volume: invalid });
		expect(playback.getCurrentTime()).toBe(120_000);
		expect(playback.getVolume()).toBe(0.5);
	});

	test("cancels animation frame zero when paused", () => {
		const playback = createPlayback();
		playback.play();
		expect(frames.has(0)).toBe(true);
		playback.pause();
		expect(frames.size).toBe(0);
	});

	test("calling play while playing does not restart the playback clock", () => {
		const playback = createPlayback();
		playback.play();
		clock = 500;
		playback.play();
		clock = 1_000;
		const callback = frames.values().next().value;
		if (!callback) throw new Error("Expected animation frame");
		frames.clear();
		callback(clock);
		expect(playback.getCurrentTime()).toBe(120_000);
		playback.pause();
	});

	test("clamps finite seeks and restores volume after muting", () => {
		const playback = createPlayback();
		playback.seek({ time: -100 });
		expect(playback.getCurrentTime()).toBe(0);
		playback.seek({ time: 2_000_000 });
		expect(playback.getCurrentTime()).toBe(duration);
		playback.setVolume({ volume: 0.25 });
		playback.mute();
		playback.unmute();
		expect(playback.getVolume()).toBe(0.25);
	});
});
