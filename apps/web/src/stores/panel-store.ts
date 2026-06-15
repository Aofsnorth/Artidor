import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PANEL_CONFIG } from "@/lib/panels/layout";

export interface PanelSizes {
	tools: number;
	preview: number;
	properties: number;
	mainContent: number;
	timeline: number;
}

export type PanelId = keyof PanelSizes;

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
	setPanel: (panel: PanelId, size: number) => void;
	setPanels: (sizes: Partial<PanelSizes>) => void;
	resetPanels: () => void;

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
			setPanel: (panel, size) =>
				set((state) => ({
					panels: {
						...state.panels,
						[panel]: size,
					},
				})),
			setPanels: (sizes) =>
				set((state) => ({
					panels: {
						...state.panels,
						...sizes,
					},
				})),
			resetPanels: () => set({ ...PANEL_CONFIG }),

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
			version: 3,
			migrate: (persistedState, version) => {
				if (version < 3) return { panels: { ...PANEL_CONFIG.panels } };

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
			}),
		},
	),
);
