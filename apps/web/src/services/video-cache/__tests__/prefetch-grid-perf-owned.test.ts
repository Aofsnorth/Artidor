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
import { VideoCache } from "../service";

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
}

interface GridState {
	inFlight: number;
	waiters: Array<() => void>;
	done: boolean;
}

interface SinkData {
	input: { dispose: () => void };
	sink: ReturnType<typeof createFakeSink>["sink"];
	iterator: PrefetchIterator | null;
	grid: GridState | null;
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
}

interface VideoCacheInternals {
	sinks: Map<string, SinkData>;
	frameChain: Map<string, Promise<unknown>>;
	initPromises: Map<string, Promise<void>>;
	prewarmPromises: Map<string, Promise<void>>;
	useCounter: number;
	observeFrameStep(args: { sinkData: SinkData; time: number }): void;
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
	};
	const indexOf = (time: number) => Math.max(0, Math.round(time * fps));
	// Resolves when the eager pump leaves its timestamp loop, i.e. when the
	// grid reported it is finished (or errored).
	let signalPumpDone = (): void => {};
	const pumpDone = new Promise<void>((resolve) => {
		signalPumpDone = resolve;
	});

	const sink = {
		getCanvas: async (time: number): Promise<WrappedCanvas | null> =>
			frameCovering(source, time),
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
			let finished = false;
			let previousIndex = 0;
			// Eager pump: pulls the next time as soon as the previous one has
			// been answered, exactly like mediabunny's decoder pump.
			void (async () => {
				try {
					for await (const time of toAsyncIterable(times)) {
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
					return { value: queue.shift() ?? null, done: false };
				},
				async return() {
					finished = true;
					const resume = wake;
					wake = null;
					resume?.();
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

/** Waits until the eager pump is blocked inside the grid's gate. */
async function waitForGate(
	grid: GridState,
	timeoutMs = 1000,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (grid.waiters.length > 0) return true;
		await new Promise((resolve) => setTimeout(resolve, 1));
	}
	return false;
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
		expect(times.length).toBeLessThanOrEqual(8 + 6);
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
		await settle(sinkData);

		// Without backpressure the eager pump would decode the whole 100 s clip
		// (6000 frames) into memory. The grid is capped at the buffer size plus
		// the in-flight points, so it stays in the low tens of frames.
		expect(stats.requestedTimestamps.length).toBeLessThanOrEqual(12);
		expect(sinkData.prefetchBuffer.length).toBeLessThanOrEqual(6);
	});

	test("falls back to consecutive source frames until the project step is known", async () => {
		const { sink, stats } = createFakeSink({ fps: 30, frames: 60 });
		const cache = cacheWithStubbedInit();
		install(cache, "cold", makeSinkData(sink));

		await cache.getFrameAt({ mediaId: "cold", file: fakeFile(), time: 0 });

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

	test("the grid advances one project frame per point and blocks at the in-flight cap", async () => {
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
		for (let i = 0; i < 6; i++) {
			const next = await iterator.next();
			expect(next.done).toBe(false);
			pulled.push(next.value as number);
		}
		// Six points = six project frames, anchored at the playhead.
		expect(pulled[0]).toBeCloseTo(2 + 1 / 30, 6);
		expect(pulled[5]).toBeCloseTo(2 + 6 / 30, 6);
		expect(sinkData.grid?.inFlight).toBe(6);

		// The seventh time blocks: the sink may not run ahead of the buffer.
		let seventh: Promise<IteratorResult<number>> | null = null;
		seventh = iterator.next();
		let settled = false;
		void seventh.then(() => {
			settled = true;
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(settled).toBe(false);

		// Delivering a frame frees a slot, which unblocks the sink.
		const grid = sinkData.grid;
		expect(grid).not.toBeNull();
		if (!grid) return;
		grid.inFlight = 5;
		for (const resume of grid.waiters.splice(0)) resume();
		const result = await seventh;
		expect(result.done).toBe(false);
		expect(result.value).toBeCloseTo(2 + 7 / 30, 6);
	});

	test("abandoning a sink unblocks the time the sink is waiting on", async () => {
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

		// The pump pulls until the in-flight cap and then blocks inside the
		// grid, waiting for a project-frame time that never comes.
		expect(await waitForGate(grid)).toBe(true);

		// Seeking away (or evicting/clearing the sink) must release it, or the
		// decoder pump would hang and its decoder would never be closed.
		cache.clearVideo({ mediaId: "abandoned" });
		await pumpDone;

		expect(grid.done).toBe(true);
		expect(grid.waiters).toHaveLength(0);
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
		data.grid = { inFlight: 2, waiters: [], done: false };
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
