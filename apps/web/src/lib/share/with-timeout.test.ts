import { describe, expect, test } from "bun:test";
import { TimeoutError, withTimeout } from "./with-timeout";

describe("withTimeout", () => {
	test("resolves with the wrapped value when it settles in time", async () => {
		await expect(withTimeout(Promise.resolve("payload"), 50)).resolves.toBe(
			"payload",
		);
	});

	test("rejects with TimeoutError when the promise never settles", async () => {
		await expect(
			withTimeout(new Promise<string>(() => {}), 10),
		).rejects.toBeInstanceOf(TimeoutError);
	});

	test("passes the original rejection through unchanged", async () => {
		const failure = new Error("network down");
		await expect(withTimeout(Promise.reject(failure), 50)).rejects.toBe(
			failure,
		);
	});
});
