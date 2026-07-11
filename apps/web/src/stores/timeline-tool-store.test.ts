import { expect, test } from "bun:test";
import { createTimelineToolStore } from "./timeline-tool-store";

test("split tool toggles back to select", () => {
	const store = createTimelineToolStore();
	store.getState().setTool("split");
	expect(store.getState().tool).toBe("split");
	store.getState().toggleSplitTool();
	expect(store.getState().tool).toBe("select");
});

test("escape/select resets split tool", () => {
	const store = createTimelineToolStore();
	store.getState().setTool("split");
	store.getState().setTool("select");
	expect(store.getState().tool).toBe("select");
});
