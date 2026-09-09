import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { MediaAsset } from "@/lib/media/types";
import { storageService } from "@/services/storage/service";
import { videoCache } from "@/services/video-cache/service";
import { hasMediaId } from "@/lib/timeline/element-utils";
import type { SceneTracks, TimelineTrack } from "@/lib/timeline";

export class RemoveMediaAssetCommand extends Command {
	private savedAssets: MediaAsset[] | null = null;
	private savedTracks: SceneTracks | null = null;
	private removedAsset: MediaAsset | null = null;
	/** Object URLs minted by undo(); revoked again on redo to avoid leaks. */
	private restoredObjectUrls: string[] = [];

	constructor(
		private projectId: string,
		private assetId: string,
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const assets = editor.media.getAssets();

		this.savedAssets = [...assets];
		this.savedTracks = editor.scenes.getActiveScene().tracks;

		this.removedAsset =
			assets.find((media) => media.id === this.assetId) ?? null;

		if (!this.removedAsset) {
			console.error("Media asset not found:", this.assetId);
			return { select: [] };
		}

		if (this.removedAsset.url) {
			URL.revokeObjectURL(this.removedAsset.url);
		}
		// thumbnailUrl is a data: URL — nothing to revoke; the revoke call on
		// it was a silent no-op. Keeping the value lets undo restore it as-is.

		videoCache.clearVideo({ mediaId: this.assetId });

		editor.media.setAssets({
			assets: assets.filter((media) => media.id !== this.assetId),
		});

		// Remove the asset's elements by mutating tracks directly. The old
		// `editor.timeline.deleteElements` re-entered CommandManager.execute,
		// which pushed the nested delete as its own history entry (N+1 undo
		// steps for one user action) and cleared the redo stack mid-redo.
		const updatedTracks = removeAssetElementsFromTracks({
			tracks: this.savedTracks,
			assetId: this.assetId,
		});
		editor.timeline.updateTracks(updatedTracks);

		storageService
			.deleteMediaAsset({ projectId: this.projectId, id: this.assetId })
			.catch((error) => {
				console.error("Failed to delete media item:", error);
			});

		editor.selection.setSelectedElements({ elements: [] });

		return { select: [] };
	}

	undo(): void {
		const editor = EditorCore.getInstance();

		if (this.savedAssets && this.removedAsset) {
			// `url` is a revoked object URL — re-mint it. `thumbnailUrl` is a
			// data: URL (see lib/media/processing.ts renderToThumbnailDataUrl),
			// which is self-contained and survives the (no-op) revoke untouched,
			// so restoring the saved value is enough.
			const restoredAsset: MediaAsset = {
				...this.removedAsset,
				url: URL.createObjectURL(this.removedAsset.file),
			};
			this.restoredObjectUrls = [restoredAsset.url];

			editor.media.setAssets({
				assets: this.savedAssets.map((a) =>
					a.id === this.assetId ? restoredAsset : a,
				),
			});

			storageService
				.saveMediaAsset({
					projectId: this.projectId,
					mediaAsset: restoredAsset,
				})
				.catch((error) => {
					console.error("Failed to restore media item on undo:", error);
				});
		}

		if (this.savedTracks) {
			editor.timeline.updateTracks(this.savedTracks);
		}
	}

	redo(): CommandResult | undefined {
		// Revoke the object urls undo() minted before re-executing, otherwise
		// every undo→redo cycle leaked two URLs.
		for (const url of this.restoredObjectUrls) {
			URL.revokeObjectURL(url);
		}
		this.restoredObjectUrls = [];
		return this.execute();
	}
}

/** Immutable removal of every element referencing `assetId`, all groups. */
function removeAssetElementsFromTracks({
	tracks,
	assetId,
}: {
	tracks: SceneTracks;
	assetId: string;
}): SceneTracks {
	const withoutAsset = <TTrack extends TimelineTrack>(
		track: TTrack,
	): TTrack => ({
		...track,
		elements: track.elements.filter(
			(element) => !(hasMediaId(element) && element.mediaId === assetId),
		),
	});

	return {
		...tracks,
		overlay: tracks.overlay.map(withoutAsset),
		main: withoutAsset(tracks.main),
		overlayAfter: tracks.overlayAfter.map(withoutAsset),
		audio: tracks.audio.map(withoutAsset),
	};
}
