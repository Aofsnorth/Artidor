import { expect, test } from "bun:test";
import { computeDropTarget } from "./drop-target";

const ONE_SECOND_TICKS = 120_000;

test("image media can drop onto the main track", () => {
	const target = computeDropTarget({
		elementType: "image",
		mouseX: 120,
		mouseY: 24,
		tracks: {
			overlay: [],
			main: {
				id: "main",
				name: "Main",
				type: "video",
				elements: [],
				muted: false,
				hidden: false,
			},
			audio: [],
		},
		playheadTime: 0,
		isExternalDrop: false,
		elementDuration: ONE_SECOND_TICKS,
		pixelsPerSecond: 100,
		zoomLevel: 1,
	});

	expect(target.isNewTrack).toBe(false);
	expect(target.trackIndex).toBe(0);
});
