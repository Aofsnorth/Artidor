import { describe, expect, test } from "bun:test";
import {
	isFrameValid,
	resolveDecodedFrameCacheLimit,
	VideoCache,
} from "./service";

describe("video cache canvas retention", () => {
	test("disables raw frame retention when CanvasSink reuses pooled canvases", () => {
		expect(
			resolveDecodedFrameCacheLimit({
				poolSize: 12,
				desiredLimit: 128,
			}),
		).toBe(0);
	});

	test("allows raw frame retention when CanvasSink pooling is disabled", () => {
		expect(
			resolveDecodedFrameCacheLimit({
				poolSize: 0,
				desiredLimit: 128,
			}),
		).toBe(128);
	});
});

describe("isFrameValid", () => {
	const frameTimestamp = 1.0;
	const frameDuration = 0.033;

	test("returns true for a timestamp strictly inside the frame window", () => {
		expect(
			isFrameValid({
				frameTimestamp,
				frameDuration,
				time: 1.015,
			}),
		).toBe(true);
	});

	test("returns true for a timestamp within 35ms start tolerance (e.g. cut boundary jitter)", () => {
		expect(
			isFrameValid({
				frameTimestamp,
				frameDuration,
				time: 0.97,
			}),
		).toBe(true);
	});

	test("returns false for a timestamp earlier than 35ms start tolerance", () => {
		expect(
			isFrameValid({
				frameTimestamp,
				frameDuration,
				time: 0.96,
			}),
		).toBe(false);
	});

	test("returns true for a timestamp within 10ms end tolerance", () => {
		expect(
			isFrameValid({
				frameTimestamp,
				frameDuration,
				time: 1.041,
			}),
		).toBe(true);
	});

	test("returns false for a timestamp beyond 10ms end tolerance", () => {
		expect(
			isFrameValid({
				frameTimestamp,
				frameDuration,
				time: 1.049,
			}),
		).toBe(false);
	});

	test("uses default 1/30s duration when frame duration is 0 or negative", () => {
		expect(
			isFrameValid({
				frameTimestamp: 2.0,
				frameDuration: 0,
				time: 2.02,
			}),
		).toBe(true);
	});
});

describe("VideoCache prewarm", () => {
	test("deduplicates concurrent prewarm calls for the same mediaId", async () => {
		const cache = new VideoCache();
		const fakeFile = new File(["dummy"], "video.mp4", { type: "video/mp4" });
		// Stub ensureSink so we don't attempt demuxing dummy files
		(cache as unknown as { ensureSink: () => Promise<void> }).ensureSink =
			async () => {};

		const promise1 = cache.prewarm({
			mediaId: "test-media-1",
			file: fakeFile,
			time: 0,
		});
		const promise2 = cache.prewarm({
			mediaId: "test-media-1",
			file: fakeFile,
			time: 0,
		});

		expect(promise1).toBe(promise2);

		await promise1;
		await promise2;
	});

	test("allows subsequent prewarm calls after previous one completes", async () => {
		const cache = new VideoCache();
		const fakeFile = new File(["dummy"], "video.mp4", { type: "video/mp4" });
		// Stub ensureSink so we don't attempt demuxing dummy files
		(cache as unknown as { ensureSink: () => Promise<void> }).ensureSink =
			async () => {};

		const promise1 = cache.prewarm({
			mediaId: "test-media-2",
			file: fakeFile,
			time: 0,
		});
		await promise1;

		const promise2 = cache.prewarm({
			mediaId: "test-media-2",
			file: fakeFile,
			time: 0,
		});

		expect(promise1).not.toBe(promise2);
		await promise2;
	});
});
