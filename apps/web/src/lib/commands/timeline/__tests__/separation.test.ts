/**
 * Source-audio separation regressions (editor-100-pass, commands scope):
 * "recover audio" must remove the detached audio layer it created, never
 * leaving doubled audio — and must not silently delete a layer the user has
 * since edited. Only the EditorCore singleton boundary is mocked (pattern:
 * lib/commands/timeline/track/remove-track.test.ts).
 */
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type {
	AudioTrack,
	SceneTracks,
	TimelineElement,
	VideoElement,
} from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

let currentTracks: SceneTracks;

const updateTracksMock = mock((tracks: SceneTracks) => {
	currentTracks = tracks;
});

const editorMock = {
	scenes: {
		getActiveScene: () => ({ tracks: currentTracks }),
		getActiveSceneOrNull: () => ({ tracks: currentTracks }),
	},
	timeline: {
		updateTracks: updateTracksMock,
	},
	selection: {
		getSelectedElements: () => [],
		setSelectedElements: () => {},
	},
	media: {
		getAssets: () =>
			[{ id: "media", type: "video", hasAudio: true }] as Array<
				Record<string, unknown>
			>,
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { CommandManager } = await import("@/core/managers/commands");
const { ToggleSourceAudioSeparationCommand } = await import(
	"../element/toggle-source-audio-separation"
);

afterAll(() => {
	mock.restore();
});

beforeEach(() => {
	updateTracksMock.mockClear();
});

function resetTracks(tracks: SceneTracks) {
	currentTracks = tracks;
}

function allElements(): TimelineElement[] {
	return [
		...currentTracks.overlay,
		currentTracks.main,
		...currentTracks.overlayAfter,
		...currentTracks.audio,
	].flatMap((track) => track.elements);
}

function findElement(id: string): TimelineElement | undefined {
	return allElements().find((element) => element.id === id);
}

function buildVideo(
	id: string,
	overrides: Partial<VideoElement> = {},
): VideoElement {
	return buildVideoElement({
		id,
		startTime: 0,
		duration: 120_000,
		...overrides,
	});
}

test("separate then recover removes the detached layer — no doubled audio", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({ elements: [buildVideo("clip")] }),
		}),
	);
	const manager = new CommandManager(editorMock);

	const command = new ToggleSourceAudioSeparationCommand({
		trackId: "main",
		elementId: "clip",
	});
	manager.execute({ command });

	// Separation created exactly one detached audio layer.
	expect(currentTracks.audio).toHaveLength(1);
	expect(currentTracks.audio[0]?.elements).toHaveLength(1);
	const detachedId = currentTracks.audio[0]?.elements[0]?.id as string;
	expect(findElement("clip")).toMatchObject({ isSourceAudioEnabled: false });

	// Recover: video audio back on AND the detached layer gone.
	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});

	expect(findElement("clip")).toMatchObject({ isSourceAudioEnabled: true });
	expect(findElement(detachedId)).toBeUndefined();
	// The lane bookkeeping still holds the (now empty) audio lane; no second
	// audio element remains anywhere (the doubling bug).
	expect(
		allElements().filter((element) => element.type === "audio"),
	).toHaveLength(0);
});

test("recover keeps a detached layer the user has since edited", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({ elements: [buildVideo("clip")] }),
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});
	const detachedId = currentTracks.audio[0]?.elements[0]?.id as string;

	// The user moves the detached layer elsewhere on the timeline.
	const movedTracks: SceneTracks = {
		...currentTracks,
		audio: currentTracks.audio.map((track) => ({
			...track,
			elements: track.elements.map((element) =>
				element.id === detachedId
					? { ...element, startTime: 240_000 }
					: element,
			),
		})),
	};
	updateTracksMock(movedTracks);
	resetTracks(movedTracks);

	// Recover must re-enable the video audio but MUST NOT delete the moved layer.
	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});

	expect(findElement("clip")).toMatchObject({ isSourceAudioEnabled: true });
	const kept = findElement(detachedId);
	expect(kept).toBeDefined();
	expect(kept).toMatchObject({ startTime: 240_000 });
});

test("separate→undo→redo chain leaves a single detached layer", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({ elements: [buildVideo("clip")] }),
		}),
	);
	const manager = new CommandManager(editorMock);
	const original = currentTracks;

	const separate = new ToggleSourceAudioSeparationCommand({
		trackId: "main",
		elementId: "clip",
	});
	manager.execute({ command: separate });

	// Undo restores the pre-separation tracks (video enabled, no audio layer).
	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement("clip")?.isSourceAudioEnabled).not.toBe(false);

	// Redo (base Command.redo → execute) re-separates: exactly one layer again.
	manager.redo();
	const audioLayers = allElements().filter(
		(element) => element.type === "audio",
	);
	expect(audioLayers).toHaveLength(1);
	expect(findElement("clip")).toMatchObject({ isSourceAudioEnabled: false });
});

test("detached audio element carries the sourceElementId back-reference", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({ elements: [buildVideo("clip")] }),
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});

	const detached = currentTracks.audio[0]?.elements[0] as TimelineElement & {
		sourceElementId?: string;
	};
	expect(detached.sourceElementId).toBe("clip");
});

test("recover keeps a pre-existing empty lane while dropping its own emptied lane", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({ elements: [buildVideo("clip")] }),
			audio: [
				{
					id: "pre-empty",
					name: "Empty",
					type: "audio",
					elements: [],
					muted: false,
				} as AudioTrack,
			],
		}),
	);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});
	// Separation appended its own lane; the pre-existing empty lane is untouched.
	expect(currentTracks.audio.map((track) => track.id)).toContain("pre-empty");

	manager.execute({
		command: new ToggleSourceAudioSeparationCommand({
			trackId: "main",
			elementId: "clip",
		}),
	});
	// Recover drops ONLY the lane it emptied; the pre-existing empty lane stays.
	expect(currentTracks.audio.map((track) => track.id)).toContain("pre-empty");
	expect(
		allElements().filter((element) => element.type === "audio"),
	).toHaveLength(0);
});
