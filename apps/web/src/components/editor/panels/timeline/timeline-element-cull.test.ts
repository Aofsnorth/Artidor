import { expect, test } from "bun:test";
import { shouldMountTimelineElement } from "./timeline-element-cull";
import { getTimelinePixelsPerSecond } from "@/lib/timeline/pixel-utils";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const ZOOM = 50; // zoomLevel
const pps = getTimelinePixelsPerSecond({ zoomLevel: ZOOM }); // px per second
const secToTicks = (seconds: number) => seconds * TICKS_PER_SECOND;

// A window of [0, 1000]px represents the overscanned visible region.
const WINDOW = { left: 0, right: 1000 };

test("mounts a clip that intersects the visible window", () => {
	// pps = 2500 at ZOOM=50, so 0.2s -> 500px left (+8 inset = 508),
	// duration 0.1s -> 250px wide -> right 758. Inside [0,1000].
	expect(
		shouldMountTimelineElement({
			elementId: "a",
			startTime: secToTicks(0.2),
			duration: secToTicks(0.1),
			zoomLevel: ZOOM,
			windowLeft: WINDOW.left,
			windowRight: WINDOW.right,
			isSelected: false,
		}),
	).toBe(true);
});

test("mounts a clip partially overlapping the left edge", () => {
	// Place the clip so its left edge sits ~5px before the window start.
	const startTimeSec = -(5 + 8) / pps; // elementLeft = 8 + startTimeSec*pps ≈ -5
	expect(
		shouldMountTimelineElement({
			elementId: "a",
			startTime: secToTicks(startTimeSec),
			duration: secToTicks(1),
			zoomLevel: ZOOM,
			windowLeft: WINDOW.left,
			windowRight: WINDOW.right,
			isSelected: false,
		}),
	).toBe(true);
});

test("culls a clip fully to the left of the window", () => {
	// -500s is far enough that even with a tiny px/sec it stays off-screen.
	expect(
		shouldMountTimelineElement({
			elementId: "a",
			startTime: secToTicks(-500),
			duration: secToTicks(1),
			zoomLevel: ZOOM,
			windowLeft: WINDOW.left,
			windowRight: WINDOW.right,
			isSelected: false,
		}),
	).toBe(false);
});

test("culls a clip fully to the right of the window", () => {
	expect(
		shouldMountTimelineElement({
			elementId: "a",
			startTime: secToTicks(500),
			duration: secToTicks(1),
			zoomLevel: ZOOM,
			windowLeft: WINDOW.left,
			windowRight: WINDOW.right,
			isSelected: false,
		}),
	).toBe(false);
});

test("always mounts a selected clip regardless of position", () => {
	expect(
		shouldMountTimelineElement({
			elementId: "a",
			startTime: secToTicks(500),
			duration: secToTicks(1),
			zoomLevel: ZOOM,
			windowLeft: WINDOW.left,
			windowRight: WINDOW.right,
			isSelected: true,
		}),
	).toBe(true);
});

// Sanity check: at ZOOM=50 the per-second width is non-trivial, so the
// far-left / far-right cases above are genuinely off-screen (not merely
// within overscan). Guards against a regression where TICKS_PER_SECOND
// or the px/sec scale changes and makes the window cover everything.
test("zoom produces a usable px-per-second scale", () => {
	expect(pps).toBeGreaterThan(1);
});
