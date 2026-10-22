/**
 * Quota reads must stay usable on browsers that expose only part of the
 * Storage API (notably `persisted`), and a rejected `persisted()` call must not
 * surface as an unhandled rejection.
 */
import { afterEach, expect, test } from "bun:test";
import { readStorageQuotaStatus } from "@/services/storage/quota";

const originalNavigator = Object.getOwnPropertyDescriptor(
	globalThis,
	"navigator",
);

function installStorage(storage: Record<string, unknown>): void {
	Object.defineProperty(globalThis, "navigator", {
		configurable: true,
		value: { storage },
	});
}

afterEach(() => {
	if (originalNavigator) {
		Object.defineProperty(globalThis, "navigator", originalNavigator);
	} else {
		Reflect.deleteProperty(globalThis, "navigator");
	}
});

test("readStorageQuotaStatus works when persisted() is missing", async () => {
	let persistCalls = 0;
	installStorage({
		estimate: async () => ({ quota: 1_000, usage: 100 }),
		persist: async () => {
			persistCalls += 1;
			return true;
		},
	});

	const status = await readStorageQuotaStatus();

	expect(status.quotaBytes).toBe(1_000);
	expect(status.usageBytes).toBe(100);
	expect(persistCalls).toBe(1);
});

test("a rejected persisted() does not reject the quota read", async () => {
	installStorage({
		estimate: async () => ({ quota: 2_000, usage: 500 }),
		persisted: async () => {
			throw new Error("permission denied");
		},
		persist: async () => true,
	});

	const status = await readStorageQuotaStatus();

	expect(status.quotaBytes).toBe(2_000);
	expect(status.usageBytes).toBe(500);
});

test("missing estimate() returns an unknown quota", async () => {
	installStorage({});

	const status = await readStorageQuotaStatus();

	expect(status).toEqual({
		quotaBytes: null,
		usageBytes: null,
		headroomBytes: null,
		availableBytes: null,
	});
});
