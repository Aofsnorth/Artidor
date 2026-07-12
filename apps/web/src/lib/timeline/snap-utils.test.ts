import { expect, test } from "bun:test";
import { buildStaticSnapPoints } from "./snap-utils";

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
