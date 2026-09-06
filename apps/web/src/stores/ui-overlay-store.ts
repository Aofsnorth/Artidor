/** Session-only visibility and display modes for the editor's auxiliary panels. */

import { create } from "zustand";

export type AudioMeterMode = "meter" | "visualizer";

interface UiOverlayStore {
	isAudioVisualizerOpen: boolean;
	setAudioVisualizerOpen: (open: boolean) => void;
	toggleAudioVisualizer: () => void;
	audioMeterMode: AudioMeterMode;
	toggleAudioMeterMode: () => void;
	isAdvancedViewersOpen: boolean;
	setAdvancedViewersOpen: (open: boolean) => void;
	toggleAdvancedViewers: () => void;
}

export const useUiOverlayStore = create<UiOverlayStore>()((set) => ({
	isAudioVisualizerOpen: true,
	setAudioVisualizerOpen: (open) => set({ isAudioVisualizerOpen: open }),
	toggleAudioVisualizer: () =>
		set((state) => ({ isAudioVisualizerOpen: !state.isAudioVisualizerOpen })),
	audioMeterMode: "meter",
	toggleAudioMeterMode: () =>
		set((state) => ({
			audioMeterMode: state.audioMeterMode === "meter" ? "visualizer" : "meter",
		})),
	isAdvancedViewersOpen: false,
	setAdvancedViewersOpen: (open) => set({ isAdvancedViewersOpen: open }),
	toggleAdvancedViewers: () =>
		set((state) => ({ isAdvancedViewersOpen: !state.isAdvancedViewersOpen })),
}));
