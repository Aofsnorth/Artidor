/**
 * Static-layer raster cache.
 *
 * Some layers (solid colour / CSS-gradient fills) are re-rasterised to a fresh
 * full-canvas OffscreenCanvas on EVERY frame. The wasm compositor dedupes
 * texture uploads by source-object identity, so a brand-new canvas each frame
 * always re-uploads — wasted GPU bandwidth for content that never changed.
 *
 * This caches the rasterised canvas keyed by a content hash (e.g. the colour
 * string + dimensions). When the inputs are unchanged the SAME canvas object
 * is returned across frames, so the identity-based upload dedupe skips the
 * re-upload entirely. The cache is a bounded LRU so it can't grow without
 * limit; changing inputs simply produce a new key and evict the oldest entry.
 */

import { createOffscreenCanvas } from "../canvas-utils";

type AnyOffscreen = ReturnType<typeof createOffscreenCanvas>;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const MAX_ENTRIES = 32;
const cache = new Map<string, AnyOffscreen>();

/**
 * Returns a cached canvas for `key`, drawing it once via `draw` on a miss.
 * The returned canvas is stable across calls with the same key, which is what
 * lets the compositor skip re-uploading an unchanged static layer.
 */
export function getCachedRaster({
	key,
	width,
	height,
	draw,
}: {
	key: string;
	width: number;
	height: number;
	draw: (ctx: Ctx2D) => void;
}): AnyOffscreen | null {
	const existing = cache.get(key);
	if (existing && existing.width === width && existing.height === height) {
		// Touch for LRU recency.
		cache.delete(key);
		cache.set(key, existing);
		return existing;
	}

	const canvas = createOffscreenCanvas({ width, height });
	const ctx = canvas.getContext("2d") as Ctx2D | null;
	if (!ctx) return null;
	draw(ctx);

	cache.set(key, canvas);
	if (cache.size > MAX_ENTRIES) {
		// Evict the oldest (first-inserted) entry.
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	return canvas;
}
