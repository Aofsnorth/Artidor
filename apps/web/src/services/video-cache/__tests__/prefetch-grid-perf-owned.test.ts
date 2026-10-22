/**
 * Playback perf regressions owned by the video cache: the project-frame
 * prefetch grid and the LRU sink cap.
 *
 * The frame source is a fake CanvasSink that models the two mediabunny
 * behaviours the prefetch depends on:
 *  - `canvases()` walks EVERY source frame and renders each into a canvas.
 *  - `canvasesAtTimestamps()` pulls the requested times EAGERLY (it decodes as
 *    soon as it has one) and only renders the frames those times resolve to.
 *
 * The eager pump is modelled explicitly, because that is what makes an
 * unbounded timestamp source dangerous: the grid must stop handing out times
 * or the sink decodes the whole clip into memory.
 */
import { describe, expect, mock, test } from "bun:test";
import type { WrappedCanvas } from "mediabunny";
import {
	PREFETCH_BUFFER,
	SCRUB_SETTLE_WINDOW_MS,
	isFrameValid,
	VideoCache,
} from "../service";

type PrefetchIterator = AsyncGenerator<WrappedCanvas | null, void, unknown>;

interface SinkStats {
	/** Times the prefetch asked the sink for, in order. */
	requestedTimestamps: number[];
	/** Canvas renders from the project-frame grid (one per requested time). */
	gridRenders: number;
	/** Canvas renders from the consecutive-frame walk (the fallback). */
	sequentialRenders: number;
	/** Source frames the decoder had to touch to answer the grid times. */
	walkedSourceFrames: number;
	canvasesCalls: number;
	canvasesAtTimestampsCalls: number;
	/**
	 * `getCanvas()` calls. mediabunny creates a NEW WebCodecs decoder for every
	 * `getCanvas()` call, so this counts decoder constructions.
	 */
	getCanvasCalls: number;
}

interface SinkData {
	input: { dispose: () => void };
	sink: ReturnType<typeof createFakeSink>["sink"];
	iterator: PrefetchIterator | null;
	grid: { done: boolean } | null;
	currentFrame: WrappedCanvas | null;
	prefetchBuffer: WrappedCanvas[];
	lastTime: number;
	prefetching: boolean;
	prefetchPromise: Promise<void> | null;
	maxDim: number | undefined;
	seekGeneration: number;
	gopIndex: null;
	frameStepSeconds: number;
	lastRequestedTime: number;
	sourceFrameDuration: number;
	lastUsedAt: number;
	activeRequests: number;
	backgroundTask: Promise<void> | null;
	pendingExactTime: number | null;
	lastRequestAt: number;
	lastRequestForward: boolean;
	isolatedRequest: boolean;
	backgroundTaskStartedAt: number;
	backgroundTaskId: number;
}

interface VideoCacheInternals {
	sinks: Map<string, SinkData>;
	frameChain: Map<string, Promise<unknown>>;
	initPromises: Map<string, Promise<void>>;
	prewarmPromises: Map<string, Promise<void>>;
	useCounter: number;
	observeFrameStep(args: { sinkData: SinkData; time: number }): void;
	resolveFrame(args: {
		sinkData: SinkData;
		time: number;
	}): Promise<WrappedCanvas | null>;
	nearestKeyframeFrame(args: {
		sinkData: SinkData;
		time: number;
		generation: number;
	}): Promise<WrappedCanvas | null>;
	resolveGridStep(args: { sinkData: SinkData }): number;
	createProjectFrameGrid(args: {
		sinkData: SinkData;
		from: number;
	}): AsyncIterable<number>;
}

function internalsOf(cache: VideoCache): VideoCacheInternals {
	return cache as unknown as VideoCacheInternals;
}

/** Source frame at `index` of an `fps`-frame-per-second clip. */
function makeSourceFrames({
	fps,
	count,
}: {
	fps: number;
	count: number;
}): WrappedCanvas[] {
	return Array.from({ length: count }, (_, index) => ({
		canvas: { width: 16, height: 16 } as unknown as HTMLCanvasElement,
		timestamp: index / fps,
		duration: 1 / fps,
	}));
}

/** mediabunny resolves a time to the last frame starting at or before it. */
function frameCovering(
	frames: WrappedCanvas[],
	time: number,
): WrappedCanvas | null {
	let match: WrappedCanvas | null = null;
	for (const frame of frames) {
		if (frame.timestamp <= time + 1e-9) match = frame;
		else break;
	}
	return match ?? frames[0] ?? null;
}

async function* toAsyncIterable(
	source: AsyncIterable<number> | Iterable<number>,
): AsyncGenerator<number> {
	if (Symbol.asyncIterator in source) {
		yield* source as AsyncIterable<number>;
		return;
	}
	yield* source as Iterable<number>;
}

function createFakeSink({ fps, frames }: { fps: number; frames: number }) {
	const source = makeSourceFrames({ fps, count: frames });
	const stats: SinkStats = {
		requestedTimestamps: [],
		gridRenders: 0,
		sequentialRenders: 0,
		walkedSourceFrames: 0,
		canvasesCalls: 0,
		canvasesAtTimestampsCalls: 0,
		getCanvasCalls: 0,
	};
	const indexOf = (time: number) => Math.max(0, Math.round(time * fps));
	// Resolves when the eager pump leaves its timestamp loop, i.e. when the
	// grid reported it is finished (or errored).
	let signalPumpDone = (): void => {};
	const pumpDone = new Promise<void>((resolve) => {
		signalPumpDone = resolve;
	});

	const sink = {
		getCanvas: async (time: number): Promise<WrappedCanvas | null> => {
			stats.getCanvasCalls++;
			return frameCovering(source, time);
		},
		canvases(from: number): PrefetchIterator {
			stats.canvasesCalls++;
			return (async function* () {
				for (const frame of source) {
					if (frame.timestamp < from) continue;
					stats.walkedSourceFrames++;
					stats.sequentialRenders++;
					yield frame;
				}
			})();
		},
		canvasesAtTimestamps(times: AsyncIterable<number>): PrefetchIterator {
			stats.canvasesAtTimestampsCalls++;
			const queue: Array<WrappedCanvas | null> = [];
			let wake: (() => void) | null = null;
			let drained: (() => void) | null = null;
			let finished = false;
			let previousIndex = 0;
			// Models mediabunny's decoder pump: it only pulls the next timestamp
			// once its internal queue has room (maxQueueSize is 8 once decoded
			// samples exist). This bounded pull is what makes the grid's
			// ungated timestamp stream safe to consume.
			const MAX_DECODE_AHEAD = 8;
			void (async () => {
				try {
					for await (const time of toAsyncIterable(times)) {
						while (queue.length >= MAX_DECODE_AHEAD && !finished) {
							await new Promise<void>((resolve) => {
								drained = resolve;
							});
						}
						if (finished) break;
						stats.requestedTimestamps.push(time);
						const index = indexOf(time);
						stats.walkedSourceFrames += Math.max(1, index - previousIndex);
						previousIndex = index;
						const frame = frameCovering(source, time);
						if (frame) stats.gridRenders++;
						queue.push(frame);
						const resume = wake;
						wake = null;
						resume?.();
					}
					finished = true;
				} finally {
					const resume = wake;
					wake = null;
					resume?.();
					signalPumpDone();
				}
			})();
			return {
				async next() {
					while (queue.length === 0) {
						if (finished) return { value: undefined, done: true };
						await new Promise<void>((resolve) => {
							wake = resolve;
						});
					}
					const value = queue.shift() ?? null;
					const resume = drained;
					drained = null;
					resume?.();
					return { value, done: false };
				},
				async return() {
					finished = true;
					const resume = drained;
					drained = null;
					resume?.();
					const resumeWake = wake;
					wake = null;
					resumeWake?.();
					return { value: undefined, done: true };
				},
				[Symbol.asyncIterator]() {
					return this;
				},
			};
		},
	};
	return { sink, stats, pumpDone };
}

function makeSinkData(sink: SinkData["sink"]): SinkData {
	return {
		input: { dispose: mock(() => {}) },
		sink,
		iterator: null,
		grid: null,
		currentFrame: null,
		prefetchBuffer: [],
		lastTime: -1,
		prefetching: false,
		prefetchPromise: null,
		maxDim: undefined,
		seekGeneration: 0,
		gopIndex: null,
		frameStepSeconds: 0,
		lastRequestedTime: Number.NaN,
		sourceFrameDuration: 0,
		lastUsedAt: 0,
		activeRequests: 0,
		backgroundTask: null,
		backgroundTaskStartedAt: 0,
		backgroundTaskId: 0,
		pendingExactTime: null,
		lastRequestAt: 0,
		lastRequestForward: true,
		isolatedRequest: false,
	};
}

const fakeFile = () => new File(["dummy"], "clip.mp4", { type: "video/mp4" });

/** VideoCache with sink construction stubbed out (no demuxing in tests). */
function cacheWithStubbedInit(): VideoCache {
	const cache = new VideoCache();
	(cache as unknown as { ensureSink: () => Promise<void> }).ensureSink =
		async () => {};
	return cache;
}

function install(cache: VideoCache, mediaId: string, data: SinkData): SinkData {
	internalsOf(cache).sinks.set(mediaId, data);
	return data;
}

/** Prefetch is fire-and-forget from resolveFrame; let the batch finish. */
async function settle(sinkData: SinkData): Promise<void> {
	for (let i = 0; i < 50; i++) {
		const pending = sinkData.prefetchPromise;
		if (!pending) return;
		await pending;
	}
}

describe("video cache: project-frame prefetch grid", () => {
	test("a 60 fps source renders one canvas per project frame, not one per source frame", async () => {
		const PROJECT_FPS = 30;
		const projectStep = 1 / PROJECT_FPS;
		const { sink, stats } = createFakeSink({ fps: 60, frames: 600 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "clip-60", makeSinkData(sink));

		// The first frame of a clip cannot know the project step, so the
		// consecutive-frame fallback runs and is upgraded on the next request.
		await cache.getFrameAt({ mediaId: "clip-60", file: fakeFile(), time: 0 });
		await cache.getFrameAt({
			mediaId: "clip-60",
			file: fakeFile(),
			time: projectStep,
		});
		// Frame fetches resolve immediately (stale-serve); the seek + prefetch
		// run in the background task.
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		await settle(sinkData);

		expect(stats.canvasesAtTimestampsCalls).toBeGreaterThan(0);
		// From here on the prefetch source is the project-frame grid.
		const rendersBefore = stats.gridRenders;
		const timesBefore = stats.requestedTimestamps.length;
		const sequentialBefore = stats.sequentialRenders;

		for (let frame = 2; frame <= 9; frame++) {
			await cache.getFrameAt({
				mediaId: "clip-60",
				file: fakeFile(),
				time: frame * projectStep,
			});
		}
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		await settle(sinkData);

		const times = stats.requestedTimestamps.slice(timesBefore);
		expect(times.length).toBeGreaterThan(0);
		// Every grid point is exactly one project frame after the previous.
		for (let i = 1; i < times.length; i++) {
			expect(times[i] as number).toBeCloseTo(
				(times[i - 1] as number) + projectStep,
				5,
			);
		}
		// One canvas render per project frame: the 60 fps source's other
		// frame in each pair is a decode dependency, but it is no longer
		// rendered into a pooled canvas only to be dropped by the consume
		// loop, and the prefetch never walks consecutive source frames again.
		expect(stats.gridRenders - rendersBefore).toBe(times.length);
		expect(stats.sequentialRenders).toBe(sequentialBefore);
		// ~8 project frames of playback cannot ask for more grid points than
		// the buffer plus the in-flight cap: the walk stays bounded.
		expect(times.length).toBeLessThanOrEqual(8 + PREFETCH_BUFFER);
	});

	test("the grid hands out no more times than the prefetch can absorb", async () => {
		const { sink, stats } = createFakeSink({ fps: 60, frames: 6000 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "long", makeSinkData(sink));

		await cache.getFrameAt({ mediaId: "long", file: fakeFile(), time: 0 });
		await cache.getFrameAt({
			mediaId: "long",
			file: fakeFile(),
			time: 1 / 30,
		});
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		await settle(sinkData);

		// Without backpressure the eager pump would decode the whole 100 s clip
		// (6000 frames) into memory. Two caps hold it in the low tens: the
		// consumer stops pulling once the buffer is full, and the pump parks
		// once its internal decode-ahead queue (8) is full.
		expect(stats.requestedTimestamps.length).toBeLessThanOrEqual(
			PREFETCH_BUFFER + 8 + 2,
		);
		expect(sinkData.prefetchBuffer.length).toBeLessThanOrEqual(
			PREFETCH_BUFFER,
		);
	});

	test("falls back to consecutive source frames until the project step is known", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 60 });
		const cache = cacheWithStubbedInit();
		install(cache, "cold", makeSinkData(sink));

		await cache.getFrameAt({ mediaId: "cold", file: fakeFile(), time: 0 });
		const cold = internalsOf(cache).sinks.get("cold");
		if (cold?.backgroundTask) await cold.backgroundTask;

		expect(stats.canvasesCalls).toBe(1);
		expect(stats.canvasesAtTimestampsCalls).toBe(0);
	});

	test("the grid never spaces itself closer than one source frame", () => {
		// 24 fps source in a 60 fps project: asking for project-frame times
		// would resolve several of them to the SAME source frame, which the
		// sink clones once per time. The source frame duration is the floor.
		const { sink } = createFakeSink({ fps: 24, frames: 24 });
		const cache = new VideoCache();
		const sinkData = makeSinkData(sink);
		sinkData.frameStepSeconds = 1 / 60;
		sinkData.sourceFrameDuration = 1 / 24;
		expect(
			internalsOf(cache).resolveGridStep({ sinkData }),
		).toBeCloseTo(1 / 24, 6);
	});
});

describe("video cache: project frame step learning", () => {
	test("learns the smallest advance and ignores seeks and repeats", () => {
		const { sink } = createFakeSink({ fps: 60, frames: 600 });
		const internals = internalsOf(new VideoCache());
		const sinkData = makeSinkData(sink);
		const observe = (time: number) =>
			internals.observeFrameStep({ sinkData, time });

		observe(0);
		expect(sinkData.frameStepSeconds).toBe(0);
		observe(1 / 30);
		expect(sinkData.frameStepSeconds).toBeCloseTo(1 / 30, 6);
		// The same frame requested again (a re-render) must not shrink it.
		observe(1 / 30);
		expect(sinkData.frameStepSeconds).toBeCloseTo(1 / 30, 6);
		// A dropped frame doubles the observed advance; the step stays.
		observe(1 / 30 + 2 / 30);
		expect(sinkData.frameStepSeconds).toBeCloseTo(1 / 30, 6);
		// A seek is not a project frame.
		observe(5);
		expect(sinkData.frameStepSeconds).toBeCloseTo(1 / 30, 6);
		observe(5 + 1 / 30);
		expect(sinkData.frameStepSeconds).toBeCloseTo(1 / 30, 6);
	});

	test("the grid hands out strictly advancing times that follow the playhead", async () => {
		const { sink } = createFakeSink({ fps: 60, frames: 600 });
		const cache = new VideoCache();
		const internals = internalsOf(cache);
		const sinkData = makeSinkData(sink);
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 60;
		sinkData.lastRequestedTime = 2;
		const iterable = internals.createProjectFrameGrid({
			sinkData,
			from: 2,
		});
		const iterator = iterable[Symbol.asyncIterator]();

		const pulled: number[] = [];
		for (let i = 0; i < 3; i++) {
			const next = await iterator.next();
			expect(next.done).toBe(false);
			pulled.push(next.value as number);
		}
		// Each point is one project frame, anchored at the playhead.
		expect(pulled[0]).toBeCloseTo(2 + 1 / 30, 6);
		expect(pulled[2]).toBeCloseTo(2 + 3 / 30, 6);

		// The grid never runs out (no in-flight cap) — backpressure lives in
		// mediabunny's decoder pump and the consumer-side buffer cap.
		const next = await iterator.next();
		expect(next.done).toBe(false);

		// And it stays anchored to the playhead: after a big seek, the next
		// point jumps ahead of the new position instead of catching up.
		sinkData.lastRequestedTime = 10;
		const afterSeek = await iterator.next();
		expect(afterSeek.value as number).toBeCloseTo(10 + 1 / 30, 6);
	});

	test("the grid survives mediabunny's toAsyncIterator unwrap", async () => {
		// mediabunny's toAsyncIterator unwraps the iterable with
		// `yield* source[Symbol.asyncIterator]()`, so the object the grid's
		// @@asyncIterator method returns must itself be async-iterable. A raw
		// `{ next, return }` object throws "yield* ... is not async iterable"
		// inside the sink, killing every prefetch cycle.
		const { sink } = createFakeSink({ fps: 60, frames: 600 });
		const cache = new VideoCache();
		const internals = internalsOf(cache);
		const sinkData = makeSinkData(sink);
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 60;
		sinkData.lastRequestedTime = 2;
		const iterable = internals.createProjectFrameGrid({
			sinkData,
			from: 2,
		});

		const inner = iterable[Symbol.asyncIterator]();
		expect(typeof inner[Symbol.asyncIterator]).toBe("function");

		// Reproduce the exact unwrap mediabunny performs.
		async function* toAsyncIterator(source: AsyncIterable<number>) {
			yield* source[Symbol.asyncIterator]();
		}

		const times: number[] = [];
		for await (const time of toAsyncIterator(iterable)) {
			times.push(time);
			if (times.length >= 3) break;
		}
		expect(times).toHaveLength(3);
		expect(times[0]).toBeCloseTo(2 + 1 / 30, 6);
		expect(times[2]).toBeCloseTo(2 + 3 / 30, 6);
	});

	test("a big jump hops to the nearest keyframe, then refines exactly", async () => {
		const { sink } = createFakeSink({ fps: 30, frames: 900 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "jump", makeSinkData(sink));
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 30;
		sinkData.lastRequestedTime = 1;
		sinkData.lastTime = 1;
		const frames = makeSourceFrames({ fps: 30, count: 900 });
		const stale = frameCovering(frames, 1);
		if (!stale) throw new Error("fixture frame missing");
		sinkData.currentFrame = stale;
		// GOP index with keyframes every 2 s (typical screen recording).
		const keyframeTimes: number[] = [];
		for (let t = 0; t <= 120; t += 2) keyframeTimes.push(t);
		sinkData.gopIndex = {
			mediaId: "jump",
			keyframeTimes,
			duration: 30,
		};

		const target = 1 + 24; // a 24 s jump
		const frame = await internalsOf(cache).resolveFrame({
			sinkData,
			time: target,
		});

		// The caller never blocks on a decode: the stale frame comes back
		// immediately, the keyframe hop + exact frame land in the background.
		expect(frame?.timestamp).toBe(1);

		// And the exact-frame fetch is in flight; it lands on the target.
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		expect(sinkData.currentFrame?.timestamp ?? -1).toBeGreaterThanOrEqual(
			target - 1 / 30,
		);
	});

	test("a small forward gap reuses the prefetch iterator instead of building a new decoder", async () => {
		// Autoplay regression. When the prefetch buffer runs dry the playhead
		// is only a few frames ahead of the last decoded frame. The old
		// ladder always hopped to the nearest keyframe FIRST, and that hop
		// creates a fresh WebCodecs decoder AND throws the iterator and the
		// prefetch buffer away - so every buffer miss cost two new decoders
		// and reset the prefetch machinery. That is the stall that made
		// autoplay stutter.
		const { sink, stats } = createFakeSink({ fps: 30, frames: 900 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "gap", makeSinkData(sink));
		const frames = makeSourceFrames({ fps: 30, count: 900 });

		// A live prefetch iterator, a little behind the playhead.
		sinkData.iterator = sink.canvases(0);
		sinkData.currentFrame = frameCovering(frames, 0.9);
		sinkData.lastTime = 0.9;
		sinkData.lastRequestedTime = 0.9;
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 30;
		// A GOP index, so the OLD ladder would really hop: the keyframe at
		// 1.0 s is closer to the 1.1 s target than the 0.9 s frame on
		// screen, which is exactly the condition the hop acts on.
		const keyframeTimes: number[] = [];
		for (let t = 0; t <= 120; t += 0.5) keyframeTimes.push(t);
		sinkData.gopIndex = {
				mediaId: "gap",
				keyframeTimes,
				duration: 30,
		};

		// The playhead moved on by a fifth of a second - well inside the
		// window where walking the iterator beats a new decoder.
		const target = 1.1;
		const frame = await internalsOf(cache).resolveFrame({
				sinkData,
				time: target,
		});

		// The caller never blocks on a decode: the stale frame comes back.
		expect(frame?.timestamp).toBe(0.9);

		if (sinkData.backgroundTask) await sinkData.backgroundTask;

		// The cheap path ran: no new decoder was constructed...
		expect(stats.getCanvasCalls).toBe(0);
		// ...and the prefetch machinery survived, so playback can keep
		// walking the same iterator instead of re-anchoring every time.
		expect(sinkData.iterator).not.toBeNull();
		// The frame landed on the target.
		expect(sinkData.currentFrame?.timestamp ?? -1).toBeGreaterThanOrEqual(
				target - 1 / 30,
		);
	});

    test("nearestKeyframeFrame hops only when it improves the picture", async () => {
		const { sink } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = new VideoCache();
		const internals = internalsOf(cache);
		const sinkData = makeSinkData(sink);
		const frames = makeSourceFrames({ fps: 30, count: 1200 });
		const keyframeTimes: number[] = [];
		for (let t = 0; t <= 40; t += 2) keyframeTimes.push(t);
		sinkData.gopIndex = {
			mediaId: "hop",
			keyframeTimes,
			duration: 40,
		};

		// Forward jump from 1 → 25: hop to the keyframe at 24.
		sinkData.currentFrame = frameCovering(frames, 1);
		const forward = await internals.nearestKeyframeFrame({
			sinkData,
			time: 25,
			generation: 0,
		});
		expect(forward?.timestamp).toBeCloseTo(24, 3);

		// Backward jump from 24 → 5: hop to the keyframe at 4 (closer than 24).
		sinkData.currentFrame = frameCovering(frames, 24);
		const backward = await internals.nearestKeyframeFrame({
			sinkData,
			time: 5,
			generation: 0,
		});
		expect(backward?.timestamp).toBeCloseTo(4, 3);

		// Already closer than any keyframe would get us: no hop.
		sinkData.currentFrame = frameCovering(frames, 25);
		expect(
			await internals.nearestKeyframeFrame({
				sinkData,
				time: 25,
				generation: 0,
			}),
		).toBeNull();
	});

	test("rapid scrub requests collapse into one trailing fetch", async () => {
		const { sink } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "scrub", makeSinkData(sink));
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 30;
		sinkData.lastRequestedTime = 1;
		sinkData.lastTime = 1;
		sinkData.currentFrame = frameCovering(
			makeSourceFrames({ fps: 30, count: 1200 }),
			1,
		);
		// GOP index with keyframes every 2 s.
		const keyframeTimes: number[] = [];
		for (let t = 0; t <= 40; t += 2) keyframeTimes.push(t);
		sinkData.gopIndex = {
			mediaId: "scrub",
			keyframeTimes,
			duration: 40,
		};
		const internals = internalsOf(cache);

		// A fast drag: three requests without awaiting between them.
		void internals.resolveFrame({ sinkData, time: 10 });
		void internals.resolveFrame({ sinkData, time: 20 });
		void internals.resolveFrame({ sinkData, time: 30 });

		// The running fetch records the newest target and lands there.
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		expect(sinkData.backgroundTask).toBeNull();
		expect(sinkData.pendingExactTime).toBeNull();
		expect(sinkData.currentFrame?.timestamp ?? -1).toBeGreaterThanOrEqual(
			30 - 1 / 30,
		);
	});

	test("a hung background fetch is abandoned instead of freezing the preview", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "stall", makeSinkData(sink));
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 30;
		sinkData.lastRequestedTime = 1;
		sinkData.lastTime = 1;
		sinkData.currentFrame = frameCovering(
			makeSourceFrames({ fps: 30, count: 1200 }),
			1,
		);

		// A fetch whose decode never comes back (the decoder is parked on a seek
		// that cannot land). Before the watchdog this left `backgroundTask` set
		// for the rest of the session: every later request only recorded its
		// position, so the preview stayed on this frame while the audio played.
		sinkData.backgroundTask = new Promise<void>(() => {});
		sinkData.backgroundTaskStartedAt = performance.now() - 60_000;
		const callsBefore = stats.getCanvasCalls;

		const served = await cache.getFrameAt({
			mediaId: "stall",
			file: fakeFile(),
			time: 30,
		});

		// The stale frame is served at once — the compositor must never block.
		expect(served?.timestamp ?? -1).toBeLessThan(30);

		// The dead fetch is dropped and a fresh one decodes the new position.
		await sinkData.backgroundTask;
		expect(sinkData.backgroundTask).toBeNull();
		expect(sinkData.backgroundTaskStartedAt).toBe(0);
		expect(stats.getCanvasCalls).toBeGreaterThan(callsBefore);
		expect(sinkData.currentFrame?.timestamp ?? -1).toBeGreaterThanOrEqual(
			30 - 1 / 30,
		);
	});

	test("a background fetch still inside the stall budget is left alone", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "fresh", makeSinkData(sink));
		sinkData.lastRequestedTime = 1;
		sinkData.lastTime = 1;
		sinkData.currentFrame = frameCovering(
			makeSourceFrames({ fps: 30, count: 1200 }),
			1,
		);

		// In flight and healthy: 50 ms in, far below the stall budget.
		sinkData.backgroundTask = new Promise<void>(() => {});
		sinkData.backgroundTaskStartedAt = performance.now() - 50;
		const callsBefore = stats.getCanvasCalls;

		await cache.getFrameAt({ mediaId: "fresh", file: fakeFile(), time: 5 });

		// Not abandoned — the healthy decode keeps its decoder, and the request
		// is only recorded for the trailing fetch.
		expect(stats.getCanvasCalls).toBe(callsBefore);
		expect(sinkData.pendingExactTime).toBe(5);
		expect(sinkData.backgroundTaskStartedAt).toBeGreaterThan(0);
	});

	test("an isolated seek decodes at once instead of waiting out the scrub settle", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "click", makeSinkData(sink));
		sinkData.lastRequestedTime = 240;
		sinkData.lastTime = 240;
		sinkData.currentFrame = frameCovering(
			makeSourceFrames({ fps: 30, count: 1200 }),
			240,
		);
		// The previous request was long ago, so this one starts a new gesture
		// (a click on the timeline) instead of continuing a drag.
		sinkData.lastRequestAt = performance.now() - 500;

		const started = Date.now();
		await cache.getFrameAt({ mediaId: "click", file: fakeFile(), time: 0 });
		await sinkData.backgroundTask;
		const elapsed = Date.now() - started;

		expect(stats.getCanvasCalls).toBeGreaterThan(0);
		// The settle window is what an isolated request must NOT pay.
		expect(elapsed).toBeLessThan(SCRUB_SETTLE_WINDOW_MS);
		expect(sinkData.currentFrame?.timestamp ?? -1).toBeLessThan(1);
	});

	test("a drag tick waits for the settle window before it decodes", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 1200 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "drag", makeSinkData(sink));
		sinkData.lastRequestedTime = 240;
		sinkData.lastTime = 240;
		sinkData.currentFrame = frameCovering(
			makeSourceFrames({ fps: 30, count: 1200 }),
			240,
		);
		// A sibling request just arrived: this one is a drag tick.
		sinkData.lastRequestAt = performance.now();

		const started = Date.now();
		await cache.getFrameAt({ mediaId: "drag", file: fakeFile(), time: 5 });
		await sinkData.backgroundTask;
		const elapsed = Date.now() - started;

		expect(stats.getCanvasCalls).toBeGreaterThan(0);
		// The drag tick waits out the window instead of decoding per tick.
		expect(elapsed).toBeGreaterThanOrEqual(SCRUB_SETTLE_WINDOW_MS - 30);
	});

	test("steady forward playback does not invalidate in-flight work", async () => {
		const { sink } = createFakeSink({ fps: 30, frames: 60 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "live", makeSinkData(sink));

		await cache.getFrameAt({ mediaId: "live", file: fakeFile(), time: 0 });
		const generation = sinkData.seekGeneration;

		// The next project frame is a continuation, not a seek — the decode
		// that is already running must stay valid, or slow decodes livelock.
		await cache.getFrameAt({
			mediaId: "live",
			file: fakeFile(),
			time: 1 / 30,
		});
		expect(sinkData.seekGeneration).toBe(generation);

		// A backward move (scrub) still invalidates.
		await cache.getFrameAt({ mediaId: "live", file: fakeFile(), time: 0 });
		expect(sinkData.seekGeneration).toBe(generation + 1);
	});

	test("a dry buffer serves the stale frame and catches up in the background", async () => {
		const { sink } = createFakeSink({ fps: 30, frames: 600 });
		const cache = cacheWithStubbedInit();
		const sinkData = install(cache, "live", makeSinkData(sink));
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 30;
		sinkData.lastRequestedTime = 1;
		sinkData.lastTime = 1;
		const stale = frameCovering(makeSourceFrames({ fps: 30, count: 600 }), 1);
		if (!stale) throw new Error("fixture frame missing");
		sinkData.currentFrame = stale;
		sinkData.iterator = sink.canvasesAtTimestamps(
			internalsOf(cache).createProjectFrameGrid({ sinkData, from: 1 }),
		);

		const target = 1 + 3 / 30;
		const frame = await internalsOf(cache).resolveFrame({
			sinkData,
			time: target,
		});
		// Non-blocking: the closest decoded frame comes back immediately.
		expect(frame).toBe(stale);

		// The background catch-up then lands on a frame the service considers
		// valid for the target time (within its jitter tolerance).
		if (sinkData.backgroundTask) await sinkData.backgroundTask;
		const served = sinkData.currentFrame;
		expect(served).not.toBeNull();
		expect(
			isFrameValid({
				frameTimestamp: served?.timestamp ?? -1,
				frameDuration: served?.duration ?? 0,
				time: target,
			}),
		).toBe(true);
		expect(served?.timestamp ?? -1).toBeGreaterThan(stale.timestamp);
	});

	test("abandoning a sink ends the decoder pump instead of hanging it", async () => {
		const { sink, pumpDone } = createFakeSink({ fps: 60, frames: 600 });
		const cache = new VideoCache();
		const sinkData = makeSinkData(sink);
		sinkData.frameStepSeconds = 1 / 30;
		sinkData.sourceFrameDuration = 1 / 60;
		sinkData.lastRequestedTime = 2;
		sinkData.iterator = sink.canvasesAtTimestamps(
			internalsOf(cache).createProjectFrameGrid({ sinkData, from: 2 }),
		);
		install(cache, "abandoned", sinkData);
		const grid = sinkData.grid;
		expect(grid).not.toBeNull();
		if (!grid) return;

		// Give the pump a moment to pull its first timestamps. Without a
		// consumer it parks once its decode-ahead queue is full.
		await new Promise((resolve) => setTimeout(resolve, 20));

		// Seeking away (or evicting/clearing the sink) must end the timestamp
		// stream, or the decoder pump would never finish and its decoder would
		// never be closed.
		cache.clearVideo({ mediaId: "abandoned" });
		await pumpDone;

		expect(grid.done).toBe(true);
	});
});

describe("video cache: sink LRU cap", () => {
	test("evicts the least recently used sink and disposes its input", async () => {
		const cache = cacheWithStubbedInit();
		const internals = internalsOf(cache);
		const { sink } = createFakeSink({ fps: 30, frames: 30 });
		const entries = ["a", "b", "c", "d", "e"].map((mediaId) => {
			const data = makeSinkData(sink);
			data.lastUsedAt = ++internals.useCounter;
			install(cache, mediaId, data);
			return data;
		});

		await cache.getFrameAt({ mediaId: "e", file: fakeFile(), time: 0 });

		expect(internals.sinks.size).toBe(4);
		expect(internals.sinks.has("a")).toBe(false);
		for (const mediaId of ["b", "c", "d", "e"]) {
			expect(internals.sinks.has(mediaId)).toBe(true);
		}
		expect(entries[0]?.input.dispose).toHaveBeenCalledTimes(1);
	});

	test("never evicts a sink an in-flight request is using", async () => {
		const cache = cacheWithStubbedInit();
		const internals = internalsOf(cache);
		const { sink } = createFakeSink({ fps: 30, frames: 30 });
		const busy = makeSinkData(sink);
		busy.lastUsedAt = ++internals.useCounter;
		// Oldest sink, but in use: the cap gives way rather than disposing an
		// Input that a decode is reading from right now.
		busy.activeRequests = 1;
		install(cache, "busy", busy);
		for (const mediaId of ["b", "c", "d", "e"]) {
			const data = makeSinkData(sink);
			data.lastUsedAt = ++internals.useCounter;
			install(cache, mediaId, data);
		}

		await cache.getFrameAt({ mediaId: "e", file: fakeFile(), time: 0 });

		expect(internals.sinks.has("busy")).toBe(true);
		expect(busy.input.dispose).not.toHaveBeenCalled();
		expect(internals.sinks.size).toBe(4);
		expect(internals.sinks.has("b")).toBe(false);
	});

	test("clearing a sink releases its pooled canvases and per-sink state", () => {
		const cache = cacheWithStubbedInit();
		const internals = internalsOf(cache);
		const { sink } = createFakeSink({ fps: 30, frames: 30 });
		const data = makeSinkData(sink);
		data.currentFrame = {
			canvas: {},
			timestamp: 0,
			duration: 1 / 30,
		} as unknown as WrappedCanvas;
		data.prefetchBuffer = [
			{ canvas: {}, timestamp: 1, duration: 1 / 30 } as unknown as WrappedCanvas,
		];
		data.prefetching = true;
		data.iterator = sink.canvases(0);
		data.grid = { done: false };
		install(cache, "purge", data);
		internals.frameChain.set("purge", Promise.resolve());
		internals.initPromises.set("purge", Promise.resolve());
		internals.prewarmPromises.set("purge", Promise.resolve());

		cache.clearVideo({ mediaId: "purge" });

		expect(internals.sinks.has("purge")).toBe(false);
		expect(data.input.dispose).toHaveBeenCalledTimes(1);
		// The pool lives on the sink, so dropping these references is what
		// returns the canvases to the GC.
		expect(data.prefetchBuffer).toEqual([]);
		expect(data.currentFrame).toBeNull();
		expect(data.iterator).toBeNull();
		expect(data.grid).toBeNull();
		expect(data.prefetching).toBe(false);
		expect(data.prefetchPromise).toBeNull();
		// A stale seek must not keep touching the disposed input.
		expect(data.seekGeneration).toBeGreaterThan(0);
		expect(internals.frameChain.has("purge")).toBe(false);
		expect(internals.initPromises.has("purge")).toBe(false);
		expect(internals.prewarmPromises.has("purge")).toBe(false);
	});
});
