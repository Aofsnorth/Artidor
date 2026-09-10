import { describe, expect, test } from "bun:test";
import { computeDropTarget } from "./drop-target";
import type { SceneTracks } from "@/lib/timeline";

const ONE_SECOND_TICKS = 120_000;
const PPS = 100;

/** Track heights here mirror layout.ts (video 64 / text 44 / audio 50 / effect 44). */
const VIDEO_H = 64;
const TEXT_H = 44;
const AUDIO_H = 50;
const GAP = 4;

function tracksWithMain(): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main",
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

describe("drop kind × target kind matrix (bughunt R02)", () => {
	test("text dropped on a video track creates a new text track (no wrong apply)", () => {
		const target = computeDropTarget({
			elementType: "text",
			mouseX: 120,
			// main track occupies 0..VIDEO_H (minus 2px top padding → still inside)
			mouseY: 10,
			tracks: tracksWithMain(),
			playheadTime: 0,
			isExternalDrop: false,
			elementDuration: ONE_SECOND_TICKS,
			pixelsPerSecond: PPS,
			zoomLevel: 1,
		});
		expect(target.isNewTrack).toBe(true);
	});

	test("video dropped on an audio track snaps back to main (documented wall)", () => {
		const audioY = VIDEO_H + GAP + AUDIO_H / 2;
		const target = computeDropTarget({
			elementType: "video",
			mouseX: 200,
			mouseY: audioY,
			tracks: {
				...tracksWithMain(),
				audio: [
					{
						id: "audio-1",
						name: "Audio 1",
						type: "audio",
						elements: [],
						muted: false,
					},
				],
			},
			playheadTime: 0,
			isExternalDrop: false,
			elementDuration: ONE_SECOND_TICKS,
			pixelsPerSecond: PPS,
			zoomLevel: 1,
		});
		expect(target.isNewTrack).toBe(false);
		expect(target.trackIndex).toBe(0);
	});

	test("effect dropped over a compatible element resolves that element", () => {
		const clip = {
			id: "clip-1",
			type: "video",
			name: "Clip",
			startTime: 0,
			duration: 10 * ONE_SECOND_TICKS,
			mediaId: "m1",
			trimStart: 0,
			trimEnd: 0,
		} as never;
		const target = computeDropTarget({
			elementType: "effect",
			// 1s into the clip.
			mouseX: PPS * 1,
			mouseY: 10,
			tracks: {
				overlay: [],
				main: {
					id: "main",
					name: "Main",
					type: "video",
					elements: [clip],
					muted: false,
					hidden: false,
				},
				overlayAfter: [],
				audio: [],
			},
			playheadTime: 0,
			isExternalDrop: false,
			elementDuration: ONE_SECOND_TICKS,
			pixelsPerSecond: PPS,
			zoomLevel: 1,
			targetElementTypes: ["video", "image", "text", "sticker", "graphic"],
		});
		expect(target.targetElement).toEqual({
			elementId: "clip-1",
			trackId: "main",
		});
	});

	test("effect dropped over an incompatible element does not resolve it", () => {
		const audioClip = {
			id: "a-1",
			type: "audio",
			name: "Audio",
			startTime: 0,
			duration: 10 * ONE_SECOND_TICKS,
			volume: 1,
			trimStart: 0,
			trimEnd: 0,
		} as never;
		const target = computeDropTarget({
			elementType: "effect",
			mouseX: PPS * 1,
			// Main track first, audio track second.
			mouseY: VIDEO_H + GAP + AUDIO_H / 2,
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
				overlayAfter: [],
				audio: [
					{
						id: "audio-1",
						name: "Audio 1",
						type: "audio",
						elements: [audioClip],
						muted: false,
					},
				],
			},
			playheadTime: 0,
			isExternalDrop: false,
			elementDuration: ONE_SECOND_TICKS,
			pixelsPerSecond: PPS,
			zoomLevel: 1,
			targetElementTypes: ["video", "image", "text", "sticker", "graphic"],
		});
		// Audio is not in targetElementTypes → no element apply, and the effect
		// cannot live on an audio track → a new track is proposed instead.
		expect(target.targetElement).toBeNull();
		expect(target.isNewTrack).toBe(true);
	});

	test("overlay text track keeps text drops (no spurious new track)", () => {
		const textClip = {
			id: "tx-1",
			type: "text",
			name: "Title",
			startTime: 5 * ONE_SECOND_TICKS,
			duration: ONE_SECOND_TICKS,
			content: "hi",
			trimStart: 0,
			trimEnd: 0,
		} as never;
		const target = computeDropTarget({
			elementType: "text",
			mouseX: PPS * 8,
			mouseY: TEXT_H / 2,
			tracks: {
				overlay: [
					{
						id: "ov-1",
						name: "Overlay 1",
						type: "text",
						elements: [textClip],
						hidden: false,
					},
				],
				main: {
					id: "main",
					name: "Main",
					type: "video",
					elements: [],
					muted: false,
					hidden: false,
				},
				overlayAfter: [],
				audio: [],
			},
			playheadTime: 0,
			isExternalDrop: false,
			elementDuration: ONE_SECOND_TICKS,
			pixelsPerSecond: PPS,
			zoomLevel: 1,
		});
		expect(target.isNewTrack).toBe(false);
		expect(target.trackIndex).toBe(0);
	});
});
