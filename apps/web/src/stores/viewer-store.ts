"use client";

/**
 * Viewer (read-only share) store.
 *
 * When a project is opened through a capability share link
 * (`/editor/[id]?share=<shareId>`), the editor runs in read-only viewer mode:
 * the actual enforcement lives in `CommandManager.readOnly` (every mutating
 * command is rejected there), and this store is the UI-facing mirror so chrome
 * can hide edit affordances and show a "read-only" badge.
 *
 * This is intentionally NOT persisted — viewer mode is derived fresh from the
 * URL on every editor mount so it can never "stick" to an owned project after
 * the shared tab is reused for navigation.
 */

import { create } from "zustand";

interface ViewerStore {
	/** True when the current editor session is a read-only shared view. */
	isViewer: boolean;
	/** The opaque share id the viewer was opened with, if any. */
	shareId: string | null;
	setViewer: (params: { isViewer: boolean; shareId: string | null }) => void;
}

export const useViewerStore = create<ViewerStore>((set) => ({
	isViewer: false,
	shareId: null,
	setViewer: ({ isViewer, shareId }) => set({ isViewer, shareId }),
}));
