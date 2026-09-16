import { expect, it, test } from "bun:test";
import {
	buildStaticSnapPoints,
	snapElementEdge,
	snapToNearestPoint,
} from "./snap-utils";

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

test("snapElementEdge snaps start of second clip to end of adjacent first clip", () => {
	// clip-1 runs from 0 to 120_000 ticks.
	// Second clip has duration 120_000 ticks.
	// User places second clip at 122_000 (2_000 ticks from clip-1 end, well within 24_000 threshold at zoom 1).
	const sceneTracks = {
		overlay: [],
		main: {
			id: "main",
			type: "video",
			name: "Main",
			elements: [
				{
					id: "clip-1",
					startTime: 0,
					duration: 120_000,
					animations: undefined,
				},
			],
		},
		overlayAfter: [],
		audio: [],
	};

	const snap = snapElementEdge({
		targetTime: 122_000,
		elementDuration: 120_000,
		tracks: sceneTracks as never,
		playheadTime: 0,
		zoomLevel: 1,
		snapToStart: true,
	});

	expect(snap.snapPoint).not.toBeNull();
	expect(snap.snappedTime).toBe(120_000);
	expect(snap.snapPoint?.type).toBe("element-end");
	expect(snap.snapPoint?.elementId).toBe("clip-1");
});

test("snapElementEdge snaps end of second clip to start of adjacent first clip", () => {
	// clip-1 starts at 120_000 ticks.
	// Second clip has duration 120_000 ticks.
	// User places second clip at 2_000 (so its end is at 122_000, 2_000 ticks from clip-1 start).
	const sceneTracks = {
		overlay: [],
		main: {
			id: "main",
			type: "video",
			name: "Main",
			elements: [
				{
					id: "clip-1",
					startTime: 120_000,
					duration: 120_000,
					animations: undefined,
				},
			],
		},
		overlayAfter: [],
		audio: [],
	};

	const snap = snapElementEdge({
		targetTime: 2_000,
		elementDuration: 120_000,
		tracks: sceneTracks as never,
		playheadTime: 0,
		zoomLevel: 1,
		snapToStart: false,
	});

	expect(snap.snapPoint).not.toBeNull();
	expect(snap.snappedTime).toBe(0);
	expect(snap.snapPoint?.type).toBe("element-start");
	expect(snap.snapPoint?.elementId).toBe("clip-1");
});
