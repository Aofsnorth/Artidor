import {
	Input,
	ALL_FORMATS,
	BlobSource,
	CanvasSink,
	type WrappedCanvas,
} from "mediabunny";
import { buildGOPIndex, type GOPIndex } from "./gop-index";

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
 * Upper bound on project-frame times the prefetch pipeline may be working on
 * at once (see `createProjectFrameGrid`). Equals the prefetch buffer so the
 * sink holds the same number of in-flight decoded frames as the plain
 * sequential iterator did — mediabunny caps its own decoded-sample queue, and
 * the grid never asks for more frames than the buffer can hold.
 */
const MAX_GRID_POINTS_IN_FLIGHT = PREFETCH_BUFFER_SIZE;

/**
 * Bounds on the project frame step learned from `getFrameAt` calls, in
 * seconds of source time. Below MIN the playhead did not advance (the same
 * frame was requested twice); above MAX the jump was a seek, not playback.
 * 0.25s ⇒ 4 fps, far below any real project frame rate.
 */
const MIN_FRAME_STEP_SECONDS = 0.0005;
const MAX_FRAME_STEP_SECONDS = 0.25;

/**
 * CanvasSink pool size. Must comfortably exceed the prefetch buffer plus the
 * current frame plus any frame the compositor is still holding a reference to.
 * With a prefetch buffer of 6 + current + compositor hold, 12 gives
 * headroom for the next batch to decode without churn.
 *
 * Pooled canvases are reused round-robin. Never retain raw WrappedCanvas
 * objects beyond the current frame / short prefetch window — old canvas
 * references silently flip to newer pixels.
 */
const SINK_POOL_SIZE = 12;

/**
 * Maximum number of live video sinks (one `Input` + one video decoder +
 * SINK_POOL_SIZE pooled canvases each). Sinks used to live for the whole
 * session: removing a clip from the timeline never purged one, so a long
 * editing session kept one decoder and one canvas pool per media ever opened.
 *
 * Memory: a pooled canvas is a full RGBA backing store (≈3.5 MB at a 1280×720
 * preview cap, ≈33 MB for an uncapped 4K one), so a sink costs roughly
 * SINK_POOL_SIZE × that — tens of MB each, on top of the demuxer's packet
 * buffers. Four sinks is the point where a multi-clip session starts pushing
 * laptop/mobile GPUs into canvas eviction, and it still covers the 2–3 clips
 * of a typical cut, so no clip that is on screen is ever torn down.
 *
 * Decode startup cost of getting it wrong: rebuilding a sink means a fresh
 * `Input`, a demux pass and a cold first-frame decode — the code around
 * `prewarm` budgets 150–500 ms for that. The cap is applied on the request
 * path, so an evicted clip that comes back on screen pays that once, while
 * everything still in the cap stays warm.
 */
const MAX_VIDEO_SINKS = 4;

/**
 * Raw decoded-frame cache is only safe when CanvasSink pooling is off.
 * With poolSize > 0, canvases are reused and timestamp-keyed retention
 * shows wrong frames during playback.
 */
/**
 * Checks whether a frame covers the requested timestamp, accounting for
 * minor timestamp jitter and container priming offsets at cut points.
 */
export function isFrameValid({
	frameTimestamp,
	frameDuration,
	time,
}: {
	frameTimestamp: number;
	frameDuration: number;
	time: number;
}): boolean {
	const duration = frameDuration > 0 ? frameDuration : 1 / 30;
	// 35ms start tolerance handles container priming offset and timestamp jitter at cut points.
	// 10ms end tolerance handles precision rounding in float timestamps.
	const startTolerance = 0.035;
	const endTolerance = 0.01;
	return (
		time >= frameTimestamp - startTolerance &&
		time < frameTimestamp + duration + endTolerance
	);
}

export function resolveDecodedFrameCacheLimit({
	poolSize,
	desiredLimit,
}: {
	poolSize: number;
	desiredLimit: number;
}): number {
	return poolSize > 0 ? 0 : desiredLimit;
}

interface VideoSinkData {
	input: Input;
	sink: CanvasSink;
	/**
	 * Frame source for the prefetch pipeline. Yields the frames the upcoming
	 * project frames need — see `createPrefetchIterator`.
	 */
	iterator: PrefetchIterator | null;
	/**
	 * Backpressure state for the project-frame grid (see
	 * `createProjectFrameGrid`). Null while the raw sequential iterator is in
	 * use, which needs no gating.
	 */
	grid: GridState | null;
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
	 * GOP index: sorted keyframe timestamps. Built lazily on first seek
	 * (or eagerly on import). Used by `seekToTime` to jump directly to
	 * the nearest preceding keyframe instead of scanning packets.
	 * Null while building or if the video has no keyframes.
	 */
	gopIndex: GOPIndex | null;
	/**
	 * Project frame step in seconds of SOURCE time, learned from the deltas
	 * between consecutive `getFrameAt` calls. 0 = not known yet, in which case
	 * prefetch falls back to walking consecutive source frames.
	 */
	frameStepSeconds: number;
	/** Source time of the most recent `getFrameAt` request. */
	lastRequestedTime: number;
	/** Duration of the last source frame seen, used to keep the grid spacing
	 * at least one source frame so it never clones the same frame twice. */
	sourceFrameDuration: number;
	/** Monotonic counter: higher means this sink was used more recently. */
	lastUsedAt: number;
	/** In-flight `getFrameAt` / `prewarm` calls. LRU eviction skips these. */
	activeRequests: number;
}

/**
 * Frame source used by the prefetch pipeline. `canvasesAtTimestamps` yields
 * `null` for a project-frame time that has no frame (e.g. past the last
 * frame of the clip), `canvases` never does.
 */
type PrefetchIterator = AsyncGenerator<
	WrappedCanvas | null,
	void,
	unknown
>;

/** Backpressure counters for one project-frame grid. */
interface GridState {
	/** Grid times handed to the sink whose frame has not been delivered yet. */
	inFlight: number;
	/** Resolvers waiting for `inFlight` to drop. */
	waiters: Array<() => void>;
	/** Set when the prefetch pipeline abandons this grid. */
	done: boolean;
}

/**
 * Ends a grid and wakes everything waiting on it. A sink whose frame source is
 * discarded is blocked inside the grid waiting for a time that will never come
 * (mediabunny does not forward `return()` to the timestamp iterable), so this
 * is what lets its decoder pump finish and close instead of hanging.
 */
function closeGrid(grid: GridState | null): void {
	if (!grid || grid.done) return;
	grid.done = true;
	const waiters = grid.waiters;
	grid.waiters = [];
	for (const resolve of waiters) resolve();
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
	private prewarmPromises = new Map<string, Promise<void>>();
	/** Monotonic LRU clock for `VideoSinkData.lastUsedAt`. */
	private useCounter = 0;

	/**
	 * Pre-warm a video sink and pre-decode its starting frames ahead of time.
	 * Called before the playhead reaches an upcoming clip, ensuring the sink,
	 * decoder, and initial frame buffer are ready when the cut arrives.
	 */
	prewarm({
		mediaId,
		file,
		time,
		maxDim,
	}: {
		mediaId: string;
		file: File;
		time: number;
		maxDim?: number;
	}): Promise<void> {
		const existingPromise = this.prewarmPromises.get(mediaId);
		if (existingPromise) return existingPromise;

		const promise = (async () => {
			let held: VideoSinkData | null = null;
			try {
				await this.ensureSink({ mediaId, file, maxDim });
				const found = this.sinks.get(mediaId);
				if (!found) return;
				const sinkData = found;
				// A prewarm in flight must not be evicted out from under the
				// background seek it is about to run.
				sinkData.activeRequests++;
				held = sinkData;
				this.touchSink(sinkData);

				// Never disturb a sink that is actively serving another playback
				// position. Split clips share one mediaId: while the first half
				// is still playing, prewarming the second half would seek this
				// same sink — tearing down its iterator + prefetch buffer and
				// forcing a full seek on every frame until the cut. That decode
				// thrash stutters the transition with or without effects. An
				// active sink already has a warm decoder, so leave it alone and
				// let the cut perform one normal seek. Only seek idle sinks
				// (no frame, no iterator) that have nothing to lose.
				if (sinkData.currentFrame || sinkData.iterator) {
					return;
				}

				// Otherwise, perform background seek to target time and fill prefetch buffer.
				sinkData.seekGeneration++;
				const gen = sinkData.seekGeneration;
				const previous = this.frameChain.get(mediaId) ?? Promise.resolve();
				const current = previous.then(async () => {
					if (sinkData.seekGeneration !== gen) return;
					const frame = await this.seekToTime({
						sinkData,
						time,
						generation: gen,
					});
					if (frame && sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
						this.startPrefetch({ sinkData });
					}
				});
				this.frameChain.set(
					mediaId,
					current.catch(() => {}),
				);
				await current;
			} catch (err) {
				console.warn("[video-cache] Prewarm failed:", mediaId, err);
			} finally {
				if (held) held.activeRequests--;
				this.prewarmPromises.delete(mediaId);
			}
		})();

		this.prewarmPromises.set(mediaId, promise);
		return promise;
	}

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

		// Learn the project frame grid from the present path. Consecutive
		// requests for one mediaId advance by exactly one project frame of
		// source time, so the smallest plausible advance is the step; larger
		// jumps are dropped frames or seeks and must not inflate it.
		this.observeFrameStep({ sinkData, time });
		// The first request of a clip cannot know the project frame step, so
		// its prefetch source starts on the consecutive-frame fallback. Switch
		// it to the grid as soon as the step is known, otherwise the fallback
		// would keep walking every source frame for the rest of the playback.
		this.upgradeToProjectFrameGrid({ sinkData });
		// Hold the sink for the whole request: an LRU eviction would dispose
		// its Input while this decode is in flight.
		sinkData.activeRequests++;
		this.touchSink(sinkData);
		this.enforceSinkLimit();

		try {
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
			return await current;
		} finally {
			sinkData.activeRequests--;
		}
	}

	/**
	 * Records where the playhead is and refines the project frame step used to
	 * build the prefetch grid. Requests that move backwards (stale renders) or
	 * not at all (the same frame requested twice) leave the learned step alone.
	 */
	private observeFrameStep({
		sinkData,
		time,
	}: {
		sinkData: VideoSinkData;
		time: number;
	}): void {
		const previous = sinkData.lastRequestedTime;
		if (!Number.isFinite(previous)) {
			sinkData.lastRequestedTime = time;
			return;
		}
		const delta = time - previous;
		// Stale render or a re-request of the current frame.
		if (delta < MIN_FRAME_STEP_SECONDS) return;
		sinkData.lastRequestedTime = time;
		// A jump larger than any real project frame is a seek. The playhead
		// moved (recorded above) but the step stays as learned.
		if (delta > MAX_FRAME_STEP_SECONDS) return;
		sinkData.frameStepSeconds =
			sinkData.frameStepSeconds > 0
				? Math.min(sinkData.frameStepSeconds, delta)
				: delta;
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

		// 1. Consume from the prefetch buffer if the next frame is at or
		// before the requested time. Shift frames that are before the
		// target time (they're past their display window).
		// ponytail: no long-lived raw WrappedCanvas cache — CanvasSink pool
		// reuses canvas bitmaps; stale timestamp keys would show wrong frames.
		while (sinkData.prefetchBuffer.length > 0) {
			const next = sinkData.prefetchBuffer[0];
			if (!next || next.timestamp > time) break;
			const shifted = sinkData.prefetchBuffer.shift();
			if (!shifted) break;
			sinkData.currentFrame = shifted;
			if (this.isFrameValid({ frame: sinkData.currentFrame, time })) {
				if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
					this.startPrefetch({ sinkData });
				}
				return sinkData.currentFrame;
			}
		}

		// 2. Check if the current frame is still valid.
		if (
			sinkData.currentFrame &&
			this.isFrameValid({ frame: sinkData.currentFrame, time })
		) {
			if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				this.startPrefetch({ sinkData });
			}
			return sinkData.currentFrame;
		}

		// 3. Try forward iteration (cheaper than a full seek).
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
				if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
					this.startPrefetch({ sinkData });
				}
				return frame;
			}
		}

		// 4. Fall back to a full seek.
		const frame = await this.seekToTime({
			sinkData,
			time,
			generation: myGeneration,
		});
		// Bail out if stale
		if (sinkData.seekGeneration !== myGeneration) return null;
		if (frame) {
			if (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				this.startPrefetch({ sinkData });
			}
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
		return isFrameValid({
			frameTimestamp: frame.timestamp,
			frameDuration: frame.duration,
			time,
		});
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
					const frame = await this.pullNextFrame({ sinkData });
					// Iterator exhausted: same recovery as before — the caller
					// falls through to a full seek.
					if (frame === null) break;
					// No frame exists for that project-frame time (past the last
					// frame of the clip). Keep walking the grid.
					if (frame === undefined) continue;

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

			this.releasePrefetchIterator(sinkData);

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
				this.observeSourceFrameDuration({ sinkData, frame });

				// The playhead is now here, so the prefetch grid (if any)
				// restarts from this position.
				sinkData.lastRequestedTime = time;

				// Set up the frame source for forward playback / prefetch. It
				// yields the frames the next project frames will ask for, so a
				// source running faster than the project never renders the
				// frames the playhead steps over.
				sinkData.iterator = this.createPrefetchIterator({ sinkData, from: time });
				return frame;
			}
		} catch (error) {
			console.warn("Failed to seek video:", error);
		}

		return null;
	}

	/** Remembers the source frame duration so the grid never clusters. */
	private observeSourceFrameDuration({
		sinkData,
		frame,
	}: {
		sinkData: VideoSinkData;
		frame: WrappedCanvas;
	}): void {
		if (frame.duration > 0) sinkData.sourceFrameDuration = frame.duration;
	}

	/**
	 * Detaches the prefetch frame source: closes it, ends its grid and wakes
	 * the sink's decoder pump, which would otherwise stay blocked waiting for a
	 * project-frame time that is never coming.
	 */
	private releasePrefetchIterator(sinkData: VideoSinkData): void {
		if (sinkData.iterator) void sinkData.iterator.return();
		closeGrid(sinkData.grid);
		sinkData.iterator = null;
		sinkData.grid = null;
	}

	/**
	 * Spacing of the project-frame grid: one project frame, but never less than
	 * one source frame. The floor matters when the project runs faster than the
	 * source (24 fps media in a 60 fps project): without it several grid points
	 * would land inside the same source frame and the sink would clone it once
	 * per point instead of moving on.
	 */
	private resolveGridStep({ sinkData }: { sinkData: VideoSinkData }): number {
		return Math.max(sinkData.frameStepSeconds, sinkData.sourceFrameDuration);
	}

	/**
	 * Frame source for the prefetch pipeline.
	 *
	 * `getFrameAt` is the only source of project frames: consecutive requests
	 * for one mediaId advance by exactly one project frame of source time, so
	 * the upcoming requests are `lastRequestedTime + n × step`. A
	 * `canvases()` iterator walks *every* source frame between two of those
	 * times, rendering each one into a pooled canvas — for a 60 fps source in a
	 * 30 fps project that is 60 canvas renders per second per clip to display
	 * 30 frames, and the 30 skipped canvases are thrown away by the consume
	 * loop in `resolveFrame`.
	 *
	 * `canvasesAtTimestamps` decodes the same packets but only renders the
	 * frames the requested times resolve to; the frames in between are closed
	 * without a canvas copy. Passing the project-frame times therefore drops
	 * the wasted renders while keeping the decode pipeline (one decoder, one
	 * iterator per seek, same GOP walk) exactly as it was.
	 *
	 * Until the project frame step is known (the first frames of a clip, or a
	 * burst of seeks) this falls back to the consecutive-frame iterator, so
	 * the buffer fills exactly as it did before.
	 */
	private createPrefetchIterator({
		sinkData,
		from,
	}: {
		sinkData: VideoSinkData;
		from: number;
	}): PrefetchIterator {
		if (sinkData.frameStepSeconds <= 0) {
			sinkData.grid = null;
			return sinkData.sink.canvases(from);
		}
		return sinkData.sink.canvasesAtTimestamps(
			this.createProjectFrameGrid({ sinkData, from }),
		);
	}

	/**
	 * Lazily produces the source times of the upcoming project frames, anchored
	 * at the playhead and advancing by one grid step.
	 *
	 * The sink pulls these eagerly — it decodes as soon as it has a time — so
	 * the iterable is also the prefetch's backpressure: at most
	 * MAX_GRID_POINTS_IN_FLIGHT times may be waiting for a frame. Each
	 * delivered frame frees a slot, so a blocked sink always has an in-flight
	 * frame to hand to whoever is pulling and the gate can never deadlock.
	 */
	private createProjectFrameGrid({
		sinkData,
		from,
	}: {
		sinkData: VideoSinkData;
		from: number;
	}): AsyncIterable<number> {
		const grid: GridState = { inFlight: 0, waiters: [], done: false };
		sinkData.grid = grid;
		let cursor = from;
		return {
			[Symbol.asyncIterator]: () => ({
				next: async (): Promise<IteratorResult<number>> => {
					while (grid.inFlight >= MAX_GRID_POINTS_IN_FLIGHT && !grid.done) {
						await new Promise<void>((resolve) => {
							grid.waiters.push(resolve);
						});
					}
					// The prefetch pipeline dropped this frame source.
					if (grid.done) return { value: undefined, done: true };
					const step = this.resolveGridStep({ sinkData });
					// Stay ahead of the playhead even if it moved on while the
					// sink was working through the previous point.
					cursor = Math.max(cursor + step, sinkData.lastRequestedTime + step);
					grid.inFlight++;
					return { value: cursor, done: false };
				},
				return: async (): Promise<IteratorResult<number>> => {
					closeGrid(grid);
					return { value: undefined, done: true };
				},
			}),
		};
	}

	/**
	 * Single funnel for reading the prefetch frame source. Frees the grid slot
	 * the frame was decoded for.
	 *
	 * Returns the frame, `undefined` when the sink has no frame for that
	 * project-frame time, or `null` when the source is exhausted.
	 */
	private async pullNextFrame({
		sinkData,
	}: {
		sinkData: VideoSinkData;
	}): Promise<WrappedCanvas | null | undefined> {
		const iterator = sinkData.iterator;
		if (!iterator) return null;
		const { value, done } = await iterator.next();
		const grid = sinkData.grid;
		if (grid && grid.inFlight > 0) {
			grid.inFlight--;
			const waiters = grid.waiters;
			grid.waiters = [];
			for (const resolve of waiters) resolve();
		}
		if (done) return null;
		// A project-frame time with no frame behind it (past the last frame of
		// the clip) yields null; the caller keeps walking the grid.
		if (!value) return undefined;
		this.observeSourceFrameDuration({ sinkData, frame: value });
		return value;
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

	/** Source time the next grid should start from. */
	private nextGridAnchor({ sinkData }: { sinkData: VideoSinkData }): number {
		const newest = sinkData.prefetchBuffer.at(-1);
		const buffered = newest ? newest.timestamp : -Infinity;
		return Math.max(buffered, sinkData.lastRequestedTime);
	}

	/**
	 * Replaces a consecutive-frame prefetch source with the project-frame grid
	 * once the step is known. At most once per iterator (a sink already on the
	 * grid is left alone), so the extra decoder setup this costs happens a
	 * single time per clip instead of per request.
	 */
	private upgradeToProjectFrameGrid({
		sinkData,
	}: {
		sinkData: VideoSinkData;
	}): void {
		if (sinkData.frameStepSeconds <= 0) return;
		if (sinkData.grid !== null) return;
		if (!sinkData.iterator) return;
		const anchor = this.nextGridAnchor({ sinkData });
		this.releasePrefetchIterator(sinkData);
		sinkData.iterator = this.createPrefetchIterator({ sinkData, from: anchor });
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
			// Fill the buffer up to PREFETCH_BUFFER_SIZE frames. Every pull is
			// one project frame the playhead will actually reach, so a source
			// faster than the project no longer renders (and buffers) the
			// frames the playhead steps over.
			while (sinkData.prefetchBuffer.length < PREFETCH_BUFFER_SIZE) {
				const frame = await this.pullNextFrame({ sinkData });
				// Source exhausted (end of clip): the spent iterator is left in
				// place, exactly as before, so the next request falls through
				// to a full seek and rebuilds it.
				if (frame === null) break;
				// No frame exists for that project-frame time — keep walking.
				if (frame === undefined) continue;

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
				grid: null,
				currentFrame: null,
				prefetchBuffer: [],
				lastTime: -1,
				prefetching: false,
				prefetchPromise: null,
				maxDim,
				seekGeneration: 0,
				gopIndex: null,
				frameStepSeconds: 0,
				lastRequestedTime: Number.NaN,
				sourceFrameDuration: 0,
				lastUsedAt: ++this.useCounter,
				activeRequests: 0,
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
			// The Input is about to be disposed, so any seek, prefetch or grid
			// still holding this sink must stop touching it.
			sinkData.seekGeneration++;
			this.releasePrefetchIterator(sinkData);
			sinkData.prefetching = false;
			sinkData.prefetchPromise = null;
			// Drop every reference we hold to pooled canvases before the sink
			// itself becomes unreachable: the pool lives on the CanvasSink, so
			// this releases the whole ring (SINK_POOL_SIZE backing stores) to
			// the GC once `sinks.delete` runs below.
			sinkData.prefetchBuffer = [];
			sinkData.currentFrame = null;
			sinkData.input.dispose();

			this.sinks.delete(mediaId);
		}

		this.initPromises.delete(mediaId);
		this.frameChain.delete(mediaId);
		this.prewarmPromises.delete(mediaId);
	}

	/** Marks a sink as the most recently used one (LRU bookkeeping). */
	private touchSink(sinkData: VideoSinkData): void {
		sinkData.lastUsedAt = ++this.useCounter;
	}

	/**
	 * Evicts least-recently-used sinks down to MAX_VIDEO_SINKS.
	 *
	 * A sink with an in-flight `getFrameAt` / `prewarm` is never a candidate —
	 * its Input is being read from right now, and disposing it under a decode
	 * would fail the request. If every sink is busy the cap is exceeded for
	 * that one request and enforced on the next call, which is the only moment
	 * a new sink can be created.
	 */
	private enforceSinkLimit(): void {
		let excess = this.sinks.size - MAX_VIDEO_SINKS;
		if (excess <= 0) return;
		const candidates = Array.from(this.sinks.entries())
			.filter(([, sinkData]) => sinkData.activeRequests === 0)
			.sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
		for (const [mediaId] of candidates) {
			if (excess <= 0) break;
			this.clearVideo({ mediaId });
			excess--;
		}
	}

	clearAll(): void {
		for (const [mediaId] of this.sinks) {
			this.clearVideo({ mediaId });
		}
		this.prewarmPromises.clear();
	}

	getStats() {
		const sinks = Array.from(this.sinks.values());
		return {
			totalSinks: this.sinks.size,
			activeSinks: sinks.filter((s) => s.iterator).length,
			cachedFrames: sinks.filter((s) => s.currentFrame).length,
			lruCachedFrames: 0,
			prefetchBuffered: sinks.reduce(
				(sum, s) => sum + s.prefetchBuffer.length,
				0,
			),
		};
	}
}

export const videoCache = new VideoCache();
