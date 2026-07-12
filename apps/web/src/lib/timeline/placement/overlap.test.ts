import { describe, expect, it } from "bun:test";
import { canPlaceTimeSpansOnTrack } from "./overlap";
import type { TimelineTrack, TimelineElement } from "@/lib/timeline";

function makeTrack(elements: TimelineElement[]): TimelineTrack {
	return {
		id: "track-1",
		type: "video",
		name: "Track",
		elements,
		muted: false,
		hidden: false,
	};
}

function makeElement(startTime: number, duration: number): TimelineElement {
	return {
		id: `el-${startTime}-${duration}`,
		type: "video",
		name: "Clip",
		startTime,
		duration,
		trimStart: 0,
		trimEnd: 0,
		mediaId: "media-1",
		transform: { position: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotate: 0 },
		opacity: 1,
	};
}

describe("canPlaceTimeSpansOnTrack", () => {
	it("does not consider tiny overlap as overlapping", () => {
		const track = makeTrack([makeElement(0, 100)]);
		expect(
			canPlaceTimeSpansOnTrack({
				track,
				timeSpans: [{ startTime: 100 - 1e-7, duration: 10 }],
			}),
		).toBe(true);
	});

	it("still reports real overlaps", () => {
		const track = makeTrack([makeElement(0, 100)]);
		expect(
			canPlaceTimeSpansOnTrack({
				track,
				timeSpans: [{ startTime: 50, duration: 100 }],
			}),
		).toBe(false);
	});
});
