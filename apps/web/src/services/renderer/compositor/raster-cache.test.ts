import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { getCachedRaster, paramValuesKey } from "./raster-cache";

type StubContext = { draw: () => void };

/**
 * `OffscreenCanvas` does not exist in bun, and `createOffscreenCanvas` falls back
 * to `document` (also absent). A counting stub canvas is enough here: the raster
 * cache only needs `getContext` to hand back something draw calls can reach.
 */
let liveDrawCount = 0;

class StubOffscreenCanvas {
	width: number;
	height: number;
	private readonly stubContext: StubContext;

	constructor(width: number, height: number) {
		this.width = width;
		this.height = height;
		this.stubContext = {
			draw: () => {
				liveDrawCount += 1;
			},
		};
	}

	getContext(): StubContext {
		return this.stubContext;
	}
}

const globals = globalThis as unknown as { OffscreenCanvas?: unknown };
const previousOffscreenCanvas = globals.OffscreenCanvas;

beforeAll(() => {
	globals.OffscreenCanvas = StubOffscreenCanvas;
});

afterAll(() => {
	globals.OffscreenCanvas = previousOffscreenCanvas;
});

const draw = (ctx: unknown) => {
	(ctx as StubContext).draw();
};

describe("paramValuesKey", () => {
	it("is stable for the same bag regardless of key insertion order", () => {
		expect(paramValuesKey({ a: 1, b: "x", c: true })).toBe(
			paramValuesKey({ c: true, b: "x", a: 1 }),
		);
	});

	it("separates values that only differ by type", () => {
		// Guards the type-tagged contract: without tags `1` and `"1"` (and
		// `["ab"]` and `["a","b"]`) would share a key, and a cache hit could then
		// serve the wrong pixels.
		expect(paramValuesKey({ a: 1 })).not.toBe(paramValuesKey({ a: "1" }));
		expect(paramValuesKey(["ab"])).not.toBe(paramValuesKey(["a", "b"]));
		expect(paramValuesKey(null)).not.toBe(paramValuesKey("z"));
		expect(paramValuesKey(true)).not.toBe(paramValuesKey("true"));
	});

	it("separates different primitive values", () => {
		expect(paramValuesKey({ r: 0.5 })).not.toBe(paramValuesKey({ r: 0.6 }));
		expect(paramValuesKey({ fill: "#fff" })).not.toBe(
			paramValuesKey({ fill: "#000" }),
		);
	});

	it("handles nested objects deterministically", () => {
		const nested = { outer: { inner: [1, 2, { deep: "x" }] } };
		expect(paramValuesKey(nested)).toBe(paramValuesKey(nested));
		expect(paramValuesKey(nested)).not.toBe(
			paramValuesKey({ outer: { inner: [1, 2, { deep: "y" }] } }),
		);
	});
});

describe("getCachedRaster", () => {
	it("returns the same canvas for a repeated key and only draws once", () => {
		const before = liveDrawCount;
		const first = getCachedRaster({ key: "k1", width: 4, height: 4, draw });
		const second = getCachedRaster({ key: "k1", width: 4, height: 4, draw });

		expect(first).toBe(second);
		expect(liveDrawCount - before).toBe(1);
	});

	it("re-rasterises when the key changes", () => {
		const first = getCachedRaster({ key: "k2", width: 4, height: 4, draw });
		const second = getCachedRaster({ key: "k3", width: 4, height: 4, draw });
		expect(first).not.toBe(second);
	});

	it("re-rasterises when the cached size no longer matches", () => {
		const small = getCachedRaster({ key: "k4", width: 4, height: 4, draw });
		const large = getCachedRaster({ key: "k4", width: 8, height: 8, draw });
		expect(small).not.toBe(large);
		expect(large?.width).toBe(8);
	});

	it("evicts past the entry cap so the cache cannot grow unbounded", () => {
		const before = liveDrawCount;
		// 32 is the documented cap, so the 33rd distinct key pushes the first out.
		for (let i = 0; i < 33; i++) {
			getCachedRaster({ key: `evict:${i}`, width: 4, height: 4, draw });
		}
		expect(liveDrawCount - before).toBe(33);

		// "evict:0" fell out of the LRU, so asking for it again re-rasterises
		// (33 -> 34 draws) instead of serving the evicted canvas.
		const refetched = getCachedRaster({
			key: "evict:0",
			width: 4,
			height: 4,
			draw,
		});
		expect(liveDrawCount - before).toBe(34);
		expect(getCachedRaster({ key: "evict:0", width: 4, height: 4, draw })).toBe(
			refetched,
		);
		expect(liveDrawCount - before).toBe(34);
	});
});
