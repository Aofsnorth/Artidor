import { create } from "zustand";
import { persist } from "zustand/middleware";
import { browserStorage } from "@/stores/browser-storage";
import { PANEL_CONFIG } from "@/lib/panels/layout";

export interface PanelSizes {
	tools: number;
	preview: number;
	properties: number;
	mainContent: number;
	timeline: number;
}

export type PanelId = keyof PanelSizes;

export interface LayoutPreset {
	id: string;
	name: string;
	sizes: PanelSizes;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
	{
		id: "default",
		name: "Default",
		sizes: {
			tools: 28,
			preview: 47,
			properties: 25,
			mainContent: 64,
			timeline: 36,
		},
	},
	{
		id: "compact",
		name: "Compact",
		sizes: {
			tools: 20,
			preview: 55,
			properties: 25,
			mainContent: 70,
			timeline: 30,
		},
	},
	{
		id: "color-grading",
		name: "Color Grading",
		sizes: {
			tools: 15,
			preview: 50,
			properties: 35,
			mainContent: 60,
			timeline: 40,
		},
	},
	{
		id: "effects-focus",
		name: "Effects Focus",
		sizes: {
			tools: 35,
			preview: 40,
			properties: 25,
			mainContent: 64,
			timeline: 36,
		},
	},
	{
		id: "audio-mix",
		name: "Audio Mix",
		sizes: {
			tools: 20,
			preview: 40,
			properties: 20,
			mainContent: 45,
			timeline: 55,
		},
	},
	{
		id: "fullscreen-preview",
		name: "Fullscreen Preview",
		sizes: {
			tools: 15,
			preview: 65,
			properties: 20,
			mainContent: 80,
			timeline: 20,
		},
	},
	{
		id: "minimal-tools",
		name: "Minimal Tools",
		sizes: {
			tools: 12,
			preview: 58,
			properties: 30,
			mainContent: 70,
			timeline: 30,
		},
	},
	{
		id: "timeline-focus",
		name: "Timeline Focus",
		sizes: {
			tools: 18,
			preview: 42,
			properties: 25,
			mainContent: 45,
			timeline: 55,
		},
	},
];

/**
 * Bounds for the user-resizable track labels column. The lower bound
 * keeps the track name readable; the upper bound prevents the labels
 * column from consuming more than a third of the typical editor width
 * (which would starve the actual timeline tracks).
 */
export const TRACK_LABELS_WIDTH_MIN_PX = 140;
export const TRACK_LABELS_WIDTH_MAX_PX = 480;
export const TRACK_LABELS_WIDTH_DEFAULT_PX = 230;

interface PanelState {
	panels: PanelSizes;
	activePreset: string | null;
	setPanel: (panel: PanelId, size: number) => void;
	setPanels: (sizes: Partial<PanelSizes>) => void;
	resetPanels: () => void;
	setPreset: (presetId: string) => void;

	/* Track labels column width (the leftmost column inside the timeline
	   that shows track name, mute/lock toggles, etc.). */
	trackLabelsWidth: number;
	setTrackLabelsWidth: (widthPx: number) => void;
	resetTrackLabelsWidth: () => void;
}

export const usePanelStore = create<PanelState>()(
	persist(
		(set) => ({
			...PANEL_CONFIG,
			activePreset: "default" as string | null,
			setPanel: (panel, size) =>
				set((state) => ({
					panels: {
						...state.panels,
						[panel]: size,
					},
					activePreset: null,
				})),
			setPanels: (sizes) =>
				set((state) => ({
					panels: {
						...state.panels,
						...sizes,
					},
					activePreset: null,
				})),
			resetPanels: () => set({ ...PANEL_CONFIG, activePreset: "default" }),
			setPreset: (presetId) => {
				const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
				if (preset) {
					set({ panels: { ...preset.sizes }, activePreset: presetId });
				}
			},

			trackLabelsWidth: TRACK_LABELS_WIDTH_DEFAULT_PX,
			setTrackLabelsWidth: (widthPx) => {
				// Clamp at the store so a stray drag can't collapse the
				// column to 0 or push it past the editor.
				const clamped = Math.max(
					TRACK_LABELS_WIDTH_MIN_PX,
					Math.min(TRACK_LABELS_WIDTH_MAX_PX, Math.round(widthPx)),
				);
				set({ trackLabelsWidth: clamped });
			},
			resetTrackLabelsWidth: () =>
				set({ trackLabelsWidth: TRACK_LABELS_WIDTH_DEFAULT_PX }),
		}),
		{
			name: "panel-sizes",
			storage: browserStorage,
			version: 6,
			migrate: (persistedState, version) => {
				// react-resizable-panels v2→v4 changed size units: bare numbers
				// are now pixels, not percentages. During the broken period
				// (v5), onLayoutChanged persisted corrupted pixel-based values.
				// Bumping to version 6 resets layout storage so users get the
				// correct percentage-based defaults again.
				if (version < 6) return { panels: { ...PANEL_CONFIG.panels } };

				const state = persistedState as
					| {
							panels?: Partial<PanelSizes> | null;
							toolsPanel?: number;
							previewPanel?: number;
							propertiesPanel?: number;
							mainContent?: number;
							timeline?: number;
							tools?: number;
							preview?: number;
							properties?: number;
					  }
					| undefined
					| null;

				if (!state) return { panels: { ...PANEL_CONFIG.panels } };

				if (state.panels && typeof state.panels === "object") {
					return {
						panels: {
							...PANEL_CONFIG.panels,
							...state.panels,
						},
					};
				}

				return {
					panels: {
						tools: state.tools ?? state.toolsPanel ?? PANEL_CONFIG.panels.tools,
						preview:
							state.preview ??
							state.previewPanel ??
							PANEL_CONFIG.panels.preview,
						properties:
							state.properties ??
							state.propertiesPanel ??
							PANEL_CONFIG.panels.properties,
						mainContent: state.mainContent ?? PANEL_CONFIG.panels.mainContent,
						timeline: state.timeline ?? PANEL_CONFIG.panels.timeline,
					},
				};
			},
			partialize: (state) => ({
				panels: state.panels,
				activePreset: state.activePreset,
			}),
		},
	),
);
