import {
	Input,
	ALL_FORMATS,
	BlobSource,
	CanvasSink,
	type WrappedCanvas,
} from "mediabunny";
import {
	buildGOPIndex,
	findNearestKeyframe,
	type GOPIndex,
} from "./gop-index";

/**
 * Maximum decoded frames to retain per video in the LRU frame cache.
 * At 60 fps this is ~0.5 s of video — enough to make backward scrubbing
 * and short-range re-seeks instant without excessive memory use.
 * Each frame wraps a canvas (GPU-backed when available), so the cost
 * is dominated by canvas backing-store, not JS heap.
 */
const MAX_CACHED_FRAMES_PER_MEDIA = 30;

/**
 * Number of frames to prefetch ahead of the playhead during forward
 * playback. The previous value of 1 gave only ~16 ms of buffer at 60 fps
 * (one frame), which meant any decode jitter caused an immediate stall.
 * 3 frames gives ~50 ms of buffer — enough to absorb single-frame
 * decode spikes without stalling the preview.
 */
const PREFETCH_BUFFER_SIZE = 3;

/**
 * CanvasSink pool size. The previous value of 3 meant only 3 decoded
 * canvases were recycled. With a prefetch buffer of 3 plus the current
 * frame, we need at least 4-5 to avoid allocation churn. 6 gives
 * headroom for the compositor to hold a reference while the next batch
 * decodes.
 */
const SINK_POOL_SIZE = 6;

interface VideoSinkData {
	input: Input;
	sink: CanvasSink;
	iterator: AsyncGenerator<WrappedCanvas, void, unknown> | null;
	currentFrame: WrappedCanvas | null;
	/** Prefetch buffer: up to PREFETCH_BUFFER_SIZE frames ahead. */
	prefetchBuffer: WrappedCanvas[];
	lastTime: number;
	prefetching: boolean;
	prefetchPromise: Promise<void> | null;
	// Longest-edge decode cap this sink was built with (undefined = full res).
	// Changing it (e.g. preview quality change) rebuilds the sink.
	maxDim: number | undefined;
	// Seek generation counter. When a new seek comes in, this increments.
	// Old seeks check this and bail out if they're stale.
	seekGeneration: number;
	/**
	 * LRU frame cache: timestamp → decoded frame. Frames are inserted
	 * after decode and looked up before decode. Eviction is FIFO
	 * (oldest timestamp first), which approximates LRU for forward
	 * playback. Map preserves insertion order in JS, so eviction is
	 * O(1) via `entries().next()`.
	 */
	frameCache: Map<number, WrappedCanvas>;
	/**
	 * GOP index: sorted keyframe timestamps. Built lazily on first seek
	 * (or eagerly on import). Used by `seekToTime` to jump directly to
	 * the nearest preceding keyframe instead of scanning packets.
	 * Null while building or if the video has no keyframes.
	 */
	gopIndex: GOPIndex | null;
	gopIndexPromise: Promise<void> | null;
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

		// 1. Check the LRU frame cache first — a cache hit skips decode
		// entirely (0 ms vs 5-80 ms for a seek). This makes backward
		// scrubbing and short-range re-seeks instant.
		const cached = this.getCachedFrame({ sinkData, time });
		if (cached) {
			sinkData.currentFrame = cached;
			if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				this.startPrefetch({ sinkData });
			}
			return cached;
		}

		// 2. Consume from the prefetch buffer if the next frame is at or
		// before the requested time. Shift frames that are before the
		// target time (they're past their display window).
		while (sinkData.prefetchBuffer.length > 0) {
			const next = sinkData.prefetchBuffer[0];
			if (!next || next.timestamp > time) break;
			const shifted = sinkData.prefetchBuffer.shift();
			if (!shifted) break;
			sinkData.currentFrame = shifted;
			this.cacheFrame({ sinkData, frame: sinkData.currentFrame });
			if (this.isFrameValid({ frame: sinkData.currentFrame, time })) {
				if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
					this.startPrefetch({ sinkData });
				}
				return sinkData.currentFrame;
			}
		}

		// 3. Check if the current frame is still valid.
		if (
			sinkData.currentFrame &&
			this.isFrameValid({ frame: sinkData.currentFrame, time })
		) {
			if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				this.startPrefetch({ sinkData });
			}
			return sinkData.currentFrame;
		}

		// 4. Try forward iteration (cheaper than a full seek).
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
				this.cacheFrame({ sinkData, frame });
				if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
					this.startPrefetch({ sinkData });
				}
				return frame;
			}
		}

		// 5. Fall back to a full seek.
		const frame = await this.seekToTime({ sinkData, time, generation: myGeneration });
		// Bail out if stale
		if (sinkData.seekGeneration !== myGeneration) return null;
		if (frame) {
			this.cacheFrame({ sinkData, frame });
			if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				this.startPrefetch({ sinkData });
			}
		}
		return frame;
	}

	/**
	 * Look up a frame in the LRU cache by checking validity (timestamp
	 * range). On hit, the entry is moved to the end of the Map (most
	 * recently used) to implement LRU eviction.
	 */
	private getCachedFrame({
		sinkData,
		time,
	}: {
		sinkData: VideoSinkData;
		time: number;
	}): WrappedCanvas | null {
		for (const [key, frame] of sinkData.frameCache) {
			if (this.isFrameValid({ frame, time })) {
				// Move to end (most recently used) by re-inserting.
				sinkData.frameCache.delete(key);
				sinkData.frameCache.set(key, frame);
				return frame;
			}
		}
		return null;
	}

	/**
	 * Store a decoded frame in the LRU cache. Evicts the oldest entry
	 * when the cache exceeds MAX_CACHED_FRAMES_PER_MEDIA.
	 */
	private cacheFrame({
		sinkData,
		frame,
	}: {
		sinkData: VideoSinkData;
		frame: WrappedCanvas;
	}): void {
		const key = frame.timestamp;
		if (sinkData.frameCache.has(key)) {
			// Already cached — move to end.
			sinkData.frameCache.delete(key);
		}
		sinkData.frameCache.set(key, frame);
		// Evict oldest entries (Map preserves insertion order).
		while (sinkData.frameCache.size > MAX_CACHED_FRAMES_PER_MEDIA) {
			const oldest = sinkData.frameCache.keys().next();
			if (oldest.done) break;
			sinkData.frameCache.delete(oldest.value);
		}
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

				// Check if the prefetch buffer has the frame we need
				const buffered = sinkData.prefetchBuffer[0];
				if (
					buffered &&
					buffered.timestamp <= targetTime + 0.05
				) {
					const shifted = sinkData.prefetchBuffer.shift();
					if (shifted) sinkData.currentFrame = shifted;
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

			sinkData.prefetchBuffer = [];

			// Use GOP index to seek directly to the nearest keyframe,
			// then iterate forward to the target time. This is O(log n)
			// vs the old O(n) packet scan. For a 15-min video with 5s
			// GOP, a jump from 1:00 to 13:00 goes from scanning ~180
			// packets to binary-searching 180 keyframe timestamps.
			//
			// If the GOP index isn't ready yet (still building in the
			// background), fall back to the old path — the first seek
			// after import may be slow, but subsequent seeks will be
			// fast once the index is available.
			const gopIndex = await this.ensureGOPIndex({ sinkData });
			const seekStartTime =
				gopIndex && findNearestKeyframe(time, gopIndex);

			// canvases(startTimestamp) starts iteration at the given
			// time. When we have a GOP index, start from the keyframe
			// (which is <= target time) so the decoder begins from a
			// valid I-frame. Without the index, start from the target
			// time directly (mediabunny handles keyframe finding
			// internally, but less efficiently for long jumps).
			sinkData.iterator = sinkData.sink.canvases(
				seekStartTime ?? time,
			);
			sinkData.lastTime = time;

			// Bail out if a newer seek has been requested
			if (sinkData.seekGeneration !== generation) return null;

			// If we started from a keyframe before the target time,
			// iterate forward to the target frame. Otherwise the first
			// frame from the iterator is the target.
			if (seekStartTime !== null && seekStartTime < time) {
				const frame = await this.iterateToTime({
					sinkData,
					targetTime: time,
					generation,
				});
				if (sinkData.seekGeneration !== generation) return null;
				if (frame) {
					sinkData.currentFrame = frame;
					return frame;
				}
				// Fall through to first-frame fetch if iteration failed.
			}

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
		if (sinkData.prefetching || !sinkData.iterator) {
			return;
		}
		// Only prefetch when the buffer isn't full.
		if (sinkData.prefetchBuffer.length >= PREFETCH_BUFFER_SIZE) {
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
			// Fill the buffer up to PREFETCH_BUFFER_SIZE frames.
			while (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				const { value: frame, done } = await sinkData.iterator.next();

				if (done || !frame) {
					break;
				}

				sinkData.prefetchBuffer.push(frame);
			}

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
				poolSize: SINK_POOL_SIZE,
				fit: "contain",
				...decodeSize,
			});

			this.sinks.set(mediaId, {
				input,
				sink,
				iterator: null,
				currentFrame: null,
				prefetchBuffer: [],
				lastTime: -1,
				prefetching: false,
				prefetchPromise: null,
				maxDim,
				seekGeneration: 0,
				frameCache: new Map(),
				gopIndex: null,
				gopIndexPromise: null,
			});

			// Build GOP index in the background — don't block sink init.
			// The index is used to accelerate seeks; until it's ready,
			// seeks fall back to the existing scan-based path.
			this.startGOPIndexBuild({ mediaId, file });
		} catch (error) {
			input?.dispose();
			console.error("Failed to initialize video sink:", mediaId, error);
			throw error;
		}
	}

	/**
	 * Build the GOP index in the background. Called once when the sink
	 * is initialized. The index is stored on the sink data and used by
	 * `seekToTime` to jump directly to the nearest keyframe.
	 */
	private startGOPIndexBuild({
		mediaId,
		file,
	}: {
		mediaId: string;
		file: File;
	}): void {
		const sinkData = this.sinks.get(mediaId);
		if (!sinkData || sinkData.gopIndexPromise) return;

		sinkData.gopIndexPromise = buildGOPIndex({ file, mediaId })
			.then((index) => {
				const sd = this.sinks.get(mediaId);
				if (sd) {
					sd.gopIndex = index;
					sd.gopIndexPromise = null;
				}
			})
			.catch((err) => {
				console.warn("GOP index build failed:", mediaId, err);
				const sd = this.sinks.get(mediaId);
				if (sd) sd.gopIndexPromise = null;
			});
	}

	/**
	 * Wait for the GOP index to be built if it's still building.
	 * Returns the index or null if it's not ready / failed.
	 */
	private async ensureGOPIndex({
		sinkData,
	}: {
		sinkData: VideoSinkData;
	}): Promise<GOPIndex | null> {
		if (sinkData.gopIndex) return sinkData.gopIndex;
		if (sinkData.gopIndexPromise) {
			await sinkData.gopIndexPromise;
		}
		return sinkData.gopIndex;
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
		const sinks = Array.from(this.sinks.values());
		return {
			totalSinks: this.sinks.size,
			activeSinks: sinks.filter((s) => s.iterator).length,
			cachedFrames: sinks.filter((s) => s.currentFrame).length,
			lruCachedFrames: sinks.reduce((sum, s) => sum + s.frameCache.size, 0),
			prefetchBuffered: sinks.reduce(
				(sum, s) => sum + s.prefetchBuffer.length,
				0,
			),
		};
	}
}

export const videoCache = new VideoCache();
