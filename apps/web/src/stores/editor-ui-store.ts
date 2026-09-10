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
import { browserStorage } from "@/stores/browser-storage";
import { createThrottledStorage } from "@/stores/throttled-storage";

export type FloatablePanelId =
	| "assets"
	| "preview"
	| "properties"
	| "timeline"
	// Sub-views of the Assets panel — each can be popped out
	// independently of the others so a power user can e.g. keep the
	// Effects browser on a second monitor while still using the main
	// asset panel on the primary.
	| "effects"
	| "transitions"
	| "adjust"
	| "plugins";

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
	// Sub-view defaults — offset so multiple popouts don't stack on
	// top of each other on first open.
	effects: { x: 120, y: 140, width: 480, height: 560 },
	transitions: { x: 160, y: 180, width: 480, height: 560 },
	adjust: { x: 200, y: 220, width: 480, height: 560 },
	plugins: { x: 240, y: 260, width: 480, height: 560 },
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

function sanitizeFloatingNumber({
	value,
	fallback,
}: {
	value: number;
	fallback: number;
}): number {
	return Number.isFinite(value) ? value : fallback;
}

function clampFloatingPosition({
	position,
	panelId,
}: {
	position: FloatingPanelState;
	panelId?: FloatablePanelId;
}): FloatingPanelState {
	// NaN/Infinity positions (e.g. a torn drag event) would otherwise sail
	// through Math.min/Math.max as NaN, persist as JSON null, and rehydrate
	// into a broken layout. Sanitize to that panel's default first.
	const fallback = panelId ? DEFAULT_FLOATING_PANELS[panelId] : undefined;
	const sane: FloatingPanelState = {
		x: sanitizeFloatingNumber({
			value: position.x,
			fallback: fallback?.x ?? 0,
		}),
		y: sanitizeFloatingNumber({
			value: position.y,
			fallback: fallback?.y ?? 0,
		}),
		width: sanitizeFloatingNumber({
			value: position.width,
			fallback: fallback?.width ?? FLOATING_PANEL_MIN_SIZE.width,
		}),
		height: sanitizeFloatingNumber({
			value: position.height,
			fallback: fallback?.height ?? FLOATING_PANEL_MIN_SIZE.height,
		}),
	};
	if (typeof window === "undefined") return sane;
	const maxX = Math.max(0, window.innerWidth - FLOATING_PANEL_MIN_SIZE.width);
	const maxY = Math.max(0, window.innerHeight - FLOATING_PANEL_MIN_SIZE.height);
	return {
		x: Math.max(0, Math.min(maxX, sane.x)),
		y: Math.max(0, Math.min(maxY, sane.y)),
		width: Math.max(
			FLOATING_PANEL_MIN_SIZE.width,
			Math.min(window.innerWidth, sane.width),
		),
		height: Math.max(
			FLOATING_PANEL_MIN_SIZE.height,
			Math.min(window.innerHeight, sane.height),
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
				effects: null,
				transitions: null,
				adjust: null,
				plugins: null,
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
							panelId: id,
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
						[id]: clampFloatingPosition({ position, panelId: id }),
					},
				}));
			},
		}),
		{
			name: "editor-ui",
			// Throttled (250ms trailing): floating-panel drags fire
			// `setFloatingPanelPosition` per mousemove (60+/sec), and each
			// `set` re-serializes + writes localStorage synchronously on the
			// main thread. Coalescing the burst keeps the final drop position
			// (the only value that matters) while skipping ~60 writes/sec
			// mid-drag. Behavior unchanged: same key, same partialize, same
			// rehydrate; only write timing. Durability tradeoff (tab closed
			// mid-drag can lose ≤250ms of position) accepted for UI layout.
			storage: createThrottledStorage({
				storage: browserStorage,
				waitMs: 250,
			}),
			partialize: (state) => ({
				focusMode: state.focusMode,
				floatingPanels: state.floatingPanels,
			}),
		},
	),
);
