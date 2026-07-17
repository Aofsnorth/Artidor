const BYTES_PER_PIXEL = 4;
export const PREVIEW_FRAME_CACHE_BUDGET_BYTES = 96 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 30;

export interface ClosableBitmap {
	width: number;
	height: number;
	close(): void;
}

export interface PreviewFrameCacheEntry<
	Bitmap extends ClosableBitmap = ImageBitmap,
> {
	bitmap: Bitmap;
	frame: number;
	scale: number;
}

export function getPreviewFrameCacheCapacity({
	width,
	height,
	budgetBytes = PREVIEW_FRAME_CACHE_BUDGET_BYTES,
}: {
	width: number;
	height: number;
	budgetBytes?: number;
}): number {
	const pixels = Math.max(1, width) * Math.max(1, height);
	const bytesPerFrame = pixels * BYTES_PER_PIXEL;
	return Math.max(
		1,
		Math.min(MAX_CACHE_ENTRIES, Math.floor(budgetBytes / bytesPerFrame)),
	);
}

export function cachePreviewFrame<Bitmap extends ClosableBitmap>({
	cache,
	key,
	entry,
	budgetBytes,
}: {
	cache: Map<string, PreviewFrameCacheEntry<Bitmap>>;
	key: string;
	entry: PreviewFrameCacheEntry<Bitmap>;
	budgetBytes?: number;
}): void {
	const replaced = cache.get(key);
	if (replaced && replaced.bitmap !== entry.bitmap) {
		replaced.bitmap.close();
	}
	cache.delete(key);
	cache.set(key, entry);

	const maxBytes = budgetBytes ?? PREVIEW_FRAME_CACHE_BUDGET_BYTES;
	let retainedBytes = 0;
	for (const retained of cache.values()) {
		retainedBytes +=
			Math.max(1, retained.bitmap.width) *
			Math.max(1, retained.bitmap.height) *
			BYTES_PER_PIXEL;
	}
	while (
		cache.size > 1 &&
		(cache.size > MAX_CACHE_ENTRIES || retainedBytes > maxBytes)
	) {
		const oldestKey = cache.keys().next().value;
		if (oldestKey === undefined) return;
		const evicted = cache.get(oldestKey);
		if (evicted) {
			retainedBytes -=
				Math.max(1, evicted.bitmap.width) *
				Math.max(1, evicted.bitmap.height) *
				BYTES_PER_PIXEL;
			evicted.bitmap.close();
		}
		cache.delete(oldestKey);
	}
}

export function clearPreviewFrameCache<Bitmap extends ClosableBitmap>(
	cache: Map<string, PreviewFrameCacheEntry<Bitmap>>,
): void {
	for (const entry of cache.values()) {
		entry.bitmap.close();
	}
	cache.clear();
}
