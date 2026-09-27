// Type-only: erased at compile time, so it costs nothing in the bundle.
import type { CanvasSink, Input } from "mediabunny";

// Shared, virtualized filmstrip frame cache.
//
// Timeline clips can be thousands of pixels wide, so the old approach of
// painting one canvas spanning the whole clip blew past the browser's max
// canvas dimension (most tiles silently never drew) and re-decoded the entire
// clip on every zoom/scroll. Instead we decode frames at a fixed small size,
// keyed by source-time bucket, and let each clip blit only the frames for the
// tiles currently on screen. Frames are decoded once and reused across zoom,
// scroll and re-mounts.

type FrameCanvas = HTMLCanvasElement | OffscreenCanvas;

/**
 * `mediabunny` is the largest third-party payload the editor can pull in, and
 * this module sits on the critical render path (timeline-element.tsx imports
 * it to paint clip filmstrips). Loading it here — instead of at module scope —
 * keeps it out of the editor's initial chunk until a clip actually asks for a
 * frame. The promise is memoized, so the chunk is fetched and evaluated at
 * most once per page.
 *
 * The lazy boundary is safe for the cache's ordering guarantees: the only new
 * await sits at the top of `ensureInit`, which `runDecoder` already awaits
 * before a single frame exists. A lazy load can therefore only *delay* the
 * moment frames land, never move it earlier, so a subscriber can never miss a
 * notification the eager import would have delivered — a subscriber that
 * arrives after frames are cached still reads them synchronously through
 * `getFilmstripFrame` on its next draw.
 */
type MediaBunnyModule = typeof import("mediabunny");

let mediaBunnyPromise: Promise<MediaBunnyModule> | null = null;

function loadMediaBunny(): Promise<MediaBunnyModule> {
	// A rejected load is not memoized, so a later mount can retry (the caller
	// treats the rejection like any other decoder failure and falls back to the
	// clip's poster background).
	mediaBunnyPromise ??= import("mediabunny").catch((error: unknown) => {
		mediaBunnyPromise = null;
		throw error;
	});
	return mediaBunnyPromise;
}

// Fixed decode size (16:9). Tiles blit-scale this to their on-screen size, so
// the cache stays independent of zoom level and track height.
const DECODE_WIDTH = 160;
const DECODE_HEIGHT = 90;

// Temporal resolution of the cache: one frame per 100ms (10fps). Plenty for a
// scrubbing filmstrip and bounds how many frames a long clip can allocate.
const BUCKET_MS = 100;

// Evict the least-recently-inserted frames once a file exceeds this many, so a
// very long clip can't grow the cache without bound.
const MAX_FRAMES_PER_FILE = 600;

/**
 * Global ceiling on filmstrip decoders running at once.
 *
 * Every mounted clip asks for its own file, so without a cap a timeline with 30
 * visible clips opens 30 `Input` + `CanvasSink` pipelines that all compete for
 * the same decode budget the playhead needs — the filmstrip work is what makes
 * playback stutter. Two keeps filmstrips progressing (both the clips already on
 * screen and the one being scrolled into view) while leaving the decoder budget
 * to playback, and it also bounds how many demuxers are open at the same time.
 * The per-file FIFO frame eviction below is unchanged: this gate only controls
 * how many files decode concurrently, not what they keep.
 */
const MAX_CONCURRENT_FILE_DECODES = 2;

let activeFileDecoders = 0;
/** FIFO waiters, so clips are served in the order they asked for frames. */
const decodeSlotWaiters: Array<() => void> = [];

function acquireDecodeSlot(): Promise<void> {
	if (activeFileDecoders < MAX_CONCURRENT_FILE_DECODES) {
		activeFileDecoders++;
		return Promise.resolve();
	}
	return new Promise<void>((resolve) => {
		decodeSlotWaiters.push(resolve);
	});
}

function releaseDecodeSlot(): void {
	const next = decodeSlotWaiters.shift();
	// Hand the slot straight to the next waiter; it already counts as in use,
	// so the counter must not dip in between.
	if (next) {
		next();
		return;
	}
	activeFileDecoders--;
}

// Tear down the decoder (and free the OPFS file handle) once no clip has
// needed a frame from this file for a while.
const IDLE_DISPOSE_MS = 8000;

interface FileEntry {
	frames: Map<number, FrameCanvas>;
	pending: Set<number>;
	input: Input | null;
	sink: CanvasSink | null;
	durationSec: number | null;
	initPromise: Promise<boolean> | null;
	decoding: boolean;
	/** Set when the entry is torn down; an in-flight decode must stop at once. */
	disposed: boolean;
	failed: boolean;
	listeners: Set<() => void>;
	idleTimer: ReturnType<typeof setTimeout> | null;
	notifyHandle: number | null;
}

const files = new Map<string, FileEntry>();

export function filmstripCacheKey(file: File): string {
	return `${file.name}:${file.size}:${file.lastModified}`;
}

function getEntry(key: string): FileEntry {
	let entry = files.get(key);
	if (!entry) {
		entry = {
			frames: new Map(),
			pending: new Set(),
			input: null,
			sink: null,
			durationSec: null,
			initPromise: null,
			decoding: false,
			disposed: false,
			failed: false,
			listeners: new Set(),
			idleTimer: null,
			notifyHandle: null,
		};
		files.set(key, entry);
	}
	return entry;
}

/**
 * Register a redraw callback for a file's frames. Returns an unsubscribe fn.
 * When the last subscriber leaves, the decoder is disposed after an idle delay.
 */
export function subscribeFilmstrip(
	file: File,
	onFrames: () => void,
): () => void {
	const key = filmstripCacheKey(file);
	const entry = getEntry(key);
	entry.listeners.add(onFrames);

	if (entry.idleTimer) {
		clearTimeout(entry.idleTimer);
		entry.idleTimer = null;
	}

	return () => {
		entry.listeners.delete(onFrames);
		if (entry.listeners.size === 0) {
			if (entry.idleTimer) clearTimeout(entry.idleTimer);
			entry.idleTimer = setTimeout(() => disposeEntry(key), IDLE_DISPOSE_MS);
		}
	};
}

function disposeEntry(key: string): void {
	const entry = files.get(key);
	if (!entry || entry.listeners.size > 0) return;
	// Flag first: a decoder that is mid-`canvasesAtTimestamps` sees this on its
	// next frame, stops pulling, and abandons the rest of the batch instead of
	// decoding frames nothing will ever read. Dropping the pending set stops
	// the finally-block from re-arming it.
	entry.disposed = true;
	entry.pending.clear();
	entry.input?.dispose();
	files.delete(key);
}

function bucketForTime(sourceTimeSec: number): number {
	return Math.max(0, Math.round((sourceTimeSec * 1000) / BUCKET_MS));
}

/**
 * Synchronously return the cached frame nearest `sourceTimeSec`, or null if it
 * has not been decoded yet. A miss schedules a decode and the registered
 * listeners are notified once it lands.
 */
export function getFilmstripFrame(
	file: File,
	sourceTimeSec: number,
): FrameCanvas | null {
	const key = filmstripCacheKey(file);
	const entry = files.get(key);
	if (!entry || entry.failed) return null;

	const bucket = bucketForTime(sourceTimeSec);
	const hit = entry.frames.get(bucket);
	if (hit) return hit;

	if (!entry.pending.has(bucket)) {
		entry.pending.add(bucket);
		void runDecoder(key, file);
	}
	return null;
}

async function ensureInit(entry: FileEntry, file: File): Promise<boolean> {
	if (entry.failed) return false;
	if (entry.sink && entry.durationSec !== null) return true;
	if (entry.initPromise) return entry.initPromise;

	entry.initPromise = (async () => {
		try {
			const mediabunny = await loadMediaBunny();
			const input = new mediabunny.Input({
				source: new mediabunny.BlobSource(file),
				formats: mediabunny.ALL_FORMATS,
			});
			const track = await input.getPrimaryVideoTrack();
			if (!track || !(await track.canDecode())) {
				input.dispose();
				entry.failed = true;
				return false;
			}
			entry.durationSec = await track.computeDuration();
			// The entry can be torn down while the demuxer is opening. Release the
			// Input here rather than parking a live one on an entry nothing will
			// ever read from again.
			if (entry.disposed) {
				input.dispose();
				return false;
			}
			entry.input = input;
			// poolSize defaults to disabled, so each yielded canvas is a fresh
			// allocation we can safely retain in the cache.
			entry.sink = new mediabunny.CanvasSink(track, {
				width: DECODE_WIDTH,
				height: DECODE_HEIGHT,
				fit: "cover",
			});
			return true;
		} catch {
			entry.failed = true;
			return false;
		}
	})();

	return entry.initPromise;
}

function scheduleNotify(entry: FileEntry): void {
	if (entry.notifyHandle !== null) return;
	entry.notifyHandle = requestAnimationFrame(() => {
		entry.notifyHandle = null;
		for (const listener of entry.listeners) listener();
	});
}

function evictIfNeeded(entry: FileEntry): void {
	while (entry.frames.size > MAX_FRAMES_PER_FILE) {
		const oldest = entry.frames.keys().next().value;
		if (oldest === undefined) break;
		entry.frames.delete(oldest);
	}
}

async function runDecoder(key: string, file: File): Promise<void> {
	const entry = files.get(key);
	if (!entry || entry.decoding || entry.disposed) return;
	// Claimed before the first await: two draws in the same frame must not both
	// start a decoder (and must not both queue for a slot) for one file.
	entry.decoding = true;

	try {
		// Queued, not run: filmstrip decodes are throttled globally so they
		// cannot take the decode budget away from playback.
		await acquireDecodeSlot();
		if (entry.disposed) return;

		const ready = await ensureInit(entry, file);
		if (!ready || entry.disposed || !entry.sink || entry.durationSec === null) {
			entry.pending.clear();
			return;
		}

		// Drain pending buckets in monotonic order so canvasesAtTimestamps can
		// use its optimized single-forward-decode path. Loop until no new
		// requests have arrived (scrolling adds buckets while we decode).
		while (entry.pending.size > 0) {
			if (entry.disposed) break;
			const buckets = [...entry.pending].sort((a, b) => a - b);
			entry.pending.clear();

			const duration = entry.durationSec;
			const timestamps = buckets.map((b) =>
				Math.min(duration, (b * BUCKET_MS) / 1000),
			);

			let index = 0;
			for await (const wrapped of entry.sink.canvasesAtTimestamps(timestamps)) {
				// The entry was evicted mid-decode. `timestamps` is a plain array,
				// so no pump is waiting on us and breaking is enough to release
				// the remaining frames; the disposed Input makes the sink throw
				// if it is still mid-packet, which the catch below absorbs.
				if (entry.disposed) break;
				const bucket = buckets[index];
				index++;
				if (wrapped && bucket !== undefined) {
					entry.frames.set(bucket, wrapped.canvas);
				}
			}
			evictIfNeeded(entry);
			scheduleNotify(entry);
		}
	} catch {
		// Leave already-decoded frames in place; the clip falls back to the
		// poster background for anything that didn't decode.
	} finally {
		releaseDecodeSlot();
		entry.decoding = false;
		// A request may have arrived right as we finished; pick it up.
		if (!entry.disposed && entry.pending.size > 0) void runDecoder(key, file);
	}
}
