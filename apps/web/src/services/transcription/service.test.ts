import { expect, test } from "bun:test";
import { createModelLoadGate } from "./service";

test("model loading gate deduplicates concurrent loads", async () => {
	let calls = 0;
	const gate = createModelLoadGate();
	const load = () =>
		gate.run("tiny", async () => {
			calls += 1;
			return "ready";
		});

	const [a, b] = await Promise.all([load(), load()]);

	expect(a).toBe("ready");
	expect(b).toBe("ready");
	expect(calls).toBe(1);
});

test("model loading gate retries after failure", async () => {
	const gate = createModelLoadGate();
	await expect(
		gate.run("tiny", async () => {
			throw new Error("network");
		}),
	).rejects.toThrow("network");

	await expect(gate.run("tiny", async () => "ready")).resolves.toBe("ready");
});
