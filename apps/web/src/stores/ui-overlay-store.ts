/**
 * Lightweight UI overlay state — single-purpose store for one-off
 * editor panels that aren't tied to a specific feature area
 * (assets/properties/timeline).
 *
 * Right now this just holds the audio-visualizer toggle, but new
 * overlays (e.g. a "minimap" of the timeline) can plug in here too
 * without polluting the existing panel / timeline stores.
 */

import { create } from "zustand";

interface UiOverlayStore {
	isAudioVisualizerOpen: boolean;
	setAudioVisualizerOpen: (open: boolean) => void;
	toggleAudioVisualizer: () => void;
}

export const useUiOverlayStore = create<UiOverlayStore>()((set) => ({
	isAudioVisualizerOpen: false,
	setAudioVisualizerOpen: (open) => set({ isAudioVisualizerOpen: open }),
	toggleAudioVisualizer: () =>
		set((state) => ({ isAudioVisualizerOpen: !state.isAudioVisualizerOpen })),
}));
