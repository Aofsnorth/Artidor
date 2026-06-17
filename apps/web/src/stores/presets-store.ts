import { create } from "zustand";
import {
	deletePreset as deletePresetFromStorage,
	loadAllPresets,
	renamePreset as renamePresetInStorage,
	savePreset as savePresetToStorage,
} from "@/lib/presets/storage";
import type { UserPreset } from "@/lib/presets/types";

interface PresetsStore {
	presets: UserPreset[];
	isLoaded: boolean;
	isLoading: boolean;
	loadPresets: () => Promise<void>;
	addPreset: (preset: UserPreset) => Promise<void>;
	removePreset: (id: string) => Promise<void>;
	renamePreset: (id: string, name: string) => Promise<void>;
}

export const usePresetsStore = create<PresetsStore>((set, get) => ({
	presets: [],
	isLoaded: false,
	isLoading: false,

	loadPresets: async () => {
		if (get().isLoading) return;
		set({ isLoading: true });
		try {
			const presets = await loadAllPresets();
			set({ presets, isLoaded: true });
		} finally {
			set({ isLoading: false });
		}
	},

	addPreset: async (preset) => {
		await savePresetToStorage({ preset });
		// Newest first, matching the storage sort order.
		set((state) => ({ presets: [preset, ...state.presets] }));
	},

	removePreset: async (id) => {
		await deletePresetFromStorage({ id });
		set((state) => ({
			presets: state.presets.filter((preset) => preset.id !== id),
		}));
	},

	renamePreset: async (id, name) => {
		const updated = await renamePresetInStorage({ id, name });
		if (!updated) return;
		set((state) => ({
			presets: state.presets.map((preset) =>
				preset.id === id ? updated : preset,
			),
		}));
	},
}));
