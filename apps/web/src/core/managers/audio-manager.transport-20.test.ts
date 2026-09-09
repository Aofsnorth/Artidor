import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import { upsertElementKeyframe } from "@/lib/animation/keyframes";
import type { AudioClipSource } from "@/lib/media/audio";
import * as audioModule from "@/lib/media/audio";
import type { SceneTracks, VideoElement } from "@/lib/timeline/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { buildSceneTracks, buildVideoElement, buildVideoTrack } from "@/tests/factories/editor";

// Retain exports; fake only I/O. No browser persistence, GPU or actual media.
const collect = mock< typeof audioModule.collectAudioClips >(() => Promise.resolve([]));
mock.module("@/lib/media/audio", () => ({ ...audioModule, collectAudioClips: collect }));
const { AudioManager } = await import("./audio-manager");

class Gain {
	value = 1;
	events: Array<{ kind: "set" | "ramp"; value: number; time: number }> = [];
	setValueAtTime(value: number, time: number) {
		this.events.push({ kind: "set", value, time });
	}
	linearRampToValueAtTime(value: number, time: number) {
		this.events.push({ kind: "ramp", value, time });
	}
	cancelScheduledValues(time: number) {
		this.events = this.events.filter((event) => event.time < time);
	}
}
function gainNode() {
	return { gain: new Gain(), connect: mock(), disconnect: mock() };
}
function sourceNode() {
	return {
		buffer: null as AudioBuffer | null,
		playbackRate: { value: 1 },
		connect: mock(), disconnect: mock(), start: mock(), stop: mock(),
		addEventListener: mock(),
	};
}
function context() {
	const sources: ReturnType<typeof sourceNode>[] = [];
	const gains: ReturnType<typeof gainNode>[] = [];
	return {
		currentTime: 10, state: "running", destination: {},
		resume: mock(() => Promise.resolve()), close: mock(() => Promise.resolve()),
		createBufferSource: () => { const node = sourceNode(); sources.push(node); return node; },
		createGain: () => { const node = gainNode(); gains.push(node); return node; },
		sources, gains,
	};
}
// Access state and codec boundaries, never replace the lifecycle/live-update
// methods being tested. The actual classes run without constructing WebAudio.
type Internals = {
	clips: AudioClipSource[];
	playbackSessionId: number;
	playbackStartTime: number;
	playbackStartContextTime: number;
	activeClipGains: Map<string, Set<GainNode>>;
	activeClipIds: Set<string>;
	preparedClipBuffers: Map<string, Promise<AudioBuffer | null>>;
	clipIterators: Map<string, AsyncGenerator<{ buffer: AudioBuffer; timestamp: number }, void, unknown>>;
	applyLiveAudioUpdates(): boolean;
	startPlayback(): Promise<void>;
	stopPlayback(): void;
	runClipIterator(args: { clip: AudioClipSource; startTime: number; sessionId: number }): Promise<void>;
	schedulePreparedClip(args: { clip: AudioClipSource; startTime: number; sessionId: number }): Promise<void>;
	buildPreparedClipCacheKey(args: { clip: AudioClipSource }): string;
	scheduleClipGainAutomation(args: { audioContext: AudioContext; clip: AudioClipSource; clipGain: GainNode; startTimestamp: number; startLocalTime: number }): void;
};
const managers: InstanceType<typeof AudioManager>[] = [];
beforeEach(() => { collect.mockReset(); collect.mockResolvedValue([]); });
afterEach(() => { for (const manager of managers) manager.dispose(); managers.length = 0; });

function fixture(tracks: SceneTracks = buildSceneTracks()) {
	const clock = context();
	const transport = { playing: true, ticks: 0 };
	const listeners = new Set<() => void>();
	const editor = {
		playback: {
			getVolume: () => 1, getCurrentTime: () => transport.ticks,
			getIsPlaying: () => transport.playing, getIsScrubbing: () => false,
			subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
		},
		timeline: { subscribe: () => () => undefined, getTotalDuration: () => 20 * TICKS_PER_SECOND },
		media: { subscribe: () => () => undefined, getAssets: () => [] },
		scenes: { subscribe: () => () => undefined, getActiveScene: () => ({ tracks }), getActiveSceneOrNull: () => ({ tracks }) },
	} as unknown as EditorCore;
	const manager = new AudioManager(editor);
	Object.defineProperty(manager, "audioContext", { value: clock, writable: true });
	const state = manager as unknown as Internals;
	state.playbackStartTime = 0;
	state.playbackStartContextTime = clock.currentTime;
	managers.push(manager);
	return { manager, state, tracks, clock, transport, notify: () => { for (const listener of listeners) listener(); } };
}
function clipFor(element: VideoElement = buildVideoElement({ duration: 600_000 }), trackId = "main"): AudioClipSource {
	return {
		id: element.id, trackId, timelineElement: element, sourceKey: element.mediaId,
		file: new File([], "fixture.mp4"), startTime: element.startTime / TICKS_PER_SECOND,
		duration: element.duration / TICKS_PER_SECOND, trimStart: element.trimStart / TICKS_PER_SECOND,
		trimEnd: element.trimEnd / TICKS_PER_SECOND, volume: 1, muted: false,
	};
}
function register(f: ReturnType<typeof fixture>, clip: AudioClipSource) {
	const node = gainNode();
	f.state.clips.push(clip);
	f.state.activeClipGains.set(clip.id, new Set([node as unknown as GainNode]));
	return node;
}
function prepared(f: ReturnType<typeof fixture>, clip: AudioClipSource, promise: Promise<AudioBuffer | null>) {
	f.state.preparedClipBuffers.set(f.state.buildPreparedClipCacheKey({ clip }), promise);
}
const buffer = { duration: 5, sampleRate: 48_000 } as AudioBuffer;

test("R15 rejected decode releases the clip for retry; resume failure is handled", async () => {
	const f = fixture(); const clip = clipFor();
	f.state.activeClipIds.add(clip.id);
	prepared(f, clip, Promise.reject(new Error("decoder unavailable")));
	await f.state.schedulePreparedClip({ clip, startTime: 0, sessionId: f.state.playbackSessionId });
	expect(f.state.activeClipIds.has(clip.id)).toBe(false);
	f.clock.state = "suspended";
	f.clock.resume.mockRejectedValueOnce(new Error("resume rejected"));
	await f.state.startPlayback();
	expect(f.clock.sources).toHaveLength(0);
	f.clock.state = "running";
	await f.state.startPlayback();
	expect(collect).toHaveBeenCalledTimes(1);
});

test("R14 source and same-length speed curve edits require a restart", () => {
	const old = buildVideoElement({ duration: 600_000, retime: { rate: 1, mode: "curve", keyframes: [{ time: 0, speed: 1 }, { time: 1, speed: 2 }] } });
	const f = fixture(buildSceneTracks({ main: buildVideoTrack({ elements: [old] }) }));
	const clip = { ...clipFor(old), retime: old.retime }; register(f, clip);
	f.tracks.main.elements = [{ ...old, retime: { rate: 1, mode: "curve", keyframes: [{ time: 0, speed: 2 }, { time: 1, speed: 1 }] } }];
	expect(f.state.applyLiveAudioUpdates()).toBe(false);
	f.tracks.main.elements = [{ ...old, mediaId: "replacement" }];
	expect(f.state.applyLiveAudioUpdates()).toBe(false);
	f.tracks.main.elements = [{ ...old, selectedAudioTrackIndex: 1 }];
	expect(f.state.applyLiveAudioUpdates()).toBe(false);
});

test("R12 stale iterator completion cannot schedule or remove its replacement", async () => {
	const f = fixture(); const clip = clipFor();
	const late = Promise.withResolvers<void>();
	async function* oldBuffers() { await late.promise; yield { buffer, timestamp: 0 }; }
	async function* replacementBuffers() { yield { buffer, timestamp: 0 }; }
	Object.defineProperty(f.manager, "getAudioSink", { value: () => Promise.resolve({ buffers: oldBuffers }) });
	const pending = f.state.runClipIterator({ clip, startTime: 0, sessionId: f.state.playbackSessionId });
	await Promise.resolve();
	f.state.stopPlayback();
	const replacement = replacementBuffers();
	f.state.clipIterators.set(clip.id, replacement);
	late.resolve(); await pending;
	expect(f.clock.sources).toHaveLength(0);
	expect(f.state.clipIterators.get(clip.id)).toBe(replacement);
});

 test("R01 live mute and unmute reach all track groups", () => {
	const tracks = buildSceneTracks({
		overlay: [buildVideoTrack({ id: "above", elements: [buildVideoElement({ id: "above" })] })],
		main: buildVideoTrack({ elements: [buildVideoElement()] }),
		overlayAfter: [buildVideoTrack({ id: "below", elements: [buildVideoElement({ id: "below" })] })],
		audio: [{ id: "audio", name: "Audio", type: "audio", muted: false, elements: [{ id: "audio-clip", name: "Audio", type: "audio", sourceType: "upload", mediaId: "media", startTime: 0, duration: 120_000, trimStart: 0, trimEnd: 0, volume: 0 }] }],
	});
	const f = fixture(tracks);
	const ordered = [...tracks.overlay, tracks.main, ...tracks.overlayAfter, ...tracks.audio];
	const nodes = ordered.map((track) => {
		const element = track.elements.at(0);
		if (!element) throw new Error("missing fixture element");
		const clip = { ...clipFor(), id: element.id, trackId: track.id, duration: 1, timelineElement: element } as AudioClipSource;
		return register(f, clip);
	});
	for (const track of ordered) track.muted = true;
	expect(f.state.applyLiveAudioUpdates()).toBe(true);
	for (const node of nodes) expect(node.gain.events.at(-1)?.value).toBe(0);
	for (const track of ordered) track.muted = false;
	expect(f.state.applyLiveAudioUpdates()).toBe(true);
	for (const node of nodes) expect(node.gain.events.at(-1)?.value).toBe(1);
});

test("R02 anchor reads transport after deferred resume and collection", async () => {
	const f = fixture();
	const resume = Promise.withResolvers<void>();
	const collection = Promise.withResolvers<AudioClipSource[]>();
	f.clock.state = "suspended";
	f.clock.resume.mockReturnValueOnce(resume.promise);
	collect.mockReturnValueOnce(collection.promise);
	const pending = f.state.startPlayback();
	f.transport.ticks = 120_000;
	resume.resolve();
	await Promise.resolve();
	f.transport.ticks = 360_000;
	f.clock.currentTime = 15;
	collection.resolve([]);
	await pending;
	expect(f.state.playbackStartTime).toBe(3);
	expect(f.state.playbackStartContextTime).toBe(15);
});

test("R03 live volume rebuilds a fade instead of flattening it", () => {
	const old = buildVideoElement({ duration: 600_000, fadeInDuration: 4, fadeOutDuration: 1 });
	const f = fixture(buildSceneTracks({ main: buildVideoTrack({ elements: [old] }) }));
	const clip = clipFor(old);
	const node = register(f, clip);
	f.clock.currentTime = 12;
	f.transport.ticks = 240_000;
	f.state.scheduleClipGainAutomation({ audioContext: f.clock as unknown as AudioContext, clip, clipGain: node as unknown as GainNode, startTimestamp: 10, startLocalTime: 0 });
	f.tracks.main.elements = [{ ...old, volume: -6 }];
	expect(f.state.applyLiveAudioUpdates()).toBe(true);
	const base = 10 ** (-6 / 20);
	expect(node.gain.events.find((e) => e.time === 12)?.value).toBeCloseTo(base * 0.5);
	expect(node.gain.events.find((e) => e.kind === "ramp" && e.time === 14)?.value).toBeCloseTo(base);
	expect(node.gain.events.at(-1)).toMatchObject({ kind: "ramp", time: 15, value: 0 });
	expect(clip.volume).toBeCloseTo(base);
});

test("R08 prepared completion after seek cannot schedule stale audio", async () => {
	const f = fixture(); const clip = clipFor();
	const decode = Promise.withResolvers<AudioBuffer | null>();
	prepared(f, clip, decode.promise);
	const pending = f.state.schedulePreparedClip({ clip, startTime: 0, sessionId: f.state.playbackSessionId });
	await f.state.startPlayback();
	decode.resolve(buffer); await pending;
	expect(f.clock.sources).toHaveLength(0);
});

test("R09 prepared completion after pause cannot schedule audio", async () => {
	const f = fixture(); const clip = clipFor();
	const decode = Promise.withResolvers<AudioBuffer | null>(); prepared(f, clip, decode.promise);
	const pending = f.state.schedulePreparedClip({ clip, startTime: 0, sessionId: f.state.playbackSessionId });
	f.transport.playing = false; f.state.stopPlayback();
	decode.resolve(buffer); await pending;
	expect(f.clock.sources).toHaveLength(0);
});

test("R10 fade-free base survives subsequent buffer scheduling", async () => {
	const old = buildVideoElement({ duration: 600_000, fadeInDuration: 4 });
	const f = fixture(buildSceneTracks({ main: buildVideoTrack({ elements: [old] }) }));
	const clip = clipFor(old); register(f, clip);
	f.clock.currentTime = 12; f.transport.ticks = 240_000;
	expect(f.state.applyLiveAudioUpdates()).toBe(true);
	expect(clip.volume).toBe(1);
	prepared(f, clip, Promise.resolve(buffer));
	await f.state.schedulePreparedClip({ clip, startTime: 2, sessionId: f.state.playbackSessionId });
	expect(f.clock.sources.at(-1)?.start).toHaveBeenCalledWith(12, 2);
	expect(f.clock.gains.at(-1)?.gain.events.find((e) => e.time === 12)?.value).toBe(0.5);
});

test("R11 same current gain still refreshes changed future keyframes", () => {
	const old = buildVideoElement({ duration: 600_000 });
	const f = fixture(buildSceneTracks({ main: buildVideoTrack({ elements: [old] }) }));
	const clip = clipFor(old); const node = register(f, clip);
	f.state.applyLiveAudioUpdates();
	let animations = upsertElementKeyframe({ propertyPath: "volume", time: 0, value: 0 });
	animations = upsertElementKeyframe({ animations, propertyPath: "volume", time: 240_000, value: -20 });
	const next = { ...old, animations };
	f.tracks.main.elements = [next];
	expect(f.state.applyLiveAudioUpdates()).toBe(true);
	expect(clip.timelineElement).toBe(next);
	expect(node.gain.events.find((e) => e.kind === "ramp" && Math.abs(e.time - 12) < 0.001)?.value).toBeCloseTo(0.1);
});
