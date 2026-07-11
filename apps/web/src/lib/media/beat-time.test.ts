import { expect, test } from "bun:test";
import { secondsToBeatTicks } from "./beat-time";

test("beat analysis uses canonical timeline ticks", () => {
	expect(secondsToBeatTicks(1)).toBe(120_000);
	expect(secondsToBeatTicks(0.5)).toBe(60_000);
});
