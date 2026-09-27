import type { EditorCore } from "@/core";
import type {
	TProject,
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
	TProjectSettings,
	TTimelineViewState,
} from "@/lib/project/types";
import {
	getGoogleAccessToken,
	fetchFolderMetadata,
	fetchFolderFiles,
	downloadFileBlob,
	saveProjectToDrive,
	createDriveFolder,
	uploadMediaToDrive,
} from "@/lib/drive/api";
import { decodeArtprProject, isArtprFileName } from "@/lib/project-file/artpr";
import { processMediaAssets } from "@/lib/media/processing";
import type { ExportOptions, ExportResult, ExportState } from "@/lib/export";
import { hasExportContent } from "@/lib/export";
import {
	deleteExportTempFileByName,
	openStreamedExportFile,
} from "@/services/renderer/export-output";
import { storageService } from "@/services/storage/service";
import { toast } from "sonner";
import { generateUUID } from "@/utils/id";
import { UpdateProjectSettingsCommand } from "@/lib/commands/project";
import { DEFAULT_BACKGROUND_COLOR } from "@/lib/background/color";
import { DEFAULT_CANVAS_SIZE } from "@/lib/canvas/sizes";
import { DEFAULT_FPS } from "@/lib/fps/defaults";
import { buildDefaultScene, getProjectDurationFromScenes } from "@/lib/scenes";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import {
	initializeGpuRenderer,
	isGpuAvailable,
} from "@/services/renderer/gpu-renderer";
import {
	CURRENT_PROJECT_VERSION,
	migrations,
	runStorageMigrations,
	type MigrationProgress,
} from "@/services/storage/migrations";
import { loadFonts } from "@/lib/fonts/google-fonts";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { getElementFontFamilies } from "@/lib/timeline/element-utils";
import { getRaisedProjectFpsForImportedMedia } from "@/lib/fps/utils";
import type { MediaAsset } from "@/lib/media/types";

export interface MigrationState {
	isMigrating: boolean;
	fromVersion: number | null;
	toVersion: number | null;
	projectName: string | null;
}

export interface DriveSyncState {
	status: "idle" | "saving" | "saved" | "error" | "syncing-assets";
	progress: number;
	message: string | null;
}

const MAX_EXPORT_HISTORY_ENTRIES = 1;

/**
 * Idle period after which a pending Google Drive sync is flushed.
 *
 * A Drive sync costs a full `JSON.stringify` of the project, a PBKDF2 key
 * derivation (120k iterations, tens of milliseconds of main-thread CPU) and a
 * PATCH of the whole encrypted file. Doing that on every autosave put that cost
 * on the critical path of every timeline drag, so saves now only *schedule* a
 * sync and the upload happens once the user pauses.
 */
const DRIVE_SYNC_DEBOUNCE_MS = 4000;

/** Longest side, in pixels, of a stored project thumbnail. */
const PROJECT_THUMBNAIL_MAX = 320;

export class ProjectManager {
	private active: TProject | null = null;
	private savedProjects: TProjectMetadata[] = [];
	private isLoading = true;
	private isInitialized = false;
	private invalidProjectIds = new Set<string>();
	private storageMigrationPromise: Promise<void> | null = null;
	private listeners = new Set<() => void>();
	private migrationState: MigrationState = {
		isMigrating: false,
		fromVersion: null,
		toVersion: null,
		projectName: null,
	};
	private exportState: ExportState = {
		isExporting: false,
		progress: 0,
		result: null,
	};
	private exportCancelRequested = false;
	private exportHistory = new Map<string, ExportResult>();
	private driveSyncState: DriveSyncState = {
		status: "idle",
		progress: 0,
		message: null,
	};
	/** Serializes overlapping loadProject calls: last request wins, stale loads are inert. */
	private loadProjectSeq = 0;
	/** Promise of the newest in-flight load; direct saves wait on it so they never snapshot half-loaded scenes. */
	private loadInFlight: Promise<void> | null = null;
	/** Serializes direct saveCurrentProject calls so snapshots can't interleave writes. */
	private directSaveChain: Promise<void> = Promise.resolve();
	/** Newest project snapshot that still has to reach Drive. */
	private pendingDriveSync: {
		folderId: string;
		fileId: string | null;
		project: TProject;
	} | null = null;
	private driveSyncTimer: ReturnType<typeof setTimeout> | null = null;
	/** Serializes Drive uploads so two never run against the same file at once. */
	private driveSyncChain: Promise<void> = Promise.resolve();

	/**
	 * A debounced Drive sync must not be lost when the tab goes away, so the
	 * last lifecycle events the browser still runs code for flush it. The upload
	 * itself is best effort — a `pagehide` handler cannot await the network — but
	 * arming it here means a backgrounded or reloading tab still pushes the
	 * pending edit instead of silently dropping it.
	 */
	private readonly flushDriveSyncOnPageHide = (): void => {
		void this.flushDriveSync();
	};

	private readonly flushDriveSyncOnHidden = (): void => {
		if (document.visibilityState === "hidden") void this.flushDriveSync();
	};

	constructor(private editor: EditorCore) {
		if (typeof window === "undefined") return;
		window.addEventListener("pagehide", this.flushDriveSyncOnPageHide);
		document.addEventListener("visibilitychange", this.flushDriveSyncOnHidden);
	}

	private async ensureStorageMigrations(): Promise<void> {
		if (this.storageMigrationPromise) {
			await this.storageMigrationPromise;
			return;
		}

		this.storageMigrationPromise = (async () => {
			await runStorageMigrations({
				migrations,
				onProgress: (progress: MigrationProgress) => {
					this.migrationState = progress;
					this.notify();
				},
			});
		})();

		await this.storageMigrationPromise;
	}

	async createNewProject({ name }: { name: string }): Promise<string> {
		const mainScene = buildDefaultScene({ name: "Main scene", isMain: true });
		const newProject: TProject = {
			metadata: {
				id: generateUUID(),
				name,
				duration: getProjectDurationFromScenes({ scenes: [mainScene] }),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			scenes: [mainScene],
			currentSceneId: mainScene.id,
			settings: {
				fps: DEFAULT_FPS,
				canvasSize: DEFAULT_CANVAS_SIZE,
				canvasSizeMode: "preset",
				lastCustomCanvasSize: null,
				originalCanvasSize: null,
				background: {
					type: "color",
					color: DEFAULT_BACKGROUND_COLOR,
				},
			},
			version: CURRENT_PROJECT_VERSION,
		};

		this.active = newProject;
		this.notify();

		// A new project is a fresh editing context; any element selection
		// from the previous project is stale and would make the Properties
		// panel try to inspect non-existent elements.
		this.editor.selection.clearSelection();

		this.editor.media.clearAllAssets();
		this.editor.scenes.initializeScenes({
			scenes: newProject.scenes,
			currentSceneId: newProject.currentSceneId,
		});

		try {
			await storageService.saveProject({ project: newProject });
			this.updateMetadata(newProject);

			return newProject.metadata.id;
		} catch (error) {
			toast.error("Failed to save new project");
			throw error;
		}
	}

	async loadProject({ id }: { id: string }): Promise<void> {
		// Serialize overlapping loads: the newest request wins and any load still
		// running for an older request becomes inert. Without this, two mounts or a
		// stale retry could interleave clearScenes()/initializeScenes() and land the
		// editor on the wrong project while loading gates flap up and down.
		const seq = ++this.loadProjectSeq;
		const isStaleLoad = () => this.loadProjectSeq !== seq;

		// Flush any pending edits of the outgoing project BEFORE tearing down
		// editor state or raising the load gate. clearScenes() below empties the
		// live scene list while `this.active` still points at the outgoing
		// project; a debounced save firing in that window used to persist the
		// outgoing project with empty scenes — destroying its timeline. Pausing
		// also cancels the armed debounce timer, so the flush below is the only
		// writer.
		//
		// If that flush fails, the switch MUST abort here: continuing would
		// clear scenes that only exist in memory and the in-flight retry could
		// then persist the outgoing project with empty scenes. Abort keeps the
		// old project mounted, its state intact and still dirty, so the debounced
		// retry keeps trying and the caller can surface the failure.
		this.editor.save.pause();
		try {
			await this.editor.save.flush();
		} catch (error) {
			this.editor.save.resume();
			if (!this.isInitialized) {
				this.isLoading = false;
				this.notify();
			}
			throw error;
		}

		if (isStaleLoad()) return;

		if (!this.isInitialized) {
			this.isLoading = true;
			this.notify();
		}

		const switchingBetweenProjects =
			this.active !== null && this.active.metadata.id !== id;

		// The load body runs behind `loadInFlight` so a direct save issued while
		// the workspace is being torn down/replaced waits for the load instead of
		// persisting cleared scenes under the outgoing project id.
		const runLoad = async (): Promise<void> => {
			try {
				await this.ensureStorageMigrations();
				if (isStaleLoad()) return;

				// Keep `isLoading` true across the whole load so SaveManager refuses
				// to start a save while scenes are cleared/replaced.
				this.isLoading = true;
				this.notify();

				this.editor.media.clearAllAssets();
				this.editor.scenes.clearScenes();

				const result = await storageService.loadProject({ id });
				if (isStaleLoad()) return;
				if (!result) {
					throw new Error(`Project with id ${id} not found`);
				}

				const project = result.project;

				this.active = project;
				this.notify();

				// Switching projects is a fresh context; clear any selection carried
				// over from the previous project so the Properties panel lands on
				// the Details view instead of trying to inspect missing elements.
				this.editor.selection.clearSelection();

				if (project.scenes && project.scenes.length > 0) {
					this.editor.scenes.initializeScenes({
						scenes: project.scenes,
						currentSceneId: project.currentSceneId,
					});
				}

				await this.editor.media.loadProjectMedia({ projectId: id });
				if (isStaleLoad()) return;

				await loadFonts({
					families: [
						...new Set(
							(project.scenes ?? []).flatMap((scene) =>
								getElementFontFamilies({ tracks: scene.tracks }),
							),
						),
					],
				});
				if (isStaleLoad()) return;

				if (!project.metadata.thumbnail) {
					// Generate the first thumbnail in the background once the GPU is
					// ready. Never block (or fail) project load on it — a brand-new
					// project has no thumbnail and the GPU init is deferred.
					const thumbnailProjectId = project.metadata.id;
					void (async () => {
						try {
							const didUpdateThumbnail =
								await this.updateThumbnailFromTimeline();
							if (
								didUpdateThumbnail &&
								this.active?.metadata.id === thumbnailProjectId
							) {
								await this.saveCurrentProject();
							}
						} catch (error) {
							console.error("Failed to generate project thumbnail:", error);
						}
					})();
				}
			} catch (error) {
				// A superseded load must not surface its own failure: the newer
				// request owns the editor and the error UI.
				if (isStaleLoad()) return;
				console.error("Failed to load project:", error);
				throw error;
			} finally {
				if (!isStaleLoad()) {
					// Keep the paused save gate down through the whole load so the
					// freshly-initialized scenes cannot trigger a save for the outgoing
					// project. resume() re-arms any still-pending debounce.
					if (switchingBetweenProjects) {
						this.editor.selection.clearSelection();
					}
					this.isLoading = false;
					this.notify();
					this.editor.save.resume();
				}
			}
		};

		const load = runLoad();
		this.loadInFlight = load;
		try {
			await load;
		} finally {
			// Only the newest load may clear the reference: an older load settling
			// after being superseded must not release newer direct saves early.
			if (this.loadInFlight === load) {
				this.loadInFlight = null;
			}
		}
	}

	/**
	 * Persist the active project. Errors propagate to the caller (SaveManager
	 * keeps the work dirty and re-arms its debounce) instead of being swallowed:
	 * a failed write previously cleared the dirty flag and left the user
	 * editing under the false belief that autosave worked.
	 *
	 * Concurrency contract: only derived metadata (duration/updatedAt) is
	 * written back onto `this.active` after the storage await. Assigning the
	 * whole pre-await snapshot used to silently revert concurrent mutations
	 * (settings changes, scene switches) that happened while IndexedDB was
	 * writing.
	 */
	async saveCurrentProject(): Promise<void> {
		// A direct save while a project is being torn down/replaced must wait:
		// snapping the workspace mid-load would persist cleared scenes (or the
		// incoming scenes) under the wrong project id.
		if (this.loadInFlight) {
			try {
				await this.loadInFlight;
			} catch {
				// The load already reported its own failure; the caller's save must
				// still run against the (unchanged) current workspace.
			}
		}

		// Direct callers (export, AI save tool, template apply, thumbnail
		// follow-up) expect *this* call to persist *now*, and caller errors must
		// stay observable (dropped errors silently skip explicit saves and break
		// SaveManager's keep-dirty retry). Chaining serializes the underlying
		// storage writes; deferring the snapshot function inside the chain keeps
		// overlapping direct saves from interleaving their reads/writes.
		// saveInFlight semantics: subsequent calls chain behind this one.
		const save = this.directSaveChain.then(() => this.persistActiveProject());
		// Keep the chain alive across failures; the rejection is carried by
		// `save` itself so the original caller still sees it.
		this.directSaveChain = save.catch(() => undefined);
		await save;
	}

	/** Snapshot the live workspace and persist it as-is. */
	private async persistActiveProject(): Promise<void> {
		const projectBeforeWrite = this.active;
		if (!projectBeforeWrite) return;

		const scenes = this.editor.scenes.getScenes();
		const projectToPersist: TProject = {
			...projectBeforeWrite,
			scenes,
			metadata: {
				...projectBeforeWrite.metadata,
				duration: getProjectDurationFromScenes({ scenes }),
				updatedAt: new Date(),
			},
		};

		// Bump the persisted-copy metadata first so failure paths below cannot
		// lose it.
		await storageService.saveProject({ project: projectToPersist });

		if (this.active === projectBeforeWrite) {
			// Merge ONLY derived fields onto the (possibly concurrently mutated)
			// live project. settings/currentSceneId set during the write window
			// must survive.
			this.active = {
				...this.active,
				metadata: {
					...this.active.metadata,
					duration: projectToPersist.metadata.duration,
					updatedAt: projectToPersist.metadata.updatedAt,
				},
			};
		}
		this.updateMetadata(projectToPersist);

		// If linked to Google Drive, remember it for the debounced sync below.
		// Failures only surface through driveSyncState — the local IndexedDB
		// write above already succeeded, so this must not fail the whole save.
		const folderId = projectToPersist.metadata.googleDriveFolderId;
		if (folderId) {
			this.scheduleDriveSync({
				folderId,
				fileId: projectToPersist.metadata.googleDriveFileId ?? null,
				project: projectToPersist,
			});
		}
	}

	/**
	 * Queues the newest project snapshot for Drive. Only the last snapshot of an
	 * idle period is uploaded, so a drag that autosaves a dozen times pays for
	 * one encryption pass and one PATCH instead of a dozen.
	 */
	private scheduleDriveSync({
		folderId,
		fileId,
		project,
	}: {
		folderId: string;
		fileId: string | null;
		project: TProject;
	}): void {
		if (this.driveSyncTimer) clearTimeout(this.driveSyncTimer);
		this.pendingDriveSync = { folderId, fileId, project };
		this.driveSyncTimer = setTimeout(() => {
			this.driveSyncTimer = null;
			void this.flushDriveSync();
		}, DRIVE_SYNC_DEBOUNCE_MS);
	}

	/**
	 * Uploads the pending Drive snapshot, if any. Uploads are serialized, so a
	 * snapshot that arrives mid-upload stays queued for this call to pick up
	 * rather than racing the one in flight. Resolves once Drive holds the
	 * newest queued snapshot.
	 */
	private flushDriveSync(): Promise<void> {
		if (this.driveSyncTimer) {
			clearTimeout(this.driveSyncTimer);
			this.driveSyncTimer = null;
		}

		const run = this.driveSyncChain.then(() => this.uploadPendingDriveSync());
		// Keep the chain alive across failures; the rejection stays on `run` so
		// the caller still sees it.
		this.driveSyncChain = run.catch(() => undefined);
		return run;
	}

	private async uploadPendingDriveSync(): Promise<void> {
		const pending = this.pendingDriveSync;
		if (!pending) return;
		if (!getGoogleAccessToken()) return;

		this.pendingDriveSync = null;
		const { folderId, fileId, project } = pending;

		try {
			this.setDriveSyncState("saving", 0, "Saving to Drive...");
			const newFileId = await saveProjectToDrive(folderId, fileId, project);

			if (
				newFileId !== fileId &&
				this.active &&
				this.active.metadata.id === project.metadata.id
			) {
				this.active.metadata.googleDriveFileId = newFileId;
				await storageService.saveProject({ project: this.active });
			}

			this.setDriveSyncState("saved", 100, "Saved to Drive");
			setTimeout(() => {
				if (this.driveSyncState.status === "saved") {
					this.setDriveSyncState("idle");
				}
			}, 2000);
		} catch (driveErr) {
			console.error("Failed to save project to Google Drive:", driveErr);
			this.setDriveSyncState("error", 0, "Save to Drive failed");
		}
	}

	private getExportHistoryKey({
		options,
	}: {
		options: ExportOptions;
	}): string | null {
		if (!this.active) return null;

		return JSON.stringify({
			projectId: this.active.metadata.id,
			updatedAt:
				this.active.metadata.updatedAt?.toISOString?.() ??
				this.active.metadata.updatedAt,
			options,
		});
	}

	async export({ options }: { options: ExportOptions }): Promise<ExportResult> {
		const cacheKey = this.getExportHistoryKey({ options });
		const cached = cacheKey ? this.exportHistory.get(cacheKey) : null;
		if (cached?.success && hasExportContent({ result: cached })) {
			// Streamed entries reference an OPFS file that may have been swept
			// (storage pressure, boot sweep, manual cleanup). Verify it still
			// exists before replaying — otherwise fall through to a fresh render.
			if (cached.streamed) {
				const alive = await openStreamedExportFile(cached.streamed.fileName)
					.then((file) => file.size > 0)
					.catch(() => false);
				if (!alive) {
					if (cacheKey) this.exportHistory.delete(cacheKey);
				} else {
					const result = { ...cached, cached: true };
					this.exportState = { isExporting: false, progress: 1, result };
					this.notify();
					return result;
				}
			} else {
				const result = { ...cached, cached: true };
				this.exportState = { isExporting: false, progress: 1, result };
				this.notify();
				return result;
			}
		}

		// A new export replaces the previous result: delete the handed-over
		// OPFS file (if any) so it never orphans — UNLESS the history still
		// owns it (it is the live cache entry, and evicting below handles its
		// cleanup). Evicted history entries get the same treatment below.
		if (!this.isHistoryOwned(this.exportState.result)) {
			void this.discardStreamedExportFile(this.exportState.result);
		}
		this.exportCancelRequested = false;
		this.exportState = { isExporting: true, progress: 0, result: null };
		this.notify();

		// Track the maximum progress reported so far. The export pipeline can
		// fall back and retry (parallel → single-worker → software retry →
		// main-thread), each starting its progress from 0. Without this guard,
		// the progress bar jumps backwards on every fallback — e.g. parallel
		// reaches 40%, fails, single-worker restarts from 5%, the bar drops
		// from 40% to 5%. With the guard, the bar only moves forward.
		let maxProgress = 0;

		const result = await this.editor.renderer.exportProject({
			options,
			onProgress: ({ progress }) => {
				// Clamp to monotonically increasing — the bar must never
				// move backwards, even if the pipeline retries from scratch.
				if (progress <= maxProgress) return;
				maxProgress = progress;
				this.exportState = { ...this.exportState, progress };
				this.notify();
			},
			onCancel: () => this.exportCancelRequested,
		});

		// Cancelled/failed runs leave no handed-over file on the success path
		// (worker + bridge already deleted it), but the cancel poll can win
		// after a streamed success resolved — belt-and-braces delete here.
		if (!result.success) {
			void this.discardStreamedExportFile(result);
		}

		if (cacheKey && result.success && hasExportContent({ result })) {
			// History holds at most one entry. Streamed results ARE cached now:
			// the handed-over OPFS file stays on disk and the history entry owns
			// it until it is evicted or the dialog clears it (both discard the
			// file). Cache hits re-verify the file's existence first.
			this.exportHistory.set(cacheKey, result);
			while (this.exportHistory.size > MAX_EXPORT_HISTORY_ENTRIES) {
				const oldestKey = this.exportHistory.keys().next().value;
				if (!oldestKey) break;
				const evicted = this.exportHistory.get(oldestKey);
				this.exportHistory.delete(oldestKey);
				void this.discardStreamedExportFile(evicted);
			}
		}

		this.exportState = {
			isExporting: false,
			progress: this.exportState.progress,
			result,
		};
		this.notify();

		return result;
	}

	cancelExport(): void {
		this.exportCancelRequested = true;
	}

	/**
	 * Best-effort delete of a result's handed-over OPFS file. Never throws;
	 * buffer-only results are a no-op.
	 */
	private discardStreamedExportFile(
		result: ExportResult | null | undefined,
	): Promise<void> {
		if (!result?.streamed) return Promise.resolve();
		return deleteExportTempFileByName(result.streamed.fileName);
	}

	/** True when the result object is still a live history entry (its OPFS
	 * file must not be discarded behind the cache's back). */
	private isHistoryOwned(result: ExportResult | null | undefined): boolean {
		if (!result) return false;
		for (const entry of this.exportHistory.values()) {
			if (entry === result) return true;
		}
		return false;
	}

	clearExportState(): void {
		// Dialog dismissed without download (or explicit reset): the handed-over
		// OPFS file would otherwise orphan — its only reference was this state.
		// EXCEPT when the history still owns it (it is the live cache entry and
		// must survive so an identical export replays from cache).
		if (!this.isHistoryOwned(this.exportState.result)) {
			void this.discardStreamedExportFile(this.exportState.result);
		}
		this.exportState = { isExporting: false, progress: 0, result: null };
		this.notify();
	}

	getExportState(): ExportState {
		return this.exportState;
	}

	async loadAllProjects(): Promise<void> {
		if (!this.isInitialized) {
			this.isLoading = true;
			this.notify();
		}

		try {
			await this.ensureStorageMigrations();
			try {
				const metadata = await storageService.loadAllProjectsMetadata();
				this.savedProjects = metadata;
				this.notify();
			} catch (error) {
				console.error("Failed to load projects:", error);
			} finally {
				this.isLoading = false;
				this.isInitialized = true;
				this.notify();
			}
		} catch (error) {
			console.error("Failed to run migrations:", error);
			this.isLoading = false;
			this.isInitialized = true;
			this.notify();
		}
	}

	async deleteProjects({ ids }: { ids: string[] }): Promise<void> {
		const uniqueIds = Array.from(new Set(ids));
		if (uniqueIds.length === 0) return;

		try {
			await Promise.all(
				uniqueIds.map((id) =>
					Promise.all([
						storageService.deleteProjectMedia({ projectId: id }),
						storageService.deleteProject({ id }),
					]),
				),
			);

			const idSet = new Set(uniqueIds);
			this.savedProjects = this.savedProjects.filter(
				(project) => !idSet.has(project.id),
			);

			const shouldClearActive =
				this.active && idSet.has(this.active.metadata.id);

			if (shouldClearActive) {
				this.active = null;
				this.editor.media.clearAllAssets();
				this.editor.scenes.clearScenes();
			}

			this.notify();
		} catch (error) {
			console.error("Failed to delete projects:", error);
		}
	}

	closeProject(): void {
		// Push any debounced Drive sync before the workspace goes away: the
		// pending snapshot is already captured, so it can still be uploaded.
		void this.flushDriveSync();

		// Stop playback BEFORE clearing state to prevent orphaned audio
		// sources from continuing to play after navigation. Pausing
		// triggers the AudioManager's handlePlaybackChange which calls
		// stopPlayback() on the audio engine automatically.
		this.editor.playback.pause();

		this.active = null;
		this.notify();

		this.editor.media.clearAllAssets();
		this.editor.scenes.clearScenes();
	}

	async renameProject({
		id,
		name,
	}: {
		id: string;
		name: string;
	}): Promise<void> {
		try {
			const result = await storageService.loadProject({ id });
			if (!result) {
				toast.error("Project not found", {
					description: "Please try again",
				});
				return;
			}

			const updatedProject: TProject = {
				...result.project,
				metadata: {
					...result.project.metadata,
					name,
					updatedAt: new Date(),
				},
			};

			await storageService.saveProject({ project: updatedProject });

			if (this.active?.metadata.id === id) {
				this.active = updatedProject;
				this.notify();
			}

			this.updateMetadata(updatedProject);
		} catch (error) {
			console.error("Failed to rename project:", error);
			toast.error("Failed to rename project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	}

	async duplicateProjects({ ids }: { ids: string[] }): Promise<string[]> {
		const uniqueIds = Array.from(new Set(ids));
		if (uniqueIds.length === 0) return [];

		try {
			const getDuplicateBaseName = ({ name }: { name: string }) => {
				const match = name.match(/^\((\d+)\)\s+(.+)$/);
				const number = match ? Number.parseInt(match[1], 10) : null;
				const baseName = match ? match[2] : name;
				return { baseName, number };
			};

			const loadResults = await Promise.all(
				uniqueIds.map(async (projectId) => {
					const result = await storageService.loadProject({ id: projectId });
					return { projectId, project: result?.project ?? null };
				}),
			);

			const missingProjectIds = loadResults
				.filter((result) => !result.project)
				.map((result) => result.projectId);

			if (missingProjectIds.length > 0) {
				toast.error(
					missingProjectIds.length === 1
						? "Project not found"
						: "Projects not found",
					{
						description:
							missingProjectIds.length === 1
								? "Please try again"
								: "Some projects could not be found",
					},
				);
				throw new Error(`Projects not found: ${missingProjectIds.join(", ")}`);
			}

			const projectsToDuplicate = loadResults.flatMap((result) =>
				result.project ? [result.project] : [],
			);

			const maxNumberByBaseName = new Map<string, number>();

			for (const project of this.savedProjects) {
				const { baseName, number } = getDuplicateBaseName({
					name: project.name,
				});

				if (number === null) continue;

				const currentMax = maxNumberByBaseName.get(baseName);
				if (currentMax === undefined || number > currentMax) {
					maxNumberByBaseName.set(baseName, number);
				}
			}

			const nextNumberByBaseName = new Map<string, number>();
			for (const [baseName, maxNumber] of maxNumberByBaseName) {
				nextNumberByBaseName.set(baseName, maxNumber + 1);
			}

			const duplicationPlans = projectsToDuplicate.map((project) => {
				const { baseName } = getDuplicateBaseName({
					name: project.metadata.name,
				});
				const nextNumber = nextNumberByBaseName.get(baseName) ?? 1;
				nextNumberByBaseName.set(baseName, nextNumber + 1);

				const newProjectId = generateUUID();
				const newProject: TProject = {
					...project,
					metadata: {
						...project.metadata,
						id: newProjectId,
						name: `(${nextNumber}) ${baseName}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				};

				return {
					newProjectId,
					newProject,
					sourceProjectId: project.metadata.id,
				};
			});

			await Promise.all(
				duplicationPlans.map(({ newProject }) =>
					storageService.saveProject({ project: newProject }),
				),
			);

			await Promise.all(
				duplicationPlans.map(async ({ sourceProjectId, newProjectId }) => {
					const sourceMediaAssets = await storageService.loadAllMediaAssets({
						projectId: sourceProjectId,
					});

					await Promise.all(
						sourceMediaAssets.map((mediaAsset) =>
							storageService.saveMediaAsset({
								projectId: newProjectId,
								mediaAsset,
							}),
						),
					);
				}),
			);

			for (const { newProject } of duplicationPlans) {
				this.updateMetadata(newProject);
			}

			return duplicationPlans.map((plan) => plan.newProjectId);
		} catch (error) {
			console.error("Failed to duplicate projects:", error);
			toast.error("Failed to duplicate projects", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
			throw error;
		}
	}

	async updateSettings({
		settings,
		pushHistory = true,
	}: {
		settings: Partial<TProjectSettings>;
		pushHistory?: boolean;
	}): Promise<void> {
		if (!this.active) return;

		const command = new UpdateProjectSettingsCommand(settings);
		if (pushHistory) {
			this.editor.command.execute({ command });
			return;
		}

		command.execute();
	}

	ratchetFpsForImportedMedia({
		importedAssets,
	}: {
		importedAssets: Array<Pick<MediaAsset, "type" | "fps">>;
	}): import("artidor-wasm").FrameRate | null {
		if (!this.active) return null;

		const nextFps = getRaisedProjectFpsForImportedMedia({
			currentFps: this.active.settings.fps,
			importedAssets,
		});
		if (nextFps === null) return null;

		new UpdateProjectSettingsCommand({ fps: nextFps }).execute();
		return nextFps;
	}

	async updateThumbnail({ thumbnail }: { thumbnail: string }): Promise<void> {
		if (!this.active) return;

		const updatedProject: TProject = {
			...this.active,
			metadata: { ...this.active.metadata, thumbnail, updatedAt: new Date() },
		};
		this.active = updatedProject;
		this.notify();
		this.updateMetadata(updatedProject);
		this.editor.save.markDirty();
	}

	/**
	 * Flush pending edits on exit. The flush is unconditional: thumbnail
	 * rendering is best-effort and unavailable on machines without WebGPU,
	 * but pending edits must still be persisted before the caller clears the
	 * editor state.
	 */
	async prepareExit(): Promise<void> {
		if (!this.active) return;

		try {
			await this.updateThumbnailFromTimeline();
		} catch (error) {
			console.error("Failed to generate project thumbnail on exit:", error);
		}

		try {
			await this.editor.save.flush();
		} catch (error) {
			// Storage write failed. The save manager keeps the work dirty and
			// re-arms its debounce, but this may be the last chance to warn.
			toast.error("Could not save your latest changes", {
				description:
					"Autosave will retry — please stay on this page if possible.",
			});
			throw error;
		}

		// Last chance for a Drive-linked project: the debounced sync would
		// otherwise sit on its timer while the workspace is torn down.
		await this.flushDriveSync();
	}

	getFilteredAndSortedProjects({
		searchQuery,
		sortOption,
	}: {
		searchQuery: string;
		sortOption: TProjectSortOption;
	}): TProjectMetadata[] {
		const filteredProjects = this.savedProjects.filter((project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);

		const [key, order] = sortOption.split("-") as [
			TProjectSortKey,
			"asc" | "desc",
		];

		const sortedProjects = [...filteredProjects].sort((a, b) => {
			const aValue = a[key];
			const bValue = b[key];

			if (order === "asc") {
				if (aValue < bValue) return -1;
				if (aValue > bValue) return 1;
				return 0;
			}
			if (aValue > bValue) return -1;
			if (aValue < bValue) return 1;
			return 0;
		});

		return sortedProjects;
	}

	isInvalidProjectId({ id }: { id: string }): boolean {
		return this.invalidProjectIds.has(id);
	}

	markProjectIdAsInvalid({ id }: { id: string }): void {
		this.invalidProjectIds.add(id);
		this.notify();
	}

	clearInvalidProjectIds(): void {
		this.invalidProjectIds.clear();
		this.notify();
	}

	getActive(): TProject {
		if (!this.active) {
			throw new Error("No active project");
		}
		return this.active;
	}

	/**
	 * for agents:
	 * in most cases, the project is guaranteed to be active, in which getActive() should be used instead.
	 * for very rare cases, this function may be used.
	 */
	getActiveOrNull(): TProject | null {
		return this.active;
	}

	getTimelineViewState(): TTimelineViewState {
		return this.active?.timelineViewState ?? DEFAULTS.timeline.viewState;
	}

	setTimelineViewState({ viewState }: { viewState: TTimelineViewState }): void {
		if (!this.active) return;
		this.active = {
			...this.active,
			timelineViewState: viewState ?? undefined,
		};
		this.editor.save.markDirty();
		this.notify();
	}

	getSavedProjects(): TProjectMetadata[] {
		return this.savedProjects;
	}

	getIsLoading(): boolean {
		return this.isLoading;
	}

	getIsInitialized(): boolean {
		return this.isInitialized;
	}

	getMigrationState(): MigrationState {
		return this.migrationState;
	}

	setActiveProject({ project }: { project: TProject }): void {
		this.active = project;
		this.notify();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private async updateThumbnailFromTimeline(): Promise<boolean> {
		if (!this.active) return false;
		const projectId = this.active.metadata.id;

		// Thumbnail rendering goes through the GPU compositor. GPU init is
		// deferred off the project-load critical path, so ensure it's ready (and
		// bail gracefully if WebGPU is unavailable) rather than throwing.
		await initializeGpuRenderer();
		if (!isGpuAvailable()) return false;
		// Awaiting GPU init can take a while on cold drivers; if the user switched
		// projects in the meantime, don't render the old timeline into the new
		// project's thumbnail.
		if (this.active?.metadata.id !== projectId) return false;

		const tracks = this.editor.scenes.getActiveScene().tracks;
		const mediaAssets = this.editor.media.getAssets();
		const duration = this.editor.timeline.getTotalDuration();
		const { canvasSize, background } = this.active.settings;

		const scene = buildScene({
			tracks,
			mediaAssets,
			duration: duration || 1,
			canvasSize,
			background,
		});

		const renderer = new CanvasRenderer({
			width: canvasSize.width,
			height: canvasSize.height,
			fps: this.active.settings.fps,
		});

		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = canvasSize.width;
		tempCanvas.height = canvasSize.height;

		try {
			await renderer.renderToCanvas({
				node: scene,
				time: 0,
				targetCanvas: tempCanvas,
			});
		} catch (error) {
			// WebGPU's `present()` can fail on adapters that can't copy
			// their swapchain texture into a 2D context (Linux/ANGLE and
			// some iGPUs hit "output surface does not support the required
			// texture format"). Render the project's background as a
			// solid-color fallback so the thumbnail card still shows
			// something sensible instead of the "no thumbnail" glyph.
			console.warn("Thumbnail render fell back to background fill:", error);
			const ctx = tempCanvas.getContext("2d");
			if (!ctx) return false;
			if (background.type === "color") {
				ctx.fillStyle = background.color;
			} else {
				ctx.fillStyle = "#0a0a0c";
			}
			ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
		}

		// Downscale to a card-sized thumbnail. A full-canvas 1920x1080 PNG is
		// 0.5-2 MB of base64 that every projects-list card has to decode, and it
		// used to be re-encoded and rewritten on every autosave. Mirrors
		// `renderPresetThumbnail`.
		const scale = Math.min(
			1,
			PROJECT_THUMBNAIL_MAX / Math.max(tempCanvas.width, tempCanvas.height),
		);
		const thumbWidth = Math.max(1, Math.round(tempCanvas.width * scale));
		const thumbHeight = Math.max(1, Math.round(tempCanvas.height * scale));
		const thumbCanvas = document.createElement("canvas");
		thumbCanvas.width = thumbWidth;
		thumbCanvas.height = thumbHeight;
		const thumbContext = thumbCanvas.getContext("2d");
		if (!thumbContext) return false;
		thumbContext.drawImage(tempCanvas, 0, 0, thumbWidth, thumbHeight);

		const thumbnailDataUrl = thumbCanvas.toDataURL("image/png");

		// The render is async; re-check the active project before writing so a
		// late finish can't overwrite a different project's thumbnail.
		if (this.active?.metadata.id !== projectId) return false;

		await this.updateThumbnail({ thumbnail: thumbnailDataUrl });
		return true;
	}

	private updateMetadata(project: TProject): void {
		const index = this.savedProjects.findIndex(
			(p) => p.id === project.metadata.id,
		);

		if (index !== -1) {
			this.savedProjects = this.savedProjects.with(index, project.metadata);
		} else {
			this.savedProjects = [project.metadata, ...this.savedProjects];
		}

		this.notify();
	}

	getDriveSyncState(): DriveSyncState {
		return this.driveSyncState;
	}

	setDriveSyncState(
		status: DriveSyncState["status"],
		progress = 0,
		message: string | null = null,
	): void {
		this.driveSyncState = { status, progress, message };
		this.notify();
	}

	async syncProjectFromDrive(folderId: string): Promise<string> {
		this.setDriveSyncState(
			"syncing-assets",
			0,
			"Connecting to Google Drive...",
		);
		const token = getGoogleAccessToken();
		if (!token) {
			this.setDriveSyncState("error", 0, "Drive unauthenticated");
			throw new Error("unauthenticated");
		}

		try {
			// 1. Check if we already have this folder loaded or stored locally
			const existingProjectMeta = this.savedProjects.find(
				(p) => p.googleDriveFolderId === folderId,
			);

			let projectId: string;
			let projectFileId: string | null = null;
			let projectData: TProject | null = null;

			// Fetch Google Drive folder metadata and file listing
			this.setDriveSyncState(
				"syncing-assets",
				10,
				"Fetching folder metadata...",
			);
			const folderMeta = await fetchFolderMetadata(folderId);
			const folderName = folderMeta.name || "Drive Project";

			const files = await fetchFolderFiles(folderId);
			const artidorFile =
				files.find((f) => isArtprFileName(f.name)) ??
				files.find(
					(f) => f.name === "artidor.json" || f.name === "project.json",
				);

			if (artidorFile) {
				projectFileId = artidorFile.id;
				this.setDriveSyncState(
					"syncing-assets",
					25,
					"Downloading project configuration...",
				);
				const blob = await downloadFileBlob(artidorFile.id);
				const text = await blob.text();
				projectData = isArtprFileName(artidorFile.name)
					? await decodeArtprProject<TProject>(text)
					: (JSON.parse(text) as TProject);
			}

			if (projectData) {
				// We have project data from Drive!
				projectId = projectData.metadata.id || generateUUID();
				projectData.metadata.id = projectId;
				projectData.metadata.googleDriveFolderId = folderId;
				projectData.metadata.googleDriveFileId = projectFileId;

				// Update/Save locally
				await storageService.saveProject({ project: projectData });
				await this.loadProject({ id: projectId });
			} else {
				// No project file on Drive, create new project
				if (existingProjectMeta) {
					projectId = existingProjectMeta.id;
					await this.loadProject({ id: projectId });
				} else {
					this.setDriveSyncState(
						"syncing-assets",
						40,
						"Creating new project...",
					);
					projectId = await this.createNewProject({ name: folderName });
				}

				// Set Drive folder metadata on active project
				if (this.active) {
					this.active.metadata.googleDriveFolderId = folderId;

					// Upload initially to Google Drive
					this.setDriveSyncState(
						"syncing-assets",
						50,
						"Creating artidor.artpr on Drive...",
					);
					const driveFileId = await saveProjectToDrive(
						folderId,
						null,
						this.active,
					);
					this.active.metadata.googleDriveFileId = driveFileId;

					// Save updated project locally
					await storageService.saveProject({ project: this.active });
					this.updateMetadata(this.active);
				}
			}

			// 2. Now import/sync other media files from the folder
			const mediaFiles = files.filter((f) => {
				const mime = f.mimeType.toLowerCase();
				return (
					mime.startsWith("video/") ||
					mime.startsWith("audio/") ||
					mime.startsWith("image/")
				);
			});

			if (mediaFiles.length > 0 && this.active) {
				const activeId = this.active.metadata.id;
				const currentAssets = this.editor.media.getAssets();

				for (let i = 0; i < mediaFiles.length; i++) {
					const file = mediaFiles[i];
					// Check if file is already imported (by name)
					const alreadyImported = currentAssets.some(
						(asset) => asset.name === file.name,
					);

					if (!alreadyImported) {
						const pct = Math.round(50 + (i / mediaFiles.length) * 45);
						this.setDriveSyncState(
							"syncing-assets",
							pct,
							`Downloading asset ${i + 1}/${mediaFiles.length}: ${file.name}`,
						);

						try {
							const blob = await downloadFileBlob(file.id);
							const localFile = new File([blob], file.name, {
								type: file.mimeType,
							});
							const processedAssets = await processMediaAssets({
								files: [localFile],
							});
							const processed = processedAssets[0];
							if (processed) {
								await this.editor.media.addMediaAsset({
									projectId: activeId,
									asset: processed,
								});
							}
						} catch (assetErr) {
							console.error(
								"Failed to download/process media:",
								file.name,
								assetErr,
							);
						}
					}
				}
			}

			this.setDriveSyncState("saved", 100, "Sync complete");
			setTimeout(() => {
				this.setDriveSyncState("idle");
			}, 3000);

			return projectId;
		} catch (err) {
			console.error("Google Drive sync failed:", err);
			this.setDriveSyncState(
				"error",
				0,
				err instanceof Error ? err.message : "Sync failed",
			);
			throw err;
		}
	}

	/**
	 * Export To Drive — copy the active project to a brand-new Google Drive
	 * folder: create the folder, upload every local media asset, then write the
	 * encrypted `artidor.artpr` project file and link the project to that folder
	 * so future saves sync there. Useful when a user's local inventory is full
	 * or they want a Drive-backed copy.
	 *
	 * Returns the new Drive folder id. Requires an active project and a live
	 * Drive token (throws "unauthenticated" otherwise).
	 */
	async exportProjectToDrive(): Promise<string> {
		if (!this.active) {
			throw new Error("No active project to export");
		}
		const token = getGoogleAccessToken();
		if (!token) {
			this.setDriveSyncState("error", 0, "Drive unauthenticated");
			throw new Error("unauthenticated");
		}

		// Persist the latest edits locally first so the exported copy is current.
		await this.saveCurrentProject();
		const project = this.active;
		if (!project) {
			throw new Error("No active project to export");
		}

		try {
			this.setDriveSyncState("saving", 5, "Creating Drive folder...");
			const folderName = project.metadata.name || "Artidor Project";
			const folderId = await createDriveFolder(folderName);

			// Upload local media assets into the new folder.
			const assets = this.editor.media.getAssets();
			for (let i = 0; i < assets.length; i++) {
				const asset = assets[i];
				if (!asset.file) continue;
				const pct = Math.round(10 + (i / Math.max(1, assets.length)) * 70);
				this.setDriveSyncState(
					"saving",
					pct,
					`Uploading ${i + 1}/${assets.length}: ${asset.name}`,
				);
				try {
					await uploadMediaToDrive(folderId, asset.file);
				} catch (uploadErr) {
					console.error("Failed to upload asset:", asset.name, uploadErr);
				}
			}

			// Write the encrypted project file and link the project to the folder.
			this.setDriveSyncState("saving", 85, "Writing project file...");
			const fileId = await saveProjectToDrive(folderId, null, project);

			if (this.active && this.active.metadata.id === project.metadata.id) {
				this.active.metadata.googleDriveFolderId = folderId;
				this.active.metadata.googleDriveFileId = fileId;
				await storageService.saveProject({ project: this.active });
				this.updateMetadata(this.active);
			}

			this.setDriveSyncState("saved", 100, "Exported to Drive");
			setTimeout(() => {
				if (this.driveSyncState.status === "saved") {
					this.setDriveSyncState("idle");
				}
			}, 3000);

			return folderId;
		} catch (err) {
			console.error("Export to Drive failed:", err);
			this.setDriveSyncState(
				"error",
				0,
				err instanceof Error ? err.message : "Export failed",
			);
			throw err;
		}
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
