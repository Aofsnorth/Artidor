import { expect, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { SceneTracks } from "@/lib/timeline/types";
import type { TimelineElement } from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";
import { TimelineManager } from "./timeline-manager";

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
