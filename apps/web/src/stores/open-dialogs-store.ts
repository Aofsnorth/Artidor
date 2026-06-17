"use client";

import { create } from "zustand";

/**
 * Single Zustand store for the "ephemeral UI dialogs" that aren't
 * tied to any particular editor state — templates picker, teleprompter,
 * future "open recent" dialog, etc. The store only tracks open/close
 * state; each dialog owns its own internal state.
 *
 * Why a dedicated store instead of just useState in each dialog?
 *  - Toolbar buttons (and shortcut handlers) can toggle the dialogs
 *    without prop-drilling callbacks all the way down to the action
 *    surface.
 *  - Future "close all dialogs" semantics (e.g. on project switch) can
 *    just call `closeAll()` here instead of reaching into a dozen
 *    component-local states.
 */
type DialogKey = "teleprompter" | "templates" | "settings";

interface OpenDialogsState {
	open: Partial<Record<DialogKey, boolean>>;
	setOpen: (key: DialogKey, open: boolean) => void;
	toggle: (key: DialogKey) => void;
	closeAll: () => void;
}

export const useOpenDialogsStore = create<OpenDialogsState>((set) => ({
	open: {},
	setOpen: (key, open) =>
		set((state) => ({ open: { ...state.open, [key]: open } })),
	toggle: (key) =>
		set((state) => ({ open: { ...state.open, [key]: !state.open[key] } })),
	closeAll: () => set({ open: {} }),
}));
