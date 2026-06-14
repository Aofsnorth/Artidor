import type { EditorCore } from "@/core";
import { toast } from "sonner";
import type { MediaAsset, MediaFolder } from "@/lib/media/types";
import { storageService } from "@/services/storage/service";
import { generateUUID } from "@/utils/id";
import { videoCache } from "@/services/video-cache/service";
import { BatchCommand, RemoveMediaAssetCommand } from "@/lib/commands";

export class MediaManager {
	private assets: MediaAsset[] = [];
	private folders: MediaFolder[] = [];
	private isLoading = false;
	private listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	// ── Folder API ────────────────────────────────────────────

	getFolders(): MediaFolder[] {
		return this.folders;
	}

	async createFolder({
		projectId,
		name,
	}: {
		projectId: string;
		name: string;
	}): Promise<MediaFolder> {
		const now = new Date();
		const folder: MediaFolder = {
			id: generateUUID(),
			projectId,
			name: name.trim() || "Untitled folder",
			createdAt: now,
			updatedAt: now,
		};
		this.folders = [...this.folders, folder];
		this.notify();
		return folder;
	}

	async renameFolder({
		id,
		name,
	}: {
		id: string;
		name: string;
	}): Promise<void> {
		const next = name.trim();
		if (!next) return;
		this.folders = this.folders.map((folder) =>
			folder.id === id
				? { ...folder, name: next, updatedAt: new Date() }
				: folder,
		);
		this.notify();
	}

	async deleteFolder({ id }: { id: string }): Promise<void> {
		// Move any assets that lived inside the folder back to root so
		// nothing is silently lost when the folder goes away.
		this.assets = this.assets.map((asset) =>
			asset.folderId === id ? { ...asset, folderId: null } : asset,
		);
		this.folders = this.folders.filter((folder) => folder.id !== id);
		this.notify();
	}

	async moveAssetToFolder({
		assetId,
		folderId,
	}: {
		assetId: string;
		folderId: string | null;
	}): Promise<void> {
		this.assets = this.assets.map((asset) =>
			asset.id === assetId ? { ...asset, folderId } : asset,
		);
		this.notify();
	}

	setFolders({ folders }: { folders: MediaFolder[] }): void {
		this.folders = folders;
		this.notify();
	}

	async addMediaAsset({
		projectId,
		asset,
	}: {
		projectId: string;
		asset: Omit<MediaAsset, "id">;
	}): Promise<MediaAsset | null> {
		const newAsset: MediaAsset = {
			...asset,
			id: generateUUID(),
		};

		this.assets = [...this.assets, newAsset];
		this.notify();

		try {
			await storageService.saveMediaAsset({ projectId, mediaAsset: newAsset });
			this.editor.project.ratchetFpsForImportedMedia({
				importedAssets: [newAsset],
			});
			return newAsset;
		} catch (error) {
			console.error("Failed to save media asset:", error);
			this.assets = this.assets.filter((asset) => asset.id !== newAsset.id);
			this.notify();

			if (storageService.isQuotaExceededError({ error })) {
				toast.error("Not enough browser storage", {
					description: error instanceof Error ? error.message : undefined,
				});
			}

			return null;
		}
	}

	removeMediaAsset({ projectId, id }: { projectId: string; id: string }): void {
		this.removeMediaAssets({ projectId, ids: [id] });
	}

	removeMediaAssets({
		projectId,
		ids,
	}: {
		projectId: string;
		ids: string[];
	}): void {
		const uniqueIds = [...new Set(ids)];
		if (uniqueIds.length === 0) {
			return;
		}

		const command =
			uniqueIds.length === 1
				? new RemoveMediaAssetCommand(projectId, uniqueIds[0])
				: new BatchCommand(
						uniqueIds.map((id) => new RemoveMediaAssetCommand(projectId, id)),
					);

		this.editor.command.execute({ command });
	}

	async loadProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		this.isLoading = true;
		this.notify();

		try {
			const mediaAssets = await storageService.loadAllMediaAssets({
				projectId,
			});
			this.assets = mediaAssets;
			this.notify();
		} catch (error) {
			console.error("Failed to load media assets:", error);
		} finally {
			this.isLoading = false;
			this.notify();
		}
	}

	async clearProjectMedia({ projectId }: { projectId: string }): Promise<void> {
		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		const mediaIds = this.assets.map((asset) => asset.id);
		this.assets = [];
		this.notify();

		try {
			await Promise.all(
				mediaIds.map((id) =>
					storageService.deleteMediaAsset({ projectId, id }),
				),
			);
		} catch (error) {
			console.error("Failed to clear media assets from storage:", error);
		}
	}

	clearAllAssets(): void {
		videoCache.clearAll();

		this.assets.forEach((asset) => {
			if (asset.url) {
				URL.revokeObjectURL(asset.url);
			}
			if (asset.thumbnailUrl) {
				URL.revokeObjectURL(asset.thumbnailUrl);
			}
		});

		this.assets = [];
		this.notify();
	}

	getAssets(): MediaAsset[] {
		return this.assets;
	}

	setAssets({ assets }: { assets: MediaAsset[] }): void {
		this.assets = assets;
		this.notify();
	}

	isLoadingMedia(): boolean {
		return this.isLoading;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
