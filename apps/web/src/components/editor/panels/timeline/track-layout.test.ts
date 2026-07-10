import { computeTrackVerticalSpans } from "./track-layout";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

const tracks = [
	{ id: "v1", type: "video" as const },
	{ id: "t1", type: "text" as const },
	{ id: "a1", type: "audio" as const },
];

const spans = computeTrackVerticalSpans({
	tracks,
	extraHeights: [10, 0, 5],
	overrideHeights: { v1: 100 },
});

assert(spans.length === 3, "returns one span per track");
assert(spans[0]?.top === 0, "first track starts at 0");
assert(
	spans[0]?.height === 110,
	"first track height includes override + extra",
);
assert(spans[1]?.top === 114, "second track starts after first height + gap");
assert(
	spans[2] !== undefined &&
		spans[1] !== undefined &&
		spans[2].top > spans[1].top,
	"third track starts after second",
);

console.log("track-layout: all assertions passed");
