/**
 * Group/parent/combine command regressions (editor-100-pass, commands scope).
 *
 * System under test: the real GroupElementsCommand / UngroupElementsCommand /
 * CombineElementsCommand / SetParentCommand / UnlinkParentCommand plus the
 * real CommandManager. Only the EditorCore singleton boundary is mocked
 * (pattern: lib/commands/timeline/track/remove-track.test.ts).
 *
 * These lock in three invariants the old implementations broke:
 * 1. One user action = ONE history entry (the commands used to call
 *    timeline.updateElements/insertElement/deleteElements, which route back
 *    through CommandManager.execute and pushed N+1 entries per action).
 * 2. undo() must not push anything onto the undo stack (the old undo
 *    re-entered command.execute, so undoing added "undo" edits to history).
 * 3. IDs stay stable across execute/undo/redo so chained follow-up commands
 *    and selection refs keep working.
 */
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type {
	AudioElement,
	AudioTrack,
	ElementRef,
	SceneTracks,
	TimelineElement,
} from "@/lib/timeline";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

let currentTracks: SceneTracks;
let selectedElements: ElementRef[] = [];

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
		getSelectedElements: () => selectedElements,
		setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
			selectedElements = elements;
		},
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { CommandManager } = await import("@/core/managers/commands");
const {
	GroupElementsCommand,
	UngroupElementsCommand,
	CombineElementsCommand,
	SetParentCommand,
	UnlinkParentCommand,
} = await import("../grouping");

afterAll(() => {
	mock.restore();
});

beforeEach(() => {
	updateTracksMock.mockClear();
	selectedElements = [];
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

function buildAudioElement(id: string): AudioElement {
	return {
		id,
		name: id,
		type: "audio",
		sourceType: "upload",
		mediaId: "media",
		startTime: 0,
		duration: 50_000,
		trimStart: 0,
		trimEnd: 0,
		volume: 0,
	} as unknown as AudioElement;
}

/* ------------------------------------------------------------------ */
/* 1. History reentrancy                                              */
/* ------------------------------------------------------------------ */

test("group action pushes exactly one history entry and undo restores both elements", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
				buildVideoElement({ id: "b", startTime: 60_000, duration: 50_000 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const command = new GroupElementsCommand({
		elementRefs: [
			{ trackId: "main", elementId: "a" },
			{ trackId: "main", elementId: "b" },
		],
	});
	const groupId = command.getGroupId();
	manager.execute({ command });

	expect(manager.getHistoryLength()).toBe(1);
	expect(findElement("a")).toMatchObject({ groupId });
	expect(findElement("b")).toMatchObject({ groupId });

	// undo must not add history entries (old code pushed one per element).
	manager.undo();
	expect(manager.getHistoryLength()).toBe(0);
	expect(findElement("a")?.groupId).toBeUndefined();
	expect(findElement("b")?.groupId).toBeUndefined();
	// Full state restore — the snapshot is identical.
	expect(currentTracks).toBe(original);

	// redo re-applies the same group id (stable id).
	manager.redo();
	expect(findElement("a")).toMatchObject({ groupId });
	expect(findElement("b")).toMatchObject({ groupId });
});

test("group keeps stale refs as a no-op without corrupting state", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [buildVideoElement({ id: "a", startTime: 0 })],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const command = new GroupElementsCommand({
		elementRefs: [
			{ trackId: "main", elementId: "a" },
			{ trackId: "main", elementId: "ghost" },
		],
	});
	manager.execute({ command });

	// The live element is still grouped; the stale ref is skipped.
	expect(findElement("a")).toMatchObject({ groupId: command.getGroupId() });
	manager.undo();
	expect(currentTracks).toBe(original);
});

/* ------------------------------------------------------------------ */
/* 2. Ungroup                                                         */
/* ------------------------------------------------------------------ */

test("ungroup clears the shared tag for every member in one entry and restores on undo", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({
					id: "a",
					startTime: 0,
					groupId: "shared",
				} as never),
				buildVideoElement({
					id: "b",
					startTime: 60_000,
					groupId: "shared",
				} as never),
				buildVideoElement({ id: "c", startTime: 120_000 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new UngroupElementsCommand({ groupId: "shared" }),
	});

	expect(manager.getHistoryLength()).toBe(1);
	expect(findElement("a")?.groupId).toBeUndefined();
	expect(findElement("b")?.groupId).toBeUndefined();
	expect(findElement("c")?.groupId).toBeUndefined();

	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement("a")).toMatchObject({ groupId: "shared" });
	expect(findElement("b")).toMatchObject({ groupId: "shared" });
});

/* ------------------------------------------------------------------ */
/* 3. Combine: stable id + real undo/redo cycle                       */
/* ------------------------------------------------------------------ */

test("combine lands the reported id on the timeline, once, and round-trips undo/redo", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
				buildVideoElement({ id: "b", startTime: 60_000, duration: 50_000 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const command = new CombineElementsCommand({
		elementRefs: [
			{ trackId: "main", elementId: "a" },
			{ trackId: "main", elementId: "b" },
		],
	});
	const combinedId = command.getCombinedId();
	manager.execute({ command });

	expect(manager.getHistoryLength()).toBe(1);
	// The id the caller was told about is the id that exists.
	expect(findElement(combinedId)).toBeDefined();
	// Both sources are consumed by the combine.
	expect(findElement("a")).toBeUndefined();
	expect(findElement("b")).toBeUndefined();
	const combined = findElement(combinedId) as TimelineElement & {
		combinedElements?: TimelineElement[];
	};
	expect(combined.combinedElements).toHaveLength(2);
	expect(combined.startTime).toBe(0);
	expect(combined.duration).toBe(110_000);
	// The combined element is selected for follow-up edits.
	expect(selectedElements).toEqual([
		{ trackId: "main", elementId: combinedId },
	]);

	// Undo restores the exact original tracks (both sources back).
	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement("a")).toBeDefined();
	expect(findElement("b")).toBeDefined();
	expect(findElement(combinedId)).toBeUndefined();

	// Redo re-combines with the SAME id (stable across cycles).
	manager.redo();
	expect(findElement(combinedId)).toBeDefined();
	expect(findElement("a")).toBeUndefined();
	expect(findElement("b")).toBeUndefined();

	// A second undo/redo cycle must still work — the old append-based
	// previousElements grew on every execute and corrupted later undos.
	manager.undo();
	manager.redo();
	expect(findElement(combinedId)).toBeDefined();
	expect(findElement("a")).toBeUndefined();
});

test("combine on overlapping-time elements spans their union", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({ id: "a", startTime: 0, duration: 100_000 }),
					buildVideoElement({ id: "b", startTime: 50_000, duration: 100_000 }),
				],
			}),
		}),
	);
	const manager = new CommandManager(editorMock);

	const command = new CombineElementsCommand({
		elementRefs: [
			{ trackId: "main", elementId: "a" },
			{ trackId: "main", elementId: "b" },
		],
	});
	manager.execute({ command });
	const combined = findElement(command.getCombinedId());
	expect(combined).toMatchObject({ startTime: 0, duration: 150_000 });
});

/* ------------------------------------------------------------------ */
/* 3b. Entire-track combine survives the auto-prune reactor           */
/* ------------------------------------------------------------------ */

/**
 * The production EditorCore registers a reactor that prunes lanes which
 * once held elements but are now empty (core/index.ts). The OLD combine
 * called deleteElements (reactor ran: source lane empty → pruned) and
 * then insertElement into the deleted lane id — the combined element was
 * lost. The snapshot-based combine writes tracks ONCE, so the reactor
 * only ever sees the final state where the lane is non-empty. This test
 * reproduces the reactor to prove the whole-track combine survives it.
 */
test("combining every element of a track survives the auto-prune reactor", () => {
	const lane = buildVideoTrack({
		id: "below",
		elements: [
			buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
			buildVideoElement({ id: "b", startTime: 60_000, duration: 50_000 }),
		],
	});
	resetTracks(buildSceneTracks({ overlayAfter: [lane] }));

	// Reproduce the production auto-prune reactor behavior: prune lanes that
	// once had elements but are now empty. Must use the REAL CommandManager
	// wiring (registerReactor + runReactors) like production does.
	const manager = new CommandManager(editorMock);
	const tracksThatHeldElements = new Set<string>();
	manager.registerReactor(() => {
		const tracks = currentTracks;
		for (const track of [
			...tracks.overlay,
			...tracks.overlayAfter,
			...tracks.audio,
		]) {
			if (track.elements.length > 0) tracksThatHeldElements.add(track.id);
		}
		const isDeadLane = (track: { id: string; elements: unknown[] }) =>
			track.elements.length === 0 && tracksThatHeldElements.has(track.id);
		const prunedTracks = {
			...tracks,
			overlay: tracks.overlay.filter((track) => !isDeadLane(track)),
			overlayAfter: tracks.overlayAfter.filter((track) => !isDeadLane(track)),
			audio: tracks.audio.filter((track) => !isDeadLane(track)),
		};
		if (
			prunedTracks.overlay.length !== tracks.overlay.length ||
			prunedTracks.overlayAfter.length !== tracks.overlayAfter.length ||
			prunedTracks.audio.length !== tracks.audio.length
		) {
			updateTracksMock(prunedTracks);
		}
	});

	const command = new CombineElementsCommand({
		elementRefs: [
			{ trackId: "below", elementId: "a" },
			{ trackId: "below", elementId: "b" },
		],
	});
	const combinedId = command.getCombinedId();
	manager.execute({ command });

	// The lane still exists (not pruned) and holds the combined element.
	expect(currentTracks.overlayAfter).toHaveLength(1);
	const laneAfter = currentTracks.overlayAfter[0];
	expect(laneAfter?.id).toBe("below");
	expect(laneAfter?.elements).toHaveLength(1);
	expect(laneAfter?.elements[0]).toMatchObject({
		id: combinedId,
		startTime: 0,
		duration: 110_000,
	});
});

test("combine with fewer than two live elements is a no-op", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [buildVideoElement({ id: "a", startTime: 0 })],
		}),
	});
	resetTracks(original);

	const command = new CombineElementsCommand({
		elementRefs: [{ trackId: "main", elementId: "a" }],
	});
	const result = command.execute();

	expect(result).toBeUndefined();
	expect(findElement("a")).toBeDefined();
	// No tracks write happened for the no-op.
	expect(updateTracksMock).not.toHaveBeenCalled();
});

/* ------------------------------------------------------------------ */
/* 4. SetParent / UnlinkParent                                        */
/* ------------------------------------------------------------------ */

test("setParent links the child and round-trips through undo/redo", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({ id: "child", startTime: 0, duration: 50_000 }),
				buildVideoElement({ id: "parent", startTime: 0, duration: 50_000 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const command = new SetParentCommand({
		ref: { trackId: "main", elementId: "child" },
		parentId: "parent",
	});
	manager.execute({ command });

	expect(manager.getHistoryLength()).toBe(1);
	expect(findElement("child")).toMatchObject({
		parentId: "parent",
		parentEnabled: true,
	});

	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement("child")?.parentId).toBeUndefined();

	manager.redo();
	expect(findElement("child")).toMatchObject({ parentId: "parent" });
});

test("setParent rejects a self-cycle without touching the timeline", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [buildVideoElement({ id: "a", startTime: 0 })],
		}),
	});
	resetTracks(original);

	const command = new SetParentCommand({
		ref: { trackId: "main", elementId: "a" },
		parentId: "a",
	});
	const result = command.execute();

	expect(result).toBeUndefined();
	expect(updateTracksMock).not.toHaveBeenCalled();
});

test("unlinkParent drops the link and undo restores it in one entry", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({
					id: "child",
					startTime: 0,
					parentId: "parent",
					parentEnabled: true,
				} as never),
				buildVideoElement({ id: "parent", startTime: 0 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	manager.execute({
		command: new UnlinkParentCommand({
			ref: { trackId: "main", elementId: "child" },
		}),
	});

	expect(manager.getHistoryLength()).toBe(1);
	expect(findElement("child")?.parentId).toBeUndefined();

	manager.undo();
	expect(currentTracks).toBe(original);
	expect(findElement("child")).toMatchObject({ parentId: "parent" });
});

/* ------------------------------------------------------------------ */
/* 5. Cross-track coverage (overlay / overlayAfter / audio)           */
/* ------------------------------------------------------------------ */

test("group spans every ordered track group, not just main", () => {
	resetTracks(
		buildSceneTracks({
			overlay: [
				buildVideoTrack({
					id: "above",
					elements: [buildVideoElement({ id: "o1", startTime: 0 })],
				}),
			],
			main: buildVideoTrack({
				elements: [buildVideoElement({ id: "m1", startTime: 0 })],
			}),
			overlayAfter: [
				buildVideoTrack({
					id: "below",
					elements: [buildVideoElement({ id: "o2", startTime: 0 })],
				}),
			],
			audio: [
				{
					id: "audio",
					name: "Audio",
					type: "audio",
					elements: [buildAudioElement("a1")],
					muted: false,
				} as AudioTrack,
			],
		}),
	);
	const manager = new CommandManager(editorMock);

	const command = new GroupElementsCommand({
		elementRefs: [
			{ trackId: "above", elementId: "o1" },
			{ trackId: "main", elementId: "m1" },
			{ trackId: "below", elementId: "o2" },
			{ trackId: "audio", elementId: "a1" },
		],
	});
	const groupId = command.getGroupId();
	manager.execute({ command });

	expect(findElement("o1")).toMatchObject({ groupId });
	expect(findElement("m1")).toMatchObject({ groupId });
	expect(findElement("o2")).toMatchObject({ groupId });
	expect(findElement("a1")).toMatchObject({ groupId });

	manager.undo();
	expect(findElement("o1")?.groupId).toBeUndefined();
	expect(findElement("m1")?.groupId).toBeUndefined();
	expect(findElement("o2")?.groupId).toBeUndefined();
	expect(findElement("a1")?.groupId).toBeUndefined();
});

/* ------------------------------------------------------------------ */
/* 6. Chained dependent command survives an intervening undo/redo      */
/* ------------------------------------------------------------------ */

test("a dependent setParent survives undo/redo of the group command via stable ids", () => {
	const original = buildSceneTracks({
		main: buildVideoTrack({
			elements: [
				buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
				buildVideoElement({ id: "b", startTime: 60_000, duration: 50_000 }),
			],
		}),
	});
	resetTracks(original);
	const manager = new CommandManager(editorMock);

	const groupCommand = new GroupElementsCommand({
		elementRefs: [
			{ trackId: "main", elementId: "a" },
			{ trackId: "main", elementId: "b" },
		],
	});
	manager.execute({ command: groupCommand });
	const groupId = groupCommand.getGroupId();

	// Dependent edit on the grouped element; stable ids keep this valid
	// across undo/redo cycles.
	manager.execute({
		command: new SetParentCommand({
			ref: { trackId: "main", elementId: "a" },
			parentId: "b",
		}),
	});

	// Undo both, redo both.
	manager.undo();
	manager.undo();
	expect(findElement("a")?.groupId).toBeUndefined();

	manager.redo();
	manager.redo();
	expect(findElement("a")).toMatchObject({ groupId });
	expect(findElement("b")).toMatchObject({ groupId });
	expect(findElement("a")).toMatchObject({ parentId: "b" });
});
