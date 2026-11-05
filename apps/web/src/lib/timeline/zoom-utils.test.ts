import { describe, expect, test } from "bun:test";
import {
	clampTimelineZoom,
	getTimelinePaddingPx,
	getTimelineZoomMin,
	getZoomPercent,
} from "./zoom-utils";
import { getRulerConfig } from "./ruler-utils";
import {
	BASE_TIMELINE_PIXELS_PER_SECOND,
	TIMELINE_ZOOM_MAX,
	TIMELINE_ZOOM_MIN,
} from "./scale";
import { TICKS_PER_SECOND } from "../wasm";

describe("getTimelineZoomMin", () => {
	test("clamps a very long timeline to TIMELINE_ZOOM_MIN", () => {
		// 3 hours in a 300px container: the raw fit value is ~0.00014.
		const minZoom = getTimelineZoomMin({
			duration: 3 * 60 * 60 * TICKS_PER_SECOND,
			containerWidth: 300,
		});

		expect(minZoom).toBe(TIMELINE_ZOOM_MIN);
	});

	test("clamps a tiny timeline to TIMELINE_ZOOM_MAX", () => {
		const minZoom = getTimelineZoomMin({
			duration: TICKS_PER_SECOND,
			containerWidth: 1_000_000,
		});

		expect(minZoom).toBe(TIMELINE_ZOOM_MAX);
	});

	test("returns the fit value when it is already inside the domain", () => {
		const minZoom = getTimelineZoomMin({
			duration: 20 * TICKS_PER_SECOND,
			containerWidth: 1000,
		});

		// 1000 * (1 - 0.75) / (20 * 50) = 0.25
		expect(minZoom).toBeCloseTo(0.25, 10);
	});

	test("falls back to the documented minimum for invalid input", () => {
		expect(
			getTimelineZoomMin({
				duration: Number.NaN,
				containerWidth: 800,
			}),
		).toBe(TIMELINE_ZOOM_MIN);
	});

	test("shrinks a 1-hour video into a compact strip and keeps multi-hour ruler ticks sparse", () => {
		const oneHourSeconds = 3600;
		const fitZoom = getTimelineZoomMin({
			duration: oneHourSeconds * TICKS_PER_SECOND,
			containerWidth: 1000,
		});
		// At fitZoom in a 1000px container, 1 hour occupies 250px; at TIMELINE_ZOOM_MIN it is 36px.
		const fitWidthPx =
			oneHourSeconds * BASE_TIMELINE_PIXELS_PER_SECOND * fitZoom;
		const minWidthPx =
			oneHourSeconds * BASE_TIMELINE_PIXELS_PER_SECOND * TIMELINE_ZOOM_MIN;
		expect(fitWidthPx).toBeCloseTo(250, 5);
		expect(minWidthPx).toBeLessThanOrEqual(50);

		const ruler = getRulerConfig({
			zoomLevel: TIMELINE_ZOOM_MIN,
			fps: { numerator: 30, denominator: 1 },
		});
		expect(ruler.labelIntervalSeconds).toBeGreaterThanOrEqual(3600);
		expect(ruler.tickIntervalSeconds).toBeGreaterThanOrEqual(1800);
	});
});

describe("getZoomPercent", () => {
	test("maps the domain endpoints to 0 and 1", () => {
		expect(getZoomPercent({ zoomLevel: 0.1, minZoom: 0.1 })).toBe(0);
		expect(getZoomPercent({ zoomLevel: TIMELINE_ZOOM_MAX, minZoom: 0.1 })).toBe(
			1,
		);
	});

	test("clamps values outside the range into 0..1", () => {
		expect(getZoomPercent({ zoomLevel: 0, minZoom: 0.1 })).toBe(0);
		expect(
			getZoomPercent({ zoomLevel: TIMELINE_ZOOM_MAX + 50, minZoom: 0.1 }),
		).toBe(1);
	});

	test("returns 0 instead of Infinity/NaN when the range collapses", () => {
		expect(
			getZoomPercent({
				zoomLevel: TIMELINE_ZOOM_MAX,
				minZoom: TIMELINE_ZOOM_MAX,
			}),
		).toBe(0);
		expect(
			getZoomPercent({
				zoomLevel: TIMELINE_ZOOM_MAX,
				minZoom: TIMELINE_ZOOM_MAX + 10,
			}),
		).toBe(0);
		expect(getZoomPercent({ zoomLevel: 1, minZoom: Number.NaN })).toBe(0);
	});

	test("keeps padding finite when the range collapses", () => {
		const padding = getTimelinePaddingPx({
			containerWidth: 1000,
			zoomLevel: TIMELINE_ZOOM_MAX,
			minZoom: TIMELINE_ZOOM_MAX,
		});

		expect(Number.isFinite(padding)).toBe(true);
		expect(padding).toBe(750);
	});
});

describe("clampTimelineZoom", () => {
	test("clamps to [minZoom, TIMELINE_ZOOM_MAX]", () => {
		expect(clampTimelineZoom({ zoomLevel: 0.01, minZoom: 0.5 })).toBe(0.5);
		expect(
			clampTimelineZoom({ zoomLevel: TIMELINE_ZOOM_MAX + 1, minZoom: 0.5 }),
		).toBe(TIMELINE_ZOOM_MAX);
		expect(clampTimelineZoom({ zoomLevel: 4, minZoom: 0.5 })).toBe(4);
	});

	test("never returns a value above the maximum when minZoom is invalid", () => {
		expect(
			clampTimelineZoom({
				zoomLevel: 10,
				minZoom: TIMELINE_ZOOM_MAX + 100,
			}),
		).toBe(TIMELINE_ZOOM_MAX);
		expect(clampTimelineZoom({ zoomLevel: Number.NaN, minZoom: 2 })).toBe(2);
	});
});
