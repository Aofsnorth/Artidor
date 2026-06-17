"use client";

/**
 * Editor UI store — small, persisted bits of editor chrome state that aren't
 * part of the document model: focus mode (hide chrome for distraction-free
 * editing), the command-palette open flag, and floating panel positions.
 *
 * Floating panel state persists so a user's window layout is restored on
 * reload. Each main panel (assets, preview, properties, timeline) can be
 * detached into a floating window; `floatingPanels[id] === null` means the
 * panel is docked in its grid slot.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FloatablePanelId = "assets" | "preview" | "properties" | "timeline";

export interface FloatingPanelState {
	x: number;
	y: number;
	width: number;
	height: number;
}

const FLOATING_PANEL_MIN_SIZE = { width: 280, height: 220 };

const DEFAULT_FLOATING_PANELS: Record<FloatablePanelId, FloatingPanelState> = {
	assets: { x: 80, y: 80, width: 360, height: 600 },
	preview: { x: 200, y: 100, width: 720, height: 480 },
	properties: { x: 360, y: 120, width: 320, height: 600 },
	timeline: { x: 100, y: 320, width: 980, height: 320 },
};

interface EditorUIStore {
	/** When true, non-essential editor chrome is collapsed. Persisted. */
	focusMode: boolean;
	toggleFocusMode: () => void;
	setFocusMode: (value: boolean) => void;

	/** Command palette visibility. Transient (not persisted). */
	commandPaletteOpen: boolean;
	setCommandPaletteOpen: (value: boolean) => void;

	/**
	 * Per-panel floating state. `null` means the panel is docked in the
	 * grid layout. When set, the panel renders in a draggable floating
	 * window and the dock slot shows a placeholder.
	 */
	floatingPanels: Record<FloatablePanelId, FloatingPanelState | null>;
	popOutPanel: (id: FloatablePanelId) => void;
	dockPanel: (id: FloatablePanelId) => void;
	setFloatingPanelPosition: ({
		id,
		position,
	}: {
		id: FloatablePanelId;
		position: FloatingPanelState;
	}) => void;
}

function clampFloatingPosition({
	position,
}: {
	position: FloatingPanelState;
}): FloatingPanelState {
	if (typeof window === "undefined") return position;
	const maxX = Math.max(0, window.innerWidth - FLOATING_PANEL_MIN_SIZE.width);
	const maxY = Math.max(0, window.innerHeight - FLOATING_PANEL_MIN_SIZE.height);
	return {
		x: Math.max(0, Math.min(maxX, position.x)),
		y: Math.max(0, Math.min(maxY, position.y)),
		width: Math.max(
			FLOATING_PANEL_MIN_SIZE.width,
			Math.min(window.innerWidth, position.width),
		),
		height: Math.max(
			FLOATING_PANEL_MIN_SIZE.height,
			Math.min(window.innerHeight, position.height),
		),
	};
}

export const useEditorUIStore = create<EditorUIStore>()(
	persist(
		(set, get) => ({
			focusMode: false,
			toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
			setFocusMode: (value) => set({ focusMode: value }),

			commandPaletteOpen: false,
			setCommandPaletteOpen: (value) => set({ commandPaletteOpen: value }),

			floatingPanels: {
				assets: null,
				preview: null,
				properties: null,
				timeline: null,
			},
			popOutPanel: (id) => {
				const current = get().floatingPanels[id];
				// Don't pop out a panel that's already floating
				if (current) return;
				set((state) => ({
					floatingPanels: {
						...state.floatingPanels,
						[id]: clampFloatingPosition({
							position: DEFAULT_FLOATING_PANELS[id],
						}),
					},
				}));
			},
			dockPanel: (id) => {
				const current = get().floatingPanels[id];
				if (!current) return;
				set((state) => ({
					floatingPanels: {
						...state.floatingPanels,
						[id]: null,
					},
				}));
			},
			setFloatingPanelPosition: ({ id, position }) => {
				set((state) => ({
					floatingPanels: {
						...state.floatingPanels,
						[id]: clampFloatingPosition({ position }),
					},
				}));
			},
		}),
		{
			name: "editor-ui",
			partialize: (state) => ({
				focusMode: state.focusMode,
				floatingPanels: state.floatingPanels,
			}),
		},
	),
);
