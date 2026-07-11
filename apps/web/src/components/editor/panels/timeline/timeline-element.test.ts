import { expect, test } from "bun:test";
import { getSplitTimeFromClipPointer } from "./split-tool";

test("split pointer time is clamped to frame-aligned clip interior", () => {
	const splitTime = getSplitTimeFromClipPointer({
		clipStart: 120_000,
		clipDuration: 240_000,
		clientX: 55,
		left: 0,
		width: 100,
		fps: 30,
	});

	expect(splitTime).toBe(252_000);
});

test("split pointer returns null on clip edges", () => {
	expect(
		getSplitTimeFromClipPointer({
			clipStart: 0,
			clipDuration: 120_000,
			clientX: 0,
			left: 0,
			width: 100,
			fps: 30,
		}),
	).toBeNull();
});
