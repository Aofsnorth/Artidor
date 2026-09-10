import { describe, expect, test } from "bun:test";
import { useEditorUIStore } from "@/stores/editor-ui-store";

/**
 * Panels bughunt regressions (editor-ui-store clear/sanitize logic):
 * NaN/Infinity floating-panel positions used to sail through
 * Math.min/Math.max as NaN, persist as JSON null, and rehydrate into a broken
 * layout. They must now sanitize to finite values.
 */
describe("editor-ui floating position sanitize", () => {
	test("NaN position sanitizes to finite values", () => {
		const { setFloatingPanelPosition, floatingPanels } =
			useEditorUIStore.getState();
		setFloatingPanelPosition({
			id: "properties",
			position: { x: NaN, y: NaN, width: NaN, height: NaN },
		});
		const next = useEditorUIStore.getState().floatingPanels.properties;
		expect(next).not.toBeNull();
		expect(Number.isFinite(next?.x)).toBe(true);
		expect(Number.isFinite(next?.y)).toBe(true);
		expect(Number.isFinite(next?.width)).toBe(true);
		expect(Number.isFinite(next?.height)).toBe(true);
		// Restore docked state so the suite leaves no residue.
		useEditorUIStore.getState().dockPanel("properties");
		expect(useEditorUIStore.getState().floatingPanels.properties).toBeNull();
		expect(floatingPanels).toBeDefined();
	});

	test("Infinity position sanitizes to finite values", () => {
		useEditorUIStore.getState().setFloatingPanelPosition({
			id: "timeline",
			position: { x: Infinity, y: -Infinity, width: Infinity, height: 100 },
		});
		const next = useEditorUIStore.getState().floatingPanels.timeline;
		expect(next).not.toBeNull();
		expect(Number.isFinite(next?.x)).toBe(true);
		expect(Number.isFinite(next?.y)).toBe(true);
		expect(Number.isFinite(next?.width)).toBe(true);
		expect(Number.isFinite(next?.height)).toBe(true);
		useEditorUIStore.getState().dockPanel("timeline");
	});
});
