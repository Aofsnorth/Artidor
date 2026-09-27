/**
 * Filmstrip decode-budget regressions owned by the filmstrip cache.
 *
 * Two properties are pinned here:
 *  1. Filmstrip decodes are globally throttled. Every mounted clip asks for
 *     its own file, so an unbounded cache opened one `Input` + `CanvasSink`
 *     per visible clip — all competing with the playhead for the same decode
 *     budget.
 *  2. Work abandoned by a teardown is released. A decoder that is mid-batch
 *     when its file is evicted must stop pulling frames, and the slot it was
 *     holding must go back to the queue.
 */
import { describe, expect, mock, test } from "bun:test";

interface DecodeStats {
	/** Decoders that reached `canvasesAtTimestamps`. */
	started: number;
	/** First timestamp of every started batch, in start order. */
	startedAt: number[];
	/** Decoders inside `canvasesAtTimestamps` right now. */
	active: number;
	/** Highest simultaneous `canvasesAtTimestamps`. */
	peakActive: number;
	/** Timestamps the sinks were asked for in total. */
	requested: number;
	/** `Input.dispose()` calls. */
	disposed: number;
}

const stats: DecodeStats = {
	started: 0,
	startedAt: [],
	active: 0,
	peakActive: 0,
	requested: 0,
	disposed: 0,
};

/** Resolvers for the timestamps a sink is currently parked on, in order. */
const parked: Array<() => void> = [];

/** mediabunny yields `WrappedCanvas` records, and the cache stores `.canvas`. */
function fakeWrappedCanvas(timestamp: number): {
	canvas: HTMLCanvasElement;
	timestamp: number;
} {
	return {
		canvas: { __timestamp: timestamp } as unknown as HTMLCanvasElement,
		timestamp,
	};
}

const fakeTrack = {
	canDecode: () => Promise.resolve(true),
	computeDuration: () => Promise.resolve(60),
};

mock.module("mediabunny", () => ({
	ALL_FORMATS: ["mp4"],
	BlobSource: class {
		constructor(readonly file: File) {}
	},
	Input: class {
		constructor(readonly options: unknown) {}
		getPrimaryVideoTrack() {
			return Promise.resolve(fakeTrack);
		}
		dispose() {
			stats.disposed++;
		}
	},
	CanvasSink: class {
		constructor(
			readonly track: unknown,
			readonly options: unknown,
		) {}
		async *canvasesAtTimestamps(
			timestamps: Iterable<number>,
		): AsyncGenerator<
			{ canvas: HTMLCanvasElement; timestamp: number },
			void,
			unknown
		> {
			const batch = [...timestamps];
			stats.started++;
			stats.startedAt.push(batch[0] ?? Number.NaN);
			stats.active++;
			stats.peakActive = Math.max(stats.peakActive, stats.active);
			try {
				for (const timestamp of batch) {
					stats.requested++;
					// Park until the test releases this frame, so a decoder that is
					// mid-batch can be observed (and interrupted) at a known point.
					await new Promise<void>((resolve) => parked.push(resolve));
					yield fakeWrappedCanvas(timestamp);
				}
			} finally {
				stats.active--;
			}
		}
	},
}));

// The cache coalesces its listener notifications into a frame callback; there
// is no frame loop here, so run them as microtasks.
globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
	queueMicrotask(() => callback(0));
	return 1;
}) as typeof globalThis.requestAnimationFrame;
globalThis.cancelAnimationFrame =
	(() => {}) as typeof globalThis.cancelAnimationFrame;

// The idle teardown waits IDLE_DISPOSE_MS (8s) — far longer than a test may
// run. Long timers fire at once; short ones pass through untouched.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((
	handler: TimerHandler,
	timeout?: number,
	...args: unknown[]
) => {
	if ((timeout ?? 0) >= 1000) {
		queueMicrotask(() => {
			if (typeof handler === "function") handler(...args);
		});
		return 0 as unknown as ReturnType<typeof setTimeout>;
	}
	return realSetTimeout(handler, timeout, ...args);
}) as typeof globalThis.setTimeout;

const { getFilmstripFrame, subscribeFilmstrip } = await import(
	"./filmstrip-cache"
);

/** Must match MAX_CONCURRENT_FILE_DECODES in filmstrip-cache.ts. */
const MAX_CONCURRENT_FILE_DECODES = 2;

function makeFile(name: string): File {
	return new File([new Uint8Array(8)], name, { type: "video/mp4" });
}

/**
 * A mounted clip. `getFilmstripFrame` only schedules work for an entry that
 * `subscribeFilmstrip` has already created, which is what a real clip does on
 * mount.
 */
function mountClip(file: File): { unmount: () => void } {
	const unsubscribe = subscribeFilmstrip(file, () => {});
	return { unmount: unsubscribe };
}

function requestFrame(file: File, sourceTimeSec: number): void {
	// A miss reports no frame and schedules the decode.
	expect(getFilmstripFrame(file, sourceTimeSec)).toBeNull();
}

function resetStats(): void {
	stats.started = 0;
	stats.startedAt = [];
	stats.active = 0;
	stats.peakActive = 0;
	stats.requested = 0;
	stats.disposed = 0;
	parked.length = 0;
}

const tick = () => new Promise<void>((resolve) => realSetTimeout(resolve, 1));

async function waitFor(predicate: () => boolean, what: string): Promise<void> {
	for (let attempt = 0; attempt < 2000; attempt++) {
		if (predicate()) return;
		await tick();
	}
	throw new Error(`waitFor timed out: ${what}`);
}

/** Release the oldest parked frame decode. */
async function releaseOne(): Promise<void> {
	await waitFor(() => parked.length > 0, "a parked decode");
	parked.shift()?.();
	await tick();
}

/** Release parked decodes until nothing is in flight. */
async function drain(): Promise<void> {
	for (let guard = 0; guard < 100; guard++) {
		await tick();
		if (parked.length === 0 && stats.active === 0) return;
		await releaseOne();
	}
}

describe("filmstrip decode concurrency", () => {
	test("never runs more filmstrip decoders at once than the global cap", async () => {
		resetStats();
		const files = ["a.mp4", "b.mp4", "c.mp4", "d.mp4"].map(makeFile);
		for (const file of files) mountClip(file);

		for (const file of files) requestFrame(file, 0.5);

		await waitFor(
			() => parked.length >= MAX_CONCURRENT_FILE_DECODES,
			"both slots to fill",
		);
		// Four clips asked for frames; only the cap may be in flight.
		expect(stats.started).toBe(MAX_CONCURRENT_FILE_DECODES);
		expect(stats.peakActive).toBe(MAX_CONCURRENT_FILE_DECODES);

		await drain();

		expect(stats.peakActive).toBeLessThanOrEqual(MAX_CONCURRENT_FILE_DECODES);
		// All four eventually decode — the cap delays work, it does not drop it.
		expect(stats.started).toBe(4);
		expect(stats.active).toBe(0);
		expect(getFilmstripFrame(files[0] as File, 0.5)).not.toBeNull();
	});

	test("queued files decode in the order they asked", async () => {
		resetStats();
		// Each file asks for a distinct timestamp, so the order the decoders
		// start in is the order the clips requested frames.
		for (const [index, name] of ["first", "second", "third"].entries()) {
			const file = makeFile(`${name}.mp4`);
			mountClip(file);
			requestFrame(file, 0.1 * (index + 1));
		}

		await waitFor(
			() => parked.length >= MAX_CONCURRENT_FILE_DECODES,
			"both slots to fill",
		);
		await drain();

		expect(stats.startedAt).toEqual([0.1, 0.2, 0.3]);
	});

	test("one clip cannot start a second decoder for the same file", async () => {
		resetStats();
		const file = makeFile("double.mp4");
		mountClip(file);
		// Two draws in the same frame, before the first decoder has started.
		requestFrame(file, 0.1);
		requestFrame(file, 0.2);

		await drain();

		expect(stats.started).toBe(1);
		expect(stats.peakActive).toBe(1);
		// Both buckets were served by the single decode.
		expect(stats.requested).toBe(2);
	});
});

describe("filmstrip teardown", () => {
	test("a decoder abandoned mid-batch stops pulling frames and frees its slot", async () => {
		resetStats();
		const blocker = makeFile("blocker.mp4");
		const abandoned = makeFile("abandoned.mp4");
		mountClip(blocker);
		const clip = mountClip(abandoned);

		// Fill both slots with parked decoders.
		requestFrame(blocker, 0.1);
		requestFrame(abandoned, 0.2);
		// Two more buckets before the decode starts, so the batch has frames
		// left to pull when the file is torn down.
		requestFrame(abandoned, 0.3);
		requestFrame(abandoned, 0.4);
		await waitFor(
			() => parked.length >= MAX_CONCURRENT_FILE_DECODES,
			"both slots to fill",
		);
		expect(stats.requested).toBe(2);

		// The clip leaves: the idle timer (stubbed to fire at once) disposes
		// the entry while its decoder is still parked on its first frame.
		clip.unmount();
		await waitFor(() => stats.disposed === 1, "the entry to be disposed");

		await drain();

		// The abandoned decoder stopped instead of pulling its whole batch.
		expect(stats.requested).toBe(2);
		// The slot it held went back to the queue, so the other file still
		// finished and its frame is cached.
		expect(stats.active).toBe(0);
		expect(stats.peakActive).toBeLessThanOrEqual(MAX_CONCURRENT_FILE_DECODES);
		expect(getFilmstripFrame(blocker, 0.1)).not.toBeNull();
	});

	test("frames decoded before a teardown stay readable", async () => {
		resetStats();
		const file = makeFile("kept.mp4");
		const clip = mountClip(file);
		requestFrame(file, 0.5);
		await drain();

		const frame = getFilmstripFrame(file, 0.5);
		expect(frame).not.toBeNull();
		// A cache hit must not schedule another decode.
		expect(stats.started).toBe(1);

		clip.unmount();
		await waitFor(() => stats.disposed === 1, "the entry to be disposed");

		// The entry is gone. A clip that scrolls back in re-subscribes and
		// re-decodes rather than reading a dead entry.
		const remounted = mountClip(file);
		requestFrame(file, 0.5);
		await drain();
		expect(stats.started).toBe(2);
		expect(getFilmstripFrame(file, 0.5)).not.toBeNull();
		remounted.unmount();
	});
});
