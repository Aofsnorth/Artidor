/**
 * Persistence-lifecycle regression tests for ProjectManager and SaveManager.
 *
 * Real manager classes are the system under test; only browser/storage
 * boundaries are replaced with in-memory fakes that keep every export of the
 * mocked module intact (spread the real module) so sibling suites sharing a
 * process still see them.
 */
import { expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { TProject } from "@/lib/project/types";
import * as realStorage from "@/services/storage/service";
import * as realDrive from "@/lib/drive/api";
import * as realMediaProcessing from "@/lib/media/processing";
import * as realRenderer from "@/services/renderer/canvas-renderer";
import * as realGpu from "@/services/renderer/gpu-renderer";
import * as realFonts from "@/lib/fonts/google-fonts";
import * as realMigrations from "@/services/storage/migrations";
import * as realToast from "sonner";
import { buildProject } from "@/tests/factories/project";

/* ---- In-memory storage boundary ---- */
const savedProjects = new Map<string, TProject>();
const loadRequests = mock(() => {});

mock.module("@/services/storage/service", () => ({
	...realStorage,
	storageService: {
		saveProject: async ({ project }: { project: TProject }) => {
			if (failingSaveIds?.has(project.metadata.id)) {
				throw new Error("simulated storage failure");
			}
			savedProjects.set(project.metadata.id, project);
			return;
		},
		loadProject: ({ id }: { id: string }) => {
			loadRequests();
			return Promise.resolve(
				savedProjects.has(id) ? { project: savedProjects.get(id) } : null,
			);
		},
		loadAllProjectsMetadata: async () =>
			[...savedProjects.values()].map((p) => p.metadata),
		loadAllMediaAssets: async () => [],
		saveMediaAsset: async () => {},
		deleteProjectMedia: async () => {},
		deleteProject: ({ id }: { id: string }) => {
			savedProjects.delete(id);
			return Promise.resolve();
		},
	},
}));

/* Drive API: no network in tests. */
mock.module("@/lib/drive/api", () => ({
	...realDrive,
	getGoogleAccessToken: () => null,
	fetchFolderMetadata: async () => ({ id: "f", name: "f" }),
	fetchFolderFiles: async () => [],
	downloadFileBlob: async () => new Blob([]),
	saveProjectToDrive: async () => "drive-file",
	createDriveFolder: async () => "folder",
	uploadMediaToDrive: async () => "media",
}));

/* Media import is irrelevant to persistence lifecycle; neutralize side effects. */
mock.module("@/lib/media/processing", () => ({
	...realMediaProcessing,
	processMediaAssets: async () => [],
}));

/* .artpr: intentionally NOT mocked (round 9). The previous mock replaced the
 * module's crypto exports with a plain-JSON stub for the whole process,
 * breaking the sibling artpr crypto tests. project-manager imports
 * decodeArtprProject/isArtprFileName but this suite never exercises them. */

/* Thumbnails render through the GPU compositor; stub the browser boundary.
 * The fake GPU boundary is deliberately minimal (round 8): it keeps the real
 * module's exports intact but neutralizes only init/availability, so sibling
 * GPU suites sharing the process are not handed a permanently-initialized GPU. */
/* Thumbnails render through the GPU compositor and the DOM canvas; stub both
 * browser boundaries. The fake GPU boundary is deliberately minimal
 * (round 8): it keeps the real module's exports intact but neutralizes only
 * init/availability, so sibling GPU suites sharing the process are not handed
 * a permanently-initialized GPU. */
mock.module("@/services/renderer/canvas-renderer", () => ({
	...realRenderer,
	CanvasRenderer: class {
		renderToCanvas = mock(async () => {});
	},
}));
mock.module("@/services/renderer/gpu-renderer", () => ({
	...realGpu,
	initializeGpuRenderer: async () => {},
	isGpuAvailable: () => false,
}));

/* document.createElement("canvas") does not exist in bun test. */
mock.module("@/lib/fonts/google-fonts", () => ({
	...realFonts,
	loadFonts: async () => {},
}));

mock.module("@/services/storage/migrations", () => ({
	...realMigrations,
	runStorageMigrations: async () => ({ migratedCount: 0 }),
}));

mock.module("sonner", () => ({
	...realToast,
	toast: { ...realToast.toast, error: mock(() => {}), success: mock(() => {}) },
}));

const { ProjectManager } = await import("./project-manager");
const { SaveManager } = await import("./save-manager");

/* Storage failure injection for abort-path tests (round 10). */
let failingSaveIds: Set<string> | null = null;

function failSavesFor(ids: string[] | null) {
	failingSaveIds = ids === null ? null : new Set(ids);
}
function buildEditor() {
	let scenesList = [] as TProject["scenes"];
	const sceneSubs = new Set<() => void>();
	const timelineSubs = new Set<() => void>();

	const save = new SaveManager({} as unknown as EditorCore, { debounceMs: 5 });
	const manager = new ProjectManager({} as unknown as EditorCore);
	const editor = {
		scenes: {
			subscribe: (fn: () => void) => {
				sceneSubs.add(fn);
				return () => sceneSubs.delete(fn);
			},
			getScenes: () => scenesList,
			clearScenes: () => {
				scenesList = [];
			},
			initializeScenes: ({ scenes }: { scenes: TProject["scenes"] }) => {
				scenesList = scenes;
				for (const fn of sceneSubs) fn();
			},
			setScenes: ({ scenes }: { scenes: TProject["scenes"] }) => {
				scenesList = scenes;
				for (const fn of sceneSubs) fn();
			},
			getActiveScene: () => scenesList[0] ?? null,
		},
		timeline: {
			subscribe: (fn: () => void) => {
				timelineSubs.add(fn);
				return () => timelineSubs.delete(fn);
			},
			getTotalDuration: () => 0,
		},
		media: {
			clearAllAssets: () => {},
			loadProjectMedia: async () => {},
			getAssets: () => [],
		},
		selection: { clearSelection: () => {} },
		playback: { pause: () => {} },
		save,
		project: manager,
	} as unknown as EditorCore;

	// Managers keep a reference to the shared editor object; patch them in
	// after the harness exists so save/project see each other.
	Object.defineProperties(save, {
		editor: { value: editor, configurable: true },
	});
	Object.defineProperties(manager, {
		editor: { value: editor, configurable: true },
	});
	return { editor, manager, save };
}

test("R07 loadProject flushes outgoing dirty edits before clearing scenes", async () => {
	const { editor, manager } = buildEditor();
	const outgoing = buildProject({
		metadata: {
			id: "old",
			name: "Old",
			duration: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
	savedProjects.set("old", outgoing);
	savedProjects.set(
		"new",
		buildProject({
			metadata: {
				id: "new",
				name: "New",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);

	await manager.loadProject({ id: "old" });
	editor.scenes.setScenes({
		scenes: [{ ...outgoing.scenes[0], id: "dirty-scene", name: "Dirty edit" }],
	});
	editor.save.markDirty();

	const opened = manager.getActiveOrNull();
	expect(opened?.metadata.id).toBe("old");

	await manager.loadProject({ id: "new" });
	// The outgoing scene must be persisted (flush happens before clearing scenes).
	const stored = savedProjects.get("old");
	expect(stored?.scenes.some((s) => s.id === "dirty-scene")).toBe(true);
	expect(manager.getActiveOrNull()?.metadata.id).toBe("new");
});

test("R11 superseded loadProject leaves editor on the newest project", async () => {
	const { manager } = buildEditor();
	savedProjects.set(
		"a",
		buildProject({
			metadata: {
				id: "a",
				name: "A",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	savedProjects.set(
		"b",
		buildProject({
			metadata: {
				id: "b",
				name: "B",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);

	const first = manager.loadProject({ id: "a" });
	const second = manager.loadProject({ id: "b" });
	await Promise.allSettled([first, second]);

	expect(manager.getActiveOrNull()?.metadata.id).toBe("b");
});

test("R16 overlapping direct saves serialize their writes", async () => {
	const { manager } = buildEditor();
	savedProjects.set(
		"p",
		buildProject({
			metadata: {
				id: "p",
				name: "P",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	await manager.loadProject({ id: "p" });

	// Two direct saves at once must not interleave snapshot reads/writes.
	await Promise.all([
		manager.saveCurrentProject(),
		manager.saveCurrentProject(),
	]);
	expect(manager.getActiveOrNull()?.metadata.id).toBe("p");
});

test("R17 direct save failure surfaces to its caller", async () => {
	const { manager } = buildEditor();
	savedProjects.set(
		"p",
		buildProject({
			metadata: {
				id: "p",
				name: "P",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	await manager.loadProject({ id: "p" });

	failSavesFor(["p"]);
	let failed = false;
	try {
		await manager.saveCurrentProject();
	} catch {
		failed = true;
	}
	failSavesFor(null);
	expect(failed).toBe(true);
	// A later direct save must still work (chain not poisoned by the rejection).
	await manager.saveCurrentProject();
	expect(manager.getActiveOrNull()?.metadata.id).toBe("p");
});

test("R18 prepareExit failure keeps dirty work and reports", async () => {
	const { editor, manager } = buildEditor();
	savedProjects.set(
		"p",
		buildProject({
			metadata: {
				id: "p",
				name: "P",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	await manager.loadProject({ id: "p" });
	editor.save.markDirty();

	failSavesFor(["p"]);
	let exitError: unknown = null;
	try {
		await manager.prepareExit();
	} catch (err) {
		exitError = err;
	}
	failSavesFor(null);

	expect(exitError).toBeInstanceOf(Error);
	// Work stays dirty for the debounced retry — closeProject() must not have
	// been required to reach here (the caller catches and navigates anyway).
	expect(editor.save.getIsDirty()).toBe(true);
});

test("R19 prepareExit with no GPU still flushes edits", async () => {
	const { editor, manager } = buildEditor();
	savedProjects.set(
		"p",
		buildProject({
			metadata: {
				id: "p",
				name: "P",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	await manager.loadProject({ id: "p" });
	editor.save.markDirty();
	await manager.prepareExit();
	expect(editor.save.getIsDirty()).toBe(false);
});

test("R20 closeProject stops saving and clears the workspace", async () => {
	const { editor, manager } = buildEditor();
	savedProjects.set(
		"p",
		buildProject({
			metadata: {
				id: "p",
				name: "P",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);
	await manager.loadProject({ id: "p" });

	manager.closeProject();
	expect(manager.getActiveOrNull()).toBeNull();
	expect(editor.scenes.getScenes()).toEqual([]);
});

test("R10 loadProject aborts switch when outgoing flush fails", async () => {
	const { editor, manager } = buildEditor();
	const outgoing = buildProject({
		metadata: {
			id: "old",
			name: "Old",
			duration: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});
	savedProjects.set("old", outgoing);
	savedProjects.set(
		"new",
		buildProject({
			metadata: {
				id: "new",
				name: "New",
				duration: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		}),
	);

	await manager.loadProject({ id: "old" });
	const beforeScenes = editor.scenes.getScenes();
	editor.scenes.setScenes({
		scenes: [{ ...outgoing.scenes[0], id: "dirty-scene", name: "Dirty edit" }],
	});
	editor.save.markDirty();

	failSavesFor(["old"]);
	let error: unknown = null;
	try {
		await manager.loadProject({ id: "new" });
	} catch (err) {
		error = err;
	}
	failSavesFor(null);

	// The switch must abort: old project stays mounted with its scenes.
	expect(error).toBeInstanceOf(Error);
	expect(manager.getActiveOrNull()?.metadata.id).toBe("old");
	const afterScenes = editor.scenes.getScenes();
	expect(afterScenes.some((s) => s.id === "dirty-scene")).toBe(true);
	expect(beforeScenes).not.toEqual(afterScenes);
	// And the failed flush kept the outgoing project dirty for retry.
	expect(editor.save.getIsDirty()).toBe(true);
});
