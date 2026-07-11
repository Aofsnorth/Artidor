import { describe, expect, test } from "bun:test";

describe("browser storage", () => {
	test("does not access Node localStorage during module evaluation", async () => {
		let accesses = 0;
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get: () => {
				accesses += 1;
				throw new Error("Node localStorage must not be used");
			},
		});

		try {
			await import(`./browser-storage?ssr=${Date.now()}`);
			expect(accesses).toBe(0);
		} finally {
			Reflect.deleteProperty(globalThis, "localStorage");
		}
	});
});
