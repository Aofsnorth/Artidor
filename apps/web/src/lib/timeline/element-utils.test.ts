import { describe, expect, test } from "bun:test";
import {
	findOrCreateTextTrack,
	getElementsAtTime,
} from "@/lib/timeline/element-utils";
import type { EditorCore } from "@/core";
import type { SceneTracks, TimelineTrack } from "@/lib/timeline";
import { TICKS_PER_SECOND } from "@/lib/wasm";

function buildSceneTracks(overlay: TimelineTrack[] = []): SceneTracks {
	return {
		overlay,
		main: {
			id: "video-main",
			name: "Main",
			type: "video",
			elements: [],
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
}

function buildMockEditor({
	tracks,
	addTrack,
}: {
	tracks: SceneTracks;
	addTrack: (args: { type: "text" }) => string;
}): EditorCore {
	return {
		scenes: {
			getActiveScene: () => ({ tracks }) as { tracks: SceneTracks },
		},
		timeline: {
			addTrack,
		},
	} as unknown as EditorCore;
}

describe("findOrCreateTextTrack", () => {
	test("returns the first existing text overlay track id", () => {
		const tracks = buildSceneTracks([
			{
				id: "track-text-1",
				name: "Text 1",
				type: "text",
				elements: [],
				hidden: false,
			},
		]);
		const editor = buildMockEditor({
			tracks,
			addTrack: () => "new-track-id",
		});

		expect(findOrCreateTextTrack(editor)).toBe("track-text-1");
	});

	test("creates a new text track when none exists", () => {
		const tracks = buildSceneTracks([]);
		const addTrack = ({ type }: { type: "text" }) => {
			expect(type).toBe("text");
			return "new-text-track";
		};
		const editor = buildMockEditor({ tracks, addTrack });

		expect(findOrCreateTextTrack(editor)).toBe("new-text-track");
	});

	test("prefers the first text track when multiple exist", () => {
		const tracks = buildSceneTracks([
			{
				id: "track-text-first",
				name: "Text First",
				type: "text",
				elements: [],
				hidden: false,
			},
			{
				id: "track-text-second",
				name: "Text Second",
				type: "text",
				elements: [],
				hidden: false,
			},
		]);
		const editor = buildMockEditor({
			tracks,
			addTrack: () => "new-track-id",
		});

		expect(findOrCreateTextTrack(editor)).toBe("track-text-first");
	});
});

describe("getElementsAtTime", () => {
	function tracksWithClip({
		startTime,
		duration,
	}: {
		startTime: number;
		duration: number;
	}): SceneTracks {
		const tracks = buildSceneTracks();
		tracks.main.elements = [
			{
				id: "clip-1",
				type: "video",
				name: "Clip",
				startTime,
				duration,
				mediaId: "media-1",
				trimStart: 0,
				trimEnd: 0,
			} as never,
		];
		return tracks;
	}

	test("includes a clip at its exact start (split at 0 targets a clip starting at 0)", () => {
		const tracks = tracksWithClip({
			startTime: 0,
			duration: 2 * TICKS_PER_SECOND,
		});

		expect(getElementsAtTime({ tracks, time: 0 })).toEqual([
			{ trackId: "video-main", elementId: "clip-1" },
		]);
	});

	test("uses a half-open interval: start inclusive, end exclusive", () => {
		const tracks = tracksWithClip({
			startTime: TICKS_PER_SECOND,
			duration: TICKS_PER_SECOND,
		});

		expect(getElementsAtTime({ tracks, time: TICKS_PER_SECOND })).toHaveLength(
			1,
		);
		expect(
			getElementsAtTime({ tracks, time: 2 * TICKS_PER_SECOND - 1 }),
		).toHaveLength(1);
		expect(
			getElementsAtTime({ tracks, time: 2 * TICKS_PER_SECOND }),
		).toHaveLength(0);
	});

	test("does not match a clip that starts later than the queried time", () => {
		const tracks = tracksWithClip({
			startTime: 5_000,
			duration: TICKS_PER_SECOND,
		});

		expect(getElementsAtTime({ tracks, time: 0 })).toHaveLength(0);
	});
});
