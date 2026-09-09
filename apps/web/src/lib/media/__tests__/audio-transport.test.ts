import { afterEach, expect, mock, test } from "bun:test";
import { buildSceneTracks, buildVideoElement, buildVideoTrack } from "@/tests/factories/editor";
import type { LibraryAudioElement } from "@/lib/timeline/types";

// `@/lib/media/audio` imports `TICKS_PER_SECOND` from `@/lib/wasm`,
// which reads the wasm instance. The wasm instance is not instantiated in
// the bun:test environment, so mock the `artidor-wasm` module with the fixed
// tick rate (120_000 — see rust/crates/time/src/media_time.rs), mirroring the
// pattern in `apps/web/src/lib/media/__tests__/audio-silence.test.ts`.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
	initializeGpu: () => Promise.resolve(),
	destroyGpu: () => {},
	applyEffectPasses: () => [0, 0, 0],
	applyMaskFeather: () => [0, 0, 0],
}));

const { collectAudioClips } = await import("../audio");
const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

const library: LibraryAudioElement = {
	id: "library",
	name: "Library",
	type: "audio",
	sourceType: "library",
	sourceUrl: "https://example.test/audio",
	startTime: 240_000,
	duration: 600_000,
	trimStart: 120_000,
	trimEnd: 60_000,
	volume: 0,
	muted: false,
};

test("library playback converts all timeline tick fields to seconds", async () => {
	globalThis.fetch = mock(async () => new Response(new Blob(["audio"]))) as typeof fetch;
	const clips = await collectAudioClips({
		tracks: buildSceneTracks({
			audio: [{ id: "audio", name: "Audio", type: "audio", muted: false, elements: [library] }],
		}),
		mediaAssets: [],
	});
	expect(clips).toHaveLength(1);
	expect(clips[0]).toMatchObject({
		startTime: 2,
		duration: 5,
		trimStart: 1,
		trimEnd: 0.5,
		trackId: "audio",
	});
	expect(clips[0]?.timelineElement).toBe(library);
});

test("collection covers every ordered video group, live track mute, and uploaded audio in seconds", async () => {
	const video = buildVideoElement({
		startTime: 240_000,
		duration: 600_000,
		trimStart: 120_000,
		trimEnd: 60_000,
	});
	const upload = {
		id: "upload",
		name: "Upload",
		type: "audio",
		sourceType: "upload",
		mediaId: "media",
		startTime: 240_000,
		duration: 600_000,
		trimStart: 120_000,
		trimEnd: 60_000,
		volume: 0,
		muted: false,
	};
	const tracks = buildSceneTracks({
		overlay: [
			buildVideoTrack({ id: "above", muted: true, elements: [{ ...video, id: "above" }] }),
		],
		main: buildVideoTrack({ elements: [{ ...video, id: "main" }] }),
		overlayAfter: [
			buildVideoTrack({ id: "below", elements: [{ ...video, id: "below", selectedAudioTrackIndex: 1 }] }),
		],
		audio: [{ id: "audio", name: "Audio", type: "audio", muted: false, elements: [upload] }],
	});
	const mediaAssets = [
		{ id: "media", name: "Media", type: "video", hasAudio: true, file: new File([], "media.mp4") },
	];
	const clips = await collectAudioClips({ tracks, mediaAssets });
	expect(clips.map((clip) => clip.id)).toEqual(["above", "main", "below", "upload"]);
	for (const clip of clips) {
		expect(clip).toMatchObject({ startTime: 2, duration: 5, trimStart: 1, trimEnd: 0.5 });
	}
	expect(clips[0]?.muted).toBe(true);
	expect(clips[2]?.sourceKey).toBe("media#audio1");
});
