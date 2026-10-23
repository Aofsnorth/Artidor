import { afterAll, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { SceneTracks } from "@/lib/timeline/types";
import type { TimelineElement } from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

// `mock.module` replaces the whole namespace for the rest of the process, so
// this stub must cover every export the import graph links against — a partial
// stub fails with "Export named '…' not found" before the first test runs.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({
		time,
		rate,
	}: {
		time: number;
		rate?: { numerator: number; denominator: number };
	}) => {
		const fps = rate ? rate.numerator / rate.denominator : 30;
		const ticksPerFrame = 120_000 / fps;
		return Math.round(time / ticksPerFrame) * ticksPerFrame;
	},
	lastFrameTime: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
	floorToFrame: ({ time }: { time: number }) => time,
	isFrameAligned: () => true,
	mediaTimeAdd: ({ lhs, rhs }: { lhs: number; rhs: number }) => lhs + rhs,
	mediaTimeSub: ({ lhs, rhs }: { lhs: number; rhs: number }) => lhs - rhs,
	mediaTimeMin: ({ lhs, rhs }: { lhs: number; rhs: number }) =>
		Math.min(lhs, rhs),
	mediaTimeMax: ({ lhs, rhs }: { lhs: number; rhs: number }) =>
		Math.max(lhs, rhs),
	mediaTimeClamp: ({
		time,
		min,
		max,
	}: {
		time: number;
		min: number;
		max: number;
	}) => Math.min(max, Math.max(min, time)),
	mediaTimeFromSeconds: ({ seconds }: { seconds: number }) =>
		Math.round(seconds * 120_000),
	mediaTimeToSeconds: ({ time }: { time: number }) => time / 120_000,
	mediaTimeFromFrame: ({
		frame,
		rate,
	}: {
		frame: number;
		rate: { numerator: number; denominator: number };
	}) =>
		Math.round(
			(frame * 120_000 * rate.denominator) / rate.numerator,
		),
	mediaTimeToFrame: ({
		time,
		rate,
	}: {
		time: number;
		rate: { numerator: number; denominator: number };
	}) =>
		BigInt(
			Math.round((time * rate.numerator) / (120_000 * rate.denominator)),
		),
	formatTimecode: () => "0:00",
	parseTimecode: () => 0,
	guessTimecodeFormat: () => "HH:MM:SS:FF",
	initializeGpu: () => Promise.resolve(),
	destroyGpu: () => {},
	initCompositor: () => {},
	initCompositorWithCanvas: () => {},
	destroyCompositor: () => {},
	getCompositorCanvas: () => undefined as unknown as OffscreenCanvas,
	resizeCompositor: () => {},
	renderFrame: () => {},
	uploadTexture: () => {},
	releaseTexture: () => {},
	applyEffectPasses: () => [0, 0, 0],
	applyMaskFeather: () => [0, 0, 0],
	initSync: () => ({}),
	default: () => Promise.resolve({}),
}));

const { TimelineManager } = await import("./timeline-manager");

afterAll(() => {
	mock.restore();
});

const cameraTrack = {
	id: "camera-track",
	name: "Camera",
	type: "camera",
	elements: [],
	muted: false,
	hidden: false,
};

function buildHarness() {
	let sceneTracks = buildSceneTracks({
		overlay: [cameraTrack as never],
	});
	const editor = {
		playback: { getCurrentTime: () => 10_500 },
		project: {
			getActiveOrNull: () => ({
				settings: { fps: { numerator: 30, denominator: 1 } },
			}),
		},
		scenes: {
			getActiveScene: () => ({ tracks: sceneTracks }),
			getActiveSceneOrNull: () => ({ tracks: sceneTracks }),
		},
		command: { execute: () => undefined },
	} as unknown as EditorCore;

	return {
		manager: new TimelineManager(editor),
		getTracks: () => sceneTracks,
		setTracks: (next: SceneTracks) => {
			sceneTracks = next;
		},
	};
}

test("CORE-22 insertCameraLayer snaps the playhead to a frame", () => {
	const { manager } = buildHarness();
	let capturedStartTime: number | undefined;
	// Capture the built camera instead of committing it; the rounding under
	// test happens before insertion.
	manager.insertElement = ({ element }) => {
		capturedStartTime = (element as unknown as TimelineElement).startTime;
		return null;
	};

	manager.insertCameraLayer();

	// 10_500 ticks at 30 fps rounds to frame 3 (12_000 ticks), not the raw
	// playhead the text path already rounds.
	expect(capturedStartTime).toBe(12_000);
});

test("CORE-18 getTotalDuration invalidates when the tracks object changes", () => {
	const { manager, setTracks } = buildHarness();
	expect(manager.getTotalDuration()).toBe(0);

	setTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({
						id: "clip",
						startTime: 20_000,
						duration: 80_000,
					}),
				],
			}),
		}),
	);

	expect(manager.getTotalDuration()).toBe(100_000);
});
