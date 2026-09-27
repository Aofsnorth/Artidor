import type { EditorCore } from "@/core";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { clampRetimeRate, shouldMaintainPitch } from "@/lib/retime/rate";
import type { AudioClipSource } from "@/lib/media/audio";
import {
	buildAudioSourceKey,
	createAudioContext,
	collectAudioClips,
} from "@/lib/media/audio";
import {
	buildAudioGainAutomation,
	hasAnimatedVolume,
	resolveEffectiveAudioGain,
	type AudioCapableElement,
} from "@/lib/timeline/audio-state";
import { createAudioMasteringChain } from "@/lib/media/audio-mastering";
import {
	getClipTimeAtSourceTime,
	getSourceTimeAtClipTime,
	renderRetimedBuffer,
} from "@/lib/retime";
import type {
	AudioBufferSink,
	Input,
	WrappedAudioBuffer,
} from "mediabunny";
import { resolveAudioTrackByIndex } from "@/lib/media/mediabunny";

/**
 * Loads `mediabunny` on demand, memoized so concurrent callers share one
 * import.
 *
 * The audio manager is constructed by the `EditorCore` constructor, so a
 * module-level `import` of `mediabunny` put the library in the initial editor
 * chunk even for a user who never plays audio. A rejected import is not
 * cached, so a transient network failure can be retried.
 */
let mediabunnyPromise: Promise<typeof import("mediabunny")> | null = null;

function loadMediabunny(): Promise<typeof import("mediabunny")> {
	mediabunnyPromise ??= import("mediabunny").catch((error) => {
		mediabunnyPromise = null;
		throw error;
	});
	return mediabunnyPromise;
}
import { getOrderedTracks } from "@/lib/timeline";
import { hasMediaId } from "@/lib/timeline/element-utils";
import { yieldToEventLoop } from "@/lib/media/yield";

import { useTimelineStore } from "@/stores/timeline-store";

/**
 * Shape encoded in the `preparedClipBuffers` key (see
 * `buildPreparedClipCacheKey`). Only read back to decide whether a cached
 * entry still matches the clip on the timeline; the cache itself stays
 * keyed by the string, so this never becomes a second source of truth.
 */
interface PreparedClipCacheKey {
	id: string;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	retime?: unknown;
}

function parsePreparedClipCacheKey(key: string): PreparedClipCacheKey | null {
	try {
		const parsed = JSON.parse(key) as Partial<PreparedClipCacheKey>;
		if (typeof parsed?.id !== "string") return null;
		return {
			id: parsed.id,
			startTime: Number(parsed.startTime),
			duration: Number(parsed.duration),
			trimStart: Number(parsed.trimStart),
			trimEnd: Number(parsed.trimEnd),
			retime: parsed.retime,
		};
	} catch {
		// A key we cannot read cannot be matched against a clip; drop it.
		return null;
	}
}

export class AudioManager {
	private audioContext: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private playbackStartTime = 0;
	private playbackStartContextTime = 0;
	private scheduleTimer: number | null = null;
	private lookaheadSeconds = 2;
	private scheduleIntervalMs = 500;
	private clips: AudioClipSource[] = [];
	private sinks = new Map<string, AudioBufferSink>();
	private inputs = new Map<string, Input>();
	private activeClipIds = new Set<string>();
	private clipIterators = new Map<
		string,
		AsyncGenerator<WrappedAudioBuffer, void, unknown>
	>();
	private queuedSources = new Set<AudioBufferSourceNode>();
	// Per-clip context-time cursor: the time the last scheduled buffer of this
	// clip ends. A new buffer may not start before this — structurally forbids
	// the same clip's buffers from overlapping (the freeze "explosion").
	private clipScheduleCursor = new Map<string, number>();
	private preparedClipBuffers = new Map<string, Promise<AudioBuffer | null>>();
	private decodedBuffers = new Map<string, Promise<AudioBuffer | null>>();
	private playbackSessionId = 0;
	private lastIsPlaying = false;
	private lastVolume = 1;
	private playbackLatencyCompensationSeconds = 0;
	private unsubscribers: Array<() => void> = [];
	private analyserLeft: AnalyserNode | null = null;
	private analyserRight: AnalyserNode | null = null;
	private activeClipGains = new Map<string, Set<GainNode>>();
	private scrubRestartTimer: number | null = null;
	private static readonly SCRUB_RESTART_DEBOUNCE_MS = 60;
	private static readonly MAX_AUDIO_CATCH_UP_SECONDS = 0.05;

	getAnalysers(): { left: AnalyserNode | null; right: AnalyserNode | null } {
		return { left: this.analyserLeft, right: this.analyserRight };
	}

	constructor(private editor: EditorCore) {
		this.lastVolume = this.editor.playback.getVolume();

		this.unsubscribers.push(
			this.editor.playback.subscribe(this.handlePlaybackChange),
			this.editor.timeline.subscribe(this.handleTimelineChange),
			this.editor.media.subscribe(this.handleTimelineChange),
		);

		this.unsubscribers.push(
			useTimelineStore.subscribe((state, prevState) => {
				if (state.trackSliders !== prevState.trackSliders) {
					this.handleTimelineChange();
				}
			}),
		);
		if (typeof window !== "undefined") {
			window.addEventListener("playback-seek", this.handleSeek);
		}
	}

	dispose(): void {
		this.stopPlayback();
		this.clearScrubRestartTimer();
		for (const unsub of this.unsubscribers) {
			unsub();
		}
		this.unsubscribers = [];
		if (typeof window !== "undefined") {
			window.removeEventListener("playback-seek", this.handleSeek);
		}
		this.disposeSinks();
		this.preparedClipBuffers.clear();
		this.decodedBuffers.clear();
		this.activeClipGains.clear();
		if (this.audioContext) {
			void this.audioContext.close();
			this.audioContext = null;
			this.masterGain = null;
			this.analyserLeft = null;
			this.analyserRight = null;
		}
	}

	private handlePlaybackChange = (): void => {
		const isPlaying = this.editor.playback.getIsPlaying();
		const volume = this.editor.playback.getVolume();

		if (volume !== this.lastVolume) {
			this.lastVolume = volume;
			this.updateGain();
		}

		if (isPlaying !== this.lastIsPlaying) {
			this.lastIsPlaying = isPlaying;
			if (isPlaying) {
				// startPlayback re-reads the transport playhead AFTER its awaits, so
				// no time argument is needed here.
				void this.startPlayback();
			} else {
				this.stopPlayback();
			}
		}
	};

	private handleSeek = (event: Event): void => {
		const detail = (event as CustomEvent<{ time: number }>).detail;
		if (!detail) return;

		if (this.editor.playback.getIsScrubbing()) {
			if (
				this.editor.playback.getIsPlaying() &&
				useTimelineStore.getState().autoPlayWhileScrubbing
			) {
				// Debounce audio restart during autoplay-scrub to prevent
				// audio source pile-up that causes exploding/crackling sound.
				// Instead of restarting on every single seek event, we
				// schedule a restart that coalesces rapid seeks into one.
				this.debouncedRestartPlayback();
				return;
			}
			this.stopPlayback();
			return;
		}

		if (this.editor.playback.getIsPlaying()) {
			void this.startPlayback();
			return;
		}

		this.stopPlayback();
	};

	// The debounce coalesces rapid scrub seeks into one restart; the actual
	// anchor time is read from the transport when the restart fires.
	private debouncedRestartPlayback(): void {
		if (this.scrubRestartTimer !== null && typeof window !== "undefined") {
			window.clearTimeout(this.scrubRestartTimer);
		}
		// Silently stop existing audio immediately to prevent overlap,
		// then schedule a fresh start after the debounce window.
		this.stopPlayback();
		if (typeof window === "undefined") return;
		this.scrubRestartTimer = window.setTimeout(() => {
			this.scrubRestartTimer = null;
			if (
				this.editor.playback.getIsPlaying() &&
				this.editor.playback.getIsScrubbing()
			) {
				void this.startPlayback();
			}
		}, AudioManager.SCRUB_RESTART_DEBOUNCE_MS);
	}

	private handleTimelineChange = (): void => {
		if (!this.editor.playback.getIsPlaying()) {
			this.pruneAudioCachesToTimeline();
			return;
		}

		if (this.applyLiveAudioUpdates()) return;

		this.restartPlayback();
	};

	/**
	 * Invalidate only the decoded audio the timeline change actually affects.
	 *
	 * While paused there is nothing decoding, and a timeline notification here
	 * is almost always a UI edit that does not touch the audio samples at all
	 * (a volume slider, a track mute, a selection change). Clearing every cache
	 * here meant nudging one slider forced a full re-decode of every audio
	 * clip on the next play.
	 *
	 * Both decoded caches are content-addressed, so nothing needs to be
	 * *invalidated* for correctness — a retimed, re-trimmed or moved clip gets
	 * a different key and is decoded again on its own. This is therefore a
	 * memory prune: entries that no live clip can ever hit again are dropped,
	 * and the ones that still match are kept warm.
	 *
	 * A change we cannot map onto the current tracks (no active scene) falls
	 * back to the old full clear rather than guessing.
	 */
	private pruneAudioCachesToTimeline(): void {
		const liveElements = this.collectLiveAudioElements();
		if (!liveElements) {
			// Unknown timeline — keep the conservative full invalidation.
			this.disposeSinks();
			this.preparedClipBuffers.clear();
			this.decodedBuffers.clear();
			return;
		}

		for (const iterator of this.clipIterators.values()) {
			void iterator.return();
		}
		this.clipIterators.clear();
		this.activeClipIds.clear();

		// Streaming sinks are keyed by source, and re-created on demand from
		// the file, so they are pruned the same way as the decoded buffers.
		const liveSourceKeys = new Set<string>();
		for (const live of liveElements.values()) liveSourceKeys.add(live.sourceKey);
		for (const key of this.sinks.keys()) {
			if (liveSourceKeys.has(key)) continue;
			this.sinks.delete(key);
			this.inputs.get(key)?.dispose();
			this.inputs.delete(key);
		}
		for (const key of this.decodedBuffers.keys()) {
			if (!liveSourceKeys.has(key)) this.decodedBuffers.delete(key);
		}

		const TICK = TICKS_PER_SECOND;
		for (const key of Array.from(this.preparedClipBuffers.keys())) {
			const cached = parsePreparedClipCacheKey(key);
			const live = cached ? liveElements.get(cached.id) : undefined;
			if (
				cached &&
				live &&
				cached.startTime === live.startTime / TICK &&
				cached.duration === live.duration / TICK &&
				cached.trimStart === live.trimStart / TICK &&
				cached.trimEnd === live.trimEnd / TICK &&
				JSON.stringify(cached.retime ?? null) ===
					JSON.stringify(live.retime ?? null)
			) {
				continue;
			}
			this.preparedClipBuffers.delete(key);
		}
	}

	/**
	 * Every audio-capable element of the active scene, keyed by element id and
	 * carrying the fields the decoded caches are keyed by. Returns null when
	 * there is no active scene to read.
	 */
	private collectLiveAudioElements(): Map<
		string,
		{
			element: AudioCapableElement;
			startTime: number;
			duration: number;
			trimStart: number;
			trimEnd: number;
			retime: AudioCapableElement["retime"];
			sourceKey: string;
		}
	> | null {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return null;

		const live = new Map<
			string,
			{
				element: AudioCapableElement;
				startTime: number;
				duration: number;
				trimStart: number;
				trimEnd: number;
				retime: AudioCapableElement["retime"];
				sourceKey: string;
			}
		>();

		for (const track of getOrderedTracks(activeScene.tracks)) {
			for (const element of track.elements) {
				if (element.type !== "audio" && element.type !== "video") continue;
				live.set(element.id, {
					element,
					startTime: element.startTime,
					duration: element.duration,
					trimStart: element.trimStart,
					trimEnd: element.trimEnd,
					retime: element.retime,
					// Mirrors collectAudioClips: media clips are keyed by asset +
					// embedded audio track, library clips by element id.
					sourceKey: buildAudioSourceKey({
						element,
						mediaId: hasMediaId(element) ? element.mediaId : undefined,
					}),
				});
			}
		}

		return live;
	}

	private applyLiveAudioUpdates(): boolean {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return false;

		const tracks = activeScene.tracks;
		const currentElements = new Map<
			string,
			{ element: AudioCapableElement; trackId: string; trackMuted: boolean }
		>();

		for (const track of getOrderedTracks(tracks)) {

			for (const element of track.elements) {
				if (element.type === "audio" || element.type === "video") {
					currentElements.set(element.id, {
											element, trackId: track.id,
											trackMuted: (track.type === "audio" || track.type === "video") && track.muted === true,
										});
				}
			}
		}

		if (currentElements.size !== this.clips.length) return false;

		const TICK = TICKS_PER_SECOND;
		for (const oldClip of this.clips) {
			const nextWrapper = currentElements.get(oldClip.id);
			if (!nextWrapper) return false;
			const next = nextWrapper.element;
			if (oldClip.startTime !== next.startTime / TICK) return false;
			if (oldClip.duration !== next.duration / TICK) return false;
			if (oldClip.trimStart !== next.trimStart / TICK) return false;
			if (oldClip.trimEnd !== next.trimEnd / TICK) return false;
			if (JSON.stringify(oldClip.retime) !== JSON.stringify(next.retime)) return false;
			const previous = oldClip.timelineElement;
			if (previous.type !== next.type) return false;
			if ("mediaId" in previous && (!('mediaId' in next) || previous.mediaId !== next.mediaId)) return false;
			if ("sourceUrl" in previous && (!('sourceUrl' in next) || previous.sourceUrl !== next.sourceUrl)) return false;
			if (previous.type === "video" && next.type === "video" && (
				previous.selectedAudioTrackIndex !== next.selectedAudioTrackIndex ||
				previous.hidden !== next.hidden
			)) return false;
		}

		const playbackTime = this.getPlaybackTime();
		for (const oldClip of this.clips) {
			const nextWrapper = currentElements.get(oldClip.id);
			if (!nextWrapper) continue;
			const next = nextWrapper.element;
			const trackMuted = nextWrapper.trackMuted;
			const trackSliderPercent =
				useTimelineStore.getState().trackSliders[nextWrapper.trackId] ?? 100;
			const elementGain = resolveEffectiveAudioGain({
				element: next,
				trackMuted,
				localTime: Math.max(0, playbackTime - oldClip.startTime),
			});
			// Fade-free base gain: the current effective gain includes fades and
			// keyframes sampled at the playhead. Writing THAT into clip.volume
			// would bake a mid-fade snapshot into the base and double-apply the
			// fade on every later buffer. Keep the automation-free base here; the
			// per-clip gain NODE receives the current effective value below.
			const baseGain = resolveEffectiveAudioGain({
				element: next,
				trackMuted,
				localTime: Math.max(0, playbackTime - oldClip.startTime),
				ignoreFades: true,
			});
			// Track slider is a linear percentage (0–100, default 100). The
			// element's effective gain (from its dB volume + fades) is
			// multiplied by slider/100 to get the final linear gain.
			const newGain = elementGain * (trackSliderPercent / 100);
			const newMuted = trackMuted || next.muted === true;

			const elementChanged = oldClip.timelineElement !== next || oldClip.trackId !== nextWrapper.trackId;
			oldClip.timelineElement = next;
			oldClip.trackId = nextWrapper.trackId;
			if (!elementChanged && oldClip.lastAppliedGain === newGain && oldClip.muted === newMuted)
				continue;
			oldClip.lastAppliedGain = newGain;
			oldClip.volume = baseGain;
			oldClip.muted = newMuted;
			const gains = this.activeClipGains.get(oldClip.id);
			if (!gains) continue;
			const audioContext = this.audioContext;
			if (!audioContext) continue;
			for (const gain of gains) {
				// Cancellation removes future events too; rebuild the remaining
				// envelope for both sounding and lookahead-scheduled nodes.
				const delay = Math.max(0, oldClip.startTime - playbackTime);
				gain.gain.cancelScheduledValues(audioContext.currentTime);
				this.scheduleClipGainAutomation({
					audioContext, clip: oldClip, clipGain: gain,
					startTimestamp: audioContext.currentTime + delay,
					startLocalTime: Math.max(0, playbackTime - oldClip.startTime),
				});
			}
		}
		return true;
	}

	private restartPlayback(): void {
		this.disposeSinks();
		this.preparedClipBuffers.clear();
		this.decodedBuffers.clear();
		void this.startPlayback();
	}

	private registerClipGain({
		clipId,
		gain,
	}: {
		clipId: string;
		gain: GainNode;
	}): void {
		let set = this.activeClipGains.get(clipId);
		if (!set) {
			set = new Set();
			this.activeClipGains.set(clipId, set);
		}
		set.add(gain);
	}

	private unregisterClipGain({
		clipId,
		gain,
	}: {
		clipId: string;
		gain: GainNode;
	}): void {
		const set = this.activeClipGains.get(clipId);
		if (!set) return;
		set.delete(gain);
		if (set.size === 0) this.activeClipGains.delete(clipId);
	}

	private ensureAudioContext(): AudioContext | null {
		if (this.audioContext) return this.audioContext;
		if (typeof window === "undefined") return null;

		this.audioContext = createAudioContext();

		this.analyserLeft = this.audioContext.createAnalyser();
		this.analyserLeft.fftSize = 256;
		this.analyserRight = this.audioContext.createAnalyser();
		this.analyserRight.fftSize = 256;

		const splitter = this.audioContext.createChannelSplitter(2);
		splitter.connect(this.analyserLeft, 0);
		splitter.connect(this.analyserRight, 1);

		const dummyNode = this.audioContext.createGain();
		dummyNode.connect(this.audioContext.destination);
		dummyNode.connect(splitter);

		const { input } = createAudioMasteringChain({
			audioContext: this.audioContext,
			destination: dummyNode,
		});
		this.masterGain = input;
		this.masterGain.gain.value = this.lastVolume;
		return this.audioContext;
	}

	private updateGain(): void {
		if (!this.masterGain) return;
		this.masterGain.gain.value = this.lastVolume;
	}

	private getPlaybackTime(): number {
		if (!this.audioContext) return this.playbackStartTime;
		const elapsed =
			this.audioContext.currentTime - this.playbackStartContextTime;
		return this.playbackStartTime + elapsed;
	}

	private async startPlayback(): Promise<void> {
		const audioContext = this.ensureAudioContext();
		if (!audioContext) return;

		this.stopPlayback();
		const sessionId = ++this.playbackSessionId;
		this.playbackLatencyCompensationSeconds = 0;

		const tracks = this.editor.scenes.getActiveScene().tracks;
		const mediaAssets = this.editor.media.getAssets();
		const duration = this.editor.timeline.getTotalDuration();

		if (duration <= 0) return;

		let clips: AudioClipSource[];
		try {
			if (audioContext.state === "suspended") await audioContext.resume();
			if (sessionId !== this.playbackSessionId || !this.editor.playback.getIsPlaying()) return;
			clips = await collectAudioClips({ tracks, mediaAssets });
		} catch (error) {
			if (sessionId === this.playbackSessionId) {
				this.stopPlayback();
				console.warn("Failed to start audio playback:", error);
			}
			return;
		}
		// Cancellation/seek race: `collectAudioClips` can resolve after a newer
		// startPlayback (seek, scrub-restart, play toggle) bumped the session.
		// Without this check the stale call clobbered the newer session's
		// `playbackStartTime` and started a SECOND schedule timer against old
		// clip data (double audio + wrong anchoring).
		if (sessionId !== this.playbackSessionId) return;
		if (!this.editor.playback.getIsPlaying()) return;

		// The awaits above (context resume, clip collection) can take real time;
		// the transport playhead may have advanced or been seeked meanwhile.
		// Anchoring to the PRE-await `time` produced a constant drift for the
		// whole session (audio late by exactly the await duration). Re-read the
		// transport position AFTER the awaits, mirroring restartPlayback.
		const anchoredTime =
			this.editor.playback.getCurrentTime() / TICKS_PER_SECOND;

		this.clips = clips;
		this.playbackStartTime = anchoredTime;
		this.playbackStartContextTime = audioContext.currentTime;

		this.scheduleUpcomingClips();

		if (typeof window !== "undefined") {
			this.scheduleTimer = window.setInterval(() => {
				this.scheduleUpcomingClips();
			}, this.scheduleIntervalMs);
		}
	}

	private scheduleUpcomingClips(): void {
		if (!this.editor.playback.getIsPlaying()) return;

		const currentTime = this.getPlaybackTime();
		const windowEnd = currentTime + this.lookaheadSeconds;

		for (const clip of this.clips) {
			if (clip.muted) continue;
			if (this.activeClipIds.has(clip.id)) continue;

			const clipEnd = clip.startTime + clip.duration;
			if (clipEnd <= currentTime) continue;
			if (clip.startTime > windowEnd) continue;

			this.activeClipIds.add(clip.id);
			if (this.shouldUsePreparedClipBuffer({ clip })) {
				void this.schedulePreparedClip({
					clip,
					startTime: currentTime,
					sessionId: this.playbackSessionId,
				});
			} else {
				void this.runClipIterator({
					clip,
					startTime: currentTime,
					sessionId: this.playbackSessionId,
				});
			}
		}
	}

	private stopPlayback(): void {
		// Invalidate pending resume/collection/decode/iterator work even when
		// disposal leaves the transport's playing flag unchanged.
		this.playbackSessionId++;
		this.clearScrubRestartTimer();
		if (this.scheduleTimer !== null && typeof window !== "undefined") {
			window.clearInterval(this.scheduleTimer);
		}
		this.scheduleTimer = null;

		for (const iterator of this.clipIterators.values()) {
			void iterator.return();
		}
		this.clipIterators.clear();
		this.activeClipIds.clear();

		for (const source of this.queuedSources) {
			try {
				source.stop();
			} catch {}
			source.disconnect();
		}
		this.queuedSources.clear();
		this.activeClipGains.clear();
		this.clipScheduleCursor.clear();
	}

	private clearScrubRestartTimer(): void {
		if (this.scrubRestartTimer !== null && typeof window !== "undefined") {
			window.clearTimeout(this.scrubRestartTimer);
			this.scrubRestartTimer = null;
		}
	}

	private async runClipIterator({
		clip,
		startTime,
		sessionId,
	}: {
		clip: AudioClipSource;
		startTime: number;
		sessionId: number;
	}): Promise<void> {
		const audioContext = this.ensureAudioContext();
		if (!audioContext) return;

		const sink = await this.getAudioSink({ clip });
		if (!sink || !this.editor.playback.getIsPlaying()) return;
		if (sessionId !== this.playbackSessionId) return;

		const clipStart = clip.startTime;
		const clipEnd = clip.startTime + clip.duration;
		const playbackTimeAfterSinkReady = this.getPlaybackTime();
		const iteratorStartTime = Math.max(
			startTime,
			clipStart,
			playbackTimeAfterSinkReady,
		);
		if (iteratorStartTime >= clipEnd) {
			return;
		}
		const sourceStartTime =
			clip.trimStart +
			getSourceTimeAtClipTime({
				clipTime: iteratorStartTime - clip.startTime,
				retime: clip.retime,
				clipDuration: clip.duration,
			});

		const iterator = sink.buffers(sourceStartTime);
		this.clipIterators.set(clip.id, iterator);
		let consecutiveDroppedBufferCount = 0;

		try {
			for await (const { buffer, timestamp } of iterator) {
				if (!this.editor.playback.getIsPlaying()) return;
				if (sessionId !== this.playbackSessionId) return;

				const timelineTime =
					clip.startTime +
					getClipTimeAtSourceTime({
						sourceTime: timestamp - clip.trimStart,
						retime: clip.retime,
						clipDuration: clip.duration,
					});
				if (timelineTime >= clipEnd) break;

				const startTimestamp =
					this.playbackStartContextTime +
					this.playbackLatencyCompensationSeconds +
					(timelineTime - this.playbackStartTime);

				// Overlap guard: never let this clip's next buffer start before its
				// previous buffer has finished. Without this, a UI freeze makes a
				// batch of late buffers all land at ~currentTime and sum into a loud
				// burst. We allow a tiny epsilon for normal back-to-back scheduling.
				const cursor = this.clipScheduleCursor.get(clip.id) ?? 0;
				const intendedStart =
					startTimestamp >= audioContext.currentTime
						? startTimestamp
						: audioContext.currentTime;
				if (intendedStart + 0.001 < cursor) {
					// Would overlap the previous buffer of this same clip — drop it.
					consecutiveDroppedBufferCount += 1;
					if (consecutiveDroppedBufferCount >= 5) {
						const resyncStartTime = this.getPlaybackTime();
						this.clipIterators.delete(clip.id);
						this.clipScheduleCursor.delete(clip.id);
						void this.runClipIterator({
							clip,
							startTime: resyncStartTime,
							sessionId,
						});
						return;
					}
					continue;
				}

				const node = audioContext.createBufferSource();
				node.buffer = buffer;
				const playbackRate = clip.retime
					? clampRetimeRate({ rate: clip.retime.rate })
					: 1;
				if (clip.retime) {
					node.playbackRate.value = playbackRate;
				}
				const clipGain = audioContext.createGain();
				const trackSliderPercent =
					useTimelineStore.getState().trackSliders[clip.trackId] ?? 100;
				// Track slider is a linear percentage (0–100, default 100).
				// clip.volume is the element's linear gain (derived from its
				// dB volume). Final gain = clip.volume * (slider / 100).
				clipGain.gain.value = clip.volume * (trackSliderPercent / 100);
				node.connect(clipGain);
				clipGain.connect(this.masterGain ?? audioContext.destination);
				this.registerClipGain({ clipId: clip.id, gain: clipGain });

				if (startTimestamp >= audioContext.currentTime) {
					node.start(startTimestamp);
					this.clipScheduleCursor.set(
						clip.id,
						startTimestamp + buffer.duration / playbackRate,
					);
					consecutiveDroppedBufferCount = 0;
				} else {
					const offset = audioContext.currentTime - startTimestamp;
					// Only nudge a *marginally* late buffer to play now. After a UI
					// freeze the iterator's pending buffers all resolve at once, each
					// already late; if every one is crammed to start at currentTime
					// they overlap into a loud burst ("explosion"). So we cap how late
					// a buffer may be before we drop it instead — dropped buffers count
					// toward the resync below, which restarts the iterator at the
					// correct (post-freeze) source time.
					if (offset <= AudioManager.MAX_AUDIO_CATCH_UP_SECONDS) {
						node.start(audioContext.currentTime, offset);
						this.clipScheduleCursor.set(
							clip.id,
							audioContext.currentTime +
								Math.max(0, buffer.duration - offset) / playbackRate,
						);
						consecutiveDroppedBufferCount = 0;
					} else {
						node.disconnect();
						clipGain.disconnect();
						this.unregisterClipGain({ clipId: clip.id, gain: clipGain });
						consecutiveDroppedBufferCount += 1;
						if (consecutiveDroppedBufferCount >= 5) {
							const nextCompensationSeconds = Math.max(
								this.playbackLatencyCompensationSeconds,
								Math.min(0.25, offset + 0.01),
							);
							if (
								nextCompensationSeconds >
								this.playbackLatencyCompensationSeconds + 0.001
							) {
								this.playbackLatencyCompensationSeconds =
									nextCompensationSeconds;
							}
							const resyncStartTime = this.getPlaybackTime();
							this.clipIterators.delete(clip.id);
							this.clipScheduleCursor.delete(clip.id);
							void this.runClipIterator({
								clip,
								startTime: resyncStartTime,
								sessionId,
							});
							return;
						}
						continue;
					}
				}

				this.queuedSources.add(node);
				node.addEventListener(
					"ended",
					() => {
						node.disconnect();
						clipGain.disconnect();
						this.queuedSources.delete(node);
						this.unregisterClipGain({ clipId: clip.id, gain: clipGain });
					},
					{ once: true },
				);

				const aheadTime = timelineTime - this.getPlaybackTime();
				if (aheadTime >= 1) {
					await this.waitUntilCaughtUp({ timelineTime, targetAhead: 1, sessionId });
					if (sessionId !== this.playbackSessionId) return;
				}
			}
		} catch (error) {
			const isDisposedError =
				error instanceof Error &&
				(error.name === "InputDisposedError" ||
					error.message.includes("disposed"));
			if (!isDisposedError) {
				console.warn("Audio clip iterator error:", error);
			}
		}

		if (this.clipIterators.get(clip.id) === iterator) {
			this.clipIterators.delete(clip.id);
		}
		// don't remove from activeClipIds - prevents scheduler from restarting this clip
		// the set is cleared on stopPlayback anyway
	}

	private async schedulePreparedClip({
		clip,
		startTime,
		sessionId,
	}: {
		clip: AudioClipSource;
		startTime: number;
		sessionId: number;
	}): Promise<void> {
		const audioContext = this.ensureAudioContext();
		if (!audioContext) return;

		let buffer: AudioBuffer | null;
		try {
			buffer = await this.getPreparedClipBuffer({ clip });
		} catch (error) {
			if (sessionId === this.playbackSessionId) {
				this.activeClipIds.delete(clip.id);
				console.warn("Failed to prepare audio clip:", error);
			}
			return;
		}
		if (!buffer || !this.editor.playback.getIsPlaying()) return;
		if (sessionId !== this.playbackSessionId) return;

		const clipStart = clip.startTime;
		const clipEnd = clip.startTime + clip.duration;
		const playbackTimeAfterReady = this.getPlaybackTime();
		const effectiveStartTime = Math.max(
			startTime,
			clipStart,
			playbackTimeAfterReady,
		);
		if (effectiveStartTime >= clipEnd) {
			return;
		}

		const node = audioContext.createBufferSource();
		node.buffer = buffer;
		const clipGain = audioContext.createGain();
		node.connect(clipGain);
		clipGain.connect(this.masterGain ?? audioContext.destination);
		this.registerClipGain({ clipId: clip.id, gain: clipGain });

		const startTimestamp =
			this.playbackStartContextTime +
			this.playbackLatencyCompensationSeconds +
			(effectiveStartTime - this.playbackStartTime);
		const clipOffset = effectiveStartTime - clipStart;
		let actualStartTimestamp = startTimestamp;
		let actualClipOffset = clipOffset;

		if (startTimestamp >= audioContext.currentTime) {
			node.start(startTimestamp, clipOffset);
		} else {
			const lateOffset = audioContext.currentTime - startTimestamp;
			// Same freeze-burst guard as the streaming path: if this prepared clip
			// is grossly late (UI froze past our catch-up budget), don't slam it in
			// at currentTime — that stacks against whatever should be playing now.
			// Skip it; the next schedule pass starts a fresh node at the right spot.
			if (lateOffset > AudioManager.MAX_AUDIO_CATCH_UP_SECONDS) {
				this.activeClipIds.delete(clip.id);
				return;
			}
			actualStartTimestamp = audioContext.currentTime;
			actualClipOffset = clipOffset + lateOffset;
			node.start(actualStartTimestamp, actualClipOffset);
		}

		this.scheduleClipGainAutomation({
			audioContext,
			clip,
			clipGain,
			startTimestamp: actualStartTimestamp,
			startLocalTime: actualClipOffset,
		});

		this.queuedSources.add(node);
		// Late completions (after a seek stop) must not confuse the next
		// session: stale nodes that finish late could still be in this set if
		// stopPlayback ran between the last await and the node creation.
		node.addEventListener(
			"ended",
			() => {
				node.disconnect();
				clipGain.disconnect();
				this.queuedSources.delete(node);
				this.unregisterClipGain({ clipId: clip.id, gain: clipGain });
			},
			{ once: true },
		);
	}

	private waitUntilCaughtUp({
		timelineTime,
		targetAhead,
		sessionId,
	}: {
		timelineTime: number;
		targetAhead: number;
		sessionId: number;
	}): Promise<void> {
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (sessionId !== this.playbackSessionId || !this.editor.playback.getIsPlaying()) {
					clearInterval(checkInterval);
					resolve();
					return;
				}

				const playbackTime = this.getPlaybackTime();
				if (timelineTime - playbackTime < targetAhead) {
					clearInterval(checkInterval);
					resolve();
				}
			}, 100);
		});
	}

	private disposeSinks(): void {
		for (const iterator of this.clipIterators.values()) {
			void iterator.return();
		}
		this.clipIterators.clear();
		this.activeClipIds.clear();

		for (const input of this.inputs.values()) {
			input.dispose();
		}
		this.inputs.clear();
		this.sinks.clear();
	}

	private shouldUsePreparedClipBuffer({
		clip,
	}: {
		clip: AudioClipSource;
	}): boolean {
		const hasCurve = this.hasCurveRetime({ clip });
		const hasKeyframedVolume = hasAnimatedVolume({
			element: clip.timelineElement,
		});
		const maintainPitch = shouldMaintainPitch({
			rate: clip.retime?.rate ?? 1,
			maintainPitch: clip.retime?.maintainPitch,
		});
		const fadeIn = clip.timelineElement.fadeInDuration ?? 0;
		const fadeOut = clip.timelineElement.fadeOutDuration ?? 0;
		const hasFade = fadeIn > 0 || fadeOut > 0;
		// FLAC is decoded natively via decodeAudioData in decodeClipBuffer because
		// mediabunny's WebCodecs-based streaming sink can decode to silence in
		// browsers whose AudioDecoder does not support FLAC. Force the prepared
		// path so FLAC clips always use decodeClipBuffer.
		//
		// The original file name is preserved on the timeline element, while the
		// underlying File object loaded from OPFS has a UUID key as its name.
		// Passing the timeline element name ensures FLAC detection still works
		// after reload.
		const needsNativeDecode = isFlacFile({
			file: clip.file,
			name: clip.timelineElement.name,
		});
		return (
			hasCurve ||
			hasKeyframedVolume ||
			maintainPitch ||
			hasFade ||
			needsNativeDecode
		);
	}

	private hasCurveRetime({ clip }: { clip: AudioClipSource }): boolean {
		const mode = (clip.retime as { mode?: unknown } | undefined)?.mode;
		return mode === "curve";
	}

	private scheduleClipGainAutomation({
		audioContext,
		clip,
		clipGain,
		startTimestamp,
		startLocalTime,
	}: {
		audioContext: AudioContext;
		clip: AudioClipSource;
		clipGain: GainNode;
		startTimestamp: number;
		startLocalTime: number;
	}): void {
		clipGain.gain.cancelScheduledValues(startTimestamp);
		if (clip.muted) {
			clipGain.gain.setValueAtTime(0, startTimestamp);
			return;
		}

		// The per-track volume slider (timeline store `trackSliders`) must
		// apply on top of the element's own gain. The live update path
		// (`applyLiveAudioUpdates`) already multiplies it in, but clips
		// rescheduled with fades or keyframed volume lost it here and jumped
		// back to full volume after a pause/play. Fold it in once.
		const trackSliderPercent =
			useTimelineStore.getState().trackSliders[clip.trackId] ?? 100;
		const trackSliderMul = trackSliderPercent / 100;

		const hasKeyframedVolume = hasAnimatedVolume({
			element: clip.timelineElement,
		});
		const fadeIn = clip.timelineElement.fadeInDuration ?? 0;
		const fadeOut = clip.timelineElement.fadeOutDuration ?? 0;
		const hasFade = fadeIn > 0 || fadeOut > 0;

		if (!hasKeyframedVolume && !hasFade) {
			clipGain.gain.setValueAtTime(
				clip.volume * trackSliderMul,
				startTimestamp,
			);
			return;
		}

		if (!hasKeyframedVolume && hasFade) {
			// Fast path for static volume + fade (no keyframes).
			// Avoid generating thousands of points which can cause WebAudio to drop events or mute.
			const baseGain = clip.volume * trackSliderMul;
			const clipDuration = clip.duration;

			// Helper to schedule a point, ensuring we don't schedule in the past
			const schedulePoint = (localTime: number, gainValue: number) => {
				const pointTime = startTimestamp + (localTime - startLocalTime);
				if (pointTime < audioContext.currentTime) return;

				// Set initial value if this is the very first scheduled point
				if (localTime === startLocalTime) {
					clipGain.gain.setValueAtTime(gainValue, pointTime);
				} else {
					clipGain.gain.linearRampToValueAtTime(gainValue, pointTime);
				}
			};

			// Fades can push the true start below 0dB very quickly: clamp the
			// fade-in ratio to [0, 1] so a tiny negative startLocalTime (float
			// dust from the scheduler) cannot invert the gain to negative.
			let startGain = baseGain;
			if (startLocalTime < fadeIn) {
				startGain = baseGain * Math.max(0, startLocalTime / fadeIn);
			} else if (startLocalTime > clipDuration - fadeOut) {
				const timeFromEnd = clipDuration - startLocalTime;
				startGain = baseGain * Math.max(0, timeFromEnd / fadeOut);
			}
			clipGain.gain.setValueAtTime(
				startGain,
				Math.max(startTimestamp, audioContext.currentTime),
			);

			if (startLocalTime < fadeIn) {
				schedulePoint(fadeIn, baseGain);
			}

			const fadeOutStart = clipDuration - fadeOut;
			if (startLocalTime < fadeOutStart) {
				schedulePoint(fadeOutStart, baseGain);
			}

			schedulePoint(clipDuration, 0);
			return;
		}

		const points = buildAudioGainAutomation({
			element: clip.timelineElement,
			fromLocalTime: startLocalTime,
			toLocalTime: clip.duration,
		});

		if (points.length === 0) {
			clipGain.gain.setValueAtTime(
				clip.volume * trackSliderMul,
				startTimestamp,
			);
			return;
		}

		clipGain.gain.setValueAtTime(
			points[0].gain * trackSliderMul,
			startTimestamp,
		);
		for (let index = 1; index < points.length; index++) {
			const point = points[index];
			const pointTimestamp =
				startTimestamp + (point.localTime - startLocalTime);
			if (pointTimestamp < audioContext.currentTime) {
				continue;
			}

			clipGain.gain.linearRampToValueAtTime(
				point.gain * trackSliderMul,
				pointTimestamp,
			);
		}
	}

	private buildPreparedClipCacheKey({
		clip,
	}: {
		clip: AudioClipSource;
	}): string {
		return JSON.stringify({
			id: clip.id,
			sourceKey: clip.sourceKey,
			startTime: clip.startTime,
			duration: clip.duration,
			trimStart: clip.trimStart,
			trimEnd: clip.trimEnd,
			retime: clip.retime ?? null,
		});
	}

	private async getPreparedClipBuffer({
		clip,
	}: {
		clip: AudioClipSource;
	}): Promise<AudioBuffer | null> {
		const cacheKey = this.buildPreparedClipCacheKey({ clip });
		const existing = this.preparedClipBuffers.get(cacheKey);
		if (existing) {
			return existing;
		}

		const promise = (async () => {
			const audioContext = this.ensureAudioContext();
			if (!audioContext) {
				return null;
			}

			const decodedBuffer = await this.getDecodedBuffer({ clip });
			if (!decodedBuffer) {
				this.preparedClipBuffers.delete(cacheKey);
				return null;
			}

			// Some containers (notably FLAC in several browsers) report an invalid
			// timeline duration — `NaN`, `Infinity`, or `0` — from media element
			// metadata even though the file imports and decodes fine. The
			// prepared-path resampler sizes its output from `clip.duration`; a
			// non-finite value makes the `createBuffer` call throw and the clip
			// silently never plays. Fall back to the decoded buffer's real
			// duration so the preview carries audio instead of being dropped.
			const effectiveDuration =
				Number.isFinite(clip.duration) && clip.duration > 0
					? clip.duration
					: decodedBuffer.duration;

			return await renderRetimedBuffer({
				audioContext,
				sourceBuffer: decodedBuffer,
				trimStart: clip.trimStart,
				clipDuration: effectiveDuration,
				retime: clip.retime,
			});
		})();

		this.preparedClipBuffers.set(cacheKey, promise);
		try {
			return await promise;
		} catch (error) {
			if (this.preparedClipBuffers.get(cacheKey) === promise) this.preparedClipBuffers.delete(cacheKey);
			throw error;
		}
	}

	private async getDecodedBuffer({
		clip,
	}: {
		clip: AudioClipSource;
	}): Promise<AudioBuffer | null> {
		const existing = this.decodedBuffers.get(clip.sourceKey);
		if (existing) {
			return existing;
		}

		const promise = this.decodeClipBuffer({ clip });
		this.decodedBuffers.set(clip.sourceKey, promise);
		try {
			return await promise;
		} catch (error) {
			if (this.decodedBuffers.get(clip.sourceKey) === promise) this.decodedBuffers.delete(clip.sourceKey);
			throw error;
		}
	}

	private async decodeClipBuffer({
		clip,
	}: {
		clip: AudioClipSource;
	}): Promise<AudioBuffer | null> {
		const audioContext = this.ensureAudioContext();
		if (!audioContext) {
			return null;
		}

		// For native audio uploads (including FLAC), prefer the browser's Web
		// Audio decoder over mediabunny's WebCodecs-based sink. Some browsers
		// support FLAC via decodeAudioData but not via AudioDecoder, which would
		// otherwise decode to silence during timeline preview. The export mix path
		// and waveform already use this same native decode for audio files.
		if (clip.timelineElement.type === "audio") {
			try {
				const arrayBuffer = await clip.file.arrayBuffer();
				return await audioContext.decodeAudioData(arrayBuffer.slice(0));
			} catch (error) {
				console.info(
					"[audio-manager] native decode failed for audio clip, falling back to mediabunny:",
					clip.file.name,
					error,
				);
			}
		}

		// `mediabunny` is the largest third-party payload in the editor, and
		// this manager is constructed by the EditorCore constructor. Loading it
		// here rather than at module scope keeps it out of the initial editor
		// chunk; the promise is memoized so it is fetched at most once.
		const { ALL_FORMATS, AudioBufferSink, BlobSource, Input } = await loadMediabunny();

		const input = new Input({
			source: new BlobSource(clip.file),
			formats: ALL_FORMATS,
		});

		try {
			const audioTrack = await resolveAudioTrackByIndex({
				input,
				trackIndex: clip.audioTrackIndex,
			});
			if (!audioTrack) {
				return null;
			}

			const sink = new AudioBufferSink(audioTrack);
			const chunks: AudioBuffer[] = [];
			let totalSamples = 0;

			for await (const { buffer } of sink.buffers(0)) {
				chunks.push(buffer);
				totalSamples += buffer.length;
				await yieldToEventLoop();
			}

			if (chunks.length === 0) {
				return null;
			}

			const targetSampleRate = audioContext.sampleRate;
			const nativeSampleRate = chunks[0].sampleRate;
			const numChannels = Math.min(2, chunks[0].numberOfChannels);
			const nativeChannels = Array.from(
				{ length: numChannels },
				() => new Float32Array(totalSamples),
			);

			let offset = 0;
			for (const chunk of chunks) {
				for (let channel = 0; channel < numChannels; channel++) {
					nativeChannels[channel].set(
						chunk.getChannelData(Math.min(channel, chunk.numberOfChannels - 1)),
						offset,
					);
				}
				offset += chunk.length;
				if (chunk.length > 8192) await yieldToEventLoop();
			}

			const outputSamples = Math.ceil(
				totalSamples * (targetSampleRate / nativeSampleRate),
			);
			const offlineContext = new OfflineAudioContext(
				numChannels,
				outputSamples,
				targetSampleRate,
			);
			const nativeBuffer = audioContext.createBuffer(
				numChannels,
				totalSamples,
				nativeSampleRate,
			);

			for (let channel = 0; channel < numChannels; channel++) {
				nativeBuffer.copyToChannel(nativeChannels[channel], channel);
			}

			const sourceNode = offlineContext.createBufferSource();
			sourceNode.buffer = nativeBuffer;
			sourceNode.connect(offlineContext.destination);
			sourceNode.start(0);

			return await offlineContext.startRendering();
		} catch (error) {
			console.warn("Failed to decode clip audio:", error);
			return null;
		} finally {
			input.dispose();
		}
	}

	private async getAudioSink({
		clip,
	}: {
		clip: AudioClipSource;
	}): Promise<AudioBufferSink | null> {
		const existingSink = this.sinks.get(clip.sourceKey);
		if (existingSink) return existingSink;

		// Lazily loaded so `mediabunny` stays out of the initial editor chunk:
		// this manager is constructed by the EditorCore constructor. See
		// `loadMediabunny` at the top of this file.
		const { ALL_FORMATS, AudioBufferSink, BlobSource, Input } = await loadMediabunny();

		try {
			const input = new Input({
				source: new BlobSource(clip.file),
				formats: ALL_FORMATS,
			});
			const audioTrack = await resolveAudioTrackByIndex({
				input,
				trackIndex: clip.audioTrackIndex,
			});
			if (!audioTrack) {
				input.dispose();
				return null;
			}

			const sink = new AudioBufferSink(audioTrack);
			this.inputs.set(clip.sourceKey, input);
			this.sinks.set(clip.sourceKey, sink);
			return sink;
		} catch (error) {
			console.warn("Failed to initialize audio sink:", error);
			return null;
		}
	}
}

/**
 * Detects FLAC files by MIME type or extension. Browsers do not always report
 * `audio/flac` for `.flac` files (especially when the OS/file picker does not
 * know the type), so we fall back to the file extension.
 *
 * The `name` fallback is needed because the file stored in OPFS is keyed by a
 * UUID, so `file.name` may not retain the original `.flac` extension.
 */
function isFlacFile({ file, name }: { file: File; name?: string }): boolean {
	const type = file.type.toLowerCase();
	if (type === "audio/flac" || type === "audio/x-flac") return true;
	const candidate = (name ?? file.name).toLowerCase();
	return /\.flac$/i.test(candidate);
}
