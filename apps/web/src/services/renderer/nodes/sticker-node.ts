import { STICKER_INTRINSIC_SIZE_FALLBACK } from "@/lib/stickers/intrinsic-size";
import { resolveStickerId } from "@/lib/stickers";
import { decodeImageBitmap, detachDecodedBitmap } from "../image-decode";
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface StickerNodeParams extends VisualNodeParams {
	stickerId: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}

interface CachedStickerSource {
	source: HTMLImageElement | ImageBitmap;
	width: number;
	height: number;
}

/**
 * Decoded stickers are pinned for the life of the tab, keyed by sticker id, and
 * each entry holds an `ImageBitmap` that nothing else releases. 12 entries
 * bounds that to a few dozen MB (sticker sheets are typically ≤512 px) while
 * covering the stickers on screen; evicting the least recently requested sticker
 * only costs a re-decode.
 */
const STICKER_SOURCE_CACHE_MAX = 12;

const stickerSourceCache = new Map<string, Promise<CachedStickerSource>>();

/**
 * Releases an evicted decode.
 *
 * This cache owns every bitmap it holds: `loadStickerSource` detaches each
 * decode from the decoder's LRU, so the decoder can never close a bitmap this
 * cache is still serving (a closed `ImageBitmap` uploads as nothing, which shows
 * up as a black layer). Eviction can still race a decode that is in flight, so
 * this must never throw or reject.
 */
function releaseCachedSticker(
	entry: Promise<CachedStickerSource> | undefined,
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

export function loadStickerSource({
	stickerId,
	intrinsicWidth,
	intrinsicHeight,
}: {
	stickerId: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}): Promise<CachedStickerSource> {
	const resizeWidth = intrinsicWidth ?? STICKER_INTRINSIC_SIZE_FALLBACK;
	const cacheKey = `${stickerId}:${resizeWidth}`;
	const cached = stickerSourceCache.get(cacheKey);
	if (cached) {
		// Touch for LRU recency.
		stickerSourceCache.delete(cacheKey);
		stickerSourceCache.set(cacheKey, cached);
		return cached;
	}

	const promise = (async (): Promise<CachedStickerSource> => {
		const url = resolveStickerId({
			stickerId,
			options: {
				width: intrinsicWidth ?? STICKER_INTRINSIC_SIZE_FALLBACK,
				height: intrinsicHeight ?? STICKER_INTRINSIC_SIZE_FALLBACK,
			},
		});

		// Use fetch + createImageBitmap so this path works in Web Worker
		// contexts where `new Image()` (a DOM API) is unavailable.
		const response = await fetch(url);
		const blob = await response.blob();
		const bitmap = await decodeImageBitmap(blob, {
			url,
			resizeWidth,
			label: "sticker",
		});
		// This cache retains the bitmap past the decode call, so it takes
		// ownership; otherwise the decoder's own LRU can close it out from under
		// a caller this cache is still serving.
		detachDecodedBitmap(bitmap);

		return {
			source: bitmap,
			width: bitmap.width,
			height: bitmap.height,
		};
	})();

	stickerSourceCache.set(cacheKey, promise);
	while (stickerSourceCache.size > STICKER_SOURCE_CACHE_MAX) {
		// Evict the least recently used (first-inserted) entry.
		const oldest = stickerSourceCache.keys().next().value;
		if (oldest === undefined) break;
		releaseCachedSticker(stickerSourceCache.get(oldest));
		stickerSourceCache.delete(oldest);
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
export function clearStickerSourceCache(): void {
	for (const entry of stickerSourceCache.values()) {
		releaseCachedSticker(entry);
	}
	stickerSourceCache.clear();
}

export class StickerNode extends VisualNode<
	StickerNodeParams,
	ResolvedVisualSourceNodeState
> {}
