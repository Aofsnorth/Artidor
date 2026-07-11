import { create } from "zustand";
import { createStore } from "zustand/vanilla";

export type TimelineTool = "select" | "split";

type TimelineToolState = {
	tool: TimelineTool;
	setTool: (tool: TimelineTool) => void;
	toggleSplitTool: () => void;
};

export function createTimelineToolStore() {
	return createStore<TimelineToolState>((set, get) => ({
		tool: "select",
		setTool: (tool) => set({ tool }),
		toggleSplitTool: () =>
			set({ tool: get().tool === "split" ? "select" : "split" }),
	}));
}

export const useTimelineToolStore = create<TimelineToolState>((set, get) => ({
	tool: "select",
	setTool: (tool) => set({ tool }),
	toggleSplitTool: () =>
		set({ tool: get().tool === "split" ? "select" : "split" }),
}));
