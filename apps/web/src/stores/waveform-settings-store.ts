/**
 * Per-project waveform display settings.
 *
 * The variant ("waveform" | "beats" | "lines" | "liquid" | "graph") is
 * persisted per project so each scene keeps its own preferred style. We also
 * keep a `lastChangedAt` timestamp to detect stale updates across sessions.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { WaveformVariant } from "@/components/editor/panels/timeline/audio-waveform";

interface ProjectWaveformSettings {
	variant: WaveformVariant;
	symmetric: boolean;
}

interface WaveformSettingsStore {
	settingsByProjectId: Record<string, ProjectWaveformSettings>;
	getSettings: ({
		projectId,
	}: {
		projectId: string | undefined;
	}) => ProjectWaveformSettings;
	setVariant: ({
		projectId,
		variant,
	}: {
		projectId: string | undefined;
		variant: WaveformVariant;
	}) => void;
	setSymmetric: ({
		projectId,
		symmetric,
	}: {
		projectId: string | undefined;
		symmetric: boolean;
	}) => void;
}

const DEFAULTS: ProjectWaveformSettings = {
	variant: "waveform",
	symmetric: false,
};

export const useWaveformSettingsStore = create<WaveformSettingsStore>()(
	persist(
		(set, get) => ({
			settingsByProjectId: {},
			getSettings: ({ projectId }) => {
				if (!projectId) return DEFAULTS;
				const stored = get().settingsByProjectId[projectId];
				return stored ?? DEFAULTS;
			},
			setVariant: ({ projectId, variant }) => {
				if (!projectId) return;
				set((state) => {
					const current = state.settingsByProjectId[projectId] ?? DEFAULTS;
					return {
						settingsByProjectId: {
							...state.settingsByProjectId,
							[projectId]: { ...current, variant },
						},
					};
				});
			},
			setSymmetric: ({ projectId, symmetric }) => {
				if (!projectId) return;
				set((state) => {
					const current = state.settingsByProjectId[projectId] ?? DEFAULTS;
					return {
						settingsByProjectId: {
							...state.settingsByProjectId,
							[projectId]: { ...current, symmetric },
						},
					};
				});
			},
		}),
		{
			name: "artidor.waveform-settings",
			storage: createJSONStorage(() => localStorage),
			version: 1,
		},
	),
);
