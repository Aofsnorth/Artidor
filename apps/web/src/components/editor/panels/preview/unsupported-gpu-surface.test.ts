import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const previewSource = () =>
	readFile(new URL("./index.tsx", import.meta.url), "utf8");

describe("preview GPU surface fallback", () => {
	test("stops frame retries after an incompatible output surface @fast @regression", async () => {
		const source = await previewSource();
		const fallbackBranch = source.slice(
			source.indexOf("const gpuUnavailable"),
			source.indexOf(
				"// Release the lock after a transient frame/device error",
			),
		);

		expect(fallbackBranch).toContain(
			'error.message === "GPU renderer is unavailable"',
		);
		expect(fallbackBranch).toContain("isUnsupportedGpuSurfaceError(error)");
		expect(fallbackBranch).toContain("unsupportedGpuSurfaceRef.current = true");
		expect(fallbackBranch).toContain("pendingRenderRef.current = false");
		expect(fallbackBranch).toContain("setNeedsRender(false)");
		expect(fallbackBranch).toContain("editor.renderer.setDegraded(true)");
		expect(source).toContain(
			"!hasUnsupportedGpuSurface && (isPlaying || needsRender)",
		);
	});
});
