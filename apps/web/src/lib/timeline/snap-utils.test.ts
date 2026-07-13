import { expect, it, test } from "bun:test";
import { buildStaticSnapPoints, snapToNearestPoint } from "./snap-utils";

const tracks = {
	overlay: [],
	main: {
		id: "main",
		type: "video",
		name: "Main",
		elements: [
			{
				id: "clip-1",
				startTime: 100,
				duration: 200,
				animations: undefined,
			},
		],
	},
	overlayAfter: [],
	audio: [],
};

test("buildStaticSnapPoints excludes moving playhead state", () => {
	const snapPoints = buildStaticSnapPoints({
		tracks: tracks as never,
		bookmarks: [{ id: "bookmark-1", time: 400, name: "Marker" }] as never,
	});

	expect(snapPoints.map((point) => point.time)).toEqual([100, 300, 400]);
	expect(snapPoints.some((point) => point.type === "playhead")).toBe(false);
});

it("snaps when target is within epsilon of threshold boundary", () => {
	const snapPoints = [{ time: 0, type: "playhead" as const }];
	// At zoom 1, 10 px = (10 / 50) * 120_000 = 24_000 ticks. The target is exactly at
	// that threshold, so the strict `<` boundary misses it without an epsilon guard.
	const result = snapToNearestPoint({
		targetTime: 24_000,
		snapPoints,
		zoomLevel: 1,
		snapThreshold: 10,
	});

	expect(result.snapPoint).not.toBeNull();
});
