import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Panels bughunt regressions (editor-provider lifecycle — static pins, no
 * DOM needed):
 * - rapid A→B switching: the provider's staleness guard blocks React state
 *   (setIsLoading/setError/GPU-degraded) after the load await. The guard is
 *   `isStale()`, which is the union of the unmount `cancelled` flag and a
 *   monotonically increasing load sequence — a slow load for project A that
 *   resolves after the user switched to project B must not publish its
 *   result. The EDITOR SINGLETON is guarded one layer down by ProjectManager's
 *   loadProjectSeq/isStaleLoad (verified present here so the ledger claim
 *   stays pinned);
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
		const checks = src.match(/if \(isStale\(\)\) return;/g) ?? [];
		// One after loadProject, one in the catch path (plus the two inside
		// the collab-placeholder branch).
		expect(checks.length).toBeGreaterThanOrEqual(2);
	});

	test("the staleness guard covers both unmount and a superseded load", () => {
		// `isStale` must be the union of the two ways a load can go stale:
		// the effect was cleaned up (`cancelled`), or a newer load started
		// (`loadSequence !== loadSequenceRef.current`). Dropping either half
		// reopens the race this guard exists to close.
		expect(src).toContain("cancelled || loadSequence !== loadSequenceRef.current");
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
