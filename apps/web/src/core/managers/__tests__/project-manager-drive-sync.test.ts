/**
 * Drive-sync debounce regression tests for ProjectManager.
 *
 * A Drive sync serializes the whole project, derives an AES key with PBKDF2
 * (120k iterations) and PATCHes the encrypted file. Doing that on every
 * autosave put ~40-90 ms of main-thread CPU plus a full upload on the critical
 * path of every timeline drag, so saves now only *schedule* the upload and it
 * runs once per idle period — with a guaranteed flush when the page goes away.
 */
import { beforeEach, expect, mock, test } from "bun:test";
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

/* ---- Browser lifecycle stubs (the debounce arms real listeners) ---- */
type Listener = () => void;

function createEventTarget() {
	const listeners = new Map<string, Set<Listener>>();
	return {
		addEventListener: (type: string, listener: Listener) => {
			const set = listeners.get(type) ?? new Set<Listener>();
			set.add(listener);
			listeners.set(type, set);
		},
		removeEventListener: (type: string, listener: Listener) => {
			listeners.get(type)?.delete(listener);
		},
		emit: (type: string) => {
			for (const listener of [...(listeners.get(type) ?? [])]) listener();
		},
		// Each test builds its own ProjectManager, which registers its own
		// lifecycle listeners; without this a previous manager would also answer
		// the next test's pagehide.
		clear: () => listeners.clear(),
	};
}

const windowEvents = createEventTarget();
const documentEvents = createEventTarget();
const fakeDocument = {
	...documentEvents,
	visibilityState: "visible" as "visible" | "hidden",
};
Object.assign(globalThis, {
	window: { ...windowEvents },
	document: fakeDocument,
});

/* ---- In-memory storage boundary ---- */
const savedProjects = new Map<string, TProject>();

mock.module("@/services/storage/service", () => ({
	...realStorage,
	storageService: {
		saveProject: async ({ project }: { project: TProject }) => {
			savedProjects.set(project.metadata.id, project);
		},
		loadProject: ({ id }: { id: string }) =>
			Promise.resolve(
				savedProjects.has(id) ? { project: savedProjects.get(id) } : null,
			),
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

/* Drive API: record uploads instead of performing them. */
const driveUploads: Array<{
	folderId: string;
	fileId: string | null;
	name: string;
}> = [];
let accessToken: string | null = "token";

mock.module("@/lib/drive/api", () => ({
	...realDrive,
	getGoogleAccessToken: () => accessToken,
	fetchFolderMetadata: async () => ({ id: "f", name: "f" }),
	fetchFolderFiles: async () => [],
	downloadFileBlob: async () => new Blob([]),
	saveProjectToDrive: async (
		folderId: string,
		fileId: string | null,
		project: TProject,
	) => {
		driveUploads.push({ folderId, fileId, name: project.metadata.name });
		return "drive-file";
	},
	createDriveFolder: async () => "folder",
	uploadMediaToDrive: async () => "media",
}));

mock.module("@/lib/media/processing", () => ({
	...realMediaProcessing,
	processMediaAssets: async () => [],
}));

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

const { ProjectManager } = await import("@/core/managers/project-manager");

function buildEditor() {
	let scenesList = [] as TProject["scenes"];
	const save = {
		pause: () => {},
		resume: () => {},
		flush: async () => {},
		markDirty: () => {},
		getIsDirty: () => false,
	};
	const manager = new ProjectManager({} as unknown as EditorCore);
	const editor = {
		scenes: {
			getScenes: () => scenesList,
			clearScenes: () => {
				scenesList = [];
			},
			initializeScenes: ({ scenes }: { scenes: TProject["scenes"] }) => {
				scenesList = scenes;
			},
			getActiveScene: () => scenesList[0] ?? null,
		},
		timeline: { getTotalDuration: () => 0 },
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

	Object.defineProperties(save, {
		editor: { value: editor, configurable: true },
	});
	Object.defineProperties(manager, {
		editor: { value: editor, configurable: true },
	});
	return { editor, manager };
}

function driveLinkedProject({ name }: { name: string }): TProject {
	return buildProject({
		metadata: {
			id: "drive-project",
			name,
			duration: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
			googleDriveFolderId: "folder",
			googleDriveFileId: null,
		},
	});
}

function createLinkedManager() {
	const harness = buildEditor();
	const project = driveLinkedProject({ name: "v0" });
	savedProjects.set(project.metadata.id, project);
	harness.manager.setActiveProject({ project });
	return { ...harness, project };
}

/** Lets the fire-and-forget Drive upload settle. */
async function settle(): Promise<void> {
	for (let index = 0; index < 5; index++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
	driveUploads.length = 0;
	accessToken = "token";
	fakeDocument.visibilityState = "visible";
	savedProjects.clear();
	windowEvents.clear();
	documentEvents.clear();
});

test("autosaves schedule a Drive sync instead of uploading on every save", async () => {
	const { manager } = createLinkedManager();

	// Ten autosaves in a row, the way a one-second drag produces them.
	for (let index = 1; index <= 10; index++) {
		const active = manager.getActiveOrNull();
		if (active) active.metadata.name = `v${index}`;
		await manager.saveCurrentProject();
	}

	await settle();
	expect(driveUploads).toHaveLength(0);
});

test("pagehide flushes the pending Drive sync once, with the newest snapshot", async () => {
	const { manager } = createLinkedManager();

	for (let index = 1; index <= 5; index++) {
		const active = manager.getActiveOrNull();
		if (active) active.metadata.name = `v${index}`;
		await manager.saveCurrentProject();
	}

	windowEvents.emit("pagehide");
	await settle();

	expect(driveUploads).toHaveLength(1);
	expect(driveUploads[0].folderId).toBe("folder");
	expect(driveUploads[0].fileId).toBeNull();
	// The debounce collapses the burst, and the surviving snapshot is the last
	// one — not a stale intermediate edit.
	expect(driveUploads[0].name).toBe("v5");
});

test("a hidden tab flushes the pending Drive sync", async () => {
	const { manager } = createLinkedManager();
	await manager.saveCurrentProject();

	fakeDocument.visibilityState = "hidden";
	documentEvents.emit("visibilitychange");
	await settle();

	expect(driveUploads).toHaveLength(1);
});

test("becoming visible again does not upload", async () => {
	const { manager } = createLinkedManager();
	await manager.saveCurrentProject();

	documentEvents.emit("visibilitychange");
	await settle();

	expect(driveUploads).toHaveLength(0);

	// Still queued: the tab going away flushes it.
	windowEvents.emit("pagehide");
	await settle();
	expect(driveUploads).toHaveLength(1);
});

test("prepareExit flushes the pending Drive sync", async () => {
	const { manager } = createLinkedManager();
	await manager.saveCurrentProject();

	await manager.prepareExit();
	await settle();

	expect(driveUploads).toHaveLength(1);
});

test("a project that is not linked to Drive never schedules a sync", async () => {
	const { manager } = buildEditor();
	const project = buildProject();
	savedProjects.set(project.metadata.id, project);
	manager.setActiveProject({ project });

	await manager.saveCurrentProject();
	windowEvents.emit("pagehide");
	await settle();

	expect(driveUploads).toHaveLength(0);
});

test("an unauthenticated flush keeps the snapshot queued instead of dropping it", async () => {
	const { manager } = createLinkedManager();
	await manager.saveCurrentProject();

	// The token can expire between the save and the flush (the projects list does
	// the same sign-in dance). The pending edit must survive that.
	accessToken = null;
	windowEvents.emit("pagehide");
	await settle();
	expect(driveUploads).toHaveLength(0);

	accessToken = "token";
	windowEvents.emit("pagehide");
	await settle();
	expect(driveUploads).toHaveLength(1);
});
