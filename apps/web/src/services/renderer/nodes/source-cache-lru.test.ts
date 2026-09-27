import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import { clearDecodedImageBitmapCache } from "../image-decode";
import { clearImageSourceCache, loadImageSource } from "./image-node";
import { clearStickerSourceCache, loadStickerSource } from "./sticker-node";

/**
 * Covers the bounded-LRU + disposal contract of the two decoded-source caches
 * (`nodes/image-node.ts`, `nodes/sticker-node.ts`). Both used to grow without
 * limit, pinning full-resolution `ImageBitmap`s for the whole tab lifetime.
 *
 * The stubs below stand in for `fetch` / `createImageBitmap`; close() is
 * idempotent like the real `ImageBitmap`, so an entry closed by another owner
 * (the decode LRU in `image-decode.ts` also closes evicted bitmaps) is a no-op
 * rather than a throw.
 */
type FakeBitmap = {
	width: number;
	height: number;
	closeCalls: number;
	/**
	 * Mirrors real `ImageBitmap` semantics: once closed the bitmap is detached and
	 * unusable. Uploading a closed bitmap to the GPU yields no pixels, which is
	 * what a black layer on the preview canvas actually is.
	 */
	closed: boolean;
	close: () => void;
};

const globals = globalThis as unknown as {
	fetch?: unknown;
	createImageBitmap?: unknown;
	Path2D?: unknown;
};
const previousFetch = globals.fetch;
const previousCreateImageBitmap = globals.createImageBitmap;
const previousPath2D = globals.Path2D;

let bitmaps: FakeBitmap[] = [];
let fetchUrls: string[] = [];
let failNextDecode = false;

function makeBitmap(): FakeBitmap {
	const bitmap: FakeBitmap = {
		width: 640,
		height: 480,
		closeCalls: 0,
		closed: false,
		close() {
			bitmap.closeCalls += 1;
			bitmap.closed = true;
		},
	};
	bitmaps.push(bitmap);
	return bitmap;
}

beforeAll(() => {
	globals.fetch = (input: string) => {
		fetchUrls.push(String(input));
		return Promise.resolve({
			blob: () => Promise.resolve(new Blob([new Uint8Array([1, 2, 3])])),
		});
	};
	globals.createImageBitmap = () => {
		if (failNextDecode) {
			return Promise.reject(new Error("decode failed"));
		}
		return Promise.resolve(makeBitmap());
	};
	// The sticker provider resolves shape stickers to an SVG data URL, which
	// goes through the same fetch stub; no canvas is involved.
	globals.Path2D = class {
		moveTo(): void {}
		lineTo(): void {}
		closePath(): void {}
		roundRect(): void {}
		arc(): void {}
	};
});

afterAll(() => {
	globals.fetch = previousFetch;
	globals.createImageBitmap = previousCreateImageBitmap;
	globals.Path2D = previousPath2D;
});

beforeEach(() => {
	// `image-decode` keeps its own 8-entry LRU that also closes evicted bitmaps;
	// reset it so these assertions only observe the node caches' own disposal.
	clearImageSourceCache();
	clearStickerSourceCache();
	clearDecodedImageBitmapCache();
	bitmaps = [];
	fetchUrls = [];
	failNextDecode = false;
});

/** Disposal runs on a microtask off the cached promise, so tests must yield. */
function flushDisposal(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("image source cache", () => {
	it("evicts past the cap and re-decodes the evicted url", async () => {
		// 13 distinct urls: the 12-entry cap must push the first one out.
		const urls = Array.from(
			{ length: 13 },
			(_, index) => `https://example.test/media/${index}.png`,
		);
		for (const url of urls) {
			await loadImageSource(url);
		}
		expect(fetchUrls.length).toBe(13);

		// The most recent entry is still cached — no new fetch.
		await loadImageSource(urls[12]);
		expect(fetchUrls.length).toBe(13);

		// The oldest was evicted, so it is fetched and decoded again.
		await loadImageSource(urls[0]);
		expect(fetchUrls.length).toBe(14);
	});

	it("returns the cached promise for a repeated url", async () => {
		const first = loadImageSource("https://example.test/repeat.png");
		const second = loadImageSource("https://example.test/repeat.png");
		expect(second).toBe(first);
		await first;
		expect(fetchUrls.length).toBe(1);
	});

	it("closes the bitmaps it holds when the cache is cleared", async () => {
		const held = await Promise.all([
			loadImageSource("https://example.test/a.png"),
			loadImageSource("https://example.test/b.png"),
			loadImageSource("https://example.test/c.png"),
		]);
		for (const entry of held) {
			expect((entry.source as FakeBitmap).closeCalls).toBe(0);
		}

		clearImageSourceCache();
		await flushDisposal();

		for (const entry of held) {
			expect((entry.source as FakeBitmap).closeCalls).toBeGreaterThan(0);
		}
		// A second clear is a no-op rather than a throw.
		expect(() => clearImageSourceCache()).not.toThrow();
	});

	it("keeps a cached source usable after the shared decode LRU overflows", async () => {
		// The decoder in `image-decode.ts` keeps its own 8-entry LRU. While the
		// node cache and that LRU share one bitmap instance, overflowing the LRU
		// closes a bitmap the node cache still hands out — and a closed bitmap
		// uploads as nothing, i.e. a black layer in the preview.
		const first = await loadImageSource("https://example.test/first.png");
		const bitmap = first.source as FakeBitmap;

		// Distinct urls => distinct blobs => distinct decoder keys.
		for (let i = 0; i < 10; i++) {
			await loadImageSource(`https://example.test/fill-${i}.png`);
		}

		// Still cached in the node cache (cap 12), so it is still served.
		const again = await loadImageSource("https://example.test/first.png");
		expect(again).toBe(first);
		expect(bitmap.closed).toBe(false);
	});

	it("clearing after a failed decode neither throws nor rejects", async () => {
		failNextDecode = true;
		const failed = loadImageSource("https://example.test/broken.png");
		failed.catch(() => {
			// The caller owns this rejection; the cache must not re-raise it.
		});
		await expect(failed).rejects.toThrow("decode failed");

		expect(() => clearImageSourceCache()).not.toThrow();
	});
});

describe("sticker source cache", () => {
	it("evicts past the cap and re-decodes the evicted sticker", async () => {
		// Distinct intrinsic widths give distinct cache keys
		// (`${stickerId}:${resizeWidth}`) for one sticker id.
		const widths = Array.from({ length: 13 }, (_, index) => 64 + index);
		for (const width of widths) {
			await loadStickerSource({
				stickerId: "shapes:rounded-card",
				intrinsicWidth: width,
				intrinsicHeight: width,
			});
		}
		expect(fetchUrls.length).toBe(13);

		await loadStickerSource({
			stickerId: "shapes:rounded-card",
			intrinsicWidth: widths[12],
			intrinsicHeight: widths[12],
		});
		expect(fetchUrls.length).toBe(13);

		await loadStickerSource({
			stickerId: "shapes:rounded-card",
			intrinsicWidth: widths[0],
			intrinsicHeight: widths[0],
		});
		expect(fetchUrls.length).toBe(14);
	});

	it("closes the bitmaps it holds when the cache is cleared", async () => {
		const held = await Promise.all([
			loadStickerSource({
				stickerId: "shapes:rounded-card",
				intrinsicWidth: 64,
			}),
			loadStickerSource({
				stickerId: "shapes:rounded-card",
				intrinsicWidth: 96,
			}),
		]);
		for (const entry of held) {
			expect((entry.source as FakeBitmap).closeCalls).toBe(0);
		}

		clearStickerSourceCache();
		await flushDisposal();

		for (const entry of held) {
			expect((entry.source as FakeBitmap).closeCalls).toBeGreaterThan(0);
		}
		expect(() => clearStickerSourceCache()).not.toThrow();
	});

	it("keeps a cached sticker usable after the shared decode LRU overflows", async () => {
		const first = await loadStickerSource({
			stickerId: "shapes:rounded-card",
			intrinsicWidth: 64,
		});
		const bitmap = first.source as FakeBitmap;

		// Distinct intrinsic widths => distinct decoder keys.
		for (let i = 0; i < 10; i++) {
			await loadStickerSource({
				stickerId: "shapes:rounded-card",
				intrinsicWidth: 128 + i,
				intrinsicHeight: 128 + i,
			});
		}

		const again = await loadStickerSource({
			stickerId: "shapes:rounded-card",
			intrinsicWidth: 64,
		});
		expect(again).toBe(first);
		expect(bitmap.closed).toBe(false);
	});

	it("eviction of an already-closed bitmap does not throw", async () => {
		failNextDecode = false;
		// Simulate another owner (the shared decode LRU) having closed the bitmap
		// first: close() is a no-op on a detached bitmap, and eviction must not
		// surface that as an error.
		const entry = await loadStickerSource({
			stickerId: "shapes:rounded-card",
			intrinsicWidth: 64,
		});
		(entry.source as FakeBitmap).close();

		expect(() => clearStickerSourceCache()).not.toThrow();
	});
});
