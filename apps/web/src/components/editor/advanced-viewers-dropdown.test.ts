import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const dropdownSource = () =>
	readFile(new URL("./advanced-viewers-dropdown.tsx", import.meta.url), "utf8");
const editorPageSource = () =>
	readFile(
		new URL("../../app/editor/[project_id]/page.tsx", import.meta.url),
		"utf8",
	);
const editorUiStoreSource = () =>
	readFile(new URL("../../stores/editor-ui-store.ts", import.meta.url), "utf8");

describe("Advanced viewers dock", () => {
	test("offers only the supported docked viewers @fast @regression", async () => {
		const source = await dropdownSource();
		const viewerDefinitions = source.slice(
			source.indexOf("const ADVANCED_VIEWERS"),
			source.indexOf("export function AdvancedViewersDropdown"),
		);

		expect(viewerDefinitions).toContain('id: "scopes"');
		expect(viewerDefinitions).toContain('id: "color-wheels"');
		expect(viewerDefinitions).toContain('id: "davinci-adjust"');
		expect(viewerDefinitions).not.toContain("audio-meter");
		expect(source).not.toContain("<Dialog");
	});

	test("mounts inline and keeps its selection transient @fast @regression", async () => {
		const [pageSource, storeSource] = await Promise.all([
			editorPageSource(),
			editorUiStoreSource(),
		]);
		const persistedState = storeSource.slice(
			storeSource.indexOf("partialize:"),
		);

		expect(pageSource).toContain('id="advanced-viewer"');
		expect(pageSource).toContain("<AdvancedViewerPanel />");
		expect(pageSource).toContain("if (activeAdvancedViewer) return;");
		expect(persistedState).not.toContain("activeAdvancedViewer:");
		expect(pageSource).toContain("<MeterDetailsColumn />");
		expect(await dropdownSource()).toContain("tabIndex={isActive ? 0 : -1}");
	});
});
