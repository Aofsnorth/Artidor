import { expect, test } from "bun:test";
import { offsetBeatsToTimeline } from "./beat-timeline";

test("offsets clip-relative beats to absolute timeline ticks", () => {
	const beats = offsetBeatsToTimeline({
		clipStartTicks: 240_000,
		beats: [{ timeSeconds: 0.5, ticks: 60_000, energy: 0.8 }],
	});

	expect(beats).toEqual([{ timeSeconds: 2.5, ticks: 300_000, energy: 0.8 }]);
});
