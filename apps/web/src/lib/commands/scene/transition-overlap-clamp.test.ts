/**
 * A transition definition whose `minDuration` is longer than the clip
 * overlap must not produce a transition that extends past both clips.
 */
import { afterAll, describe, expect, mock, test } from "bun:test";
import type { TScene } from "@/lib/timeline";

// `@/lib/timeline` (pulled in via `@/lib/scenes`) re-exports bookmarks,
// which imports `artidor-wasm`. Bun cannot instantiate that build in tests.
mock.module("artidor-wasm", () => ({
	roundToFrame: ({ time }: { time: number }) => time,
}));

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => ({}) },
}));

mock.module("@/lib/transitions/registry", () => ({
	transitionsRegistry: {
		get: (type: string) => {
			if (type !== "fade") throw new Error(`Unknown transition: ${type}`);
			return { type: "fade", minDuration: 100, maxDuration: 3000 };
		},
	},
}));

const { clampTransitionToOverlap } = await import(
	"@/lib/commands/scene/transition"
);

afterAll(() => {
	mock.restore();
});

function tracksWithOverlap(overlapLength: number): TScene["tracks"] {
	return {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			muted: false,
			hidden: false,
			elements: [
				{
					id: "a",
					name: "A",
					type: "video",
					mediaId: "m",
					startTime: 0,
					duration: overlapLength + 50,
					trimStart: 0,
					trimEnd: 0,
					transform: {
						scaleX: 1,
						scaleY: 1,
						position: { x: 0, y: 0 },
						rotate: 0,
					},
					opacity: 1,
				},
				{
					id: "b",
					name: "B",
					type: "video",
					mediaId: "m",
					startTime: 50,
					duration: overlapLength,
					trimStart: 0,
					trimEnd: 0,
					transform: {
						scaleX: 1,
						scaleY: 1,
						position: { x: 0, y: 0 },
						rotate: 0,
					},
					opacity: 1,
				},
			],
		},
		overlayAfter: [],
		audio: [],
	} as unknown as TScene["tracks"];
}

describe("clampTransitionToOverlap", () => {
	test("clamps the definition minimum down to a shorter overlap", () => {
		// Clips: A [0,50], B [50,100] → overlap is exactly 50 < minDuration 100.
		const clamped = clampTransitionToOverlap({
			tracks: tracksWithOverlap(50),
			transitionType: "fade",
			fromTrackId: "main",
			fromElementId: "a",
			toTrackId: "main",
			toElementId: "b",
			startTime: 0,
			duration: 60_000,
		});

		expect(clamped.duration).toBe(50);
		expect(clamped.startTime).toBe(50);
		expect(clamped.startTime + clamped.duration).toBeLessThanOrEqual(100);
	});

	test("still honours minDuration when the overlap is large enough", () => {
		const clamped = clampTransitionToOverlap({
			tracks: tracksWithOverlap(200),
			transitionType: "fade",
			fromTrackId: "main",
			fromElementId: "a",
			toTrackId: "main",
			toElementId: "b",
			startTime: 50,
			duration: 10,
		});

		expect(clamped.duration).toBeGreaterThanOrEqual(100);
		expect(clamped.duration).toBeLessThanOrEqual(200);
	});
});
