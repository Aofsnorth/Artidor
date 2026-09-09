/**
 * Frame-step helper regressions (editor-100-pass, audio/playback scope).
 *
 * `ticksPerFrame` mirrors the Rust core's `FrameRate::ticks_per_frame`
 * (rust/crates/time/src/frame_rate.rs): 120_000 * denominator must divide
 * evenly by numerator, else the rate is unsupported. `stepTimeByFrame` snaps
 * onto that grid so repeated arrow-key steps land exactly on frame
 * boundaries — including from a mid-frame playhead position (e.g. after a
 * drag) and for fractional rates like 29.97 whose ticks-per-frame (4004)
 * does not divide a "nice" round number.
 */
import { describe, expect, test } from "bun:test";
import { stepTimeByFrame, ticksPerFrame } from "@/lib/timeline/frame-step";
import { TICKS_PER_SECOND } from "@/lib/wasm";

describe("ticksPerFrame", () => {
	test("matches the Rust frame-rate table for supported rates", () => {
		// Mirrors rust/crates/time/src/frame_rate.rs test
		// `resolves_ticks_per_standard_frame_rate`.
		expect(ticksPerFrame({ fps: { numerator: 24, denominator: 1 } })).toBe(5_000);
		expect(ticksPerFrame({ fps: { numerator: 25, denominator: 1 } })).toBe(4_800);
		expect(ticksPerFrame({ fps: { numerator: 30, denominator: 1 } })).toBe(4_000);
		expect(ticksPerFrame({ fps: { numerator: 60, denominator: 1 } })).toBe(2_000);
		expect(ticksPerFrame({ fps: { numerator: 120, denominator: 1 } })).toBe(1_000);
		// Fractional rates are representable: 29.97 = 30000/1001 → 4004 ticks.
		expect(
			ticksPerFrame({ fps: { numerator: 30_000, denominator: 1_001 } }),
		).toBe(4_004);
	});

	test("returns null for rates that do not divide the tick grid", () => {
		// 120_000 * 3 / 7 is not an integer — the Rust core rejects this too.
		expect(ticksPerFrame({ fps: { numerator: 7, denominator: 3 } })).toBeNull();
	});

	test("returns null for invalid rates", () => {
		expect(ticksPerFrame({ fps: { numerator: 0, denominator: 1 } })).toBeNull();
		expect(ticksPerFrame({ fps: { numerator: 1, denominator: 0 } })).toBeNull();
		expect(
			ticksPerFrame({ fps: { numerator: Number.NaN, denominator: 1 } }),
		).toBeNull();
		expect(
			ticksPerFrame({ fps: { numerator: 30, denominator: Number.NaN } }),
		).toBeNull();
	});
});

describe("stepTimeByFrame", () => {
	const FPS_30 = { numerator: 30, denominator: 1 };

	test("steps exactly one frame when already on the grid", () => {
		expect(stepTimeByFrame({ time: 0, fps: FPS_30, direction: 1 })).toBe(4_000);
		expect(
			stepTimeByFrame({ time: 40_000, fps: FPS_30, direction: 1 }),
		).toBe(44_000);
		expect(
			stepTimeByFrame({ time: 44_000, fps: FPS_30, direction: -1 }),
		).toBe(40_000);
	});

	test("steps backward clamps at zero instead of going negative", () => {
		expect(stepTimeByFrame({ time: 0, fps: FPS_30, direction: -1 })).toBe(0);
		expect(
			stepTimeByFrame({ time: 2_000, fps: FPS_30, direction: -1 }),
		).toBe(0);
	});

	test("snaps a mid-frame time forward to the NEXT boundary, not one past it", () => {
		// A drag left the playhead at 41_000 (mid frame 10 of 30fps).
		// Forward must land on 44_000 (frame 11), not 45_000 (a frame + step).
		expect(
			stepTimeByFrame({ time: 41_000, fps: FPS_30, direction: 1 }),
		).toBe(44_000);
	});

	test("snaps a mid-frame time backward to the boundary it is inside", () => {
		// From 41_000 backward lands on 40_000 (the frame it's inside), not 36_000.
		expect(
			stepTimeByFrame({ time: 41_000, fps: FPS_30, direction: -1 }),
		).toBe(40_000);
	});

	test("repeated stepping from a mid-frame start stays on-grid forever", () => {
		// The old `now + ticksPerFrame` arithmetic drifted off-grid forever
		// once the playhead was between frames.
		let time = 41_000; // mid-frame
		for (let i = 0; i < 10; i++) {
			time = stepTimeByFrame({ time, fps: FPS_30, direction: 1 }) ?? time;
		}
		// First step snaps 41_000 → 44_000 (frame 11); the remaining 9 steps
		// each add one frame: 44_000 + 9*4_000 = 80_000. Every value on the way
		// is frame-aligned.
		expect(time % 4_000).toBe(0);
		expect(time).toBe(80_000);
	});

	test("handles fractional frame rates (29.97) without drift", () => {
		const fps = { numerator: 30_000, denominator: 1_001 }; // 29.97
		const step = ticksPerFrame({ fps });
		expect(step).toBe(4_004);

		let time = 0;
		for (let i = 0; i < 30; i++) {
			time = stepTimeByFrame({ time, fps, direction: 1 }) ?? time;
		}
		// 30 frames at 29.97fps ≈ 1.001 seconds = 120_120 ticks.
		expect(time).toBe(30 * 4_004);
		expect(time % 4_004).toBe(0);
	});

	test("returns null for unsupported rates and 0 for non-finite time", () => {
		expect(
			stepTimeByFrame({
				time: 100,
				fps: { numerator: 7, denominator: 3 },
				direction: 1,
			}),
		).toBeNull();
		expect(
			stepTimeByFrame({
				time: Number.NaN,
				fps: FPS_30,
				direction: 1,
			}),
		).toBe(0);
		expect(
			stepTimeByFrame({
				time: Number.POSITIVE_INFINITY,
				fps: FPS_30,
				direction: -1,
			}),
		).toBe(0);
	});

	test("full second contains an exact integer number of frames at 30fps", () => {
		// Sanity: the grid must tile the second exactly.
		expect(TICKS_PER_SECOND / 4_000).toBe(30);
	});
});
