import type { EditorCore } from "@/core";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { clampRetimeRate, shouldMaintainPitch } from "@/lib/retime/rate";
import type { AudioClipSource } from "@/lib/media/audio";
import { createAudioContext, collectAudioClips } from "@/lib/media/audio";
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
import {
	ALL_FORMATS,
	AudioBufferSink,
	BlobSource,
	Input,
	type WrappedAudioBuffer,
} from "mediabunny";
import { resolveAudioTrackByIndex } from "@/lib/media/mediabunny";
import { yieldToEventLoop } from "@/lib/media/yield";

import { useTimelineStore } from "@/stores/timeline-store";

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
				void this.startPlayback({
					time: this.editor.playback.getCurrentTime() / TICKS_PER_SECOND,
				});
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
				this.debouncedRestartPlayback(detail.time / TICKS_PER_SECOND);
				return;
			}
			this.stopPlayback();
			return;
		}

		if (this.editor.playback.getIsPlaying()) {
			void this.startPlayback({ time: detail.time / TICKS_PER_SECOND });
			return;
		}

		this.stopPlayback();
	};

	private debouncedRestartPlayback(timeSeconds: number): void {
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
				void this.startPlayback({ time: timeSeconds });
			}
		}, AudioManager.SCRUB_RESTART_DEBOUNCE_MS);
	}

	private handleTimelineChange = (): void => {
		if (!this.editor.playback.getIsPlaying()) {
			this.disposeSinks();
			this.preparedClipBuffers.clear();
			this.decodedBuffers.clear();
			return;
		}

		if (this.applyLiveAudioUpdates()) return;

		this.restartPlayback();
	};

	private applyLiveAudioUpdates(): boolean {
		const activeScene = this.editor.scenes.getActiveSceneOrNull();
		if (!activeScene) return false;

		const tracks = activeScene.tracks;
		const currentElements = new Map<
			string,
			{ element: AudioCapableElement; trackId: string }
		>();
		for (const track of [tracks.main, ...tracks.overlay, ...tracks.audio]) {
			for (const element of track.elements) {
				if (element.type === "audio" || element.type === "video") {
					currentElements.set(element.id, { element, trackId: track.id });
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
			const oldRetimeKey = oldClip.retime
				? `${oldClip.retime.rate}|${oldClip.retime.mode ?? ""}|${oldClip.retime.maintainPitch ? 1 : 0}|${oldClip.retime.keyframes?.length ?? 0}`
				: "";
			const newRetimeKey = next.retime
				? `${next.retime.rate}|${next.retime.mode ?? ""}|${next.retime.maintainPitch ? 1 : 0}|${next.retime.keyframes?.length ?? 0}`
				: "";
			if (oldRetimeKey !== newRetimeKey) return false;
		}

		const playbackTime =
			this.editor.playback.getCurrentTime() / TICKS_PER_SECOND;
		for (const oldClip of this.clips) {
			const nextWrapper = currentElements.get(oldClip.id);
			if (!nextWrapper) continue;
			const next = nextWrapper.element;
			const trackSliderPercent =
				useTimelineStore.getState().trackSliders[nextWrapper.trackId] ?? 100;
			const elementGain = resolveEffectiveAudioGain({
				element: next,
				localTime: Math.max(0, playbackTime - oldClip.startTime),
			});
			// Track slider is a linear percentage (0–100, default 100). The
			// element's effective gain (from its dB volume + fades) is
			// multiplied by slider/100 to get the final linear gain.
			const newGain = elementGain * (trackSliderPercent / 100);
			const newMuted = next.muted === true;

			if (oldClip.lastAppliedGain === newGain && oldClip.muted === newMuted)
				continue;
			oldClip.lastAppliedGain = newGain;
			oldClip.volume = elementGain;
			oldClip.muted = newMuted;
			const gains = this.activeClipGains.get(oldClip.id);
			if (!gains) continue;
			for (const gain of gains) {
				try {
					gain.gain.cancelScheduledValues(0);
					gain.gain.setValueAtTime(newMuted ? 0 : newGain, 0);
				} catch {}
			}
		}
		return true;
	}

	private restartPlayback(): void {
		this.disposeSinks();
		this.preparedClipBuffers.clear();
		this.decodedBuffers.clear();
		void this.startPlayback({
			time: this.editor.playback.getCurrentTime() / TICKS_PER_SECOND,
		});
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

	private async startPlayback({ time }: { time: number }): Promise<void> {
		const audioContext = this.ensureAudioContext();
		if (!audioContext) return;

		this.stopPlayback();
		this.playbackSessionId++;
		this.playbackLatencyCompensationSeconds = 0;

		const tracks = this.editor.scenes.getActiveScene().tracks;
		const mediaAssets = this.editor.media.getAssets();
		const duration = this.editor.timeline.getTotalDuration();

		if (duration <= 0) return;

		if (audioContext.state === "suspended") {
			await audioContext.resume();
		}

		this.clips = await collectAudioClips({ tracks, mediaAssets });
		if (!this.editor.playback.getIsPlaying()) return;

		this.playbackStartTime = time;
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
		this.clearScrubRestartTimer();
		if (this.scheduleTimer && typeof window !== "undefined") {
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
				node.addEventListener("ended", () => {
					node.disconnect();
					clipGain.disconnect();
					this.queuedSources.delete(node);
					this.unregisterClipGain({ clipId: clip.id, gain: clipGain });
				}, { once: true });

				const aheadTime = timelineTime - this.getPlaybackTime();
				if (aheadTime >= 1) {
					await this.waitUntilCaughtUp({ timelineTime, targetAhead: 1 });
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

		this.clipIterators.delete(clip.id);
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

		const buffer = await this.getPreparedClipBuffer({ clip });
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
		node.addEventListener("ended", () => {
			node.disconnect();
			clipGain.disconnect();
			this.queuedSources.delete(node);
		}, { once: true });
	}

	private waitUntilCaughtUp({
		timelineTime,
		targetAhead,
	}: {
		timelineTime: number;
		targetAhead: number;
	}): Promise<void> {
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (!this.editor.playback.getIsPlaying()) {
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
		const hasKeyframedVolume = hasAnimatedVolume({ element: clip.timelineElement });
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
		const needsNativeDecode = isFlacFile(clip.file);
		return hasCurve || hasKeyframedVolume || maintainPitch || hasFade || needsNativeDecode;
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

		const hasKeyframedVolume = hasAnimatedVolume({ element: clip.timelineElement });
		const fadeIn = clip.timelineElement.fadeInDuration ?? 0;
		const fadeOut = clip.timelineElement.fadeOutDuration ?? 0;
		const hasFade = fadeIn > 0 || fadeOut > 0;

		if (!hasKeyframedVolume && !hasFade) {
			clipGain.gain.setValueAtTime(clip.volume, startTimestamp);
			return;
		}

		if (!hasKeyframedVolume && hasFade) {
			// Fast path for static volume + fade (no keyframes).
			// Avoid generating thousands of points which can cause WebAudio to drop events or mute.
			const baseGain = clip.volume;
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

			// Start point
			let startGain = baseGain;
			if (startLocalTime < fadeIn) {
				startGain = baseGain * (startLocalTime / fadeIn);
			} else if (startLocalTime > clipDuration - fadeOut) {
				const timeFromEnd = clipDuration - startLocalTime;
				startGain = baseGain * Math.max(0, timeFromEnd / fadeOut);
			}
			clipGain.gain.setValueAtTime(startGain, Math.max(startTimestamp, audioContext.currentTime));

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
			clipGain.gain.setValueAtTime(clip.volume, startTimestamp);
			return;
		}

		clipGain.gain.setValueAtTime(points[0].gain, startTimestamp);
		for (let index = 1; index < points.length; index++) {
			const point = points[index];
			const pointTimestamp =
				startTimestamp + (point.localTime - startLocalTime);
			if (pointTimestamp < audioContext.currentTime) {
				continue;
			}

			clipGain.gain.linearRampToValueAtTime(point.gain, pointTimestamp);
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
		return promise;
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
		return promise;
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
 * know the type), so we fall back to the file extension. This matches the
 * detection used by the waveform component and the Tauri media bridge.
 */
function isFlacFile(file: File): boolean {
	const type = file.type.toLowerCase();
	if (type === "audio/flac" || type === "audio/x-flac") return true;
	return /\.flac$/i.test(file.name);
}
