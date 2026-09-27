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

/**
 * Canonical content key for a param bag, used to decide whether a raster can be
 * reused across frames.
 *
 * WHY not `JSON.stringify`: it re-walks, re-escapes and re-type-tags every
 * value on every frame. For an animated graphic (params change 60x/second) that
 * showed up as real main-thread time for a key that only has to detect change.
 * This walks the bag once in sorted key order and emits a type-tagged string:
 *
 * - sorted, so key insertion order can never cause a spurious cache miss;
 * - type-tagged and length-prefixed, so `1` / `"1"` and `["ab"]` / ["a","b"]
 *   can never collide;
 * - exact, not a numeric hash: a hit therefore *guarantees* identical pixels,
 *   so there is no (however unlikely) hash-collision path to a stale raster.
 */
export function paramValuesKey(value: unknown): string {
	if (value === null) return "z";
	switch (typeof value) {
		case "number":
			return `n${value}`;
		case "string": {
			const text = value as string;
			return `s${text.length}:${text}`;
		}
		case "boolean":
			return value ? "b1" : "b0";
		case "undefined":
			return "u";
		case "object":
			break;
		default:
			// bigint / symbol / function: not valid param values, but must not throw.
			return `x${String(value)}`;
	}

	if (Array.isArray(value)) {
		let out = "[";
		for (const item of value) {
			out += `${paramValuesKey(item)},`;
		}
		return `${out}]`;
	}

	const record = value as Record<string, unknown>;
	const keys = Object.keys(record).sort();
	let out = "{";
	for (const key of keys) {
		out += `${key.length}:${key}=${paramValuesKey(record[key])},`;
	}
	return `${out}}`;
}
