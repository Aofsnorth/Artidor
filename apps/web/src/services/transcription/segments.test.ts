import { expect, test } from "bun:test";
import { SEGMENT_TIMESTAMP_MODE, toTranscriptionSegments } from "./segments";

test("uses segment timestamps without cross attentions", () => {
	expect(SEGMENT_TIMESTAMP_MODE).toBeTrue();
});

test("preserves model segment timing for caption generation", () => {
	const segments = toTranscriptionSegments({
		result: {
			text: "Hello there general Kenobi",
			chunks: [
				{ text: " Hello there", timestamp: [1, 3] },
				{ text: " general Kenobi", timestamp: [3, 5] },
			],
		},
		durationSeconds: 8,
	});

	expect(segments).toEqual([
		{ text: "Hello there", start: 1, end: 3 },
		{ text: "general Kenobi", start: 3, end: 5 },
	]);
});
