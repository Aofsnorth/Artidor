import { expect, test } from "bun:test";
import { getCaptionCues } from "./caption-cues";

test("maps caption elements into sorted seconds-based cues", () => {
	const cues = getCaptionCues({
		track: {
			id: "caption-track",
			elements: [
				{
					id: "second",
					content: "Second cue",
					startTime: 2_000,
					duration: 1_000,
				},
				{
					id: "first",
					content: "First cue",
					startTime: 1_000,
					duration: 2_000,
				},
			],
		},
		ticksPerSecond: 1_000,
	});

	expect(cues).toEqual([
		{
			trackId: "caption-track",
			elementId: "first",
			text: "First cue",
			startTime: 1,
			duration: 2,
		},
		{
			trackId: "caption-track",
			elementId: "second",
			text: "Second cue",
			startTime: 2,
			duration: 1,
		},
	]);
});
