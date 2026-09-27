import type {
	TProject,
	TProjectMetadata,
	TProjectSettings,
	TTimelineViewState,
} from "@/lib/project/types";
import { getProjectDurationFromScenes } from "@/lib/scenes";
import type { MediaAsset } from "@/lib/media/types";
import { IndexedDBAdapter } from "./indexeddb-adapter";
import { OPFSAdapter } from "./opfs-adapter";
import {
	type StorageCapacityCheckResult,
	StorageQuotaExceededError,
	evaluateStorageCapacity,
	isStorageQuotaExceededError,
	readStorageQuotaStatus,
} from "./quota";
import type {
	MediaAssetData,
	StorageConfig,
	SerializedProject,
	SerializedScene,
} from "./types";
import type {
	SavedSoundsData,
	SavedSound,
	SoundEffect,
} from "@/lib/sounds/types";
import {
	migrations,
	runStorageMigrations,
} from "@/services/storage/migrations";
import type { Bookmark, SceneTracks, TScene } from "@/lib/timeline";

/**
 * Separator between the project id and the scene id inside the scene store's
 * key. Project and scene ids are uuids, so the split is unambiguous.
 */
const SCENE_KEY_SEPARATOR = "::";

/**
 * Bytes converted per `String.fromCharCode` spread when re-encoding a
 * thumbnail. Spreading a whole 320px PNG in one call blows the argument limit.
 */
const THUMBNAIL_BASE64_CHUNK_SIZE = 0x8000;

/**
 * Head record for a project: everything the projects list needs, plus the
 * project-level fields that are not per scene. Deliberately tiny (a couple of
 * hundred bytes) because it is rewritten on every autosave.
 *
 * `sceneCount` is the integrity check for the split layout: the scene store is
 * the source of truth for a migrated project, and a record count that
 * disagrees with this header means the two halves are out of sync.
 */
interface ProjectHeaderRecord {
	/** Always equal to the store key. Redundant on purpose: it makes a
	 * `getAll()` read self-describing, which the projects list relies on. */
	id: string;
	name: string;
	duration: number;
	createdAt: string;
	updatedAt: string;
	googleDriveFolderId?: string | null;
	googleDriveFileId?: string | null;
	currentSceneId: string;
	version: number;
	settings: TProjectSettings;
	timelineViewState?: TTimelineViewState;
	sceneCount: number;
}

/** One scene of one project, stored under `${projectId}::${sceneId}`. */
interface ProjectSceneRecord {
	projectId: string;
	order: number;
	scene: SerializedScene;
}

/** Project thumbnail, stored as a blob so no base64 is ever rewritten. */
interface ProjectThumbnailRecord {
	blob: Blob;
}

/**
 * What the service remembers about the scene records it last wrote for a
 * project. `source` is the caller's live scene object: every timeline mutation
 * replaces it (and bumps `updatedAt`), so an unchanged pair means the stored
 * record is still current. Keeping the reference — rather than a deep copy —
 * costs no extra memory: the editor already holds these objects alive.
 */
export interface TrackedSceneRecord {
	order: number;
	updatedAt: string;
	source: TScene;
}

export interface SceneWritePlan {
	/** Scenes whose stored record must be (re)written. */
	writes: Array<{ scene: SerializedScene; order: number }>;
	/** Scene ids that no longer belong to the project. */
	removedSceneIds: string[];
	/** The bookkeeping to keep for the next save. */
	next: Map<string, TrackedSceneRecord>;
}

/** Key prefix every scene record of `projectId` shares. */
export function getProjectSceneKeyPrefix({ projectId }: { projectId: string }) {
	return `${projectId}${SCENE_KEY_SEPARATOR}`;
}

export function getProjectSceneKey({
	projectId,
	sceneId,
}: {
	projectId: string;
	sceneId: string;
}) {
	return `${getProjectSceneKeyPrefix({ projectId })}${sceneId}`;
}

/**
 * Decides which scene records a save has to touch.
 *
 * A scene is skipped only when all three of its identity signals match the last
 * write: the caller's scene object is the very same object, its `updatedAt` is
 * unchanged, and it sits at the same position. The reference check alone is
 * what makes this safe — `updatedAt` has millisecond resolution, so two edits
 * inside the same millisecond would otherwise look identical.
 *
 * Pure, so the save contract is unit-testable without a database.
 */
export function planSceneWrites({
	entries,
	previous,
}: {
	entries: Array<{ scene: TScene; serialized: SerializedScene }>;
	previous?: Map<string, TrackedSceneRecord>;
}): SceneWritePlan {
	const writes: SceneWritePlan["writes"] = [];
	const next = new Map<string, TrackedSceneRecord>();

	entries.forEach(({ scene, serialized }, order) => {
		const tracked = previous?.get(serialized.id);

		if (
			tracked &&
			tracked.source === scene &&
			tracked.updatedAt === serialized.updatedAt &&
			tracked.order === order
		) {
			next.set(serialized.id, tracked);
			return;
		}

		writes.push({ scene: serialized, order });
		next.set(serialized.id, {
			order,
			updatedAt: serialized.updatedAt,
			source: scene,
		});
	});

	const removedSceneIds = previous
		? [...previous.keys()].filter((sceneId) => !next.has(sceneId))
		: [];

	return { writes, removedSceneIds, next };
}

/** Decodes a `data:` URL into the blob the thumbnail store keeps. */
export function dataUrlToBlob({ dataUrl }: { dataUrl: string }): Blob {
	const separatorIndex = dataUrl.indexOf(",");
	if (!dataUrl.startsWith("data:") || separatorIndex === -1) {
		throw new Error("Thumbnail is not a data URL");
	}

	const header = dataUrl.slice("data:".length, separatorIndex);
	if (!header.split(";")[1]?.includes("base64")) {
		throw new Error("Thumbnail data URL is not base64 encoded");
	}

	const binary = atob(dataUrl.slice(separatorIndex + 1));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}

	return new Blob([bytes], { type: header.split(";")[0] || "image/png" });
}

/**
 * Re-encodes a stored thumbnail as the data URL every existing consumer
 * expects (`TProjectMetadata.thumbnail`, project file export, presets). Only
 * the full-project load path pays for this — the hot save and list paths never
 * touch the thumbnail.
 */
export async function blobToDataUrl({ blob }: { blob: Blob }): Promise<string> {
	const bytes = new Uint8Array(await blob.arrayBuffer());
	let binary = "";
	for (
		let index = 0;
		index < bytes.length;
		index += THUMBNAIL_BASE64_CHUNK_SIZE
	) {
		binary += String.fromCharCode(
			...bytes.subarray(index, index + THUMBNAIL_BASE64_CHUNK_SIZE),
		);
	}
	return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

function normalizeBookmarks({ raw }: { raw: unknown }): Bookmark[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.map((item): Bookmark | null => {
			if (typeof item === "number") return { time: item };
			const obj = item as Record<string, unknown>;
			if (
				typeof obj !== "object" ||
				obj === null ||
				typeof obj.time !== "number"
			) {
				return null;
			}
			return {
				time: obj.time,
				...(typeof obj.note === "string" && { note: obj.note }),
				...(typeof obj.color === "string" && { color: obj.color }),
				...(typeof obj.duration === "number" && { duration: obj.duration }),
			};
		})
		.filter((b): b is Bookmark => b !== null);
}

/** Rebuilds a scene from its stored record. */
function deserializeScene({ scene }: { scene: SerializedScene }): TScene {
	return {
		id: scene.id,
		name: scene.name,
		isMain: scene.isMain,
		tracks: scene.tracks,
		bookmarks: normalizeBookmarks({ raw: scene.bookmarks }),
		createdAt: new Date(scene.createdAt),
		updatedAt: new Date(scene.updatedAt),
	};
}

/** At most this many projects keep their media adapters (and open db) cached. */
const MEDIA_ADAPTER_CACHE_LIMIT = 32;

/**
 * List entry for a split project. `thumbnail` is intentionally left unset:
 * the image bytes live in their own record and the list loads them on demand
 * (`loadProjectThumbnail`), so neither the list nor the save path carries them.
 */
function toMetadata({
	header,
}: {
	header: ProjectHeaderRecord;
}): TProjectMetadata {
	return {
		id: header.id,
		name: header.name,
		duration: header.duration,
		createdAt: new Date(header.createdAt),
		updatedAt: new Date(header.updatedAt),
	};
}

function toLegacyMetadata({
	serializedProject,
}: {
	serializedProject: SerializedProject;
}): TProjectMetadata {
	return {
		id: serializedProject.metadata.id,
		name: serializedProject.metadata.name,
		duration:
			serializedProject.metadata.duration ??
			getProjectDurationFromScenes({
				scenes: (serializedProject.scenes ?? []) as unknown as TScene[],
			}),
		createdAt: new Date(serializedProject.metadata.createdAt),
		updatedAt: new Date(serializedProject.metadata.updatedAt),
	};
}

class StorageService {
	/**
	 * Pre-split layout, still read (and then dropped) for projects saved before
	 * the scenes/thumbnail/metadata split. See `readLegacyProject`.
	 */
	private projectsAdapter: IndexedDBAdapter<SerializedProject>;
	/** Per-scene records keyed by `${projectId}::${sceneId}`. */
	private projectScenesAdapter: IndexedDBAdapter<ProjectSceneRecord>;
	/** Project head records (list metadata + project-level fields). */
	private projectHeadersAdapter: IndexedDBAdapter<ProjectHeaderRecord>;
	/** Project thumbnails as blobs, keyed by project id. */
	private projectThumbnailsAdapter: IndexedDBAdapter<ProjectThumbnailRecord>;
	private savedSoundsAdapter: IndexedDBAdapter<SavedSoundsData>;
	private config: StorageConfig;
	private migrationsPromise: Promise<void> | null = null;
	/** Last written scene bookkeeping, per project. Empty means "write all". */
	private trackedScenes = new Map<string, Map<string, TrackedSceneRecord>>();
	/** Last written thumbnail data URL, per project. */
	private trackedThumbnails = new Map<string, string>();
	private mediaAdapterCache = new Map<
		string,
		{
			mediaMetadataAdapter: IndexedDBAdapter<MediaAssetData>;
			mediaAssetsAdapter: OPFSAdapter;
		}
	>();

	constructor() {
		this.config = {
			projectsDb: "video-editor-projects",
			mediaDb: "video-editor-media",
			savedSoundsDb: "video-editor-saved-sounds",
			version: 1,
		};

		this.projectsAdapter = new IndexedDBAdapter<SerializedProject>(
			this.config.projectsDb,
			"projects",
			this.config.version,
		);

		// Split layout. Each store gets its own database so an existing
		// `video-editor-projects` database never needs a version bump (which the
		// migration runner, pinned at version 1, could not reopen) and so a
		// pre-split database is simply "missing" the records rather than
		// structurally incompatible.
		this.projectScenesAdapter = new IndexedDBAdapter<ProjectSceneRecord>(
			"video-editor-project-scenes",
			"project-scenes",
			this.config.version,
		);
		this.projectHeadersAdapter = new IndexedDBAdapter<ProjectHeaderRecord>(
			"video-editor-project-headers",
			"project-headers",
			this.config.version,
		);
		this.projectThumbnailsAdapter =
			new IndexedDBAdapter<ProjectThumbnailRecord>(
				"video-editor-project-thumbnails",
				"project-thumbnails",
				this.config.version,
			);

		this.savedSoundsAdapter = new IndexedDBAdapter<SavedSoundsData>(
			this.config.savedSoundsDb,
			"saved-sounds",
			this.config.version,
		);
	}

	private async ensureMigrations(): Promise<void> {
		if (this.migrationsPromise) {
			await this.migrationsPromise;
			return;
		}

		this.migrationsPromise = runStorageMigrations({ migrations }).then(
			() => undefined,
		);
		await this.migrationsPromise;
	}

	private getProjectMediaAdapters({ projectId }: { projectId: string }) {
		const cached = this.mediaAdapterCache.get(projectId);
		if (cached) {
			return cached;
		}

		const adapters = {
			mediaMetadataAdapter: new IndexedDBAdapter<MediaAssetData>(
				`${this.config.mediaDb}-${projectId}`,
				"media-metadata",
				this.config.version,
			),
			mediaAssetsAdapter: new OPFSAdapter(`media-files-${projectId}`),
		};

		this.mediaAdapterCache.set(projectId, adapters);

		// Adapters hold an open IndexedDB connection. Bound the cache and close
		// the evicted ones so a workspace with hundreds of projects cannot
		// exhaust the browser's connection budget.
		while (this.mediaAdapterCache.size > MEDIA_ADAPTER_CACHE_LIMIT) {
			const oldestProjectId = this.mediaAdapterCache.keys().next().value;
			if (oldestProjectId === undefined) break;
			const oldest = this.mediaAdapterCache.get(oldestProjectId);
			this.mediaAdapterCache.delete(oldestProjectId);
			oldest?.mediaMetadataAdapter.close();
		}

		return adapters;
	}

	async canStoreFile({
		size,
	}: {
		size: number;
	}): Promise<StorageCapacityCheckResult> {
		const quotaStatus = await readStorageQuotaStatus();
		return evaluateStorageCapacity({
			requiredBytes: size,
			quotaStatus,
		});
	}

	isQuotaExceededError({ error }: { error: unknown }): boolean {
		return isStorageQuotaExceededError({ error });
	}

	private stripAudioBuffers({ tracks }: { tracks: SceneTracks }): SceneTracks {
		return {
			...tracks,
			audio: tracks.audio.map((track) => ({
				...track,
				elements: track.elements.map((element) => {
					const { buffer: _buffer, ...rest } = element;
					return rest;
				}),
			})),
		};
	}

	/**
	 * Persists a project.
	 *
	 * Only what changed is written: the head record (always, it carries
	 * `updatedAt`), the scene records the caller actually mutated, and the
	 * thumbnail only when its data URL differs from the last one written. A
	 * project that still lives in the pre-split layout is migrated here — its
	 * scenes and thumbnail move into their own records and the legacy row is
	 * dropped last, so an interrupted save always leaves a readable project
	 * behind (see `loadProject`).
	 */
	async saveProject({ project }: { project: TProject }): Promise<void> {
		const projectId = project.metadata.id;
		const duration =
			project.metadata.duration ??
			getProjectDurationFromScenes({ scenes: project.scenes });
		const entries = project.scenes.map((scene) => ({
			scene,
			serialized: {
				id: scene.id,
				name: scene.name,
				isMain: scene.isMain,
				tracks: this.stripAudioBuffers({ tracks: scene.tracks }),
				bookmarks: scene.bookmarks,
				createdAt: scene.createdAt.toISOString(),
				updatedAt: scene.updatedAt.toISOString(),
			},
		}));

		const { writes, removedSceneIds, next } = planSceneWrites({
			entries,
			previous: this.trackedScenes.get(projectId),
		});

		// Scene records first, head record second. The head is what a later read
		// trusts, so it must never claim a state whose scene records were not
		// committed: an interrupted save leaves the head describing the previous
		// (complete) state rather than a scene that was never written.
		await Promise.all([
			...writes.map(({ scene, order }) =>
				this.projectScenesAdapter.set(
					getProjectSceneKey({ projectId, sceneId: scene.id }),
					{ projectId, order, scene },
				),
			),
			...removedSceneIds.map((sceneId) =>
				this.projectScenesAdapter.remove(
					getProjectSceneKey({ projectId, sceneId }),
				),
			),
		]);

		await this.projectHeadersAdapter.set(projectId, {
			id: projectId,
			name: project.metadata.name,
			duration,
			createdAt: project.metadata.createdAt.toISOString(),
			updatedAt: project.metadata.updatedAt.toISOString(),
			googleDriveFolderId: project.metadata.googleDriveFolderId,
			googleDriveFileId: project.metadata.googleDriveFileId,
			currentSceneId: project.currentSceneId,
			version: project.version,
			settings: project.settings,
			timelineViewState: project.timelineViewState,
			sceneCount: entries.length,
		});

		this.trackedScenes.set(projectId, next);

		await this.saveThumbnail({
			projectId,
			thumbnail: project.metadata.thumbnail,
		});

		// The pre-split row is redundant now that every part of it is stored
		// separately — but only once this save has rewritten every scene, so the
		// row can never be the last copy of one. Dropping it last keeps the
		// migration crash-safe.
		const rewroteEveryScene =
			entries.length > 0 && writes.length === entries.length;
		if (rewroteEveryScene) {
			await this.projectsAdapter.remove(projectId);
		}
	}

	/**
	 * Writes the thumbnail blob when the project carries a new one. Clearing a
	 * thumbnail (a project saved without one) removes the record so the
	 * projects list falls back to its generated placeholder.
	 */
	private async saveThumbnail({
		projectId,
		thumbnail,
	}: {
		projectId: string;
		thumbnail?: string;
	}): Promise<void> {
		if (!thumbnail) {
			if (this.trackedThumbnails.has(projectId)) {
				this.trackedThumbnails.delete(projectId);
				await this.projectThumbnailsAdapter.remove(projectId);
			}
			return;
		}

		if (this.trackedThumbnails.get(projectId) === thumbnail) return;

		let blob: Blob;
		try {
			blob = dataUrlToBlob({ dataUrl: thumbnail });
		} catch (error) {
			// A thumbnail is decoration: never fail the save over it.
			console.warn("Skipping undecodable project thumbnail:", error);
			return;
		}

		this.trackedThumbnails.set(projectId, thumbnail);
		await this.projectThumbnailsAdapter.set(projectId, { blob });
	}

	/**
	 * The projects list needs the image bytes, but the hot save path must not
	 * carry them. Returns the stored blob so the caller owns the object URL
	 * lifecycle; null when the project has no thumbnail.
	 */
	async loadProjectThumbnail({
		projectId,
	}: {
		projectId: string;
	}): Promise<Blob | null> {
		await this.ensureMigrations();

		const stored = await this.projectThumbnailsAdapter.get(projectId);
		if (stored?.blob) return stored.blob;

		// Only a project that is not fully split can still have its thumbnail
		// inside the legacy row, and reading that row means deserializing the
		// whole project — so check the head record first and skip the read for
		// every project the autosave path has already migrated.
		const header = await this.projectHeadersAdapter.get(projectId);
		if (header && header.sceneCount > 0) return null;

		const legacy = await this.projectsAdapter.get(projectId);
		const legacyThumbnail = legacy?.metadata?.thumbnail;
		if (!legacyThumbnail) return null;

		try {
			return dataUrlToBlob({ dataUrl: legacyThumbnail });
		} catch (error) {
			console.warn("Skipping undecodable project thumbnail:", error);
			return null;
		}
	}

	async loadProject({
		id,
	}: {
		id: string;
	}): Promise<{ project: TProject } | null> {
		await this.ensureMigrations();

		const sceneRecords = await this.projectScenesAdapter.getAllByPrefix(
			getProjectSceneKeyPrefix({ projectId: id }),
		);
		const header = await this.projectHeadersAdapter.get(id);
		const legacyProject = await this.projectsAdapter.get(id);

		// The legacy row is authoritative until the head record exists, and a
		// project with no scene records at all is pre-split (or list-only
		// backfilled) — a project always has at least one scene. Both cases are
		// exactly the windows a save passes through while migrating, so the row is
		// still there and is what a read must use.
		if (legacyProject && (sceneRecords.length === 0 || !header)) {
			return this.readLegacyProject({ serializedProject: legacyProject });
		}

		if (!header) {
			// No head record and no legacy row to fall back on: the project does
			// not exist, or its records were lost outside Artidor. Report it
			// instead of handing the editor an empty timeline.
			if (sceneRecords.length > 0) {
				console.error(
					`Project ${id} has ${sceneRecords.length} scene records but no project header.`,
				);
			}
			return null;
		}

		if (sceneRecords.length !== header.sceneCount) {
			console.error(
				`Project ${id} is inconsistent: ${sceneRecords.length} scene records for ${header.sceneCount} scenes. Loading what is stored.`,
			);
		}

		const scenes = sceneRecords
			.sort((a, b) => a.order - b.order)
			.map((record) => deserializeScene({ scene: record.scene }));

		// A half-migrated project can still have its thumbnail in the legacy row.
		const thumbnailRecord = await this.projectThumbnailsAdapter.get(id);
		const thumbnail = thumbnailRecord?.blob
			? await blobToDataUrl({ blob: thumbnailRecord.blob })
			: legacyProject?.metadata.thumbnail;

		const project: TProject = {
			metadata: {
				id,
				name: header.name,
				thumbnail,
				duration: header.duration ?? getProjectDurationFromScenes({ scenes }),
				createdAt: new Date(header.createdAt),
				updatedAt: new Date(header.updatedAt),
				googleDriveFolderId: header.googleDriveFolderId,
				googleDriveFileId: header.googleDriveFileId,
			},
			scenes,
			currentSceneId: header.currentSceneId,
			settings: header.settings,
			version: header.version,
			timelineViewState: header.timelineViewState,
		};

		return { project };
	}

	/** Reads a project saved in the pre-split single-document layout. */
	private readLegacyProject({
		serializedProject,
	}: {
		serializedProject: SerializedProject;
	}): { project: TProject } {
		const scenes =
			serializedProject.scenes?.map((scene) => deserializeScene({ scene })) ??
			[];

		const project: TProject = {
			metadata: {
				id: serializedProject.metadata.id,
				name: serializedProject.metadata.name,
				thumbnail: serializedProject.metadata.thumbnail,
				duration:
					serializedProject.metadata.duration ??
					getProjectDurationFromScenes({ scenes }),
				createdAt: new Date(serializedProject.metadata.createdAt),
				updatedAt: new Date(serializedProject.metadata.updatedAt),
				googleDriveFolderId: serializedProject.metadata.googleDriveFolderId,
				googleDriveFileId: serializedProject.metadata.googleDriveFileId,
			},
			scenes,
			currentSceneId: serializedProject.currentSceneId || "",
			settings: serializedProject.settings,
			version: serializedProject.version,
			timelineViewState: serializedProject.timelineViewState,
		};

		return { project };
	}

	async loadAllProjects(): Promise<TProject[]> {
		const projectIds = await this.listAllProjectIds();
		const projects: TProject[] = [];

		for (const id of projectIds) {
			const result = await this.loadProject({ id });
			if (result?.project) {
				projects.push(result.project);
			}
		}

		return projects.sort(
			(a, b) => b.metadata.updatedAt.getTime() - a.metadata.updatedAt.getTime(),
		);
	}

	/**
	 * Project list, served from the head records alone.
	 *
	 * The pre-split layout kept the list metadata inside the full project
	 * document, so listing projects deserialized every scene of every project.
	 * Head records are a few hundred bytes each. Projects that have not been
	 * re-saved since the split are still read from the legacy rows and get a
	 * head record backfilled, so the expensive path runs at most once per
	 * project.
	 */
	async loadAllProjectsMetadata(): Promise<TProjectMetadata[]> {
		await this.ensureMigrations();

		const [headers, legacyIds] = await Promise.all([
			this.projectHeadersAdapter.getAll(),
			this.projectsAdapter.list(),
		]);

		const metadataById = new Map<string, TProjectMetadata>(
			headers.map((header) => [header.id, toMetadata({ header })]),
		);

		// Projects saved before the split have no head record yet. Read just
		// those rows (never the ones already listed) and backfill a head record
		// so the next visit is served from the light store alone.
		const unlistedLegacyIds = legacyIds.filter((id) => !metadataById.has(id));

		if (unlistedLegacyIds.length > 0) {
			const legacyProjects = await Promise.all(
				unlistedLegacyIds.map((id) => this.projectsAdapter.get(id)),
			);

			for (const serializedProject of legacyProjects) {
				if (!serializedProject) continue;
				metadataById.set(
					serializedProject.metadata.id,
					toLegacyMetadata({ serializedProject }),
				);
				await this.backfillHeader({ serializedProject });
			}
		}

		return [...metadataById.values()].sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
		);
	}

	/** Copies a legacy row's list metadata into a head record. */
	private async backfillHeader({
		serializedProject,
	}: {
		serializedProject: SerializedProject;
	}): Promise<void> {
		const { metadata, scenes } = serializedProject;
		await this.projectHeadersAdapter.set(metadata.id, {
			id: metadata.id,
			name: metadata.name,
			duration:
				metadata.duration ??
				getProjectDurationFromScenes({
					scenes: (scenes ?? []) as unknown as TScene[],
				}),
			createdAt: metadata.createdAt,
			updatedAt: metadata.updatedAt,
			googleDriveFolderId: metadata.googleDriveFolderId,
			googleDriveFileId: metadata.googleDriveFileId,
			currentSceneId: serializedProject.currentSceneId,
			version: serializedProject.version,
			settings: serializedProject.settings,
			timelineViewState: serializedProject.timelineViewState,
			// The scenes are still in the legacy row: this head is list-only, so
			// the project load keeps reading the legacy row until the project is
			// saved again.
			sceneCount: 0,
		});

		// Move the thumbnail out of the legacy row too, so the projects list stops
		// pulling whole project documents in just to draw a card image.
		await this.saveThumbnail({
			projectId: metadata.id,
			thumbnail: metadata.thumbnail,
		});
	}

	/** Every project id, from the head records and the legacy rows. */
	private async listAllProjectIds(): Promise<string[]> {
		const [headerIds, legacyIds] = await Promise.all([
			this.projectHeadersAdapter.list(),
			this.projectsAdapter.list(),
		]);
		return [...new Set([...headerIds, ...legacyIds])];
	}

	async deleteProject({ id }: { id: string }): Promise<void> {
		this.trackedScenes.delete(id);
		this.trackedThumbnails.delete(id);
		this.mediaAdapterCache.delete(id);

		await Promise.all([
			this.projectsAdapter.remove(id),
			this.projectHeadersAdapter.remove(id),
			this.projectThumbnailsAdapter.remove(id),
			this.projectScenesAdapter.removeByPrefix(
				getProjectSceneKeyPrefix({ projectId: id }),
			),
		]);
	}

	async saveMediaAsset({
		projectId,
		mediaAsset,
	}: {
		projectId: string;
		mediaAsset: MediaAsset;
	}): Promise<void> {
		const { mediaMetadataAdapter, mediaAssetsAdapter } =
			this.getProjectMediaAdapters({ projectId });

		const metadata: MediaAssetData = {
			id: mediaAsset.id,
			name: mediaAsset.name,
			type: mediaAsset.type,
			size: mediaAsset.file.size,
			lastModified: mediaAsset.file.lastModified,
			width: mediaAsset.width,
			height: mediaAsset.height,
			duration: mediaAsset.duration,
			fps: mediaAsset.fps,
			hasAudio: mediaAsset.hasAudio,
			thumbnailUrl: mediaAsset.thumbnailUrl,
			ephemeral: mediaAsset.ephemeral,
		};

		try {
			await mediaAssetsAdapter.set(mediaAsset.id, mediaAsset.file);
			await mediaMetadataAdapter.set(mediaAsset.id, metadata);
		} catch (error) {
			try {
				await mediaAssetsAdapter.remove(mediaAsset.id);
			} catch {
				// Ignore cleanup failures so the original storage error is preserved.
			}

			if (this.isQuotaExceededError({ error })) {
				throw new StorageQuotaExceededError({
					requiredBytes: mediaAsset.file.size,
				});
			}

			throw error;
		}
	}

	async loadMediaAsset({
		projectId,
		id,
	}: {
		projectId: string;
		id: string;
	}): Promise<MediaAsset | null> {
		const { mediaMetadataAdapter, mediaAssetsAdapter } =
			this.getProjectMediaAdapters({ projectId });

		const [file, metadata] = await Promise.all([
			mediaAssetsAdapter.get(id),
			mediaMetadataAdapter.get(id),
		]);

		if (!file || !metadata) return null;

		// NOTE: The object URLs created below are intentionally tied to the
		// MediaAsset lifecycle — they are returned on the asset's `url` field
		// and must be revoked by the caller (e.g. via URL.revokeObjectURL)
		// when the asset is removed from the media library or the project is
		// deleted. This service does not track them to avoid complex
		// bookkeeping that could introduce stale-reference bugs.
		let url: string;
		if (metadata.type === "image" && (!file.type || file.type === "")) {
			try {
				const text = await file.text();
				if (text.trim().startsWith("<svg")) {
					const svgBlob = new Blob([text], { type: "image/svg+xml" });
					url = URL.createObjectURL(svgBlob);
				} else {
					url = URL.createObjectURL(file);
				}
			} catch {
				url = URL.createObjectURL(file);
			}
		} else {
			url = URL.createObjectURL(file);
		}

		return {
			id: metadata.id,
			name: metadata.name,
			type: metadata.type,
			file,
			url,
			width: metadata.width,
			height: metadata.height,
			duration: metadata.duration,
			fps: metadata.fps,
			hasAudio: metadata.hasAudio,
			thumbnailUrl: metadata.thumbnailUrl,
			ephemeral: metadata.ephemeral,
		};
	}

	async loadAllMediaAssets({
		projectId,
	}: {
		projectId: string;
	}): Promise<MediaAsset[]> {
		const { mediaMetadataAdapter } = this.getProjectMediaAdapters({
			projectId,
		});

		const mediaIds = await mediaMetadataAdapter.list();
		// Parallel: each asset needs its own OPFS read plus its metadata row, and
		// the adapters are memoized per project, so this is a flat fan-out rather
		// than a chain of open() calls.
		const mediaItems = await Promise.all(
			mediaIds.map((id) => this.loadMediaAsset({ projectId, id })),
		);

		return mediaItems.filter((item): item is MediaAsset => item !== null);
	}

	async deleteMediaAsset({
		projectId,
		id,
	}: {
		projectId: string;
		id: string;
	}): Promise<void> {
		const { mediaMetadataAdapter, mediaAssetsAdapter } =
			this.getProjectMediaAdapters({ projectId });

		await Promise.all([
			mediaAssetsAdapter.remove(id),
			mediaMetadataAdapter.remove(id),
		]);
	}

	async deleteProjectMedia({
		projectId,
	}: {
		projectId: string;
	}): Promise<void> {
		const { mediaMetadataAdapter, mediaAssetsAdapter } =
			this.getProjectMediaAdapters({ projectId });

		await Promise.all([
			mediaMetadataAdapter.clear(),
			mediaAssetsAdapter.clear(),
		]);
	}

	async clearAllData(): Promise<void> {
		this.trackedScenes.clear();
		this.trackedThumbnails.clear();

		await Promise.all([
			this.projectsAdapter.clear(),
			this.projectHeadersAdapter.clear(),
			this.projectThumbnailsAdapter.clear(),
			this.projectScenesAdapter.clear(),
		]);
		// project-specific media and timelines cleaned up when projects are deleted
	}

	async getStorageInfo(): Promise<{
		projects: number;
		isOPFSSupported: boolean;
		isIndexedDBSupported: boolean;
	}> {
		const projectIds = await this.listAllProjectIds();

		return {
			projects: projectIds.length,
			isOPFSSupported: this.isOPFSSupported(),
			isIndexedDBSupported: this.isIndexedDBSupported(),
		};
	}

	async getProjectStorageInfo({ projectId }: { projectId: string }): Promise<{
		mediaItems: number;
	}> {
		const { mediaMetadataAdapter } = this.getProjectMediaAdapters({
			projectId,
		});

		const mediaIds = await mediaMetadataAdapter.list();

		return {
			mediaItems: mediaIds.length,
		};
	}

	async loadSavedSounds(): Promise<SavedSoundsData> {
		try {
			const savedSoundsData = await this.savedSoundsAdapter.get("user-sounds");
			return (
				savedSoundsData || {
					sounds: [],
					lastModified: new Date().toISOString(),
				}
			);
		} catch (error) {
			console.error("Failed to load saved sounds:", error);
			return { sounds: [], lastModified: new Date().toISOString() };
		}
	}

	async saveSoundEffect({
		soundEffect,
	}: {
		soundEffect: SoundEffect;
	}): Promise<void> {
		try {
			const currentData = await this.loadSavedSounds();

			if (currentData.sounds.some((sound) => sound.id === soundEffect.id)) {
				return; // Already saved
			}

			const savedSound: SavedSound = {
				id: soundEffect.id,
				name: soundEffect.name,
				username: soundEffect.username,
				previewUrl: soundEffect.previewUrl,
				downloadUrl: soundEffect.downloadUrl,
				duration: soundEffect.duration,
				tags: soundEffect.tags,
				license: soundEffect.license,
				savedAt: new Date().toISOString(),
			};

			const updatedData: SavedSoundsData = {
				sounds: [...currentData.sounds, savedSound],
				lastModified: new Date().toISOString(),
			};

			await this.savedSoundsAdapter.set("user-sounds", updatedData);
		} catch (error) {
			console.error("Failed to save sound effect:", error);
			throw error;
		}
	}

	async removeSavedSound({ soundId }: { soundId: number }): Promise<void> {
		try {
			const currentData = await this.loadSavedSounds();

			const updatedData: SavedSoundsData = {
				sounds: currentData.sounds.filter((sound) => sound.id !== soundId),
				lastModified: new Date().toISOString(),
			};

			await this.savedSoundsAdapter.set("user-sounds", updatedData);
		} catch (error) {
			console.error("Failed to remove saved sound:", error);
			throw error;
		}
	}

	async isSoundSaved({ soundId }: { soundId: number }): Promise<boolean> {
		try {
			const currentData = await this.loadSavedSounds();
			return currentData.sounds.some((sound) => sound.id === soundId);
		} catch (error) {
			console.error("Failed to check if sound is saved:", error);
			return false;
		}
	}

	async clearSavedSounds(): Promise<void> {
		try {
			await this.savedSoundsAdapter.remove("user-sounds");
		} catch (error) {
			console.error("Failed to clear saved sounds:", error);
			throw error;
		}
	}

	isOPFSSupported(): boolean {
		return OPFSAdapter.isSupported();
	}

	isIndexedDBSupported(): boolean {
		return "indexedDB" in window;
	}

	isFullySupported(): boolean {
		return this.isIndexedDBSupported() && this.isOPFSSupported();
	}
}

export const storageService = new StorageService();
export { StorageService };
