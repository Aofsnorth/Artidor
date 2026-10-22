/**
 * Command-manager regressions owned by the commands scope (editor-100-pass).
 *
 * The real CommandManager/commands are the system under test; only the
 * EditorCore singleton boundary is mocked, matching the pattern in
 * `lib/commands/timeline/track/remove-track.test.ts`.
 */
import { afterEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { ElementRef, SceneTracks } from "@/lib/timeline";
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
	project: {
		getActiveOrNull: () => null,
		getActive: () => null,
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { CommandManager } = await import("./commands");
const { Command } = await import("@/lib/commands/base-command");
const { MoveElementCommand } = await import(
	"@/lib/commands/timeline/element/move-elements"
);

afterEach(() => {
	updateTracksMock.mockClear();
	selectedElements = [];
});

class NoOpCommand extends Command {
	execute() {
		return undefined;
	}

	undo(): void {}

	redo() {
		return undefined;
	}
}

class ThrowingUndoCommand extends Command {
	execute() {
		return undefined;
	}

	undo(): void {
		throw new Error("undo failed");
	}
}

function resetTracks(tracks: SceneTracks) {
	currentTracks = tracks;
}

test("round 01: reactor subscriptions dispose independently and idempotently", () => {
	resetTracks(buildSceneTracks());
	const manager = new CommandManager(editorMock);
	let calls = 0;
	const reactor = () => {
		calls += 1;
	};
	const unsubscribe = manager.registerReactor(reactor);
	manager.registerReactor(reactor);
	manager.execute({ command: new NoOpCommand() });
	expect(calls).toBe(2);
	unsubscribe();
	unsubscribe(); // idempotent disposal
	manager.execute({ command: new NoOpCommand() });
	expect(calls).toBe(3);
});

test("CORE-14: undo runs reactors like redo", () => {
	resetTracks(buildSceneTracks());
	const manager = new CommandManager(editorMock);
	const seen: string[] = [];
	manager.registerReactor((command) => seen.push(command.constructor.name));

	const command = new NoOpCommand();
	manager.execute({ command });
	expect(seen).toEqual(["NoOpCommand"]);
	manager.undo();
	expect(seen).toEqual(["NoOpCommand", "NoOpCommand"]);
});

test("CORE-02: a throwing undo keeps the entry on the history stack", () => {
	resetTracks(buildSceneTracks());
	const manager = new CommandManager(editorMock);
	manager.execute({ command: new ThrowingUndoCommand() });
	expect(manager.canUndo()).toBe(true);
	expect(manager.canRedo()).toBe(false);

	expect(() => manager.undo()).toThrow("undo failed");

	// Not silently lost: the entry is still undoable and was not moved to redo.
	expect(manager.canUndo()).toBe(true);
	expect(manager.canRedo()).toBe(false);
});

test("CORE-02: readOnly undo never pops an entry", () => {
	resetTracks(buildSceneTracks());
	const manager = new CommandManager(editorMock);
	manager.execute({ command: new NoOpCommand() });
	manager.readOnly = true;

	manager.undo();

	expect(manager.canUndo()).toBe(true);
	expect(manager.canRedo()).toBe(false);
});

test("round 02: move command pushes past a single blocker when placement allows", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
					buildVideoElement({ id: "b", startTime: 60_000, duration: 50_000 }),
				],
			}),
		}),
	);
	// Moving "b" to 10_000 overlaps "a"; the fallback pushes it to the end of
	// "a" (t=50_000), which is legal — assert the pushed placement commits.
	const command = new MoveElementCommand({
		sourceTrackId: "main",
		targetTrackId: "main",
		elementId: "b",
		newStartTime: 10_000,
	});
	const result = command.execute();
	expect(result).toBeUndefined();
	expect(updateTracksMock).toHaveBeenCalledTimes(1);
	expect(
		currentTracks.main.elements.find((el) => el.id === "b")?.startTime,
	).toBe(50_000);
});

test("round 02b: move command refuses to commit an illegal position", () => {
	resetTracks(
		buildSceneTracks({
			main: buildVideoTrack({
				elements: [
					buildVideoElement({ id: "a", startTime: 0, duration: 50_000 }),
					buildVideoElement({ id: "b", startTime: 50_000, duration: 50_000 }),
				],
			}),
		}),
	);
	// Moving "b" to 10_000 overlaps "a"; pushing past "a" lands back on
	// "b" itself, which is also illegal — the command must not commit the
	// overlapping position (regression: the fallback used to fall through and
	// persist the illegal requested start time anyway).
	const command = new MoveElementCommand({
		sourceTrackId: "main",
		targetTrackId: "main",
		elementId: "b",
		newStartTime: 10_000,
	});
	command.execute();
	// The track model itself must never be mutated to the illegal position:
	// the committed start stays at the original 50_000 (no move happened).
	expect(
		currentTracks.main.elements.find((el) => el.id === "b")?.startTime,
	).toBe(50_000);
});
