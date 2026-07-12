import { create } from "zustand";

interface AssetPreviewState {
	/** ID of the media asset currently being previewed in the canvas. null when idle. */
	previewAssetId: string | null;
	/** Active inline audio preview id (e.g. sound card play button). null when idle. */
	audioPreviewId: string | null;
	/** Active inline audio preview element. Stored here so any new preview can stop the old one. */
	audioPreviewElement: HTMLAudioElement | null;
	/** Set an asset to preview. Passing the same ID again clears the preview (toggle). Stops any inline audio preview. */
	setPreviewAsset: (mediaId: string) => void;
	/** Clear the current preview. */
	clearPreview: () => void;
	/** Start an inline audio preview, killing any other active preview first. */
	playAudioPreview: ({
		id,
		url,
	}: {
		id: string;
		url: string | undefined | null;
	}) => void;
	/** Stop the inline audio preview. */
	stopAudioPreview: () => void;
}

/**
 * Lightweight store for the "click-to-preview" feature in the assets panel.
 * When the user clicks (not drags) a media card, the media is previewed
 * on the canvas via an overlay. Clicking the same asset again, or clicking
 * a different one, toggles / replaces the preview.
 */
export const useAssetPreviewStore = create<AssetPreviewState>()((set) => ({
	previewAssetId: null,
	audioPreviewId: null,
	audioPreviewElement: null,
	setPreviewAsset: (mediaId) =>
		set((state) => {
			state.audioPreviewElement?.pause();
			return {
				previewAssetId: state.previewAssetId === mediaId ? null : mediaId,
				audioPreviewId: null,
				audioPreviewElement: null,
			};
		}),
	clearPreview: () =>
		set((state) => {
			state.audioPreviewElement?.pause();
			return {
				previewAssetId: null,
				audioPreviewId: null,
				audioPreviewElement: null,
			};
		}),
	playAudioPreview: ({ id, url }) =>
		set((state) => {
			state.audioPreviewElement?.pause();
			if (state.audioPreviewId === id) {
				return {
					previewAssetId: null,
					audioPreviewId: null,
					audioPreviewElement: null,
				};
			}
			if (!url) {
				return state;
			}
			const audio = new Audio(url);
			audio.play().catch(() => {});
			audio.addEventListener("ended", () => {
				set({ audioPreviewId: null, audioPreviewElement: null });
			});
			audio.addEventListener("error", () => {
				set({ audioPreviewId: null, audioPreviewElement: null });
			});
			return {
				previewAssetId: null,
				audioPreviewId: id,
				audioPreviewElement: audio,
			};
		}),
	stopAudioPreview: () =>
		set((state) => {
			state.audioPreviewElement?.pause();
			return {
				audioPreviewId: null,
				audioPreviewElement: null,
			};
		}),
}));
