import { afterEach, describe, expect, test } from "bun:test";
import { cancelInteraction, registerCanceller } from "../cancel-interaction";

const originalError = console.error;

afterEach(() => {
	console.error = originalError;
	// Drain anything a failed assertion left behind.
	cancelInteraction();
});

describe("cancelInteraction", () => {
	test("runs every canceller even when one throws", () => {
		const calls: string[] = [];
		console.error = () => {};
		registerCanceller({
			fn: () => {
				calls.push("first");
				throw new Error("boom");
			},
		});
		registerCanceller({ fn: () => calls.push("second") });
		registerCanceller({ fn: () => calls.push("third") });

		expect(cancelInteraction()).toBe(true);
		expect(calls).toEqual(["first", "second", "third"]);
	});

	test("clears the set after cancellation", () => {
		registerCanceller({ fn: () => {} });
		expect(cancelInteraction()).toBe(true);
		expect(cancelInteraction()).toBe(false);
	});

	test("unregister removes a canceller before cancellation", () => {
		let called = false;
		const unregister = registerCanceller({ fn: () => (called = true) });
		unregister();

		expect(cancelInteraction()).toBe(false);
		expect(called).toBe(false);
	});
});
