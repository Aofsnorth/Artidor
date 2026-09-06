import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const editorHeaderSource = () =>
	readFile(new URL("./editor-header.tsx", import.meta.url), "utf8");

describe("Editor header project identity", () => {
	test("keeps the editable project name without the breadcrumb capsule @fast @regression", async () => {
		const source = await editorHeaderSource();
		const headerMarkup = source.slice(
			source.indexOf("export function EditorHeader"),
			source.indexOf("function HeaderZoomDropdown"),
		);

		expect(headerMarkup).toContain("<EditableProjectName />");
		expect(headerMarkup).not.toContain(">Projects</Link>");
		expect(headerMarkup).not.toContain("Identity Pod Capsule");
	});
});
