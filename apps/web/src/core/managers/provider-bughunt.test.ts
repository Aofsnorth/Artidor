import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Panels bughunt regressions (editor-provider lifecycle — static pins, no
 * DOM needed):
 * - rapid A→B switching: the provider's `cancelled` flag guards React state
 *   (setIsLoading/setError/GPU-degraded), while the EDITOR SINGLETON is
 *   guarded one layer down by ProjectManager's loadProjectSeq/isStaleLoad
 *   (verified present here so the ledger claim stays pinned);
 * - beforeunload warns ONLY when dirty (wired to save.getIsDirty).
 */
describe("editor-provider lifecycle", () => {
	const src = readFileSync(
		join(import.meta.dir, "../../components/providers/editor-provider.tsx"),
		"utf8",
	);
	const projectManager = readFileSync(
		join(import.meta.dir, "project-manager.ts"),
		"utf8",
	);

	test("cancelled flag guards React state after the load await", () => {
		const checks = src.match(/if \(cancelled\) return;/g) ?? [];
		// One after loadProject, one in the catch path.
		expect(checks.length).toBeGreaterThanOrEqual(2);
	});

	test("singleton writes are sequenced in project-manager, not the provider", () => {
		expect(projectManager).toContain("loadProjectSeq");
		expect(projectManager).toContain("isStaleLoad()");
	});

	test("beforeunload warns only when dirty via getIsDirty", () => {
		expect(src).toContain("editor.save.getIsDirty()");
		expect(src).toContain('addEventListener("beforeunload"');
		expect(src).toContain('removeEventListener("beforeunload"');
	});
});
