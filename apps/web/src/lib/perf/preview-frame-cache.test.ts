import { describe, expect, test } from "bun:test";
import {
	cachePreviewFrame,
	clearPreviewFrameCache,
	getPreviewFrameCacheCapacity,
	type PreviewFrameCacheEntry,
} from "./preview-frame-cache";

class FakeBitmap {
	closed = false;

	constructor(
		readonly width: number,
		readonly height: number,
	) {}

	close(): void {
		this.closed = true;
	}
}

type Entry = PreviewFrameCacheEntry<FakeBitmap>;

describe("getPreviewFrameCacheCapacity", () => {
	test("caps 1080p snapshots by the memory budget", () => {
		expect(getPreviewFrameCacheCapacity({ width: 1920, height: 1080 })).toBe(
			12,
		);
	});

	test("keeps only a few 4K snapshots", () => {
		expect(getPreviewFrameCacheCapacity({ width: 3840, height: 2160 })).toBe(3);
	});

	test("caps tiny previews to thirty entries", () => {
		expect(getPreviewFrameCacheCapacity({ width: 320, height: 180 })).toBe(30);
	});
});

describe("cachePreviewFrame", () => {
	test("evicts and closes the oldest bitmap", () => {
		const cache = new Map<string, Entry>();
		const first = new FakeBitmap(100, 100);
		const second = new FakeBitmap(100, 100);

		cachePreviewFrame({
			cache,
			key: "first",
			entry: { bitmap: first, frame: 1, scale: 1 },
			budgetBytes: 40_000,
		});
		cachePreviewFrame({
			cache,
			key: "second",
			entry: { bitmap: second, frame: 2, scale: 1 },
			budgetBytes: 40_000,
		});

		expect(cache.has("first")).toBe(false);
		expect(first.closed).toBe(true);
		expect(cache.get("second")?.bitmap).toBe(second);
	});

	test("enforces the total byte budget across mixed bitmap sizes", () => {
		const cache = new Map<string, Entry>();
		const small = new FakeBitmap(50, 50);
		const large = new FakeBitmap(100, 100);

		cachePreviewFrame({
			cache,
			key: "small",
			entry: { bitmap: small, frame: 1, scale: 0.5 },
			budgetBytes: 40_000,
		});
		cachePreviewFrame({
			cache,
			key: "large",
			entry: { bitmap: large, frame: 2, scale: 1 },
			budgetBytes: 40_000,
		});

		expect(cache.has("small")).toBe(false);
		expect(small.closed).toBe(true);
		expect(cache.get("large")?.bitmap).toBe(large);
	});

	test("closes every bitmap when cleared", () => {
		const first = new FakeBitmap(100, 100);
		const second = new FakeBitmap(100, 100);
		const cache = new Map<string, Entry>([
			["first", { bitmap: first, frame: 1, scale: 1 }],
			["second", { bitmap: second, frame: 2, scale: 1 }],
		]);

		clearPreviewFrameCache(cache);

		expect(cache.size).toBe(0);
		expect(first.closed).toBe(true);
		expect(second.closed).toBe(true);
	});
});
