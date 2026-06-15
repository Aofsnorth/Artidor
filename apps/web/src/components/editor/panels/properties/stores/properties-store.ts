import { create } from "zustand";

/**
 * Three display modes for the media thumbnail card at the top of the
 * inspector. Stored as a literal union so the dropdown items can be
 * typed and exhaustive-checked.
 *
 *  - "default": full size (48px thumb + name + type badge + actions)
 *  - "compact": small thumb (28px), name only, no type badge
 *  - "hidden":  no thumb, just the name, takes a single row
 */
export type MediaSummarySize = "default" | "compact" | "hidden";

interface PropertiesState {
	activeTabPerType: Record<string, string>;
	setActiveTab: (elementType: string, tabId: string) => void;
	isTransformScaleLocked: boolean;
	setTransformScaleLocked: (locked: boolean) => void;
	/**
	 * Per-media-asset favourite state. Keyed by `media.id` so the star
	 * is stable across selection (favouriting a video while it's
	 * selected will still show as favourited the next time you pick the
	 * same clip). The set is held in component memory, not persisted —
	 * favourites here are a session-scoped workflow hint, not user
	 * library state.
	 */
	favoriteMediaIds: Set<string>;
	toggleMediaFavorite: (mediaId: string) => void;
	mediaSummarySize: MediaSummarySize;
	setMediaSummarySize: (size: MediaSummarySize) => void;
}

export const usePropertiesStore = create<PropertiesState>()((set) => ({
	activeTabPerType: {},
	setActiveTab: (elementType, tabId) =>
		set((state) => ({
			activeTabPerType: { ...state.activeTabPerType, [elementType]: tabId },
		})),
	isTransformScaleLocked: false,
	setTransformScaleLocked: (locked) => set({ isTransformScaleLocked: locked }),

	favoriteMediaIds: new Set<string>(),
	toggleMediaFavorite: (mediaId) =>
		set((state) => {
			// Build a new Set so React/Zustand subscribers see a fresh
			// reference (mutating the existing set would not trigger a
			// re-render in some selectors).
			const next = new Set(state.favoriteMediaIds);
			if (next.has(mediaId)) {
				next.delete(mediaId);
			} else {
				next.add(mediaId);
			}
			return { favoriteMediaIds: next };
		}),

	mediaSummarySize: "default",
	setMediaSummarySize: (size) => set({ mediaSummarySize: size }),
}));
