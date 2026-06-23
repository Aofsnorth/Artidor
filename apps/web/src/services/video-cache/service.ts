import {
	Input,
	ALL_FORMATS,
	BlobSource,
	CanvasSink,
	type WrappedCanvas,
} from "mediabunny";

interface VideoSinkData {
	input: Input;
	sink: CanvasSink;
	iterator: AsyncGenerator<WrappedCanvas, void, unknown> | null;
	currentFrame: WrappedCanvas | null;
	nextFrame: WrappedCanvas | null;
	lastTime: number;
	prefetching: boolean;
	prefetchPromise: Promise<void> | null;
	// Longest-edge decode cap this sink was built with (undefined = full res).
	// Changing it (e.g. preview quality change) rebuilds the sink.
	maxDim: number | undefined;
	// Seek generation counter. When a new seek comes in, this increments.
	// Old seeks check this and bail out if they're stale.
	seekGeneration: number;
}

/**
 * Map a longest-edge cap onto a CanvasSink size, preserving aspect ratio.
 * Returns {} (no resize → full source resolution) when uncapped or when the
 * source is already smaller than the cap. Sets only the longer edge; the sink
 * derives the other from the track's aspect.
 */
function resolveDecodeSize({
	srcWidth,
	srcHeight,
	maxDim,
}: {
	srcWidth: number;
	srcHeight: number;
	maxDim?: number;
}): { width?: number; height?: number } {
	if (!maxDim || Math.max(srcWidth, srcHeight) <= maxDim) return {};
	return srcWidth >= srcHeight ? { width: maxDim } : { height: maxDim };
}

const FORWARD_ITERATE_WINDOW_SECONDS = 8;

export class VideoCache {
	private sinks = new Map<string, VideoSinkData>();
	private initPromises = new Map<string, Promise<void>>();
	private frameChain = new Map<string, Promise<unknown>>();

	async getFrameAt({
		mediaId,
		file,
		time,
		maxDim,
	}: {
		mediaId: string;
		file: File;
		time: number;
		/** Longest-edge decode cap (preview downscale). Omit for full res. */
		maxDim?: number;
	}): Promise<WrappedCanvas | null> {
		await this.ensureSink({ mediaId, file, maxDim });

		const sinkData = this.sinks.get(mediaId);
		if (!sinkData) return null;

		// Increment seek generation to invalidate stale seeks.
		// When a new seek comes in while an old one is still processing,
		// the old one checks `seekGeneration` and bails out early.
		sinkData.seekGeneration++;
		const myGeneration = sinkData.seekGeneration;

		const previous = this.frameChain.get(mediaId) ?? Promise.resolve();
		const current = previous.then(() => {
			// Bail out if a newer seek has been requested — don't waste decode time
			// on frames the user has already scrubbed past.
			if (sinkData.seekGeneration !== myGeneration) return null;
			return this.resolveFrame({ sinkData, time });
		});
		this.frameChain.set(
			mediaId,
			current.catch(() => {}),
		);
		return current;
	}

	private async resolveFrame({
		sinkData,
		time,
	}: {
		sinkData: VideoSinkData;
		time: number;
	}): Promise<WrappedCanvas | null> {
		// Check if this seek is still the latest one — bail out if a newer seek
		// has been requested while we were waiting in the queue.
		const myGeneration = sinkData.seekGeneration;

		if (sinkData.nextFrame && sinkData.nextFrame.timestamp <= time) {
			sinkData.currentFrame = sinkData.nextFrame;
			sinkData.nextFrame = null;
			this.startPrefetch({ sinkData });
		}

		if (
			sinkData.currentFrame &&
			this.isFrameValid({ frame: sinkData.currentFrame, time })
		) {
			if (!sinkData.nextFrame && !sinkData.prefetching) {
				this.startPrefetch({ sinkData });
			}
			return sinkData.currentFrame;
		}

		if (
			sinkData.iterator &&
			sinkData.currentFrame &&
			time >= sinkData.lastTime &&
			time < sinkData.lastTime + FORWARD_ITERATE_WINDOW_SECONDS
		) {
			const frame = await this.iterateToTime({ sinkData, targetTime: time, generation: myGeneration });
			// Bail out if stale
			if (sinkData.seekGeneration !== myGeneration) return null;
			if (frame) {
				if (!sinkData.nextFrame && !sinkData.prefetching) {
					this.startPrefetch({ sinkData });
				}
				return frame;
			}
		}

		const frame = await this.seekToTime({ sinkData, time, generation: myGeneration });
		// Bail out if stale
		if (sinkData.seekGeneration !== myGeneration) return null;
		if (frame && !sinkData.nextFrame && !sinkData.prefetching) {
			this.startPrefetch({ sinkData });
		}
		return frame;
	}

	private isFrameValid({
		frame,
		time,
	}: {
		frame: WrappedCanvas;
		time: number;
	}): boolean {
		return time >= frame.timestamp && time < frame.timestamp + frame.duration;
	}
	private async iterateToTime({
		sinkData,
		targetTime,
		generation,
	}: {
		sinkData: VideoSinkData;
		targetTime: number;
		generation: number;
	}): Promise<WrappedCanvas | null> {
		if (!sinkData.iterator) return null;

		try {
			while (true) {
				// Bail out if a newer seek has been requested
				if (sinkData.seekGeneration !== generation) return null;

				// Wait for any pending prefetch to finish before touching iterator
				if (sinkData.prefetching && sinkData.prefetchPromise) {
					await sinkData.prefetchPromise;
				}

				// Bail out if a newer seek has been requested
				if (sinkData.seekGeneration !== generation) return null;

				// Check if the nextFrame (which might have just arrived) is what we need
				if (
					sinkData.nextFrame &&
					sinkData.nextFrame.timestamp <= targetTime + 0.05 // Tolerance
				) {
					sinkData.currentFrame = sinkData.nextFrame;
					sinkData.nextFrame = null;
				} else {
					const { value: frame, done } = await sinkData.iterator.next();

					if (done || !frame) break;

					sinkData.currentFrame = frame;
				}

				const frame = sinkData.currentFrame;
				if (!frame) break;

				sinkData.lastTime = frame.timestamp;

				if (this.isFrameValid({ frame, time: targetTime })) {
					return frame;
				}

				if (frame.timestamp > targetTime + 1.0) break;
			}
		} catch (error) {
			console.warn("Iterator failed, will restart:", error);
			sinkData.iterator = null;
		}

		return null;
	}
	private async seekToTime({
		sinkData,
		time,
		generation,
	}: {
		sinkData: VideoSinkData;
		time: number;
		generation: number;
	}): Promise<WrappedCanvas | null> {
		try {
			// Bail out if a newer seek has been requested
			if (sinkData.seekGeneration !== generation) return null;

			if (sinkData.iterator) {
				await sinkData.iterator.return();
				sinkData.iterator = null;
			}

			sinkData.nextFrame = null;
			sinkData.iterator = sinkData.sink.canvases(time);
			sinkData.lastTime = time;

			// Bail out if a newer seek has been requested
			if (sinkData.seekGeneration !== generation) return null;

			// Fetch current frame
			const { value: frame } = await sinkData.iterator.next();

			if (frame) {
				sinkData.currentFrame = frame;
				return frame;
			}
		} catch (error) {
			console.warn("Failed to seek video:", error);
		}

		return null;
	}

	private startPrefetch({ sinkData }: { sinkData: VideoSinkData }): void {
		if (sinkData.prefetching || !sinkData.iterator || sinkData.nextFrame) {
			return;
		}

		sinkData.prefetching = true;
		sinkData.prefetchPromise = this.prefetchNextFrame({ sinkData });
	}

	private async prefetchNextFrame({
		sinkData,
	}: {
		sinkData: VideoSinkData;
	}): Promise<void> {
		if (!sinkData.iterator) {
			sinkData.prefetching = false;
			sinkData.prefetchPromise = null;
			return;
		}

		try {
			const { value: frame, done } = await sinkData.iterator.next();

			if (done || !frame) {
				sinkData.prefetching = false;
				sinkData.prefetchPromise = null;
				return;
			}

			sinkData.nextFrame = frame;
			sinkData.prefetching = false;
			sinkData.prefetchPromise = null;
		} catch (error) {
			console.warn("Prefetch failed:", error);
			sinkData.prefetching = false;
			sinkData.prefetchPromise = null;
			sinkData.iterator = null;
		}
	}
	private async ensureSink({
		mediaId,
		file,
		maxDim,
	}: {
		mediaId: string;
		file: File;
		maxDim?: number;
	}): Promise<void> {
		const existing = this.sinks.get(mediaId);
		if (existing) {
			// Rebuild only when the decode cap actually changed (e.g. the user
			// switched preview quality). Steady-state playback never rebuilds.
			if (existing.maxDim === maxDim) return;
			this.clearVideo({ mediaId });
		}

		if (this.initPromises.has(mediaId)) {
			await this.initPromises.get(mediaId);
			return;
		}

		const initPromise = this.initializeSink({ mediaId, file, maxDim });
		this.initPromises.set(mediaId, initPromise);

		try {
			await initPromise;
		} finally {
			this.initPromises.delete(mediaId);
		}
	}
	private async initializeSink({
		mediaId,
		file,
		maxDim,
	}: {
		mediaId: string;
		file: File;
		maxDim?: number;
	}): Promise<void> {
		let input: Input | null = null;
		try {
			input = new Input({
				source: new BlobSource(file),
				formats: ALL_FORMATS,
			});

			const videoTrack = await input.getPrimaryVideoTrack();
			if (!videoTrack) {
				throw new Error("No video track found");
			}

			const canDecode = await videoTrack.canDecode();
			if (!canDecode) {
				throw new Error("Video codec not supported for decoding");
			}

			// Cap decode resolution to the preview's longest edge, preserving
			// aspect. Decoding a 4K source for a 720p preview is pure waste.
			const decodeSize = resolveDecodeSize({
				srcWidth: videoTrack.displayWidth,
				srcHeight: videoTrack.displayHeight,
				maxDim,
			});

			const sink = new CanvasSink(videoTrack, {
				poolSize: 3,
				fit: "contain",
				...decodeSize,
			});

			this.sinks.set(mediaId, {
				input,
				sink,
				iterator: null,
				currentFrame: null,
				nextFrame: null,
				lastTime: -1,
				prefetching: false,
				prefetchPromise: null,
				maxDim,
				seekGeneration: 0,
			});
		} catch (error) {
			input?.dispose();
			console.error("Failed to initialize video sink:", mediaId, error);
			throw error;
		}
	}

	clearVideo({ mediaId }: { mediaId: string }): void {
		const sinkData = this.sinks.get(mediaId);
		if (sinkData) {
			if (sinkData.iterator) {
				void sinkData.iterator.return();
			}
			sinkData.input.dispose();

			this.sinks.delete(mediaId);
		}

		this.initPromises.delete(mediaId);
		this.frameChain.delete(mediaId);
	}

	clearAll(): void {
		for (const [mediaId] of this.sinks) {
			this.clearVideo({ mediaId });
		}
	}

	getStats() {
		return {
			totalSinks: this.sinks.size,
			activeSinks: Array.from(this.sinks.values()).filter((s) => s.iterator)
				.length,
			cachedFrames: Array.from(this.sinks.values()).filter(
				(s) => s.currentFrame,
			).length,
		};
	}
}

export const videoCache = new VideoCache();
