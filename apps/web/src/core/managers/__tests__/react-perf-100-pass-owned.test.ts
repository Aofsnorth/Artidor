/**
 * React-scope perf regressions owned by the editor-perf-100-pass
 * (React track). Covers ONLY the allowed React surface:
 * components/hooks under `apps/web/src/components/` +
 * `apps/web/src/hooks/`, zustand stores under `apps/web/src/stores/`,
 * and the bounded-history behavior of
 * `apps/web/src/core/managers/commands.ts`.
 *
 * The real CommandManager is the system under test for the history
 * rounds; only the EditorCore singleton boundary is mocked, matching the
 * pattern in `core/managers/commands-100-pass-owned.test.ts`.
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { ElementRef, SceneTracks } from "@/lib/timeline";
import { buildSceneTracks } from "@/tests/factories/editor";

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

const { CommandManager } = await import("@/core/managers/commands");
const { MAX_COMMAND_HISTORY_LENGTH } = await import("@/core/managers/commands");
const { Command } = await import("@/lib/commands/base-command");

afterEach(() => {
	updateTracksMock.mockClear();
	selectedElements = [];
	currentTracks = buildSceneTracks();
});

/** No-op-ish command built via the existing Command factory surface. */
class NoOpCommand extends Command {
	execute() {
		return undefined;
	}
	override undo(): void {
		// No-op: undoable so redo/undo-cap rounds can cycle it.
	}
}

/** Undo-counting command so the retained-window correctness is observable. */
class CountingCommand extends Command {
	static undone = 0;
	execute() {
		return undefined;
	}
	override undo(): void {
		CountingCommand.undone += 1;
	}
}

/** Command holding an external resource; dispose must release it. */
class UrlHoldingCommand extends Command {
	static disposed = 0;
	execute() {
		return undefined;
	}
	override dispose(): void {
		UrlHoldingCommand.disposed += 1;
	}
}

describe("react perf: bounded undo history (commands.ts history cap only)", () => {
	test("round 01: pushing 150 commands retains exactly the 100-entry cap", () => {
		const manager = new CommandManager(editorMock);
		for (let i = 0; i < 150; i += 1) {
			manager.execute({ command: new NoOpCommand() });
		}
		// Before: unbounded → 150 retained. After: capped at 100.
		expect(manager.getHistoryLength()).toBe(MAX_COMMAND_HISTORY_LENGTH);
		expect(manager.getHistoryLength()).toBe(100);
	});

	test("round 02: undo still correct for the retained window (LIFO order)", () => {
		CountingCommand.undone = 0;
		const manager = new CommandManager(editorMock);
		for (let i = 0; i < 150; i += 1) {
			manager.execute({ command: new CountingCommand() });
		}
		expect(manager.getHistoryLength()).toBe(100);
		// Undo the whole retained window: exactly 100 undos, then empty.
		for (let i = 0; i < 100; i += 1) {
			expect(manager.canUndo()).toBe(true);
			manager.undo();
		}
		expect(CountingCommand.undone).toBe(100);
		expect(manager.canUndo()).toBe(false);
		expect(manager.getHistoryLength()).toBe(0);
	});

	test("round 03: evicted entries release snapshots via dispose()", () => {
		UrlHoldingCommand.disposed = 0;
		const manager = new CommandManager(editorMock);
		for (let i = 0; i < 150; i += 1) {
			manager.execute({ command: new UrlHoldingCommand() });
		}
		// 150 pushed, 100 retained → the 50 oldest were evicted + disposed.
		expect(manager.getHistoryLength()).toBe(100);
		expect(UrlHoldingCommand.disposed).toBe(50);
	});

	test("round 04: push() path is capped too (not just execute())", () => {
		const manager = new CommandManager(editorMock);
		for (let i = 0; i < 150; i += 1) {
			manager.push({ command: new NoOpCommand() });
		}
		expect(manager.getHistoryLength()).toBe(100);
	});

	test("round 05: redo re-entry respects the cap", () => {
		const manager = new CommandManager(editorMock);
		for (let i = 0; i < 100; i += 1) {
			manager.execute({ command: new NoOpCommand() });
		}
		manager.undo();
		manager.undo();
		expect(manager.getHistoryLength()).toBe(98);
		manager.redo();
		manager.redo();
		expect(manager.getHistoryLength()).toBe(100);
		// One more execute past a full window must evict, not grow.
		manager.execute({ command: new NoOpCommand() });
		expect(manager.getHistoryLength()).toBe(100);
	});
});
