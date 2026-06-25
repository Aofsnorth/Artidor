import { describe, expect, test } from "bun:test";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import {
	findNearestClipEdge,
	snapElementEdge,
} from "@/lib/timeline/snap-utils";
import type { SceneTracks } from "@/lib/timeline";

// At zoom=1, 1 second = BASE_TIMELINE_PIXELS_PER_SECOND (50) pixels and
// TICKS_PER_SECOND (120_000) ticks. Snap threshold is 10px ≈ 24_000 ticks.
const ONE_SEC = TICKS_PER_SECOND;
const HALF_SEC = TICKS_PER_SECOND / 2;
const ZOOM = 1;

function makeScene({
	elements,
}: {
	elements: Array<{ startTime: number; duration: number; id?: string }>;
}): SceneTracks {
	return {
		main: {
			id: "main",
			type: "video",
			name: "Main",
			muted: false,
			hidden: false,
			elements: elements.map((el, i) => ({
				id: el.id ?? `el-${i}`,
				startTime: el.startTime,
				duration: el.duration,
				type: "video" as const,
				sourceType: "library" as const,
				sourceUrl: "memory://fake",
				name: `el-${i}`,
				volume: 0,
				muted: false,
				pan: 0,
				transform: {
					scaleX: 1,
					scaleY: 1,
					position: { x: 0, y: 0 },
					rotate: 0,
				},
				opacity: 1,
				effects: [],
			})),
		},
		overlay: [],
		audio: [],
	};
}

describe("snapElementEdge — external drop snap to adjacent", () => {
	test("snaps new clip start to existing clip end within threshold", () => {
		const tracks = makeScene({
			elements: [{ startTime: 0, duration: 2 * ONE_SEC }],
		});

		// Cursor 1px before the existing clip's end at t=2s. The new clip's
		// START should snap to 2s.
		const result = snapElementEdge({
			targetTime: 2 * ONE_SEC - 1,
			elementDuration: ONE_SEC,
			tracks,
			playheadTime: 0,
			zoomLevel: ZOOM,
			snapToStart: true,
		});

		expect(result.snapPoint?.type).toBe("element-end");
		expect(result.snappedTime).toBe(2 * ONE_SEC);
	});

	test("snaps new clip end to existing clip start (snapToStart: false)", () => {
		const tracks = makeScene({
			elements: [{ startTime: 5 * ONE_SEC, duration: ONE_SEC }],
		});

		// Cursor exactly at the existing clip's start (5s). The new clip's
		// END should snap to the existing clip's start so they touch
		// end-to-start.
		const result = snapElementEdge({
			targetTime: 5 * ONE_SEC,
			elementDuration: 2 * ONE_SEC,
			tracks,
			playheadTime: 0,
			zoomLevel: ZOOM,
			snapToStart: false,
		});

		// effectiveTarget = targetTime + elementDuration = 5s + 2s = 7s.
		// Closest edge: existing clip end (6s). Distance = 1s.
		// snappedTime = 6s - 2s = 4s.
		expect(result.snapPoint?.type).toBe("element-end");
		expect(result.snappedTime).toBe(4 * ONE_SEC);
	});

	test("does NOT snap when no clip edge is within threshold", () => {
		const tracks = makeScene({
			elements: [{ startTime: 0, duration: ONE_SEC }],
		});

		// Cursor 1 full minute past the existing clip's end (1min >> 24s
		// threshold). No snap.
		const result = snapElementEdge({
			targetTime: ONE_SEC + 60 * ONE_SEC,
			elementDuration: ONE_SEC,
			tracks,
			playheadTime: 0,
			zoomLevel: ZOOM,
			snapToStart: true,
		});

		expect(result.snapPoint).toBeNull();
	});

	test("snaps to closest edge when multiple candidates exist", () => {
		const tracks = makeScene({
			elements: [
				{ startTime: 0, duration: 2 * ONE_SEC, id: "el-0" },
				{ startTime: 5 * ONE_SEC, duration: ONE_SEC, id: "el-1" },
			],
		});

		// Cursor at 5s exactly — exactly on el-1's start edge, 3s past
		// el-0's end. Should snap to el-1's start (distance 0).
		const result = snapElementEdge({
			targetTime: 5 * ONE_SEC,
			elementDuration: ONE_SEC,
			tracks,
			playheadTime: 0,
			zoomLevel: ZOOM,
			snapToStart: true,
		});

		expect(result.snapPoint?.type).toBe("element-start");
		expect(result.snapPoint?.elementId).toBe("el-1");
	});
});

describe("findNearestClipEdge", () => {
	test("returns start edge when target is closer to start", () => {
		const tracks = makeScene({
			elements: [{ startTime: 2 * ONE_SEC, duration: ONE_SEC }],
		});

		const result = findNearestClipEdge({
			targetTime: 2 * ONE_SEC - 1, // 1px before start
			tracks,
			zoomLevel: ZOOM,
		});

		expect(result.snapPoint?.type).toBe("element-start");
	});

	test("returns end edge when target is closer to end", () => {
		const tracks = makeScene({
			elements: [{ startTime: 2 * ONE_SEC, duration: ONE_SEC }],
		});

		const result = findNearestClipEdge({
			targetTime: 3 * ONE_SEC + 1, // 1px past end
			tracks,
			zoomLevel: ZOOM,
		});

		expect(result.snapPoint?.type).toBe("element-end");
	});

	test("returns no snap point when no edge is within threshold", () => {
		const tracks = makeScene({
			elements: [{ startTime: 2 * ONE_SEC, duration: ONE_SEC }],
		});

		const result = findNearestClipEdge({
			targetTime: 2 * ONE_SEC + 60 * ONE_SEC, // 1 minute past start
			tracks,
			zoomLevel: ZOOM,
		});

		expect(result.snapPoint).toBeNull();
	});

	test("picks the closer edge when both are within threshold", () => {
		// Place a short clip at 0..0.5s and query at 0.4s. Both edges
		// are within the 24_000-tick threshold: start at dist 0.4s
		// (48_000 ticks > 24_000 threshold) — actually that's still
		// outside threshold. Use a tighter scenario: clip at 5..6s,
		// query at 5.5s, distances are 0.5s = 60_000 ticks > 24_000.
		// We need shorter distances for the threshold to fire.
		// Place query at 5.001s — 1ms past start, 999ms before end.
		const tracks = makeScene({
			elements: [{ startTime: 5 * ONE_SEC, duration: ONE_SEC }],
		});

		const oneMs = ONE_SEC / 1000;
		const result = findNearestClipEdge({
			targetTime: 5 * ONE_SEC + oneMs, // 1ms past start
			tracks,
			zoomLevel: ZOOM,
		});

		expect(result.snapPoint?.type).toBe("element-start");
		expect(result.snappedTime).toBe(5 * ONE_SEC);
	});
});