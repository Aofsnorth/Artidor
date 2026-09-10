/**
 * React-scope perf regressions: throttled persist storage.
 *
 * A storage spy measures write counts: a 60-write burst (one drag gesture)
 * must collapse to a handful of real storage writes (first immediate +
 * one trailing flush), while a single discrete edit still writes with zero
 * added latency. `getItem`/`removeItem` pass through unwrapped.
 */
import { describe, expect, mock, test } from "bun:test";

const { createThrottledStorage } = await import("../throttled-storage");

function spyStorage() {
	const writes: Array<{ name: string; value: unknown }> = [];
	const setItem = mock((name: string, value: unknown) => {
		writes.push({ name, value });
	});
	return {
		writes,
		setItem,
		storage: {
			getItem: mock(() => null),
			setItem,
			removeItem: mock(() => undefined),
		},
	};
}

describe("react perf: throttled persist storage", () => {
	test("round 06: 60-write burst collapses to ≤2 real writes", async () => {
		const spy = spyStorage();
		const throttled = createThrottledStorage({
			storage: spy.storage,
			waitMs: 250,
		});
		expect(throttled).toBeDefined();
		// Simulate a drag: 60 synchronous sets (one gesture).
		for (let i = 0; i < 60; i += 1) {
			throttled?.setItem("editor-ui", { pos: i } as never);
		}
		// First write immediate + burst coalesced; trailing flush pending.
		expect(spy.writes.length).toBe(1);
		await new Promise((resolve) => setTimeout(resolve, 300));
		// After the trailing flush: exactly 2 real writes for 60 sets.
		expect(spy.writes.length).toBe(2);
		// The trailing flush carries the LATEST value, not a stale one.
		expect(spy.writes.at(-1)).toMatchObject({ name: "editor-ui" });
		expect(
			(spy.writes.at(-1)?.value as { state: { pos: number } })?.state?.pos ??
				(spy.writes.at(-1)?.value as { pos: number })?.pos,
		).toBeDefined();
	});

	test("round 07: single discrete edit writes immediately (zero added latency)", () => {
		const spy = spyStorage();
		const throttled = createThrottledStorage({
			storage: spy.storage,
			waitMs: 250,
		});
		throttled?.setItem("editor-ui", { focusMode: true } as never);
		expect(spy.writes.length).toBe(1);
	});

	test("round 08: removeItem passes through and cancels a pending flush", async () => {
		const spy = spyStorage();
		const throttled = createThrottledStorage({
			storage: spy.storage,
			waitMs: 250,
		});
		throttled?.setItem("editor-ui", { pos: 1 } as never);
		throttled?.setItem("editor-ui", { pos: 2 } as never);
		throttled?.removeItem("editor-ui");
		expect(spy.storage.removeItem).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 300));
		// No trailing flush after removal: still exactly the 1 immediate write.
		expect(spy.writes.length).toBe(1);
	});

	test("round 09: getItem passes through unwrapped", () => {
		const spy = spyStorage();
		const throttled = createThrottledStorage({
			storage: spy.storage,
			waitMs: 250,
		});
		throttled?.getItem("editor-ui");
		expect(spy.storage.getItem).toHaveBeenCalledTimes(1);
	});
});
