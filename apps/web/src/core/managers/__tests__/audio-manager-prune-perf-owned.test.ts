/**
 * Audio cache perf regressions: a timeline notification while PAUSED must not
 * wipe every decoded clip.
 *
 * `handleTimelineChange` used to call `disposeSinks()` and clear both decoded
 * caches on every notification while paused, so nudging a volume slider forced
 * a full re-decode of every audio clip on the next play. These tests pin the
 * prune-to-timeline behaviour: entries a live clip can still hit stay warm,
 * entries no live clip can hit are dropped.
 *
 * The manager runs for real; only WebAudio and the media decoders are faked.
 */
import { afterEach, describe, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { AudioClipSource } from "@/lib/media/audio";
import type { SceneTracks, VideoElement } from "@/lib/timeline/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { buildSceneTracks, buildVideoElement, buildVideoTrack } from "@/tests/factories/editor";
import { AudioManager } from "../audio-manager";

type Internals = {
	clips: AudioClipSource[];
	preparedClipBuffers: Map<string, Promise<AudioBuffer | null>>;
	decodedBuffers: Map<string, Promise<AudioBuffer | null>>;
	sinks: Map<string, unknown>;
	inputs: Map<string, { dispose: () => void }>;
	buildPreparedClipCacheKey(args: { clip: AudioClipSource }): string;
	pruneAudioCachesToTimeline(): void;
};

const managers: InstanceType<typeof AudioManager>[] = [];
afterEach(() => {
	for (const manager of managers) manager.dispose();
	managers.length = 0;
});

function fixture(tracks: SceneTracks) {
	const transport = { playing: false, ticks: 0 };
	let activeScene: { tracks: SceneTracks } | null = { tracks };
	const editor = {
		playback: {
			getVolume: () => 1,
			getCurrentTime: () => transport.ticks,
			getIsPlaying: () => transport.playing,
			getIsScrubbing: () => false,
			subscribe: () => () => undefined,
		},
		timeline: {
			subscribe: () => () => undefined,
			getTotalDuration: () => 20 * TICKS_PER_SECOND,
		},
		media: { subscribe: () => () => undefined, getAssets: () => [] },
		scenes: {
			subscribe: () => () => undefined,
			getActiveScene: () => activeScene ?? { tracks },
			getActiveSceneOrNull: () => activeScene,
		},
	} as unknown as EditorCore;
	const manager = new AudioManager(editor);
	managers.push(manager);
	return {
		state: manager as unknown as Internals,
		tracks,
		transport,
		setScene(next: { tracks: SceneTracks } | null) {
			activeScene = next;
		},
	};
}

function clipFor(element: VideoElement): AudioClipSource {
	return {
		id: element.id,
		trackId: "main",
		timelineElement: element,
		sourceKey: element.mediaId,
		file: new File([], "fixture.mp4"),
		startTime: element.startTime / TICKS_PER_SECOND,
		duration: element.duration / TICKS_PER_SECOND,
		trimStart: element.trimStart / TICKS_PER_SECOND,
		trimEnd: element.trimEnd / TICKS_PER_SECOND,
		volume: 1,
		muted: false,
		retime: element.retime,
	};
}

/** Fills the decoded caches + sinks the way a previous playback session did. */
function seed(
	state: Internals,
	clips: AudioClipSource[],
): { preparedKeys: Map<string, string>; sourceKeys: string[] } {
	const preparedKeys = new Map<string, string>();
	const sourceKeys: string[] = [];
	for (const clip of clips) {
		const key = state.buildPreparedClipCacheKey({ clip });
		preparedKeys.set(clip.id, key);
		state.preparedClipBuffers.set(key, Promise.resolve(null));
		if (!sourceKeys.includes(clip.sourceKey)) {
			sourceKeys.push(clip.sourceKey);
			state.decodedBuffers.set(clip.sourceKey, Promise.resolve(null));
			const input = { dispose: mock(() => {}) };
			state.inputs.set(clip.sourceKey, input);
			state.sinks.set(clip.sourceKey, {});
		}
	}
	return { preparedKeys, sourceKeys };
}

describe("audio manager: paused timeline prune", () => {
	test("a volume-only change keeps every decoded clip warm", () => {
		const element = buildVideoElement({ id: "a", duration: 600_000 });
		const other = buildVideoElement({
			id: "b",
			mediaId: "media-2",
			duration: 600_000,
			startTime: 600_000,
		});
		const f = fixture(
			buildSceneTracks({ main: buildVideoTrack({ elements: [element, other] }) }),
		);
		const clipA = clipFor(element);
		const clipB = clipFor(other);
		const { preparedKeys } = seed(f.state, [clipA, clipB]);

		f.state.pruneAudioCachesToTimeline();

		expect(f.state.preparedClipBuffers.has(preparedKeys.get("a") as string)).toBe(true);
		expect(f.state.preparedClipBuffers.has(preparedKeys.get("b") as string)).toBe(true);
		expect(f.state.decodedBuffers.size).toBe(2);
		expect(f.state.sinks.size).toBe(2);
		expect(f.state.inputs.size).toBe(2);
	});

	test("a removed clip releases only its own decoded audio", () => {
		const kept = buildVideoElement({ id: "keep", duration: 600_000 });
		const removed = buildVideoElement({
			id: "gone",
			mediaId: "media-2",
			duration: 600_000,
			startTime: 600_000,
		});
		const f = fixture(
			buildSceneTracks({ main: buildVideoTrack({ elements: [kept, removed] }) }),
		);
		const { preparedKeys } = seed(f.state, [clipFor(kept), clipFor(removed)]);
		const removedInput = f.state.inputs.get("media-2");

		// The user deletes the second clip from the timeline.
		f.tracks.main.elements = [kept];
		f.state.pruneAudioCachesToTimeline();

		expect(f.state.preparedClipBuffers.has(preparedKeys.get("keep") as string)).toBe(true);
		expect(f.state.preparedClipBuffers.has(preparedKeys.get("gone") as string)).toBe(false);
		expect(f.state.decodedBuffers.has("media-2")).toBe(false);
		expect(f.state.sinks.has("media-2")).toBe(false);
		expect(f.state.inputs.has("media-2")).toBe(false);
		// The disposed Input is what actually frees the demuxer.
		expect(removedInput?.dispose).toHaveBeenCalledTimes(1);
		expect(f.state.decodedBuffers.has("media")).toBe(true);
	});

	test("a retimed clip drops its stale prepared buffer", () => {
		const before = buildVideoElement({
			id: "r",
			duration: 600_000,
			retime: { rate: 1, mode: "curve", keyframes: [{ time: 0, speed: 1 }] },
		});
		const f = fixture(
			buildSceneTracks({ main: buildVideoTrack({ elements: [before] }) }),
		);
		const { preparedKeys } = seed(f.state, [clipFor(before)]);

		// The user changes the speed curve: the prepared buffer no longer
		// matches, and the decoded source stays valid (same media, same trim).
		f.tracks.main.elements = [
			{
				...before,
				retime: { rate: 1, mode: "curve", keyframes: [{ time: 0, speed: 2 }] },
			},
		];
		f.state.pruneAudioCachesToTimeline();

		expect(f.state.preparedClipBuffers.has(preparedKeys.get("r") as string)).toBe(false);
		expect(f.state.decodedBuffers.size).toBe(1);
	});

	test("a re-trimmed clip drops its stale prepared buffer", () => {
		const before = buildVideoElement({ id: "t", duration: 600_000, trimStart: 0 });
		const f = fixture(
			buildSceneTracks({ main: buildVideoTrack({ elements: [before] }) }),
		);
		const { preparedKeys } = seed(f.state, [clipFor(before)]);

		f.tracks.main.elements = [{ ...before, trimStart: 120_000 }];
		f.state.pruneAudioCachesToTimeline();

		expect(f.state.preparedClipBuffers.has(preparedKeys.get("t") as string)).toBe(false);
	});

	test("without an active scene the prune falls back to a full clear", () => {
		const element = buildVideoElement({ id: "a", duration: 600_000 });
		const f = fixture(
			buildSceneTracks({ main: buildVideoTrack({ elements: [element] }) }),
		);
		seed(f.state, [clipFor(element)]);
		// No active scene: the prune cannot tell which entries are live, so it
		// must not keep anything it cannot justify.
		f.setScene(null);

		f.state.pruneAudioCachesToTimeline();

		expect(f.state.preparedClipBuffers.size).toBe(0);
		expect(f.state.decodedBuffers.size).toBe(0);
		expect(f.state.sinks.size).toBe(0);
		expect(f.state.inputs.size).toBe(0);
	});
});
