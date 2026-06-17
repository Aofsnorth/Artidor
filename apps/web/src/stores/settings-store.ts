import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Application-wide settings, persisted to localStorage. Keeps the
 * shape small and flat — no nested objects, no computed values.
 */
interface SettingsState {
	/** Skip the "type DELETE to confirm" gate in the delete-project dialog. */
	skipDeleteConfirm: boolean;
	setSkipDeleteConfirm: (value: boolean) => void;

	/** Default project frame rate. Persisted so new projects use the same value. */
	defaultFps: number;
	setDefaultFps: (fps: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			skipDeleteConfirm: false,
			setSkipDeleteConfirm: (value) => set({ skipDeleteConfirm: value }),

			defaultFps: 30,
			setDefaultFps: (fps) => set({ defaultFps: fps }),
		}),
		{
			name: "app-settings",
		},
	),
);
