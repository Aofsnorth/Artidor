import { describe, expect, test } from "bun:test";
import type { TProject } from "../types";
import { reviveProjectDates } from "../dates";

/**
 * Regression: the Drive-folder import path decoded the project from JSON and
 * handed it straight to `storageService.saveProject`, which serialises
 * `metadata.createdAt` / `scene.createdAt` with `.toISOString()`. JSON has no
 * Date type, so every Drive import failed with
 * "toISOString is not a function" and nothing was imported.
 */
describe("reviveProjectDates", () => {
	test("converts serialised timestamps back into Date instances", () => {
		const createdAt = "2024-01-02T03:04:05.000Z";
		const updatedAt = "2024-05-06T07:08:09.000Z";

		const project = {
			metadata: { createdAt, updatedAt },
			scenes: [{ createdAt, updatedAt }],
		} as unknown as TProject;

		const revived = reviveProjectDates(project);

		expect(revived.metadata.createdAt).toBeInstanceOf(Date);
		expect(revived.metadata.updatedAt).toBeInstanceOf(Date);
		expect(revived.scenes[0].createdAt).toBeInstanceOf(Date);
		expect(revived.scenes[0].updatedAt).toBeInstanceOf(Date);

		// This is the exact call storage makes; it used to throw.
		expect(revived.metadata.createdAt.toISOString()).toBe(createdAt);
		expect(revived.scenes[0].updatedAt.toISOString()).toBe(updatedAt);
	});

	test("preserves the original object shape", () => {
		const project = {
			metadata: { id: "p1", name: "Clip", createdAt: "2024-01-02T03:04:05.000Z", updatedAt: "2024-01-02T03:04:05.000Z" },
			scenes: [],
		} as unknown as TProject;

		const revived = reviveProjectDates(project);

		expect(revived.metadata.id).toBe("p1");
		expect(revived.metadata.name).toBe("Clip");
		expect(revived.scenes).toEqual([]);
	});
});