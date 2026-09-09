import type { EditorCore } from "@/core";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { roundToFrame } from "artidor-wasm";

export class PlaybackManager {
	private isPlaying = false;
	private currentTime = 0;
	private volume = 1;
	private muted = false;
	private previousVolume = 1;
	private isScrubbing = false;
	private loop = false;
	private listeners = new Set<() => void>();
	private playbackTimer: number | null = null;
	private playbackStartWallTime = 0;
	private playbackStartTime = 0;
	private timelineScopeBound = false;

	constructor(private editor: EditorCore) {}

	bindTimelineScope(): void {
		if (this.timelineScopeBound) {
			return;
		}

		const reconcile = () => {
			this.reconcileTimelineScope();
		};
		this.editor.timeline.subscribe(reconcile);
		this.editor.scenes.subscribe(reconcile);
		this.timelineScopeBound = true;
		this.reconcileTimelineScope();
	}

	play(): void {
		const maxTime = this.editor.timeline.getTotalDuration();
		if (maxTime <= 0) {
			return;
		}

		if (this.currentTime >= maxTime) {
			this.seek({ time: 0 });
		}

		this.isPlaying = true;
		this.startTimer();
		this.notify();
	}

	pause(): void {
		this.isPlaying = false;
		this.stopTimer();
		this.notify();
	}

	toggle(): void {
		if (this.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	seek({ time }: { time: number }): void {
		this.currentTime = this.clampTimeToTimeline(time);
		if (this.isPlaying) {
			this.playbackStartWallTime = performance.now();
			this.playbackStartTime = this.currentTime;
		}
		this.notify();
		this.dispatchSeekEvent(this.currentTime);
	}

	setVolume({ volume }: { volume: number }): void {
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.volume = clampedVolume;
		this.muted = clampedVolume === 0;
		if (clampedVolume > 0) {
			this.previousVolume = clampedVolume;
		}
		this.notify();
	}

	mute(): void {
		if (this.volume > 0) {
			this.previousVolume = this.volume;
		}
		this.muted = true;
		this.volume = 0;
		this.notify();
	}

	unmute(): void {
		this.muted = false;
		this.volume = this.previousVolume;
		this.notify();
	}

	toggleMute(): void {
		if (this.muted) {
			this.unmute();
		} else {
			this.mute();
		}
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}

	getCurrentTime(): number {
		return this.currentTime;
	}

	getVolume(): number {
		return this.volume;
	}

	isMuted(): boolean {
		return this.muted;
	}

	setScrubbing({ isScrubbing }: { isScrubbing: boolean }): void {
		this.isScrubbing = isScrubbing;
		this.notify();
	}

	getIsScrubbing(): boolean {
		return this.isScrubbing;
	}

	/**
	 * Loop playback. When enabled, reaching the end of the timeline seeks
	 * back to 0 and keeps playing instead of pausing. Owned here (not in UI
	 * listeners) so the decision happens in the same rAF tick that detects
	 * the end — a UI listener could miss a >1-frame rAF gap and stall on the
	 * last frame.
	 */
	setLoopMode({ loop }: { loop: boolean }): void {
		this.loop = loop;
		this.notify();
	}

	getLoop(): boolean {
		return this.loop;
	}

	toggleLoop(): void {
		this.setLoopMode({ loop: !this.loop });
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private reconcileTimelineScope(): void {
		const maxTime = this.editor.timeline.getTotalDuration();
		const nextTime = this.clampTimeToTimeline(this.currentTime);
		const shouldPause = this.isPlaying && nextTime >= maxTime;
		const timeChanged = nextTime !== this.currentTime;

		if (!timeChanged && !shouldPause) {
			return;
		}

		if (shouldPause) {
			this.isPlaying = false;
			this.stopTimer();
		}

		this.currentTime = nextTime;
		this.notify();

		if (timeChanged) {
			this.dispatchSeekEvent(this.currentTime);
		}
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	private startTimer(): void {
		if (this.playbackTimer !== null) {
			cancelAnimationFrame(this.playbackTimer);
		}

		this.playbackStartWallTime = performance.now();
		this.playbackStartTime = this.currentTime;
		this.updateTime();
	}

	private stopTimer(): void {
		if (this.playbackTimer !== null) {
			cancelAnimationFrame(this.playbackTimer);
			this.playbackTimer = null;
		}
	}

	private updateTime = (): void => {
		this.playbackTimer = null;
		if (!this.isPlaying) return;

		const fps = this.editor.project.getActive()?.settings.fps;
		const elapsedSeconds =
			(performance.now() - this.playbackStartWallTime) / 1000;
		const rawTime =
			this.playbackStartTime + Math.round(elapsedSeconds * TICKS_PER_SECOND);
		const newTime = fps
			? (roundToFrame({ time: rawTime, rate: fps }) ?? rawTime)
			: rawTime;
		const maxTime = this.editor.timeline.getTotalDuration();

		if (newTime >= maxTime) {
			if (this.loop && maxTime > 0) {
				// Restart from 0 in the same tick: a UI-side listener had to beat the
				// pause path and could miss the window on a long rAF gap, stalling
				// playback on the last frame with loop enabled.
				this.seek({ time: 0 });
				if (this.isPlaying) this.playbackTimer = requestAnimationFrame(this.updateTime);
				return;
			}
			this.currentTime = maxTime;
			this.pause();
			this.dispatchSeekEvent(maxTime);
			return;
		}

		this.currentTime = newTime;
		this.dispatchUpdateEvent(newTime);
		if (this.isPlaying) this.playbackTimer = requestAnimationFrame(this.updateTime);
	};

	private clampTimeToTimeline(time: number): number {
		const maxTime = this.editor.timeline.getTotalDuration();
		return Math.max(0, Math.min(maxTime, time));
	}

	private dispatchSeekEvent(time: number): void {
		if (typeof window === "undefined") {
			return;
		}

		window.dispatchEvent(
			new CustomEvent("playback-seek", {
				detail: { time },
			}),
		);
	}

	private dispatchUpdateEvent(time: number): void {
		if (typeof window === "undefined") {
			return;
		}

		window.dispatchEvent(
			new CustomEvent("playback-update", {
				detail: { time },
			}),
		);
	}
}
