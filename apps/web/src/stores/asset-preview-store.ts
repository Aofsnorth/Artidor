import { create } from "zustand";

interface AssetPreviewState {
	/** ID of the media asset currently being previewed in the canvas. null when idle. */
	previewAssetId: string | null;
	/** Set an asset to preview. Passing the same ID again clears the preview (toggle). */
	setPreviewAsset: (mediaId: string) => void;
	/** Clear the current preview. */
	clearPreview: () => void;
}

/**
 * Lightweight store for the "click-to-preview" feature in the assets panel.
 * When the user clicks (not drags) a media card, the media is previewed
 * on the canvas via an overlay. Clicking the same asset again, or clicking
 * a different one, toggles / replaces the preview.
 */
export const useAssetPreviewStore = create<AssetPreviewState>()((set) => ({
	previewAssetId: null,
	setPreviewAsset: (mediaId) =>
		set((state) => ({
			previewAssetId:
				state.previewAssetId === mediaId ? null : mediaId,
		})),
	clearPreview: () => set({ previewAssetId: null }),
}));
