import { afterAll, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { ElementRef, SceneTracks } from "@/lib/timeline";
import { buildDefaultScene } from "@/lib/scenes";

/**
 * Panels bughunt regressions (scenes scope — create/delete flows + camera):
 * - deleting the ACTIVE scene clears selection into the deleted scene's refs
 *   (fallback selection), deleting a background scene keeps selection;
 * - new scenes carry default tracks;
 * - undo of delete restores scenes AND the saved activeSceneId.
 *
 * DeleteSceneCommand undo restores activeSceneId — pinned here because the
 * scope asks for it explicitly, even though the command file itself belongs
 * to another track (this test only *calls* it, never edits it).
 */

interface MockScene {
	id: string;
	isMain: boolean;
	tracks: SceneTracks;
	name: string;
}

let scenes: MockScene[];
let activeSceneId: string | null;
let selectedElements: ElementRef[] = [];

const editorMock = {
	scenes: {
		getScenes: () => scenes,
		getActiveScene: () => {
			const found = scenes.find((s) => s.id === activeSceneId) ?? null;
			if (!found) throw new Error("No active scene.");
			return found;
		},
		// Command-level tests drive setScenes directly (undo pins). The
		// manager-level tests below seed the REAL manager via
		// initializeScenes instead — no mirror needed.
		setScenes: ({
			scenes: next,
			activeSceneId: nextActive,
		}: {
			scenes: MockScene[];
			activeSceneId?: string;
		}) => {
			scenes = next as MockScene[];
			if (nextActive !== undefined) {
				activeSceneId = next.find((s) => s.id === nextActive)?.id ?? null;
			} else {
				activeSceneId = scenes.find((s) => s.id === activeSceneId)?.id ?? null;
			}
		},
	},
	selection: {
		getSelectedElements: () => [...selectedElements],
		setSelectedElements: ({ elements }: { elements: ElementRef[] }) => {
			selectedElements = [...elements];
		},
		clearSelection: () => {
			selectedElements = [];
		},
	},
	project: {
		getActive: () => ({ id: "p" }),
		setActiveProject: () => undefined,
	},
	save: { markDirty: () => undefined },
	playback: { seek: () => undefined },
	command: {
		execute: ({ command }: { command: { execute: () => unknown } }) =>
			command.execute(),
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { ScenesManager } = await import("@/core/managers/scenes-manager");
const { DeleteSceneCommand } = await import(
	"@/lib/commands/scene/delete-scene"
);

afterAll(() => {
	mock.restore();
});

function reset(next: MockScene[], active: string | null) {
	scenes = next;
	activeSceneId = active;
	selectedElements = [];
}

function scene(id: string, isMain: boolean): MockScene {
	const base = buildDefaultScene({ name: id, isMain });
	return { ...base, id };
}

// Manager-level tests use a manager wired to a command mock that routes
// DeleteSceneCommand's setScenes back into the SAME manager (production
// routes through CommandManager.execute; here the mock must forward the
// scenes state instead of dropping it on the floor).
function seedManager(next: MockScene[], active: string) {
	reset(next, active);
	selectedElements = [];
	const editor = {
		...editorMock,
		command: {
			execute: ({ command }: { command: { execute: () => unknown } }) => {
				const prevSetScenes = editorMock.scenes.setScenes;
				(editorMock.scenes as { setScenes: unknown }).setScenes = ({
					scenes: updated,
					activeSceneId: nextActive,
				}: {
					scenes: MockScene[];
					activeSceneId?: string;
				}) => {
					(
						manager as unknown as {
							setScenes: (args: {
								scenes: MockScene[];
								activeSceneId?: string;
							}) => void;
						}
					).setScenes({ scenes: updated, activeSceneId: nextActive });
				};
				try {
					command.execute();
				} finally {
					(editorMock.scenes as { setScenes: unknown }).setScenes =
						prevSetScenes;
				}
			},
		},
	} as unknown as EditorCore;
	const manager = new ScenesManager(editor);
	manager.initializeScenes({
		scenes: next as never,
		currentSceneId: active,
	});
	return manager;
}

describe("scene delete selection + undo", () => {
	test("deleting the active scene clears its stale selection", async () => {
		const manager = seedManager([scene("main", true), scene("b", false)], "b");
		selectedElements = [{ trackId: "t", elementId: "e" }];
		await manager.deleteScene({ sceneId: "b" });
		expect(selectedElements).toHaveLength(0);
		expect(manager.getActiveSceneOrNull()?.id).toBe("main");
	});

	test("deleting a background scene keeps the current selection", async () => {
		const manager = seedManager(
			[scene("main", true), scene("b", false)],
			"main",
		);
		selectedElements = [{ trackId: "t", elementId: "e" }];
		await manager.deleteScene({ sceneId: "b" });
		expect(selectedElements).toHaveLength(1);
		expect(manager.getActiveSceneOrNull()?.id).toBe("main");
	});

	test("new scenes carry default tracks (main lane present)", () => {
		const fresh = buildDefaultScene({ name: "New", isMain: false });
		expect(fresh.tracks.main.id).toBeTruthy();
		expect(Array.isArray(fresh.tracks.main.elements)).toBe(true);
	});

	test("undo of delete restores scenes and the saved activeSceneId", () => {
		reset([scene("main", true), scene("b", false)], "b");
		const command = new DeleteSceneCommand("b");
		command.execute();
		expect(scenes.map((s) => s.id)).toEqual(["main"]);
		command.undo();
		expect(scenes.map((s) => s.id).sort()).toEqual(["b", "main"]);
		expect(activeSceneId).toBe("b");
	});

	test("deleting the last non-main scene falls back to main, never empty", async () => {
		const manager = seedManager(
			[scene("main", true), scene("only", false)],
			"only",
		);
		await manager.deleteScene({ sceneId: "only" });
		expect(manager.getScenes().map((s) => s.id)).toEqual(["main"]);
		expect(manager.getActiveSceneOrNull()?.id).toBe("main");
	});
});
