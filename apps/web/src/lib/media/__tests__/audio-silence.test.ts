import { beforeAll, describe, expect, mock, test } from "bun:test";

// `@/lib/media/audio` imports `TICKS_PER_SECOND` from `@/lib/wasm`,
// which reads the wasm instance. The wasm instance is not instantiated
// in the bun:test environment, so mock the `artidor-wasm` module with
// the fixed tick rate (120_000 — see rust/crates/time/src/media_time.rs).
// This mirrors the existing pattern in
// `apps/web/src/lib/animation/__tests__/transform-z-and-groups.test.ts`.
mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: 120_000,
	roundToFrame: ({ time }: { time: number }) => time,
	snappedSeekTime: ({ time }: { time: number }) => time,
}));

let timelineHasAudio: typeof import("../audio").timelineHasAudio;
let collectAudioClips: typeof import("../audio").collectAudioClips;
import type {
	SceneTracks,
	VideoTrack,
	AudioTrack,
	VideoElement,
	UploadAudioElement,
} from "../../timeline/types";
import type { MediaAsset } from "../types";

beforeAll(async () => {
	({ timelineHasAudio, collectAudioClips } = await import("../audio"));
});

/**
 * Unit tests for `timelineHasAudio`, the helper the audio meter
 * components rely on to decide whether the meter should be silent
 * (flat / idle). The meter must NOT light up when the timeline has no
 * audible candidate — e.g. a video with no audio track, a muted
 * element, or a muted track.
 *
 * Fixtures are kept minimal: `timelineHasAudio` only inspects
 * `track.muted`, `track.elements`, `element.type`, `element.duration`,
 * `element.muted`, `element.mediaId`, `element.isSourceAudioEnabled`,
 * and `mediaAsset.type` / `mediaAsset.hasAudio`. We construct only
 * those fields and cast to the full element type to avoid building
 * every optional property of `VideoElement`.
 */

function makeVideoAsset({
	id,
	hasAudio,
}: {
	id: string;
	hasAudio?: boolean;
}): MediaAsset {
	return {
		id,
		name: `video-${id}`,
		type: "video",
		file: new File([], `video-${id}.mp4`, { type: "video/mp4" }),
		hasAudio,
	};
}

function makeVideoElement({
	id,
	mediaId,
	muted,
	isSourceAudioEnabled,
}: {
	id: string;
	mediaId: string;
	muted?: boolean;
	isSourceAudioEnabled?: boolean;
}): VideoElement {
	return {
		id,
		name: `el-${id}`,
		type: "video",
		mediaId,
		startTime: 0,
		duration: 1000,
		trimStart: 0,
		trimEnd: 0,
		muted,
		isSourceAudioEnabled,
		transform: { scaleX: 1, scaleY: 1, position: { x: 0, y: 0 }, rotate: 0 },
		opacity: 1,
	} as unknown as VideoElement;
}

function makeUploadAudioElement({
	id,
	mediaId,
	muted,
}: {
	id: string;
	mediaId: string;
	muted?: boolean;
}): UploadAudioElement {
	return {
		id,
		name: `audio-${id}`,
		type: "audio",
		sourceType: "upload",
		mediaId,
		startTime: 0,
		duration: 1000,
		trimStart: 0,
		trimEnd: 0,
		muted,
	} as unknown as UploadAudioElement;
}

function emptyMainTrack(): VideoTrack {
	return {
		id: "main",
		name: "Main",
		type: "video",
		muted: false,
		hidden: false,
		elements: [],
	};
}

function tracksWithMain(
	main: VideoTrack,
	audio: AudioTrack[] = [],
): SceneTracks {
	return { overlay: [], main, overlayAfter: [], audio };
}

describe("timelineHasAudio", () => {
	test("empty timeline has no audio", () => {
		expect(
			timelineHasAudio({
				tracks: tracksWithMain(emptyMainTrack()),
				mediaAssets: [],
			}),
		).toBe(false);
	});

	test("video element whose media has no audio track is silent", () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: false });
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [makeVideoElement({ id: "e1", mediaId: "v1" })],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [asset] }),
		).toBe(false);
	});

	test("video element with audio and source audio enabled is audible", () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: true });
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [
				makeVideoElement({
					id: "e1",
					mediaId: "v1",
					isSourceAudioEnabled: true,
				}),
			],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [asset] }),
		).toBe(true);
	});

	test("muted video element is silent", () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: true });
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [
				makeVideoElement({
					id: "e1",
					mediaId: "v1",
					muted: true,
					isSourceAudioEnabled: true,
				}),
			],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [asset] }),
		).toBe(false);
	});

	test("muted track makes its audible element silent", () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: true });
		const main: VideoTrack = {
			...emptyMainTrack(),
			muted: true,
			elements: [
				makeVideoElement({
					id: "e1",
					mediaId: "v1",
					isSourceAudioEnabled: true,
				}),
			],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [asset] }),
		).toBe(false);
	});

	test("audio track with an unmuted upload element is audible", () => {
		const asset = makeVideoAsset({ id: "a1", hasAudio: true });
		const audioTrack: AudioTrack = {
			id: "audio-1",
			name: "Audio 1",
			type: "audio",
			muted: false,
			elements: [makeUploadAudioElement({ id: "e1", mediaId: "a1" })],
		};
		expect(
			timelineHasAudio({
				tracks: tracksWithMain(emptyMainTrack(), [audioTrack]),
				mediaAssets: [asset],
			}),
		).toBe(true);
	});

	test("audio track muted makes its element silent", () => {
		const asset = makeVideoAsset({ id: "a1", hasAudio: true });
		const audioTrack: AudioTrack = {
			id: "audio-1",
			name: "Audio 1",
			type: "audio",
			muted: true,
			elements: [makeUploadAudioElement({ id: "e1", mediaId: "a1" })],
		};
		expect(
			timelineHasAudio({
				tracks: tracksWithMain(emptyMainTrack(), [audioTrack]),
				mediaAssets: [asset],
			}),
		).toBe(false);
	});

	test("upload audio with missing media asset is silent", () => {
		const audioTrack: AudioTrack = {
			id: "audio-1",
			name: "Audio 1",
			type: "audio",
			muted: false,
			elements: [makeUploadAudioElement({ id: "e1", mediaId: "missing" })],
		};
		expect(
			timelineHasAudio({
				tracks: tracksWithMain(emptyMainTrack(), [audioTrack]),
				mediaAssets: [],
			}),
		).toBe(false);
	});

	test("video element with source audio separated (disabled) is silent", () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: true });
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [
				makeVideoElement({
					id: "e1",
					mediaId: "v1",
					isSourceAudioEnabled: false,
				}),
			],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [asset] }),
		).toBe(false);
	});

	test("missing media asset for a video element is silent", () => {
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [makeVideoElement({ id: "e1", mediaId: "missing" })],
		};
		expect(
			timelineHasAudio({ tracks: tracksWithMain(main), mediaAssets: [] }),
		).toBe(false);
	});
});

describe("collectAudioClips", () => {
	test("adds each audible video clip once", async () => {
		const asset = makeVideoAsset({ id: "v1", hasAudio: true });
		const main: VideoTrack = {
			...emptyMainTrack(),
			elements: [
				makeVideoElement({
					id: "e1",
					mediaId: "v1",
					isSourceAudioEnabled: true,
				}),
			],
		};

		const clips = await collectAudioClips({
			tracks: tracksWithMain(main),
			mediaAssets: [asset],
		});

		expect(clips.map((clip) => clip.id)).toEqual(["e1"]);
	});
});
