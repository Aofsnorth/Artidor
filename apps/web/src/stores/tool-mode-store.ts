import { create } from "zustand";

export type ToolMode = "select" | "draw" | "vector";

export interface DrawToolConfig {
	/** Stroke colour for the freehand / vector paths the user creates. */
	stroke: string;
	/** Stroke width in source coords (the same unit the freehand
	 *  graphic uses internally — 0..64). */
	strokeWidth: number;
	/** Brush opacity, 0..1. Applied as the stroke alpha on commit and
	 *  on the live preview overlay. */
	opacity: number;
	/** Whether new paths should be closed (loop back to the start). */
	closed: boolean;
	/** Optional fill colour for closed paths. "transparent" means no fill. */
	fill: string;
}

const DEFAULT_DRAW_CONFIG: DrawToolConfig = {
	stroke: "#ffffff",
	strokeWidth: 4,
	opacity: 1,
	closed: false,
	fill: "transparent",
};

interface ToolModeState {
	/**
	 * Current tool mode. When "draw", the preview interaction overlay
	 * delegates pointer events to the freehand draw handler instead of
	 * the usual select/drag interaction. When "vector", the pen-tool
	 * handler takes over and builds a bezier path from sequential clicks.
	 */
	toolMode: ToolMode;
	setToolMode: (mode: ToolMode) => void;
	toggleToolMode: () => void;

	/** Live config for the freehand + vector tools. Read by the preview
	 *  overlay so the in-progress stroke matches the shape that will be
	 *  committed on finish. */
	drawConfig: DrawToolConfig;
	setDrawConfig: (partial: Partial<DrawToolConfig>) => void;
	resetDrawConfig: () => void;
}

export const useToolModeStore = create<ToolModeState>()((set) => ({
	toolMode: "select",
	setToolMode: (mode) => set({ toolMode: mode }),
	toggleToolMode: () =>
		set((state) => ({
			toolMode: state.toolMode === "select" ? "draw" : "select",
		})),
	drawConfig: { ...DEFAULT_DRAW_CONFIG },
	setDrawConfig: (partial) =>
		set((state) => ({
			drawConfig: { ...state.drawConfig, ...partial },
		})),
	resetDrawConfig: () => set({ drawConfig: { ...DEFAULT_DRAW_CONFIG } }),
}));
