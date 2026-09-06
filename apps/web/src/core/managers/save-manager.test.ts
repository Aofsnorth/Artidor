import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type { EditorCore } from "@/core";
import { SaveManager } from "./save-manager";

const managers: SaveManager[] = [];

function createSaveManager(saveCurrentProject: () => Promise<void>) {
	const editor = { project: {
		getActiveOrNull: () => ({ metadata: { id: "project" } }),
		getIsLoading: () => false,
		getMigrationState: () => ({ isMigrating: false }),
		saveCurrentProject,
	} };
	// Storage is gated explicitly; no browser database or real user projects.
	const manager = new SaveManager(editor as unknown as EditorCore, { debounceMs: 60_000 });
	managers.push(manager);
	return manager;
}

afterEach(() => { for (const manager of managers.splice(0)) manager.stop(); });

describe("autosave concurrency @fast @regression", () => {
	test("flush waits for an active save and persists edits made during it", async () => {
		const firstStarted = Promise.withResolvers<void>();
		const firstWrite = Promise.withResolvers<void>();
		const secondStarted = Promise.withResolvers<void>();
		const secondWrite = Promise.withResolvers<void>();
		let writes = 0;
		const manager = createSaveManager(() => {
			writes += 1;
			if (writes === 1) { firstStarted.resolve(); return firstWrite.promise; }
			secondStarted.resolve();
			return secondWrite.promise;
		});
		const firstFlush = manager.flush();
		await firstStarted.promise;
		manager.markDirty();
		let completed = false;
		const flush = manager.flush().then(() => { completed = true; });
		await Promise.resolve();
		await Promise.resolve();
		const completedBeforeWrite = completed;
		firstWrite.resolve();
		secondWrite.resolve();
		await Promise.all([firstFlush, flush]);
		expect(completedBeforeWrite).toBe(false);
		expect(writes).toBe(2);
		expect(manager.getIsDirty()).toBe(false);
	});

	test("keeps failed saves dirty and allows an explicit retry", async () => {
		let writes = 0;
		const manager = createSaveManager(() => {
			writes += 1;
			return writes === 1 ? Promise.reject(new Error("Disk full")) : Promise.resolve();
		});
		await expect(manager.flush()).rejects.toThrow("Disk full");
		expect(manager.getIsDirty()).toBe(true);
		await manager.flush();
		expect(writes).toBe(2);
		expect(manager.getIsDirty()).toBe(false);
	});

	test("pause cancels a queued autosave without discarding dirty state", () => {
		const manager = createSaveManager(() => Promise.resolve());
		manager.markDirty();
		const clear = spyOn(globalThis, "clearTimeout");
		try {
			manager.pause();
			expect(clear).toHaveBeenCalledTimes(1);
			expect(manager.getIsDirty()).toBe(true);
		} finally { clear.mockRestore(); }
	});
});
