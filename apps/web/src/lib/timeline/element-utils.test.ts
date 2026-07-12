import { describe, expect, test } from "bun:test";
import { findOrCreateTextTrack } from "@/lib/timeline/element-utils";
import type { EditorCore } from "@/core";
import type { SceneTracks, TimelineTrack } from "@/lib/timeline";

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
