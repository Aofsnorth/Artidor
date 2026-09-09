import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type {
	AudioTrack,
	SceneTracks,
	TextTrack,
	VideoTrack,
} from "@/lib/timeline";

let currentTracks: SceneTracks;

const updateTracksMock = mock((tracks: SceneTracks) => {
	currentTracks = tracks;
});

const editorMock = {
	scenes: {
		getActiveScene: () => ({ tracks: currentTracks }),
	},
	timeline: {
		updateTracks: updateTracksMock,
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { RemoveTrackCommand } = await import("./remove-track");

afterAll(() => {
	mock.restore();
});

afterEach(() => {
	updateTracksMock.mockClear();
});

function buildVideoTrack(id: string): VideoTrack {
	return {
		id,
		name: id,
		type: "video",
		elements: [],
		muted: false,
		hidden: false,
	};
}

function buildTextTrack(id: string): TextTrack {
	return {
		id,
		name: id,
		type: "text",
		elements: [],
		hidden: false,
	};
}

function buildAudioTrack(id: string): AudioTrack {
	return {
		id,
		name: id,
		type: "audio",
		elements: [],
		muted: false,
	};
}

function buildSceneTracks(overrides: Partial<SceneTracks> = {}): SceneTracks {
	return {
		overlay: [],
		main: buildVideoTrack("main-track"),
		overlayAfter: [],
		audio: [],
		...overrides,
	};
}

describe("RemoveTrackCommand", () => {
	test("removes a video track added below the main track (overlayAfter)", () => {
		currentTracks = buildSceneTracks({
			overlayAfter: [buildVideoTrack("video-below")],
		});

		new RemoveTrackCommand("video-below").execute();

		expect(updateTracksMock).toHaveBeenCalledTimes(1);
		expect(currentTracks.overlayAfter).toHaveLength(0);
		expect(currentTracks.main.id).toBe("main-track");
	});

	test("removes an overlay track above the main track", () => {
		currentTracks = buildSceneTracks({
			overlay: [buildTextTrack("text-top"), buildVideoTrack("video-top")],
		});

		new RemoveTrackCommand("video-top").execute();

		expect(currentTracks.overlay.map((track) => track.id)).toEqual([
			"text-top",
		]);
	});

	test("removes an audio track", () => {
		currentTracks = buildSceneTracks({
			audio: [buildAudioTrack("audio-1"), buildAudioTrack("audio-2")],
		});

		new RemoveTrackCommand("audio-1").execute();

		expect(currentTracks.audio.map((track) => track.id)).toEqual(["audio-2"]);
	});

	test("leaves the main track and other lanes untouched", () => {
		currentTracks = buildSceneTracks({
			overlay: [buildTextTrack("text-top")],
			overlayAfter: [buildVideoTrack("video-below")],
			audio: [buildAudioTrack("audio-1")],
		});

		new RemoveTrackCommand("no-such-track").execute();

		expect(currentTracks.main.id).toBe("main-track");
		expect(currentTracks.overlay).toHaveLength(1);
		expect(currentTracks.overlayAfter).toHaveLength(1);
		expect(currentTracks.audio).toHaveLength(1);
	});

	test("undo restores the tracks captured before removal", () => {
		const original = buildSceneTracks({
			overlayAfter: [buildVideoTrack("video-below")],
		});
		currentTracks = original;

		const command = new RemoveTrackCommand("video-below");
		command.execute();
		expect(currentTracks.overlayAfter).toHaveLength(0);

		command.undo();
		expect(updateTracksMock).toHaveBeenCalledTimes(2);
		expect(currentTracks).toBe(original);
	});
});
