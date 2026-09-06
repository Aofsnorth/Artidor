import { describe, expect, test } from "bun:test";
import { buildSceneTracks, buildVideoElement, buildVideoTrack } from "@/tests/factories/editor";
import { applyRippleAdjustments } from "./apply";
import { computeRippleAdjustments } from "./diff";

describe("ripple track coverage @fast @regression", () => {
	test("closes a deleted clip's gap below the main track", () => {
		const first = buildVideoElement();
		const second = buildVideoElement({ id: "second", startTime: 120_000 });
		const before = buildSceneTracks({
			overlayAfter: [buildVideoTrack({ id: "below", elements: [first, second] })],
		});
		const after = buildSceneTracks({
			overlayAfter: [buildVideoTrack({ id: "below", elements: [second] })],
		});
		const adjustments = computeRippleAdjustments({ beforeTracks: before, afterTracks: after });
		expect(adjustments).toEqual([{ trackId: "below", afterTime: 120_000, shiftAmount: 120_000 }]);
		const result = applyRippleAdjustments({ tracks: after, adjustments });
		expect(result.overlayAfter.at(0)?.elements.at(0)?.startTime).toBe(0);
		expect(before.overlayAfter.at(0)?.elements).toEqual([first, second]);
	});

	test("does not close a gap when the clip was moved below the main track", () => {
		const clip = buildVideoElement();
		const before = buildSceneTracks({ main: buildVideoTrack({ elements: [clip] }) });
		const after = buildSceneTracks({
			overlayAfter: [buildVideoTrack({ id: "below", elements: [clip] })],
		});
		expect(computeRippleAdjustments({ beforeTracks: before, afterTracks: after })).toEqual([]);
	});

	test("does not ripple when splitting preserves the occupied interval", () => {
		const before = buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement()] }) });
		const after = buildSceneTracks({ main: buildVideoTrack({ elements: [
			buildVideoElement({ duration: 60_000 }),
			buildVideoElement({ id: "right", startTime: 60_000, duration: 60_000 }),
		] }) });
		expect(computeRippleAdjustments({ beforeTracks: before, afterTracks: after })).toEqual([]);
	});
});
