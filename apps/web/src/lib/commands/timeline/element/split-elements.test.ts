/**
 * Split command regressions: frame-sized halves must be checked on the
 * integer tick grid, and a frame rate with no exact tick representation must
 * reject the cut explicitly instead of guessing with a float frame size.
 */
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { SceneTracks } from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

const TICKS_PER_SECOND = 120_000;

let currentTracks: SceneTracks;
let fps = { numerator: 30, denominator: 1 };

const editorMock = {
	scenes: {
		getActiveScene: () => ({ tracks: currentTracks }),
	},
	timeline: {
		updateTracks: (next: SceneTracks) => {
			currentTracks = next;
		},
	},
	project: {
		getActiveOrNull: () => ({ settings: { fps } }),
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

// The command imports `roundToFrame` from artidor-wasm; bun never instantiates
// the wasm module. Mirror the real checked frame-rate math so 7/3 fails.
function ticksPerFrameFor(rate: { numerator: number; denominator: number }) {
	const ticks = TICKS_PER_SECOND * rate.denominator;
	if (
		!Number.isSafeInteger(ticks) ||
		!Number.isSafeInteger(rate.numerator) ||
		rate.numerator <= 0 ||
		ticks % rate.numerator !== 0
	) {
		return null;
	}
	return ticks / rate.numerator;
}

mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND,
	roundToFrame: ({
		time,
		rate,
	}: {
		time: number;
		rate: { numerator: number; denominator: number };
	}) => {
		const perFrame = ticksPerFrameFor(rate);
		if (perFrame === null) return null;
		return Math.round(time / perFrame) * perFrame;
	},
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

const { SplitElementsCommand } = await import("./split-elements");

afterAll(() => {
	mock.restore();
});

beforeEach(() => {
	fps = { numerator: 30, denominator: 1 };
	currentTracks = buildSceneTracks({
		main: buildVideoTrack({
			id: "main",
			elements: [
				buildVideoElement({ id: "clip", startTime: 0, duration: 120_000 }),
			],
		}),
	});
});

function splitAt(splitTime: number) {
	new SplitElementsCommand({
		elements: [{ trackId: "main", elementId: "clip" }],
		splitTime,
	}).execute();
	return currentTracks.main.elements;
}

test("splits at an exact frame boundary", () => {
	const elements = splitAt(60_000);

	expect(elements).toHaveLength(2);
	expect(elements[0]).toMatchObject({ startTime: 0, duration: 60_000 });
	expect(elements[1]).toMatchObject({ startTime: 60_000, duration: 60_000 });
});

test("rejects a cut that leaves a sub-frame half", () => {
	currentTracks = buildSceneTracks({
		main: buildVideoTrack({
			id: "main",
			elements: [
				buildVideoElement({ id: "clip", startTime: 0, duration: 21_000 }),
			],
		}),
	});

	const elements = splitAt(20_000);

	expect(elements).toHaveLength(1);
	expect(elements[0]?.id).toBe("clip");
});

test("rejects the cut when the frame rate has no exact tick representation", () => {
	// 7/3 fps is 360_000 / 7 ticks per frame — not an integer. The old float
	// frame size (~51_428.57) would have allowed this split; the checked
	// helper must refuse it instead of creating off-grid halves.
	fps = { numerator: 7, denominator: 3 };

	const elements = splitAt(60_000);

	expect(elements).toHaveLength(1);
	expect(elements[0]?.id).toBe("clip");
});
