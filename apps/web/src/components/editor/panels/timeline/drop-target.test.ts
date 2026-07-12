import { expect, test } from "bun:test";
import { computeDropTarget } from "./drop-target";

const ONE_SECOND_TICKS = 120_000;

/** Track height in px — must match getTrackHeight for video tracks. */
const VIDEO_TRACK_HEIGHT = 56;
const AUDIO_TRACK_HEIGHT = 56;
const TRACK_GAP = 4;

test("image media dropped onto the main track lands on the main track", () => {
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

/**
 * Bug: audio element dragged over an overlay (visual) track used to
 * "snap to main track" via the type-wall shortcut. But the main track
 * is a video track — audio cannot go on it — so MoveElementCommand
 * would throw and the element stayed at its original (left) position.
 *
 * Expected after fix: the wall does NOT snap audio to the main track.
 * Instead, computeDropTarget falls through to resolveTrackPlacement,
 * which creates a new audio track below the main track.
 */
test("audio dragged over an overlay track creates a new audio track, not snap to main video track", () => {
	const overlayTrackHeight = VIDEO_TRACK_HEIGHT;
	// Mouse Y is inside the overlay track (first track, 0..overlayTrackHeight)
	const mouseY = overlayTrackHeight / 2;

	const target = computeDropTarget({
		elementType: "audio",
		mouseX: 300,
		mouseY,
		tracks: {
			overlay: [
				{
					id: "overlay-1",
					name: "Overlay 1",
					type: "text",
					elements: [],
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
			audio: [],
		},
		playheadTime: 0,
		isExternalDrop: false,
		elementDuration: ONE_SECOND_TICKS,
		pixelsPerSecond: 100,
		zoomLevel: 1,
	});

	// Should NOT land on the main video track (index 1 = overlay.length).
	// Audio cannot go on a video track — that was the bug.
	expect(target.isNewTrack).toBe(true);
	// New audio track should be inserted below the main track.
	expect(target.trackIndex).toBe(2); // overlay(1) + main(1) = 2 → first audio slot
	expect(target.xPosition).toBe(Math.round((300 / 100) * ONE_SECOND_TICKS));
});

/**
 * Audio dragged over the main video track should also create a new
 * audio track below the main track, not snap to the main track.
 */
test("audio dragged over the main track creates a new audio track below main", () => {
	const mainTrackY = VIDEO_TRACK_HEIGHT + TRACK_GAP + VIDEO_TRACK_HEIGHT / 2;

	const target = computeDropTarget({
		elementType: "audio",
		mouseX: 200,
		mouseY: mainTrackY,
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

	expect(target.isNewTrack).toBe(true);
	expect(target.trackIndex).toBe(1); // main(1) → first audio slot
});

/**
 * Audio dragged over an existing audio track should land on that
 * track (no new track needed when there's no overlap).
 */
test("audio dragged over an existing audio track lands on that track", () => {
	const audioTrackY =
		VIDEO_TRACK_HEIGHT + // overlay
		TRACK_GAP +
		VIDEO_TRACK_HEIGHT + // main
		TRACK_GAP +
		AUDIO_TRACK_HEIGHT / 2; // first audio track

	const target = computeDropTarget({
		elementType: "audio",
		mouseX: 400,
		mouseY: audioTrackY,
		tracks: {
			overlay: [
				{
					id: "overlay-1",
					name: "Overlay 1",
					type: "text",
					elements: [],
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
		pixelsPerSecond: 100,
		zoomLevel: 1,
	});

	expect(target.isNewTrack).toBe(false);
	expect(target.trackIndex).toBe(2); // overlay(1) + main(1) + audio(0) = index 2
});

/**
 * Video dragged over an audio track should still snap to the main
 * track (video CAN go on the main video track). This preserves the
 * existing UX for video/image elements.
 */
test("video dragged over an audio track snaps to main track", () => {
	const audioTrackY =
		VIDEO_TRACK_HEIGHT + // main (no overlay)
		TRACK_GAP +
		AUDIO_TRACK_HEIGHT / 2;

	const target = computeDropTarget({
		elementType: "video",
		mouseX: 200,
		mouseY: audioTrackY,
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
		pixelsPerSecond: 100,
		zoomLevel: 1,
	});

	// Video can go on the main track — wall behavior is correct here.
	expect(target.isNewTrack).toBe(false);
	expect(target.trackIndex).toBe(0); // main track
});
