/**
 * PlaybackManager loop regressions (editor-100-pass, audio/playback scope).
 *
 * The loop restart must happen inside the rAF tick that detects the end of
 * the timeline — the old implementation had a UI listener watch
 * `playback-update` events and seek back to 0 when the playhead came within
 * 50ms of the end. A long rAF gap (>1 frame) jumped straight past that
 * window, so playback stalled on the last frame with loop enabled.
 *
 * A fake requestAnimationFrame clock drives the tick loop deterministically:
 * no real timers, no real frames, full control over frame gaps.
 */
import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";

// `PlaybackManager` calls `roundToFrame` from `artidor-wasm`, which reads
// the wasm instance; bun:test never instantiates it, so mock the module
// with the fixed tick rate and a frame-grid-rounded implementation
// (pattern: apps/web/src/lib/media/__tests__/audio-silence.test.ts).
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	// 30fps grid: 4_000 ticks per frame.
	roundToFrame: ({ time }: { time: number }) => Math.round(time / 4_000) * 4_000,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

const { PlaybackManager } = await import("../playback-manager");

const TOTAL_DURATION = 10 * 120_000; // 10 seconds in ticks
const FPS_30 = { numerator: 30, denominator: 1 };
const FRAME_MS = 1_000 / 30;

/** Virtual time in ms; advanced only by the test. */
let now = 0;
/** Pending rAF callbacks registered by the manager. */
const rafQueue: Array<{ id: number; callback: () => void }> = [];
let nextRafId = 1;

function installFakeClock() {
	now = 0;
	rafQueue.length = 0;
	nextRafId = 1;
	globalThis.requestAnimationFrame = ((callback: () => void) => {
		const entry = { id: nextRafId++, callback };
		rafQueue.push(entry);
		return entry.id;
	}) as typeof requestAnimationFrame;
	globalThis.cancelAnimationFrame = ((id: number) => {
		const index = rafQueue.findIndex((entry) => entry.id === id);
		if (index >= 0) rafQueue.splice(index, 1);
	}) as typeof cancelAnimationFrame;
}

/**
 * Advance the virtual clock and run every queued rAF callback, simulating
 * `frames` display frames. `gapFrames` lets one tick cover MORE than one
 * frame duration (the real-world jank case that broke the old loop).
 */
function advanceFrames(frames: number, gapMultiplier = 1): void {
	for (let i = 0; i < frames; i++) {
		now += FRAME_MS * gapMultiplier;
		const callbacks = [...rafQueue];
		rafQueue.length = 0;
		for (const entry of callbacks) {
			entry.callback();
		}
	}
}

function buildEditor(): EditorCore {
	const seekEvents: number[] = [];
	return {
		timeline: {
			getTotalDuration: () => TOTAL_DURATION,
			subscribe: () => () => {},
		},
		scenes: {
			subscribe: () => () => {},
		},
		project: {
			getActive: () => ({ settings: { fps: FPS_30 } }),
		},
		playback: null,
		// Expose the recorded seek events for assertions.
		...({
			__seekEvents: seekEvents,
		} as Record<string, unknown>),
	} as unknown as EditorCore & { __seekEvents: number[] };
}

let originalRaf: typeof requestAnimationFrame;
let originalCancelRaf: typeof cancelAnimationFrame;
let originalNow: typeof performance.now;
let seekListener: ((event: Event) => void) | undefined;

beforeEach(() => {
	originalRaf = globalThis.requestAnimationFrame;
	originalCancelRaf = globalThis.cancelAnimationFrame;
	originalNow = performance.now;
	installFakeClock();
	performance.now = (() => now) as typeof performance.now;
	if (typeof window === "undefined") {
		seekListener = undefined;
	}
});

afterEach(() => {
	globalThis.requestAnimationFrame = originalRaf;
	globalThis.cancelAnimationFrame = originalCancelRaf;
	performance.now = originalNow;
	if (seekListener) {
		window.removeEventListener("playback-seek", seekListener);
		seekListener = undefined;
	}
});

test("loop restarts from zero in the same tick that hits the end", () => {
	const editor = buildEditor();
	const manager = new PlaybackManager(editor);

	// Start near the end: one frame before the 10s end.
	manager.seek({ time: TOTAL_DURATION - 4_000 });
	manager.setLoop({ loop: true });
	manager.play();

	expect(manager.getIsPlaying()).toBe(true);

	// One normal frame crosses the end.
	advanceFrames(1);

	// With loop on, playback must still be running and have restarted from
	// the beginning of the timeline (not stalled at the end).
	expect(manager.getIsPlaying()).toBe(true);
	// One frame past the end restarts at 0 and the same tick re-schedules;
	// the next tick advances one frame.
	advanceFrames(1);
	expect(manager.getCurrentTime()).toBe(4_000);
	expect(manager.getLoop()).toBe(true);
});

test("loop survives a >1-frame rAF gap that jumps past the old 50ms window", () => {
	const editor = buildEditor();
	const manager = new PlaybackManager(editor);

	// Start 2 frames before the end.
	manager.seek({ time: TOTAL_DURATION - 2 * 4_000 });
	manager.setLoop({ loop: true });
	manager.play();

	// A single rAF tick covering 6 frames (~200ms at 30fps) blows straight
	// past the old listener's 50ms end-window: the playhead lands AT the end.
	// The manager's own tick must still restart, not stall.
	advanceFrames(1, 6);

	expect(manager.getIsPlaying()).toBe(true);
	expect(manager.getCurrentTime()).toBe(0);
});

test("loop off still pauses at the end", () => {
	const editor = buildEditor();
	const manager = new PlaybackManager(editor);

	manager.seek({ time: TOTAL_DURATION - 4_000 });
	manager.play();

	advanceFrames(2);

	expect(manager.getIsPlaying()).toBe(false);
	expect(manager.getCurrentTime()).toBe(TOTAL_DURATION);
});

test("toggleLoop flips the flag and notifies subscribers", () => {
	const editor = buildEditor();
	const manager = new PlaybackManager(editor);

	let notifications = 0;
	const unsubscribe = manager.subscribe(() => {
		notifications += 1;
	});

	expect(manager.getLoop()).toBe(false);
	manager.toggleLoop();
	expect(manager.getLoop()).toBe(true);
	manager.toggleLoop();
	expect(manager.getLoop()).toBe(false);
	expect(notifications).toBe(2);

	unsubscribe();
});

test("seek while looping re-anchors the wall clock so playback does not jump", () => {
	const editor = buildEditor();
	const manager = new PlaybackManager(editor);

	manager.setLoop({ loop: true });
	manager.seek({ time: 5 * 120_000 });
	manager.play();
	advanceFrames(3);

	// ~100ms of playback at 30fps ≈ 3 frames ≈ 12_000 ticks past 5s.
	expect(manager.getCurrentTime()).toBeGreaterThan(5 * 120_000);

	// Seek back near the end mid-playback, then keep playing.
	manager.seek({ time: TOTAL_DURATION - 2 * 4_000 });
	const timeAfterSeek = manager.getCurrentTime();
	advanceFrames(1);
	// The seek re-anchored: the next tick advances from the seek position,
	// it does not jump by the pre-seek elapsed time.
	expect(manager.getCurrentTime()).toBeGreaterThan(timeAfterSeek);
	expect(manager.getIsPlaying()).toBe(true);
});
