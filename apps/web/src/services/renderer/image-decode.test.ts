import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	clearDecodedImageBitmapCache,
	decodeImageBitmap,
	MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE,
} from "./image-decode";

type FakeBitmap = {
	width: number;
	height: number;
	closeCalls: number;
	close: () => void;
};

const makeBlob = ({ bytes, type }: { bytes: number[]; type: string }) =>
	new Blob([new Uint8Array(bytes)], { type });

const makeFakeBitmap = (): FakeBitmap => {
	const fake: FakeBitmap = {
		width: 64,
		height: 64,
		closeCalls: 0,
		close: () => {
			fake.closeCalls += 1;
		},
	};
	return fake;
};

describe("decodeImageBitmap LRU cache", () => {
	let decodeCalls = 0;
	let impl: (blob: Blob) => Promise<ImageBitmap>;
	let previousCreateImageBitmap: unknown;
	let minted: FakeBitmap[];

	beforeEach(() => {
		clearDecodedImageBitmapCache();
		decodeCalls = 0;
		minted = [];
		impl = async () => {
			decodeCalls += 1;
			const fake = makeFakeBitmap();
			minted.push(fake);
			return fake as unknown as ImageBitmap;
		};
		previousCreateImageBitmap = (globalThis as Record<string, unknown>)
			.createImageBitmap;
		(globalThis as Record<string, unknown>).createImageBitmap = (
			...args: unknown[]
		) => impl(args[0] as Blob);
	});

	afterEach(() => {
		if (previousCreateImageBitmap === undefined) {
			Reflect.deleteProperty(
				globalThis as Record<string, unknown>,
				"createImageBitmap",
			);
		} else {
			(globalThis as Record<string, unknown>).createImageBitmap =
				previousCreateImageBitmap;
		}
		clearDecodedImageBitmapCache();
	});

	test("decodes once for repeated same-asset calls", async () => {
		const blob = makeBlob({ bytes: [1, 2, 3], type: "image/png" });
		const options = { url: "blob:asset-a", label: "image" };

		const first = await decodeImageBitmap(blob, options);
		const second = await decodeImageBitmap(blob, options);
		const third = await decodeImageBitmap(blob, options);

		expect(decodeCalls).toBe(1);
		expect(second).toBe(first);
		expect(third).toBe(first);
	});

	test("shares one decode across concurrent same-key callers", async () => {
		const blob = makeBlob({ bytes: [4, 5, 6], type: "image/png" });
		const options = { url: "blob:asset-b", label: "image" };

		const [first, second] = await Promise.all([
			decodeImageBitmap(blob, options),
			decodeImageBitmap(blob, options),
		]);

		expect(decodeCalls).toBe(1);
		expect(second).toBe(first);
	});

	test("treats different content under the same URL as different assets", async () => {
		const options = { url: "blob:asset-c", label: "image" };
		const first = await decodeImageBitmap(
			makeBlob({ bytes: [7, 8, 9], type: "image/png" }),
			options,
		);
		const second = await decodeImageBitmap(
			makeBlob({ bytes: [10, 11, 12], type: "image/png" }),
			options,
		);

		expect(decodeCalls).toBe(2);
		expect(second).not.toBe(first);
	});

	test("keys the cache by decode size hint", async () => {
		const bytes = [13, 14, 15];
		const full = await decodeImageBitmap(
			makeBlob({ bytes, type: "image/png" }),
			{ url: "blob:asset-d", label: "image" },
		);
		const capped = await decodeImageBitmap(
			makeBlob({ bytes, type: "image/png" }),
			{ url: "blob:asset-d", maxSourceSize: 512, label: "image" },
		);

		expect(decodeCalls).toBe(2);
		expect(capped).not.toBe(full);
	});

	test("evicts the oldest entry past the cap and closes it", async () => {
		expect(MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE).toBe(8);
		const firsts: ImageBitmap[] = [];

		for (let i = 0; i <= MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE; i++) {
			firsts.push(
				await decodeImageBitmap(
					makeBlob({ bytes: [i, i + 1, i + 2], type: "image/png" }),
					{ url: `blob:asset-evict-${i}`, label: "image" },
				),
			);
		}

		expect(decodeCalls).toBe(MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE + 1);
		const evicted = minted[0];
		expect(evicted?.closeCalls).toBe(1);

		// The evicted key misses and decodes again.
		await decodeImageBitmap(makeBlob({ bytes: [0, 1, 2], type: "image/png" }), {
			url: "blob:asset-evict-0",
			label: "image",
		});
		expect(decodeCalls).toBe(MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE + 2);
	});

	test("never caches a failed decode", async () => {
		impl = async () => {
			decodeCalls += 1;
			throw new Error("boom");
		};
		const blob = makeBlob({ bytes: [16, 17], type: "image/png" });
		const options = { url: "blob:asset-f", label: "image" };

		await expect(decodeImageBitmap(blob, options)).rejects.toThrow(
			/Failed to decode image/,
		);
		await expect(decodeImageBitmap(blob, options)).rejects.toThrow(
			/Failed to decode image/,
		);
		expect(decodeCalls).toBe(2);
	});
});
