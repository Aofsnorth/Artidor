import { decodeImageBitmap, detachDecodedBitmap } from "../image-decode";
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface ImageNodeParams extends VisualNodeParams {
	mediaId: string;
	url: string;
	file: File;
	maxSourceSize?: number;
}

export interface CachedImageSource {
	source: HTMLImageElement | OffscreenCanvas | ImageBitmap;
	width: number;
	height: number;
}

/**
 * Decoded sources are pinned for the life of the tab, keyed by blob URL. Each
 * entry holds a full-resolution `ImageBitmap` (or a scaled `OffscreenCanvas`),
 * i.e. GPU-visible memory that nothing else ever releases, so a project switch
 * that imports new media grows the cache without bound. 12 entries is a few
 * dozen MB for typical stills and comfortably covers the media on screen;
 * evicting the least recently requested URL only costs a re-decode.
 */
const IMAGE_SOURCE_CACHE_MAX = 12;

const imageSourceCache = new Map<string, Promise<CachedImageSource>>();

/**
 * Releases the GPU-side memory of an evicted decode.
 *
 * This cache owns every bitmap it holds: `loadImageSource` detaches each decode
 * from the decoder's LRU, so closing here can never pull the bitmap out from
 * under a caller that is still serving it. A cached source is either an
 * `ImageBitmap` (close it) or an `OffscreenCanvas` drawn from a bitmap the
 * downscale path already closed (nothing left to release). The promise can also
 * still be pending or rejected, and an eviction that races an in-flight decode
 * must never turn into an unhandled rejection.
 */
function releaseCachedImage(
	entry: Promise<CachedImageSource> | undefined,
): void {
	if (!entry) return;
	void entry
		.then((cached) => {
			// Duck-typed: `ImageBitmap` is the only cached source with `close`, and
			// checking the method keeps this working in every context (and avoids
			// touching an already-detached bitmap through another cache's close).
			const closable = cached.source as { close?: () => void };
			if (typeof closable.close === "function") {
				closable.close();
			}
		})
		.catch(() => {
			// The decode failed; there is nothing to release.
		});
}

export function loadImageSource(
	url: string,
	maxSourceSize?: number,
): Promise<CachedImageSource> {
	const cacheKey = `${url}::${maxSourceSize ?? "full"}`;

	const cached = imageSourceCache.get(cacheKey);
	if (cached) {
		// Touch for LRU recency.
		imageSourceCache.delete(cacheKey);
		imageSourceCache.set(cacheKey, cached);
		return cached;
	}

	const promise = (async (): Promise<CachedImageSource> => {
		// Use createImageBitmap via fetch so this path works in both the main
		// thread and Web Worker contexts (where `new Image()` is unavailable).
		const response = await fetch(url);
		const blob = await response.blob();
		const bitmap = await decodeImageBitmap(blob, {
			url,
			maxSourceSize,
			label: "image",
		});
		// This cache retains the bitmap past the decode call, so it takes
		// ownership. Without this the decoder's own LRU keeps a second reference
		// and closes the bitmap on its next eviction, after which every caller
		// this cache still serves gets a detached bitmap that uploads as nothing.
		detachDecodedBitmap(bitmap);

		const naturalWidth = bitmap.width;
		const naturalHeight = bitmap.height;
		const exceedsLimit =
			maxSourceSize &&
			(naturalWidth > maxSourceSize || naturalHeight > maxSourceSize);

		if (exceedsLimit) {
			const scale = Math.min(
				maxSourceSize / naturalWidth,
				maxSourceSize / naturalHeight,
			);
			const scaledWidth = Math.round(naturalWidth * scale);
			const scaledHeight = Math.round(naturalHeight * scale);

			const offscreen = new OffscreenCanvas(scaledWidth, scaledHeight);
			const ctx = offscreen.getContext("2d");

			if (ctx) {
				ctx.drawImage(bitmap, 0, 0, scaledWidth, scaledHeight);
				// Owned by this cache (detached above), so releasing the
				// full-resolution copy is safe and is the point of downscaling.
				bitmap.close();
				return { source: offscreen, width: scaledWidth, height: scaledHeight };
			}
		}

		// Return the bitmap directly — it is drawable by CanvasRenderingContext2D
		// in both main-thread and worker contexts, unlike HTMLImageElement.
		return { source: bitmap, width: naturalWidth, height: naturalHeight };
	})();

	imageSourceCache.set(cacheKey, promise);
	while (imageSourceCache.size > IMAGE_SOURCE_CACHE_MAX) {
		// Evict the least recently used (first-inserted) entry.
		const oldest = imageSourceCache.keys().next().value;
		if (oldest === undefined) break;
		releaseCachedImage(imageSourceCache.get(oldest));
		imageSourceCache.delete(oldest);
	}
	return promise;
}

/**
 * Drops every cached decode and releases the pinned bitmaps.
 *
 * Exported (not called here) so a project-teardown / project-switch hook can
 * free this cache's GPU memory at the point the previous project's media is
 * discarded — the call site is owned by the project-lifecycle track.
 */
export function clearImageSourceCache(): void {
	for (const entry of imageSourceCache.values()) {
		releaseCachedImage(entry);
	}
	imageSourceCache.clear();
}

export class ImageNode extends VisualNode<
	ImageNodeParams,
	ResolvedVisualSourceNodeState
> {}
