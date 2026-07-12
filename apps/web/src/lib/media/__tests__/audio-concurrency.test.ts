import { describe, expect, test } from "bun:test";
import { runTasksWithConcurrency } from "../audio";

describe("runTasksWithConcurrency", () => {
	test("preserves result order while limiting active tasks", async () => {
		let active = 0;
		let peakActive = 0;
		const releases: Array<() => void> = [];
		const tasks = Array.from({ length: 5 }, (_, value) => async () => {
			active++;
			peakActive = Math.max(peakActive, active);
			await new Promise<void>((resolve) => releases.push(resolve));
			active--;
			return value;
		});

		const resultPromise = runTasksWithConcurrency({ tasks, concurrency: 2 });
		await Promise.resolve();
		expect(active).toBe(2);

		while (releases.length > 0 || active > 0) {
			releases.shift()?.();
			await Promise.resolve();
			await Promise.resolve();
		}

		expect(await resultPromise).toEqual([0, 1, 2, 3, 4]);
		expect(peakActive).toBe(2);
	});

	test("rejects invalid concurrency", async () => {
		await expect(
			runTasksWithConcurrency({ tasks: [async () => 1], concurrency: 0 }),
		).rejects.toThrow("concurrency must be at least 1");
	});
});
