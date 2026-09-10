import { describe, expect, test } from "bun:test";
import { shouldMountTimelineElement } from "./timeline-element-cull";
import { getTimelinePixelsPerSecond } from "@/lib/timeline/pixel-utils";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const ZOOM = 50;
const pps = getTimelinePixelsPerSecond({ zoomLevel: ZOOM });
const secToTicks = (seconds: number) => seconds * TICKS_PER_SECOND;
// Content x for a start time (mirrors timeline-element-cull: pixels + inset).
const INSET = 8;
const leftOf = (startTime: number) =>
	(startTime / TICKS_PER_SECOND) * pps + INSET;

describe("cull boundary stability (bughunt R13)", () => {
	test("1px scroll near the viewport edge does not flip a mounted edge clip", () => {
		// Clip whose right edge sits exactly on the window's right edge.
		const window = { left: 0, right: 1000 };
		const durationSec = 0.1;
		const durationPx = durationSec * pps;
		const startTime = (window.right - durationPx - INSET) / pps;
		const base = {
			elementId: "edge",
			startTime: secToTicks(startTime),
			duration: secToTicks(durationSec),
			zoomLevel: ZOOM,
			isSelected: false,
		};
		expect(
			shouldMountTimelineElement({
				...base,
				windowLeft: window.left,
				windowRight: window.right,
			}),
		).toBe(true);
		// ±1px viewport jitter (scroll/resize sub-pixel oscillation) keeps it mounted.
		for (const d of [-1, 1, -2, 2]) {
			expect(
				shouldMountTimelineElement({
					...base,
					windowLeft: window.left + d,
					windowRight: window.right + d,
				}),
			).toBe(true);
		}
	});

	test("mount decision is symmetric: same inputs, same outputs", () => {
		const params = {
			elementId: "a",
			startTime: secToTicks(0.2),
			duration: secToTicks(0.1),
			zoomLevel: ZOOM,
			windowLeft: 0,
			windowRight: 1000,
			isSelected: false,
		};
		const first = shouldMountTimelineElement(params);
		for (let i = 0; i < 5; i += 1) {
			expect(shouldMountTimelineElement({ ...params })).toBe(first);
		}
	});

	test("a clip exactly one viewport away stays culled across small scrolls", () => {
		const window = { left: 0, right: 1000 };
		// Clip fully left of the window by a full viewport width.
		const startTime = (window.left - 1000 - 250 - INSET) / pps;
		const base = {
			elementId: "far",
			startTime: secToTicks(startTime),
			duration: secToTicks(0.1),
			zoomLevel: ZOOM,
			isSelected: false,
		};
		for (const d of [0, -1, 1, -10, 10]) {
			expect(
				shouldMountTimelineElement({
					...base,
					windowLeft: window.left + d,
					windowRight: window.right + d,
				}),
			).toBe(false);
		}
	});

	test("leftOf helper sanity: cull math matches the render offset model", () => {
		// 0.2s at this zoom → 0.2*pps + inset px from content origin.
		expect(leftOf(secToTicks(0.2))).toBeCloseTo(0.2 * pps + INSET, 6);
	});
});
