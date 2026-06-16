"use client";

/**
 * Editor UI store — small, persisted bits of editor chrome state that aren't
 * part of the document model: focus mode (hide chrome for distraction-free
 * editing) and the command-palette open flag.
 *
 * Focus mode persists (a preference); the command palette does not (it's
 * transient per session).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EditorUIStore {
	/** When true, non-essential editor chrome is collapsed. Persisted. */
	focusMode: boolean;
	toggleFocusMode: () => void;
	setFocusMode: (value: boolean) => void;

	/** Command palette visibility. Transient (not persisted). */
	commandPaletteOpen: boolean;
	setCommandPaletteOpen: (value: boolean) => void;
}

export const useEditorUIStore = create<EditorUIStore>()(
	persist(
		(set) => ({
			focusMode: false,
			toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
			setFocusMode: (value) => set({ focusMode: value }),

			commandPaletteOpen: false,
			setCommandPaletteOpen: (value) => set({ commandPaletteOpen: value }),
		}),
		{
			name: "editor-ui",
			partialize: (state) => ({ focusMode: state.focusMode }),
		},
	),
);
