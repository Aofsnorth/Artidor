import { afterEach, describe, expect, test } from "bun:test";
import { OPFSAdapter } from "../opfs-adapter";

const originalNavigator = Object.getOwnPropertyDescriptor(
	globalThis,
	"navigator",
);

function stubStorage(getDirectory: () => Promise<unknown>): void {
	Object.defineProperty(globalThis, "navigator", {
		configurable: true,
		value: { storage: { getDirectory } },
	});
}

afterEach(() => {
	if (originalNavigator) {
		Object.defineProperty(globalThis, "navigator", originalNavigator);
	}
});

describe("OPFSAdapter.getDirectory", () => {
	test("retries after a transient failure instead of caching the rejection", async () => {
		let calls = 0;
		stubStorage(async () => {
			calls += 1;
			if (calls === 1) {
				throw new Error("transient OPFS failure");
			}
			return {
				getDirectoryHandle: async () => ({
					getFileHandle: async () => {
						const error = new Error("missing");
						error.name = "NotFoundError";
						throw error;
					},
				}),
			};
		});

		const adapter = new OPFSAdapter("media");

		// First attempt fails. Before the fix the rejected promise stayed
		// cached, so every later read/write replayed this same error until a
		// full page reload — silently breaking project saving.
		await expect(adapter.get("a.txt")).rejects.toThrow(
			"transient OPFS failure",
		);

		// The next attempt must retry and reach the directory again.
		await expect(adapter.get("a.txt")).resolves.toBeNull();
		expect(calls).toBe(2);
	});
});