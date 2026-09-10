export interface DecodeImageBitmapOptions {
	url: string;
	/** Desired bitmap width for SVG sources that lack intrinsic dimensions. */
	resizeWidth?: number;
	/** Cap on the longest edge, used as a fallback resize target when `resizeWidth` is not given. */
	maxSourceSize?: number;
	/** Label for error messages, e.g. "sticker" or "image". */
	label?: string;
}

/**
 * Maximum decoded bitmaps retained by the module-level LRU cache.
 *
 * Kept small on purpose: a single 4K `ImageBitmap` holds tens of MB of
 * GPU-side pixels, so an unbounded cache would trade decode CPU for
 * unbounded GPU memory. 8 covers the hot set (recently used stickers /
 * repeated image decodes) without pinning whole projects.
 */
export const MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE = 8;

/** Bytes of blob content folded into the cache key (FNV-1a prefix hash). */
const DECODE_CACHE_KEY_PREFIX_BYTES = 4096;

/** Recently decoded bitmaps, insertion-ordered (oldest = least recently used). */
const decodedBitmapCache = new Map<string, ImageBitmap>();
/** Same-key concurrent decodes share one in-flight promise. */
const pendingBitmapDecodes = new Map<string, Promise<ImageBitmap>>();

/**
 * Clears the decoded-bitmap cache, closing retained bitmaps.
 *
 * Primarily for test isolation. Production code has no reason to call this:
 * entries are bounded by `MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE` and evicted
 * oldest-first automatically.
 */
export function clearDecodedImageBitmapCache(): void {
	for (const bitmap of decodedBitmapCache.values()) {
		closeBitmapQuietly({ bitmap });
	}
	decodedBitmapCache.clear();
	pendingBitmapDecodes.clear();
}

function closeBitmapQuietly({ bitmap }: { bitmap: ImageBitmap }): void {
	try {
		bitmap.close();
	} catch {
		// Already closed by a shared owner — nothing left to free.
	}
}

async function hashBlobPrefix({ blob }: { blob: Blob }): Promise<string> {
	const prefix = new Uint8Array(
		await blob.slice(0, DECODE_CACHE_KEY_PREFIX_BYTES).arrayBuffer(),
	);
	let hash = 0x811c9dc5;
	for (const byte of prefix) {
		hash ^= byte;
		hash = Math.imul(hash, 0x01000193);
	}
	return `${blob.size.toString(36)}-${(hash >>> 0).toString(36)}`;
}

async function buildDecodeCacheKey({
	blob,
	options,
}: {
	blob: Blob;
	options: DecodeImageBitmapOptions;
}): Promise<string> {
	const prefixHash = await hashBlobPrefix({ blob });
	const sizeHint = options.resizeWidth ?? options.maxSourceSize ?? "full";
	return `${options.url}::${blob.type}::${sizeHint}::${prefixHash}`;
}

function refreshCachedBitmap({
	key,
	bitmap,
}: {
	key: string;
	bitmap: ImageBitmap;
}): void {
	decodedBitmapCache.delete(key);
	decodedBitmapCache.set(key, bitmap);
}

function storeDecodedBitmap({
	key,
	bitmap,
}: {
	key: string;
	bitmap: ImageBitmap;
}): void {
	refreshCachedBitmap({ key, bitmap });
	while (decodedBitmapCache.size > MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE) {
		const oldest = decodedBitmapCache.keys().next();
		if (oldest.done) break;
		const evicted = decodedBitmapCache.get(oldest.value);
		decodedBitmapCache.delete(oldest.value);
		if (evicted && evicted !== bitmap) {
			closeBitmapQuietly({ bitmap: evicted });
		}
	}
}

function isSvgFromMetadata(blob: Blob, url: string): boolean {
	if (blob.type?.includes("image/svg+xml")) return true;
	if (url.startsWith("data:image/svg+xml")) return true;

	try {
		const pathname = new URL(url).pathname;
		return pathname.toLowerCase().endsWith(".svg");
	} catch {
		return false;
	}
}

async function isSvgFromContent(blob: Blob): Promise<boolean> {
	const sample = await blob.slice(0, 1024).text();
	const trimmed = sample.trimStart();
	return (
		trimmed.startsWith("<?xml") ||
		trimmed.toLowerCase().startsWith("<svg") ||
		trimmed.toLowerCase().includes("<svg")
	);
}

async function isSvgImage(
	blob: Blob,
	url: string,
	force = false,
): Promise<boolean> {
	if (isSvgFromMetadata(blob, url)) return true;
	if (!force) return false;
	return isSvgFromContent(blob);
}

function buildDecodeError(
	label: string,
	url: string,
	blob: Blob,
	error: unknown,
): Error {
	const reason = error instanceof Error ? error.message : String(error);
	return new Error(
		`Failed to decode ${label} from "${url}" (type: "${blob.type}"): ${reason}`,
	);
}

/**
 * Decode a `Blob` into an `ImageBitmap`, with a fallback for SVG sources that
 * do not have intrinsic dimensions.
 *
 * Results are memoized in a small module-level LRU cache keyed by asset URL
 * plus blob identity (type, size, content-prefix hash) plus decode size hint,
 * so repeated decodes of the same source skip `createImageBitmap` entirely.
 * Concurrent same-key decodes share one in-flight promise. Failures are never
 * cached — a rejected decode is retried on the next call.
 *
 * Shared-ownership contract: cache hits return the SAME `ImageBitmap`
 * instance. Treat the result as borrowed — do NOT call `close()` on it,
 * or later same-key callers will receive a dead bitmap. Eviction closes the
 * evicted bitmap (best-effort, failures ignored).
 *
 * Known gap (out of scope for this pass): `nodes/image-node.ts` closes the
 * bitmap on its downscale path. A same-key caller after such a close can
 * receive a closed bitmap. The key includes the size hint, so preview vs
 * export variants rarely collide; the residual case is documented in
 * `docs/features/editor-perf-100-pass/export.md` instead of fixed here
 * because the node files are outside this pass's ownership.
 *
 * `createImageBitmap(blob)` fails on SVGs without `width`/`height` or a
 * `viewBox` in some browsers. Passing `resizeWidth` (or falling back to
 * `maxSourceSize` / 1024) gives the browser an explicit output size and lets
 * it derive the other dimension from the SVG aspect ratio.
 */
export async function decodeImageBitmap(
	blob: Blob,
	options: DecodeImageBitmapOptions,
): Promise<ImageBitmap> {
	const key = await buildDecodeCacheKey({ blob, options });

	const cached = decodedBitmapCache.get(key);
	if (cached) {
		refreshCachedBitmap({ key, bitmap: cached });
		return cached;
	}

	const pending = pendingBitmapDecodes.get(key);
	if (pending) return pending;

	const promise = (async (): Promise<ImageBitmap> => {
		try {
			const bitmap = await decodeImageBitmapUncached({ blob, options });
			pendingBitmapDecodes.delete(key);
			storeDecodedBitmap({ key, bitmap });
			return bitmap;
		} catch (error) {
			pendingBitmapDecodes.delete(key);
			throw error;
		}
	})();
	pendingBitmapDecodes.set(key, promise);
	return promise;
}

async function decodeImageBitmapUncached({
	blob,
	options,
}: {
	blob: Blob;
	options: DecodeImageBitmapOptions;
}): Promise<ImageBitmap> {
	const isSvg = await isSvgImage(blob, options.url);
	const targetWidth = options.resizeWidth ?? options.maxSourceSize;
	const label = options.label ?? "image source";

	if (isSvg && targetWidth !== undefined) {
		try {
			return await createImageBitmap(blob, {
				resizeWidth: Math.max(1, Math.round(targetWidth)),
				resizeQuality: "high",
			});
		} catch {
			// A resize hint was provided but the SVG still could not be decoded.
			// Continue to the unparameterized path so we can produce a useful
			// error message and, if the source was misidentified, try again.
		}
	}

	try {
		return await createImageBitmap(blob);
	} catch (error) {
		const maybeSvg = await isSvgImage(blob, options.url, true);
		if (maybeSvg) {
			const fallbackWidth = Math.max(1, Math.round(targetWidth ?? 1024));
			try {
				return await createImageBitmap(blob, {
					resizeWidth: fallbackWidth,
					resizeQuality: "high",
				});
			} catch (fallbackError) {
				throw buildDecodeError(label, options.url, blob, fallbackError);
			}
		}

		throw buildDecodeError(label, options.url, blob, error);
	}
}
