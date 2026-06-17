import { create } from "zustand";

export type ToolMode = "select" | "draw";

interface ToolModeState {
	/**
	 * Current tool mode. When "draw", the preview interaction overlay
	 * delegates pointer events to the freehand draw handler instead of
	 * the usual select/drag interaction.
	 */
	toolMode: ToolMode;
	setToolMode: (mode: ToolMode) => void;
	toggleToolMode: () => void;
}

export const useToolModeStore = create<ToolModeState>()((set) => ({
	toolMode: "select",
	setToolMode: (mode) => set({ toolMode: mode }),
	toggleToolMode: () =>
		set((state) => ({
			toolMode: state.toolMode === "select" ? "draw" : "select",
		})),
}));
