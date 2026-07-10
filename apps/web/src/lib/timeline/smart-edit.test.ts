import { closeTimelineGap, findNearestSnapTime } from "./smart-edit";

function assert(cond: boolean, msg: string): void {
	if (!cond) {
		console.error(`FAIL: ${msg}`);
		process.exit(1);
	}
}

const shifted = closeTimelineGap(
	[
		{ id: "a", startTime: 0, duration: 10 },
		{ id: "b", startTime: 20, duration: 10 },
	],
	10,
	20,
);
assert(shifted[1]?.startTime === 10, "gap close shifts later clips left");
assert(
	findNearestSnapTime(98, [0, 100, 200], 5) === 100,
	"snap within threshold",
);
assert(
	findNearestSnapTime(90, [0, 100, 200], 5) === null,
	"no snap outside threshold",
);

console.log("smart-edit: all assertions passed");
