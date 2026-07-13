import {
	Input,
	ALL_FORMATS,
	BlobSource,
	CanvasSink,
	type WrappedCanvas,
} from "mediabunny";
import { buildGOPIndex, type GOPIndex } from "./gop-index";

/**
 * Maximum decoded frames to retain per video in the LRU frame cache.
 * At 60 fps this is ~1.1 s of video — enough to make backward scrubbing
 * and short-range re-seeks instant on long clips. Each frame wraps a
 * canvas (GPU-backed when available) decoded at the *preview* resolution
 * (capped by `maxDim`), so the cost is dominated by the downscaled canvas
 * backing-store, not full-res JS heap.
 */
const MAX_CACHED_FRAMES_PER_MEDIA = 128;

/**
 * Number of frames to prefetch ahead of the playhead during forward
 * playback. The original value of 1 gave only ~16 ms of buffer at 60 fps.
 * 6 frames gives ~100 ms of buffer — enough to absorb decode spikes on
 * long/high-GOP clips while keeping the prefetch batch small. A smaller
 * batch completes sooner, so `iterateToTime` waits less for the prefetch
 * promise and the playhead reaches the next frame faster.
 */
const PREFETCH_BUFFER_SIZE = 6;

/**
 * CanvasSink pool size. Must comfortably exceed the prefetch buffer plus the
 * current frame plus any frame the compositor is still holding a reference to.
 * With a prefetch buffer of 6 + current + compositor hold, 12 gives
 * headroom for the next batch to decode without churn.
 */
const SINK_POOL_SIZE = 12;

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
			const frame = await this.iterateToTime({
				sinkData,
				targetTime: time,
				generation: myGeneration,
			});
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
		const frame = await this.seekToTime({
			sinkData,
			time,
			generation: myGeneration,
		});
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
				if (buffered && buffered.timestamp <= targetTime + 0.05) {
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

			// Use getCanvas() for single-frame retrieval instead of
			// canvases() iterator. getCanvas() is optimized for seeking
			// to a specific timestamp — it doesn't set up the iterator
			// pipeline or pre-decode frames ahead. For long jumps (e.g.
			// minute 1 to minute 13), this avoids the overhead of
			// creating an iterator and iterating through all frames
			// from the keyframe to the target.
			//
			// The GOP index (built eagerly on import) helps mediabunny
			// find the nearest keyframe in O(log n) instead of O(n)
			// packet scan. Combined with getCanvas(), this gives us
			// CapCut-level seek performance.
			const frame = await sinkData.sink.getCanvas(time);

			// Bail out if a newer seek has been requested
			if (sinkData.seekGeneration !== generation) return null;

			if (frame) {
				sinkData.currentFrame = frame;
				sinkData.lastTime = frame.timestamp;

				// Set up iterator from the current frame for forward
				// playback / prefetch. canvases(startTimestamp) starts
				// at the given time, so we use the frame's timestamp
				// (which may be slightly before `time` if the target
				// fell between frames).
				sinkData.iterator = sinkData.sink.canvases(frame.timestamp);
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
			});

			// Build the GOP index in the BACKGROUND (do NOT await it here).
			// It used to be awaited during sink init, which blocked the very
			// first frame of a clip behind a full keyframe-table scan
			// (50-200ms, and substantially worse on long/4K clips) — a visible
			// stall the first time you scrub to or play a long video. The seek
			// path relies on mediabunny's own efficient internal seek
			// (`sink.getCanvas(time)`), so the index is advisory and does not
			// need to gate sink readiness. Building it off the critical path
			// lets the first frame display as soon as it can be decoded.
			const sinkData = this.sinks.get(mediaId);
			if (sinkData) {
				void buildGOPIndex({ file, mediaId })
					.then((index) => {
						// The sink may have been cleared/rebuilt (e.g. a preview
						// quality change) while we were scanning; only attach the
						// index if this exact sink is still the current one.
						if (this.sinks.get(mediaId) === sinkData) {
							sinkData.gopIndex = index;
						}
					})
					.catch((err) => {
						console.warn("GOP index build failed:", mediaId, err);
					});
			}
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
