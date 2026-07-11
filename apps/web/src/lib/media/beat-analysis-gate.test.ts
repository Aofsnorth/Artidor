import { expect, test } from "bun:test";
import { createBeatAnalysisGate } from "./beat-analysis-gate";

test("beat analysis gate rejects a concurrent different job", async () => {
	const gate = createBeatAnalysisGate();
	let release = () => {};
	const first = gate.run(
		() =>
			new Promise<string>((resolve) => {
				release = () => resolve("done");
			}),
	);

	expect(() => gate.run(async () => "other")).toThrow(
		"Beat analysis already in progress",
	);
	release();
	expect(await first).toBe("done");
});

test("beat analysis gate accepts a new job after settlement", async () => {
	const gate = createBeatAnalysisGate();
	expect(await gate.run(async () => "first")).toBe("first");
	expect(await gate.run(async () => "second")).toBe("second");
});
