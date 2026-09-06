import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const canvasRendererSource = () =>
	readFile(new URL("./canvas-renderer.ts", import.meta.url), "utf8");

describe("CanvasRenderer GPU readiness", () => {
	test("waits for GPU initialization before rendering @fast @regression", async () => {
		const source = await canvasRendererSource();
		const initializationIndex = source.indexOf("await initializeGpuRenderer();");
		const renderTreeIndex = source.indexOf("await resolveRenderTree");

		expect(initializationIndex).toBeGreaterThan(-1);
		expect(renderTreeIndex).toBeGreaterThan(initializationIndex);
		expect(source).toContain("if (!isGpuAvailable())");
	});
});
