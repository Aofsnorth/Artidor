/**
 * Storage-layout regression tests for the split project stores.
 *
 * The split moved a project's scenes, list metadata and thumbnail out of the
 * single `projects` row into their own records, so autosaves stop rewriting the
 * whole document. These tests pin the two properties that make that safe:
 *
 * 1. a document written by the pre-split layout still loads (and gets migrated
 *    on the next save), and
 * 2. a save writes only the scene records that actually changed.
 *
 * Bun has no IndexedDB, so a minimal in-memory `indexedDB`/`IDBKeyRange` shim
 * stands in for the browser. It implements only what `IndexedDBAdapter` uses,
 * and counts writes so the "only what changed" claim is measured rather than
 * assumed.
 */
import { beforeEach, expect, test } from "bun:test";
import type { SceneTracks, TScene } from "@/lib/timeline";
import type { SerializedProject } from "@/services/storage/types";
import { buildProject } from "@/tests/factories/project";
import {
	buildSceneTracks,
	buildVideoElement,
	buildVideoTrack,
} from "@/tests/factories/editor";

/* ------------------------------------------------------------------ *
 * Minimal in-memory IndexedDB
 * ------------------------------------------------------------------ */

interface FakeRequest {
	result?: unknown;
	error: Error | null;
	onerror: (() => void) | null;
	onsuccess: (() => void) | null;
}

function createRequest(): FakeRequest {
	return { error: null, onerror: null, onsuccess: null };
}

function complete(request: FakeRequest, result: unknown): void {
	request.result = result;
	// Real IndexedDB never fires handlers synchronously, and neither must this
	// shim: the adapter relies on the promise being settled by the callback.
	queueMicrotask(() => request.onsuccess?.());
}

function fail(request: FakeRequest, error: Error): void {
	request.error = error;
	queueMicrotask(() => request.onerror?.());
}

interface FakeStore {
	records: Map<string, unknown>;
	keyPath: string;
}

interface FakeDatabase {
	stores: Map<string, FakeStore>;
	version: number;
	closed: boolean;
	__name: string;
}

/** Databases the storage layer opened, for schema and record assertions. */
const databases = new Map<string, FakeDatabase>();

/** Counts every write the storage layer issues, keyed by `db/store`. */
const writeCounts = new Map<string, number>();

function countWrite({ storeName }: { storeName: string }): void {
	writeCounts.set(storeName, (writeCounts.get(storeName) ?? 0) + 1);
}

function getTotalWrites(): number {
	let total = 0;
	for (const count of writeCounts.values()) total += count;
	return total;
}

function resetWrites(): void {
	writeCounts.clear();
}

interface FakeRange {
	lower: string;
	upper: string;
}

function readValue<T>({ value }: { value: unknown }): T {
	return structuredClone(value) as T;
}

function makeObjectStore({
	db,
	dbName,
	name,
}: {
	db: FakeDatabase;
	dbName: string;
	name: string;
}) {
	const store: FakeStore = db.stores.get(name) ?? {
		records: new Map(),
		keyPath: "id",
	};
	db.stores.set(name, store);
	const writeKey = `${dbName}/${name}`;

	const matches = (key: string, range: FakeRange | undefined): boolean => {
		if (!range) return true;
		return key >= range.lower && key <= range.upper;
	};

	return {
		get: (key: string) => {
			const request = createRequest();
			const value = store.records.get(key);
			complete(request, value === undefined ? undefined : readValue({ value }));
			return request;
		},
		getAll: (range?: FakeRange) => {
			const request = createRequest();
			const values = [...store.records.entries()]
				.filter(([key]) => matches(key, range))
				.sort(([a], [b]) => (a < b ? -1 : 1))
				.map(([, value]) => readValue({ value }));
			complete(request, values);
			return request;
		},
		getAllKeys: (range?: FakeRange) => {
			const request = createRequest();
			const keys = [...store.records.keys()]
				.filter((key) => matches(key, range))
				.sort((a, b) => (a < b ? -1 : 1));
			complete(request, keys);
			return request;
		},
		put: (value: { id: string }) => {
			const request = createRequest();
			if (typeof value?.id !== "string") {
				throw new Error("record is missing its id");
			}
			countWrite({ storeName: writeKey });
			store.records.set(value.id, structuredClone(value));
			complete(request, value.id);
			return request;
		},
		delete: (key: string | FakeRange) => {
			const request = createRequest();
			const doomed =
				typeof key === "string"
					? [key]
					: [...store.records.keys()].filter((recordKey) =>
							matches(recordKey, key),
						);
			for (const recordKey of doomed) {
				countWrite({ storeName: writeKey });
				store.records.delete(recordKey);
			}
			complete(request, undefined);
			return request;
		},
		clear: () => {
			const request = createRequest();
			countWrite({ storeName: writeKey });
			store.records.clear();
			complete(request, undefined);
			return request;
		},
	};
}

/** Databases the storage layer opened, for schema assertions. */
function createFakeDatabase({
	name,
	version,
}: {
	name: string;
	version: number;
}) {
	const db: FakeDatabase = {
		stores: new Map(),
		version,
		closed: false,
		__name: name,
	};

	return Object.assign(db, {
		objectStoreNames: {
			contains: (storeName: string) => db.stores.has(storeName),
		},
		createObjectStore: (storeName: string) =>
			makeObjectStore({ db, dbName: name, name: storeName }),
		transaction: (storeNames: string[]) => ({
			objectStore: (storeName: string) =>
				makeObjectStore({ db, dbName: name, name: storeName }),
			storeNames,
		}),
		close: () => {
			db.closed = true;
		},
	});
}

const fakeIndexedDB = {
	open: (name: string, version: number) => {
		const request = createRequest() as FakeRequest & { result: unknown };

		queueMicrotask(() => {
			const existing = databases.get(name);
			if (existing && existing.version > version) {
				// Real IndexedDB raises VersionError here. The migration runner is
				// pinned to version 1, so a split store must never be opened at a
				// lower version than an existing database.
				fail(request, new Error("VersionError"));
				return;
			}

			const db = existing ?? createFakeDatabase({ name, version: 0 });
			databases.set(name, db);
			request.result = db;
			if (db.version < version) {
				db.version = version;
				request.onupgradeneeded?.({ target: { result: db } });
			}
			request.onsuccess?.();
		});

		return request;
	},
};

Object.assign(globalThis, {
	indexedDB: fakeIndexedDB,
	IDBKeyRange: {
		bound: (lower: string, upper: string): FakeRange => ({ lower, upper }),
	},
	// `getStorageInfo` reports browser capability through these; Bun has neither.
	window: globalThis,
	navigator: { storage: {} },
});

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const { StorageService } = await import("@/services/storage/service");
const { planSceneWrites, getProjectSceneKey } = await import(
	"@/services/storage/service"
);

const LEGACY_DB = "video-editor-projects";
const LEGACY_STORE = `${LEGACY_DB}/projects`;
const SCENES_STORE = "video-editor-project-scenes/project-scenes";
const HEADERS_STORE = "video-editor-project-headers/project-headers";
const THUMBNAILS_STORE = "video-editor-project-thumbnails/project-thumbnails";
const SCENES_DB = "video-editor-project-scenes";
const HEADERS_DB = "video-editor-project-headers";
const THUMBNAILS_DB = "video-editor-project-thumbnails";

function makeScene({
	id,
	clipCount = 1,
	updatedAt = new Date("2026-09-01T00:00:00Z"),
	order = 0,
}: {
	id: string;
	clipCount?: number;
	updatedAt?: Date;
	order?: number;
}): TScene {
	const tracks: SceneTracks = buildSceneTracks({
		main: buildVideoTrack({
			elements: Array.from({ length: clipCount }, (_, index) =>
				buildVideoElement({
					id: `${id}-clip-${index}`,
					startTime: index * 1_000,
				}),
			),
		}),
	});
	return {
		id,
		name: `Scene ${order}`,
		isMain: order === 0,
		tracks,
		bookmarks: [],
		createdAt: new Date("2026-09-01T00:00:00Z"),
		updatedAt,
	};
}

/** 1x1 transparent PNG. */
const TINY_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function storeRecord({
	dbName,
	storeName,
	key,
	value,
}: {
	dbName: string;
	storeName: string;
	key: string;
	value: unknown;
}): void {
	const db = databases.get(dbName);
	if (!db) throw new Error(`no fake database ${dbName}`);
	makeObjectStore({ db, dbName, name: storeName });
	db.stores
		.get(storeName)
		?.records.set(key, structuredClone({ id: key, ...(value as object) }));
}

function readRecord<T>({
	dbName,
	storeName,
	key,
}: {
	dbName: string;
	storeName: string;
	key: string;
}): T | undefined {
	const db = databases.get(dbName);
	return db?.stores.get(storeName)?.records.get(key) as T | undefined;
}

function readRecords<T>({
	dbName,
	storeName,
}: {
	dbName: string;
	storeName: string;
}): Array<{ id: string } & T> {
	const db = databases.get(dbName);
	const store = db?.stores.get(storeName);
	if (!store) return [];
	return [...store.records.entries()].map(([key, value]) => ({
		...(value as object),
		id: key,
	})) as Array<{ id: string } & T>;
}

let service: InstanceType<typeof StorageService>;

beforeEach(() => {
	databases.clear();
	resetWrites();
	service = new StorageService();
});

/* ------------------------------------------------------------------ *
 * planSceneWrites — pure save-diff contract
 * ------------------------------------------------------------------ */

function serializeScene({ scene }: { scene: TScene }) {
	return {
		id: scene.id,
		name: scene.name,
		isMain: scene.isMain,
		tracks: scene.tracks,
		bookmarks: scene.bookmarks,
		createdAt: scene.createdAt.toISOString(),
		updatedAt: scene.updatedAt.toISOString(),
	};
}

test("planSceneWrites writes every scene the first time it sees a project", () => {
	const scene = makeScene({ id: "a" });

	const plan = planSceneWrites({
		entries: [{ scene, serialized: serializeScene({ scene }) }],
	});

	expect(plan.writes).toHaveLength(1);
	expect(plan.removedSceneIds).toEqual([]);
});

test("planSceneWrites skips scenes whose object, timestamp and order are unchanged", () => {
	const scene = makeScene({ id: "a" });
	const first = planSceneWrites({
		entries: [{ scene, serialized: serializeScene({ scene }) }],
	});

	const second = planSceneWrites({
		entries: [{ scene, serialized: serializeScene({ scene }) }],
		previous: first.next,
	});

	expect(second.writes).toHaveLength(0);
	expect(second.removedSceneIds).toEqual([]);
});

test("planSceneWrites rewrites a scene replaced inside the same millisecond", () => {
	// `updatedAt` has millisecond resolution, so a drag that produces two edits
	// with an identical timestamp must still be detected. Timeline mutations
	// always hand back a new scene object, and that reference is the signal.
	const stamp = new Date("2026-09-01T00:00:00.000Z");
	const before = makeScene({ id: "a", updatedAt: stamp });
	const first = planSceneWrites({
		entries: [{ scene: before, serialized: serializeScene({ scene: before }) }],
	});

	const after = makeScene({
		id: "a",
		updatedAt: stamp,
		clipCount: 5,
	});
	const second = planSceneWrites({
		entries: [{ scene: after, serialized: serializeScene({ scene: after }) }],
		previous: first.next,
	});

	expect(second.writes).toHaveLength(1);
	expect(second.writes[0].scene.tracks.main.elements).toHaveLength(5);
});

test("planSceneWrites rewrites a scene that only moved position", () => {
	const first = makeScene({ id: "a" });
	const second = makeScene({ id: "b" });
	const initial = planSceneWrites({
		entries: [
			{ scene: first, serialized: serializeScene({ scene: first }) },
			{ scene: second, serialized: serializeScene({ scene: second }) },
		],
	});

	const reordered = planSceneWrites({
		entries: [
			{ scene: second, serialized: serializeScene({ scene: second }) },
			{ scene: first, serialized: serializeScene({ scene: first }) },
		],
		previous: initial.next,
	});

	expect(reordered.writes.map(({ order }) => order)).toEqual([0, 1]);
	expect(reordered.removedSceneIds).toEqual([]);
});

test("planSceneWrites reports scenes that left the project", () => {
	const kept = makeScene({ id: "a" });
	const dropped = makeScene({ id: "b" });
	const initial = planSceneWrites({
		entries: [
			{ scene: kept, serialized: serializeScene({ scene: kept }) },
			{ scene: dropped, serialized: serializeScene({ scene: dropped }) },
		],
	});

	const next = planSceneWrites({
		entries: [{ scene: kept, serialized: serializeScene({ scene: kept }) }],
		previous: initial.next,
	});

	expect(next.removedSceneIds).toEqual(["b"]);
	expect(next.writes).toHaveLength(0);
});

/* ------------------------------------------------------------------ *
 * Round trip against the shim
 * ------------------------------------------------------------------ */

test("a saved project reloads with its scenes, order and metadata intact", async () => {
	const project = buildProject({
		metadata: {
			id: "p1",
			name: "Trip",
			duration: 12_000,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-02-02T00:00:00Z"),
			thumbnail: TINY_PNG,
			googleDriveFolderId: "folder",
		},
		scenes: [makeScene({ id: "s1" }), makeScene({ id: "s2", order: 1 })],
		currentSceneId: "s2",
	});

	await service.saveProject({ project });
	const loaded = await service.loadProject({ id: "p1" });

	expect(loaded?.project.scenes.map((scene) => scene.id)).toEqual(["s1", "s2"]);
	expect(loaded?.project.scenes[1].name).toBe("Scene 1");
	expect(loaded?.project.currentSceneId).toBe("s2");
	expect(loaded?.project.metadata.name).toBe("Trip");
	expect(loaded?.project.metadata.duration).toBe(12_000);
	expect(loaded?.project.metadata.googleDriveFolderId).toBe("folder");
	expect(loaded?.project.metadata.createdAt.toISOString()).toBe(
		"2026-01-01T00:00:00.000Z",
	);
	// The thumbnail is stored as a blob but handed back as the data URL every
	// existing consumer (project file export, presets) expects.
	expect(loaded?.project.metadata.thumbnail).toBe(TINY_PNG);
});

test("the projects list is served from the head records without reading documents", async () => {
	await service.saveProject({
		project: buildProject({
			metadata: {
				id: "p1",
				name: "One",
				duration: 0,
				createdAt: new Date("2026-01-01T00:00:00Z"),
				updatedAt: new Date("2026-03-01T00:00:00Z"),
			},
			scenes: [makeScene({ id: "s1", clipCount: 40 })],
		}),
	});
	await service.saveProject({
		project: buildProject({
			metadata: {
				id: "p2",
				name: "Two",
				duration: 0,
				createdAt: new Date("2026-01-02T00:00:00Z"),
				updatedAt: new Date("2026-04-01T00:00:00Z"),
			},
			scenes: [makeScene({ id: "s1", clipCount: 40 })],
		}),
	});

	const metadata = await service.loadAllProjectsMetadata();

	// Sorted by most recently updated.
	expect(metadata.map((entry) => entry.id)).toEqual(["p2", "p1"]);
	// The list must not carry image bytes: the card fetches them on demand.
	expect(metadata.every((entry) => entry.thumbnail === undefined)).toBe(true);

	// Re-listing is a pure head-store read: no project document is touched, so
	// the pre-split database (long gone) is not even consulted.
	resetWrites();
	await service.loadAllProjectsMetadata();
	expect(getTotalWrites()).toBe(0);
});

test("a second save rewrites only the scene that changed", async () => {
	const sceneA = makeScene({ id: "s1", clipCount: 60 });
	const sceneB = makeScene({ id: "s2", clipCount: 60, order: 1 });
	const project = buildProject({
		metadata: {
			id: "p1",
			name: "Drag me",
			duration: 0,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-01-01T00:00:00Z"),
		},
		scenes: [sceneA, sceneB],
		currentSceneId: "s1",
	});
	await service.saveProject({ project });

	// One drag frame: the editor hands back a brand new scene object for the
	// scene that moved and the untouched scene object is reused verbatim.
	const draggedSceneA = makeScene({
		id: "s1",
		clipCount: 60,
		updatedAt: new Date("2026-09-01T00:00:01Z"),
	});
	resetWrites();
	await service.saveProject({
		project: {
			...project,
			scenes: [draggedSceneA, sceneB],
			metadata: {
				...project.metadata,
				updatedAt: new Date("2026-01-01T00:00:01Z"),
			},
		},
	});

	// One scene record + the head record. Before the split this rewrote both
	// scenes and a 0.5-2 MB base64 thumbnail in a single put.
	expect(writeCounts.get(SCENES_STORE)).toBe(1);
	expect(writeCounts.get(HEADERS_STORE)).toBe(1);
	expect(writeCounts.get(THUMBNAILS_STORE)).toBeUndefined();

	const loaded = await service.loadProject({ id: "p1" });
	expect(loaded?.project.scenes[0].updatedAt.toISOString()).toBe(
		"2026-09-01T00:00:01.000Z",
	);
	// The untouched scene kept its original timestamp: it was not rewritten.
	expect(loaded?.project.scenes[1].updatedAt.toISOString()).toBe(
		"2026-09-01T00:00:00.000Z",
	);
});

test("an unchanged save writes only the head record", async () => {
	const scene = makeScene({ id: "s1" });
	const project = buildProject({
		metadata: {
			id: "p1",
			name: "Idle",
			duration: 0,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-01-01T00:00:00Z"),
		},
		scenes: [scene],
		currentSceneId: "s1",
	});
	await service.saveProject({ project });

	resetWrites();
	await service.saveProject({
		project: {
			...project,
			metadata: {
				...project.metadata,
				updatedAt: new Date("2026-01-01T00:00:05Z"),
			},
		},
	});

	expect(writeCounts.get(SCENES_STORE)).toBeUndefined();
	expect(writeCounts.get(HEADERS_STORE)).toBe(1);
});

test("an unchanged thumbnail is not rewritten", async () => {
	const scene = makeScene({ id: "s1" });
	const project = buildProject({
		metadata: {
			id: "p1",
			name: "Thumb",
			duration: 0,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-01-01T00:00:00Z"),
			thumbnail: TINY_PNG,
		},
		scenes: [scene],
		currentSceneId: "s1",
	});

	await service.saveProject({ project });
	resetWrites();
	await service.saveProject({
		project: {
			...project,
			metadata: {
				...project.metadata,
				updatedAt: new Date("2026-01-01T00:00:09Z"),
			},
		},
	});
	expect(writeCounts.get(THUMBNAILS_STORE)).toBeUndefined();

	await service.saveProject({
		project: {
			...project,
			metadata: {
				...project.metadata,
				updatedAt: new Date("2026-01-01T00:00:10Z"),
				thumbnail: TINY_PNG.replace("AAA", "BBB"),
			},
		},
	});
	expect(writeCounts.get(THUMBNAILS_STORE)).toBe(1);
});

/* ------------------------------------------------------------------ *
 * Backward compatibility
 * ------------------------------------------------------------------ */

function writeLegacyDocument({
	serialized,
}: {
	serialized: SerializedProject;
}): void {
	const db =
		databases.get(LEGACY_DB) ??
		createFakeDatabase({ name: LEGACY_DB, version: 1 });
	databases.set(LEGACY_DB, db);
	storeRecord({
		dbName: LEGACY_DB,
		storeName: "projects",
		key: serialized.metadata.id,
		value: serialized,
	});
}

function buildLegacyProject(): SerializedProject {
	const base = buildProject({
		metadata: {
			id: "legacy",
			name: "Old format",
			duration: 7_000,
			createdAt: new Date("2025-01-01T00:00:00Z"),
			updatedAt: new Date("2025-02-01T00:00:00Z"),
			thumbnail: TINY_PNG,
		},
		scenes: [makeScene({ id: "s1" }), makeScene({ id: "s2", order: 1 })],
		currentSceneId: "s2",
	});

	return {
		metadata: {
			id: base.metadata.id,
			name: base.metadata.name,
			thumbnail: base.metadata.thumbnail,
			duration: base.metadata.duration,
			createdAt: base.metadata.createdAt.toISOString(),
			updatedAt: base.metadata.updatedAt.toISOString(),
			googleDriveFolderId: undefined,
			googleDriveFileId: undefined,
		},
		scenes: base.scenes.map((scene) => ({
			id: scene.id,
			name: scene.name,
			isMain: scene.isMain,
			tracks: scene.tracks,
			bookmarks: scene.bookmarks,
			createdAt: scene.createdAt.toISOString(),
			updatedAt: scene.updatedAt.toISOString(),
		})),
		currentSceneId: base.currentSceneId,
		settings: base.settings,
		// A current-version document: the version migrations are a separate
		// pipeline, and running them here would only add the runner's 1s
		// minimum-visible delay to this suite.
		version: 25,
	};
}

test("a pre-split document still loads, list included", async () => {
	writeLegacyDocument({ serialized: buildLegacyProject() });

	const loaded = await service.loadProject({ id: "legacy" });
	expect(loaded?.project.metadata.name).toBe("Old format");
	expect(loaded?.project.scenes.map((scene) => scene.id)).toEqual(["s1", "s2"]);
	expect(loaded?.project.currentSceneId).toBe("s2");
	expect(loaded?.project.metadata.thumbnail).toBe(TINY_PNG);

	const metadata = await service.loadAllProjectsMetadata();
	expect(metadata.map((entry) => entry.name)).toEqual(["Old format"]);

	// The list backfilled a head record, and the thumbnail moved out of the
	// document so the card can draw it without a project read.
	expect(
		readRecords({ dbName: HEADERS_DB, storeName: "project-headers" }),
	).toHaveLength(1);
	const blob = await service.loadProjectThumbnail({ projectId: "legacy" });
	expect(blob).toBeInstanceOf(Blob);
	expect(await blob?.text()).not.toBe("");
});

test("saving a pre-split project migrates it and drops the old row", async () => {
	const legacy = buildLegacyProject();
	writeLegacyDocument({ serialized: legacy });

	// First the list visit (the path a projects page takes), then the save.
	await service.loadAllProjectsMetadata();
	const loaded = await service.loadProject({ id: "legacy" });
	expect(loaded).not.toBeNull();
	if (!loaded) return;

	resetWrites();
	await service.saveProject({ project: loaded.project });

	// Both scenes plus the head, and exactly one touch of the legacy store: the
	// delete, which only happens because this save rewrote every scene.
	expect(writeCounts.get(SCENES_STORE)).toBe(2);
	expect(writeCounts.get(HEADERS_STORE)).toBe(1);
	expect(writeCounts.get(LEGACY_STORE)).toBe(1);

	// Every part now has its own record and the single-document row is gone.
	expect(
		readRecord({ dbName: LEGACY_DB, storeName: "projects", key: "legacy" }),
	).toBeUndefined();
	expect(
		readRecord({
			dbName: SCENES_DB,
			storeName: "project-scenes",
			key: getProjectSceneKey({ projectId: "legacy", sceneId: "s1" }),
		}),
	).toBeDefined();
	expect(
		readRecord({
			dbName: SCENES_DB,
			storeName: "project-scenes",
			key: getProjectSceneKey({ projectId: "legacy", sceneId: "s2" }),
		}),
	).toBeDefined();
	const header = readRecord<{ sceneCount: number }>({
		dbName: HEADERS_DB,
		storeName: "project-headers",
		key: "legacy",
	});
	expect(header?.sceneCount).toBe(2);

	// And the migrated project reads back identically.
	const reloaded = await service.loadProject({ id: "legacy" });
	expect(reloaded?.project.scenes.map((scene) => scene.id)).toEqual([
		"s1",
		"s2",
	]);
	expect(reloaded?.project.metadata.name).toBe("Old format");
	expect(reloaded?.project.metadata.thumbnail).toBe(TINY_PNG);
});

test("a half-written migration still reads from the legacy row", async () => {
	// Simulates a crash between the scene writes and the head write: scene
	// records exist, the head does not, and the legacy row is still intact.
	const legacy = buildLegacyProject();
	writeLegacyDocument({ serialized: legacy });

	// Move the scenes across by hand, without the head record.
	const db =
		databases.get(SCENES_DB) ??
		createFakeDatabase({ name: SCENES_DB, version: 1 });
	databases.set(SCENES_DB, db);
	storeRecord({
		dbName: SCENES_DB,
		storeName: "project-scenes",
		key: getProjectSceneKey({ projectId: "legacy", sceneId: "only" }),
		value: { projectId: "legacy", order: 0, scene: legacy.scenes[0] },
	});

	const loaded = await service.loadProject({ id: "legacy" });
	expect(loaded?.project.scenes.map((scene) => scene.id)).toEqual(["s1", "s2"]);
});

test("no split database is opened at a version the migration runner cannot reopen", async () => {
	await service.saveProject({
		project: buildProject({
			metadata: {
				id: "p1",
				name: "Versioned",
				duration: 0,
				createdAt: new Date("2026-01-01T00:00:00Z"),
				updatedAt: new Date("2026-01-01T00:00:00Z"),
				thumbnail: TINY_PNG,
			},
		}),
	});

	// The migration runner is pinned to version 1 of `video-editor-projects`;
	// the split stores must live in their own databases so it can never hit a
	// VersionError on an already-upgraded database.
	expect(databases.has(LEGACY_DB)).toBe(true);
	expect(databases.get(LEGACY_DB)?.version).toBe(1);
	expect(databases.get(SCENES_DB)?.version).toBe(1);
	expect(databases.get(HEADERS_DB)?.version).toBe(1);
	expect(databases.get(THUMBNAILS_DB)?.version).toBe(1);
});

/* ------------------------------------------------------------------ *
 * Deletes
 * ------------------------------------------------------------------ */

test("deleting a project removes every record it owns", async () => {
	const project = buildProject({
		metadata: {
			id: "p1",
			name: "Doomed",
			duration: 0,
			createdAt: new Date("2026-01-01T00:00:00Z"),
			updatedAt: new Date("2026-01-01T00:00:00Z"),
			thumbnail: TINY_PNG,
		},
		scenes: [makeScene({ id: "s1" }), makeScene({ id: "s2", order: 1 })],
		currentSceneId: "s1",
	});
	await service.saveProject({ project });
	await service.saveProject({
		project: { ...project, metadata: { ...project.metadata, id: "p2" } },
	});

	await service.deleteProject({ id: "p1" });

	expect(await service.loadProject({ id: "p1" })).toBeNull();
	expect(
		readRecords({ dbName: SCENES_DB, storeName: "project-scenes" }).filter(
			(r) => String(r.id).startsWith("p1::"),
		),
	).toHaveLength(0);
	expect(
		readRecord({ dbName: HEADERS_DB, storeName: "project-headers", key: "p1" }),
	).toBeUndefined();
	expect(
		readRecord({
			dbName: THUMBNAILS_DB,
			storeName: "project-thumbnails",
			key: "p1",
		}),
	).toBeUndefined();

	// The other project is untouched.
	expect(await service.loadProject({ id: "p2" })).not.toBeNull();
});

test("clearAllData empties the split stores too", async () => {
	await service.saveProject({ project: buildProject() });

	await service.clearAllData();

	expect(await service.loadProject({ id: "project" })).toBeNull();
	expect(await service.loadAllProjectsMetadata()).toEqual([]);
	expect(
		readRecords({ dbName: SCENES_DB, storeName: "project-scenes" }),
	).toEqual([]);
	expect(
		readRecords({ dbName: HEADERS_DB, storeName: "project-headers" }),
	).toEqual([]);
});

test("storage info counts split and pre-split projects without double counting", async () => {
	await service.saveProject({ project: buildProject() });
	writeLegacyDocument({ serialized: buildLegacyProject() });

	expect((await service.getStorageInfo()).projects).toBe(2);
});
