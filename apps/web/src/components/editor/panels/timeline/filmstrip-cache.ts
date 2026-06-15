import { ALL_FORMATS, BlobSource, CanvasSink, Input } from "mediabunny";

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
			const input = new Input({
				source: new BlobSource(file),
				formats: ALL_FORMATS,
			});
			const track = await input.getPrimaryVideoTrack();
			if (!track || !(await track.canDecode())) {
				input.dispose();
				entry.failed = true;
				return false;
			}
			entry.durationSec = await track.computeDuration();
			entry.input = input;
			// poolSize defaults to disabled, so each yielded canvas is a fresh
			// allocation we can safely retain in the cache.
			entry.sink = new CanvasSink(track, {
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
	if (!entry || entry.decoding) return;
	entry.decoding = true;

	try {
		const ready = await ensureInit(entry, file);
		if (!ready || !entry.sink || entry.durationSec === null) {
			entry.pending.clear();
			return;
		}

		// Drain pending buckets in monotonic order so canvasesAtTimestamps can
		// use its optimized single-forward-decode path. Loop until no new
		// requests have arrived (scrolling adds buckets while we decode).
		while (entry.pending.size > 0) {
			const buckets = [...entry.pending].sort((a, b) => a - b);
			entry.pending.clear();

			const duration = entry.durationSec;
			const timestamps = buckets.map((b) =>
				Math.min(duration, (b * BUCKET_MS) / 1000),
			);

			let index = 0;
			for await (const wrapped of entry.sink.canvasesAtTimestamps(timestamps)) {
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
		entry.decoding = false;
		// A request may have arrived right as we finished; pick it up.
		if (entry.pending.size > 0) void runDecoder(key, file);
	}
}
