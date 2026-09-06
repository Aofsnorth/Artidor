import { beforeEach, describe, expect, mock, test } from "bun:test";
import { buildSceneTracks, buildVideoElement, buildVideoTrack, createTimelineEditor } from "@/tests/factories/editor";
import { getKeyframeAtTime } from "@/lib/animation";
import { buildSpeedRampRetime, getSourceTimeAtClipTime } from "@/lib/retime";

let state = createTimelineEditor();
mock.module("@/core", () => ({ EditorCore: { getInstance: () => state.editor } }));
const { PasteKeyframesCommand } = await import("@/lib/commands/timeline/clipboard/paste-keyframes");
const { SplitElementsCommand } = await import("@/lib/commands/timeline/element/split-elements");

beforeEach(() => { state = createTimelineEditor(); });

describe("animation timing @fast @regression", () => {
	test("pastes keyframes at clip-local playhead time and keeps their IDs on redo", () => {
		const original = buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement({ startTime: 240_000 })] }) });
		state.setTracks(original);
		const command = new PasteKeyframesCommand({
			trackId: "main", elementId: "clip", time: 270_000,
			clipboardItems: [
				{ propertyPath: "opacity", timeOffset: 0, value: 0.2, interpolation: "linear", curvePatches: [] },
				{ propertyPath: "opacity", timeOffset: 30_000, value: 0.8, interpolation: "linear", curvePatches: [] },
			],
		});
		command.execute();
		const animations = state.getTracks().main.elements.at(0)?.animations;
		expect(getKeyframeAtTime({ animations, propertyPath: "opacity", time: 30_000 })?.value).toBe(0.2);
		expect(getKeyframeAtTime({ animations, propertyPath: "opacity", time: 60_000 })?.value).toBe(0.8);
		const pasted = state.getTracks();
		command.undo();
		expect(state.getTracks()).toEqual(original);
		command.redo();
		expect(state.getTracks()).toEqual(pasted);
	});

	test.each(["both", "left", "right"] as const)("split retaining %s preserves speed-ramp source mapping", (retainSide) => {
		const retime = buildSpeedRampRetime({ duration: 120_000, keyframes: [{ time: 0, speed: 1 }, { time: 1, speed: 3 }] });
		const original = buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement({ retime })] }) });
		state.setTracks(original);
		const command = new SplitElementsCommand({ elements: [{ trackId: "main", elementId: "clip" }], splitTime: 60_000, retainSide });
		command.execute();
		for (const element of state.getTracks().main.elements) {
			if (element.type !== "video") throw new Error("Expected video split");
			const sourceAtMidpoint = element.trimStart + getSourceTimeAtClipTime({ clipTime: 30_000, retime: element.retime, clipDuration: element.duration });
			const expectedSource = getSourceTimeAtClipTime({ clipTime: element.startTime + 30_000, retime, clipDuration: 120_000 });
			expect(sourceAtMidpoint).toBeCloseTo(expectedSource, 4);
			expect(element.duration).toBe(60_000);
		}
		command.undo();
		expect(state.getTracks()).toEqual(original);
	});

	test.each([0, 120_000])("does not split at clip boundary %s", (splitTime) => {
		const original = buildSceneTracks({ main: buildVideoTrack({ elements: [buildVideoElement()] }) });
		state.setTracks(original);
		new SplitElementsCommand({ elements: [{ trackId: "main", elementId: "clip" }], splitTime }).execute();
		expect(state.getTracks()).toEqual(original);
	});
});
