/**
 * Waveform decode-cost regressions owned by the audio waveform.
 *
 * Three properties are pinned here:
 *  1. A clip only decodes its trim window. A 1-hour source used to be
 *     materialised in full (~1.4 GB of PCM) for every mounted clip, so the
 *     4 seconds a clip actually shows cost the whole file.
 *  2. The window's trim ratios map onto exactly the same source samples the
 *     whole-source ratios did, so the drawn waveform is unchanged.
 *  3. The peak caches are bounded: `DECODE_CACHE` by bytes, LRU, and the
 *     AudioBuffer-keyed peak cache by the buffer's own lifetime.
 */
import { describe, expect, mock, test } from "bun:test";
import { TICKS_PER_SECOND } from "@/lib/wasm";

const decodeCalls: Array<{
	name: string;
	trimStartSeconds: number | undefined;
	durationSeconds: number | undefined;
}> = [];

function makeAudioBuffer({
	length,
	channels = [{ fill: 0.5 }],
}: {
	length: number;
	channels?: Array<{ fill: number }>;
}): AudioBuffer {
	const data = channels.map((channel) => {
		const samples = new Float32Array(length);
		samples.fill(channel.fill);
		return samples;
	});
	return {
		numberOfChannels: data.length,
		length,
		sampleRate: 48000,
		getChannelData: (index: number) => data[index],
	} as unknown as AudioBuffer;
}

// The real module pulls in mediabunny + the WASM glue and needs an
// AudioContext, none of which exist here. The stub records what the waveform
// asked to decode, which is the whole point of the window fix.
mock.module("@/lib/media/audio", () => ({
	createAudioContext: () => ({
		close: () => Promise.resolve(),
		// Stands in for the native whole-file path a URL-only source takes.
		decodeAudioData: () =>
			Promise.resolve(
				makeAudioBuffer({ length: 2048, channels: [{ fill: 0.5 }] }),
			),
	}),
	decodeMediaFileAudioBuffer: ({
		file,
		trimStartSeconds,
		durationSeconds,
	}: {
		file: File;
		trimStartSeconds?: number;
		durationSeconds?: number;
	}) => {
		decodeCalls.push({
			name: file.name,
			trimStartSeconds,
			durationSeconds,
		});
		return Promise.resolve(
			makeAudioBuffer({ length: 4096, channels: [{ fill: 0.5 }] }),
		);
	},
}));

globalThis.fetch = (() =>
	Promise.resolve({
		ok: true,
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
	})) as unknown as typeof globalThis.fetch;

const {
	computeSourceTrimRatios,
	decodeAndCache,
	evictDecodeCacheToBudget,
	getCacheKey,
	getCachedPeaks,
	resolveDecodePlan,
} = await import("./audio-waveform");

const secondsToTicks = (seconds: number) => seconds * TICKS_PER_SECOND;

function makeVideoFile(name: string): File {
	return new File([new Uint8Array(8)], name, { type: "video/mp4" });
}

describe("resolveDecodePlan", () => {
	test("a 4s clip in a 1-hour source decodes 4 seconds, not an hour", () => {
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(10),
			trimEndTicks: secondsToTicks(3586),
			sourceDurationTicks: secondsToTicks(3600),
		});

		expect(plan.window).not.toBeNull();
		// The window covers the clip (snapped outward to the quantum) and is a
		// fraction of the source.
		expect(plan.window?.startSeconds).toBeLessThanOrEqual(10);
		expect(
			(plan.window?.startSeconds ?? 0) + (plan.window?.durationSeconds ?? 0),
		).toBeGreaterThanOrEqual(14);
		expect(plan.window?.durationSeconds).toBeLessThan(5);
		// 3600s of PCM (~1.4 GB stereo) replaced by ~4s (~1.5 MB).
		expect(plan.window?.durationSeconds).toBeLessThan(3600 / 100);
	});

	test("an untrimmed clip keeps decoding the whole source (ratios unchanged)", () => {
		const plan = resolveDecodePlan({ sourceDurationTicks: secondsToTicks(60) });
		expect(plan.window).toBeNull();
		expect(plan.sourceRatios.trimStartRatio).toBe(0);
		expect(plan.sourceRatios.trimEndRatio).toBe(0);
	});

	test("a trim smaller than the quantum is not worth a window", () => {
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(0.2),
			sourceDurationTicks: secondsToTicks(60),
		});
		expect(plan.window).toBeNull();
		expect(plan.sourceRatios.trimStartRatio).toBeCloseTo(0.2 / 60, 12);
	});

	test("an unknown source duration falls back to a whole-source decode", () => {
		const plan = resolveDecodePlan({ trimStartTicks: secondsToTicks(10) });
		expect(plan.window).toBeNull();
		expect(plan.sourceRatios.trimStartRatio).toBe(0);
		expect(plan.sourceRatios.trimEndRatio).toBe(0);
	});

	test("window ratios always stay inside [0, 1]", () => {
		// Ragged offsets: the padding must never come out negative, and the
		// window must always cover the clip it was derived from.
		for (const trimStart of [0, 0.13, 1, 7.77, 59.9]) {
			for (const clipSeconds of [0.5, 1, 3.33, 12]) {
				const plan = resolveDecodePlan({
					trimStartTicks: secondsToTicks(trimStart),
					trimEndTicks: secondsToTicks(3600 - trimStart - clipSeconds),
					sourceDurationTicks: secondsToTicks(3600),
				});
				expect(plan.sourceRatios.trimStartRatio).toBeGreaterThanOrEqual(0);
				expect(plan.sourceRatios.trimStartRatio).toBeLessThanOrEqual(1);
				expect(plan.sourceRatios.trimEndRatio).toBeGreaterThanOrEqual(0);
				expect(plan.sourceRatios.trimEndRatio).toBeLessThanOrEqual(1);
				expect(plan.windowRatios.trimStartRatio).toBeGreaterThanOrEqual(0);
				expect(plan.windowRatios.trimStartRatio).toBeLessThanOrEqual(1);
				expect(plan.windowRatios.trimEndRatio).toBeGreaterThanOrEqual(0);
				expect(plan.windowRatios.trimEndRatio).toBeLessThanOrEqual(1);
				if (!plan.window) continue;
				expect(plan.window.startSeconds).toBeLessThanOrEqual(trimStart + 1e-9);
				expect(
					plan.window.startSeconds + plan.window.durationSeconds,
				).toBeGreaterThanOrEqual(trimStart + clipSeconds - 1e-9);
			}
		}
	});

	test("the windowed mapping lands on the same source samples as the whole-source one", () => {
		const sampleRate = 48000;
		const sourceSeconds = 3600;
		const trimStartSeconds = 123.4;
		const clipSeconds = 4;
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(trimStartSeconds),
			trimEndTicks: secondsToTicks(
				sourceSeconds - trimStartSeconds - clipSeconds,
			),
			sourceDurationTicks: secondsToTicks(sourceSeconds),
		});
		expect(plan.window).not.toBeNull();

		// Model A: the pre-window path — one buffer holding the whole source,
		// trimmed by the clip's fractions of the source duration.
		const wholeLength = sourceSeconds * sampleRate;
		const wholeRatios = computeSourceTrimRatios({
			trimStartTicks: secondsToTicks(trimStartSeconds),
			trimEndTicks: secondsToTicks(
				sourceSeconds - trimStartSeconds - clipSeconds,
			),
			sourceDurationTicks: secondsToTicks(sourceSeconds),
		});
		const wholeStart = wholeRatios.trimStartRatio * wholeLength;
		const wholeRange =
			wholeLength -
			wholeRatios.trimStartRatio * wholeLength -
			wholeRatios.trimEndRatio * wholeLength;

		// Model B: the windowed path — the buffer IS the window, so the ratios
		// are the padding inside it.
		const windowSeconds = plan.window?.durationSeconds ?? 0;
		const windowLength = windowSeconds * sampleRate;
		const windowStart = plan.windowRatios.trimStartRatio * windowLength;
		const windowRange =
			windowLength -
			plan.windowRatios.trimStartRatio * windowLength -
			plan.windowRatios.trimEndRatio * windowLength;

		for (const fraction of [0, 0.25, 0.5, 0.999, 1]) {
			const wholeTime = (wholeStart + fraction * wholeRange) / sampleRate;
			const windowedTime =
				(plan.window?.startSeconds ?? 0) +
				(windowStart + fraction * windowRange) / sampleRate;
			expect(windowedTime).toBeCloseTo(wholeTime, 6);
		}
		// The windowed range is the clip, not the file.
		expect(windowRange / sampleRate).toBeCloseTo(clipSeconds, 6);
	});
});

describe("getCacheKey", () => {
	test("is stable for the same source and window", () => {
		const file = makeVideoFile("clip.mp4");
		const window = { startSeconds: 10, durationSeconds: 4 };
		expect(getCacheKey(undefined, file, window)).toBe(
			getCacheKey(undefined, file, window),
		);
	});

	test("separates the trim windows of one file", () => {
		const file = makeVideoFile("clip.mp4");
		const first = getCacheKey(undefined, file, {
			startSeconds: 10,
			durationSeconds: 4,
		});
		const second = getCacheKey(undefined, file, {
			startSeconds: 20,
			durationSeconds: 4,
		});
		const longer = getCacheKey(undefined, file, {
			startSeconds: 10,
			durationSeconds: 8,
		});
		expect(new Set([first, second, longer]).size).toBe(3);
	});

	test("an unwindowed key is the plain source identity", () => {
		const file = makeVideoFile("clip.mp4");
		expect(getCacheKey(undefined, file, null)).toBe(
			`file:clip.mp4:8:${file.lastModified}`,
		);
		expect(getCacheKey(undefined, undefined)).toBe("");
	});
});

describe("getCachedPeaks", () => {
	test("reuses the peaks of a buffer it has already walked", async () => {
		const buffer = makeAudioBuffer({ length: 512 });
		const first = getCachedPeaks(buffer);
		// Identity, not just equality: a second walk would be a second O(n) pass.
		expect(getCachedPeaks(buffer)).toBe(first);

		const other = makeAudioBuffer({ length: 512 });
		expect(getCachedPeaks(other)).not.toBe(first);
		await first;
	});

	test("reduces a buffer to one averaged peak per block", async () => {
		const peaks = await getCachedPeaks(
			makeAudioBuffer({
				length: 512,
				channels: [{ fill: 0.5 }, { fill: 0.1 }],
			}),
		);
		expect(peaks.bufferLength).toBe(512);
		// 2 blocks of 256; each is the mean of the per-channel maxima.
		expect(peaks.peakBuffer.length).toBe(2);
		expect(peaks.peakBuffer[0]).toBeCloseTo(0.3, 6);
		expect(peaks.peakBuffer[1]).toBeCloseTo(0.3, 6);
		expect(peaks.globalPeak).toBeCloseTo(0.3, 6);
	});

	test("a silent buffer still reports a usable global peak", async () => {
		const peaks = await getCachedPeaks(
			makeAudioBuffer({ length: 256, channels: [{ fill: 0 }] }),
		);
		expect(peaks.globalPeak).toBe(0.01);
	});
});

describe("decodeAndCache", () => {
	test("asks the decoder for the clip's window and stamps window-relative ratios", async () => {
		const file = makeVideoFile("windowed.mp4");
		decodeCalls.length = 0;
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(10),
			trimEndTicks: secondsToTicks(20),
			sourceDurationTicks: secondsToTicks(30),
		});
		const key = getCacheKey(undefined, file, plan.window);

		const peaks = await decodeAndCache({
			cacheKey: key,
			audioUrl: undefined,
			mediaFile: file,
			plan,
		});

		expect(decodeCalls).toHaveLength(1);
		expect(decodeCalls[0]?.trimStartSeconds).toBe(plan.window?.startSeconds);
		expect(decodeCalls[0]?.durationSeconds).toBe(plan.window?.durationSeconds);
		// The buffer IS the window, so it carries the window's padding ratios.
		expect(peaks.trimStartRatio).toBe(plan.windowRatios.trimStartRatio);
		expect(peaks.trimEndRatio).toBe(plan.windowRatios.trimEndRatio);
		expect(peaks.peakBuffer.length).toBeGreaterThan(0);
	});

	test("a window planned for a URL-only source keeps the source ratios", async () => {
		// No File to window, so the URL path decodes the whole thing — the
		// ratios must describe that buffer, not the unused window.
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(10),
			trimEndTicks: secondsToTicks(16),
			sourceDurationTicks: secondsToTicks(30),
		});
		expect(plan.window).not.toBeNull();
		const url = "blob:library-audio";
		decodeCalls.length = 0;
		const peaks = await decodeAndCache({
			cacheKey: getCacheKey(url, undefined, plan.window),
			audioUrl: url,
			mediaFile: undefined,
			plan,
		});
		expect(decodeCalls).toHaveLength(0);
		expect(peaks.trimStartRatio).toBe(plan.sourceRatios.trimStartRatio);
		expect(peaks.trimEndRatio).toBe(plan.sourceRatios.trimEndRatio);
	});

	test("an unwindowed clip still decodes with the source trim ratios", async () => {
		const file = makeVideoFile("whole.mp4");
		decodeCalls.length = 0;
		const plan = resolveDecodePlan({
			trimStartTicks: secondsToTicks(4),
			trimEndTicks: secondsToTicks(4),
			sourceDurationTicks: secondsToTicks(8),
		});
		expect(plan.window).toBeNull();

		const peaks = await decodeAndCache({
			cacheKey: getCacheKey(undefined, file, plan.window),
			audioUrl: undefined,
			mediaFile: file,
			plan,
		});

		expect(decodeCalls).toHaveLength(1);
		expect(decodeCalls[0]?.trimStartSeconds).toBeUndefined();
		expect(decodeCalls[0]?.durationSeconds).toBeUndefined();
		expect(peaks.trimStartRatio).toBe(0.5);
		expect(peaks.trimEndRatio).toBe(0.5);
	});

	test("two clips of one file share a decode only when their windows match", async () => {
		const file = makeVideoFile("shared.mp4");
		const planA = resolveDecodePlan({
			trimStartTicks: secondsToTicks(0),
			trimEndTicks: secondsToTicks(86),
			sourceDurationTicks: secondsToTicks(90),
		});
		const planB = resolveDecodePlan({
			trimStartTicks: secondsToTicks(4),
			trimEndTicks: secondsToTicks(82),
			sourceDurationTicks: secondsToTicks(90),
		});
		decodeCalls.length = 0;

		await Promise.all([
			decodeAndCache({
				cacheKey: getCacheKey(undefined, file, planA.window),
				audioUrl: undefined,
				mediaFile: file,
				plan: planA,
			}),
			decodeAndCache({
				cacheKey: getCacheKey(undefined, file, planA.window),
				audioUrl: undefined,
				mediaFile: file,
				plan: planA,
			}),
		]);
		expect(decodeCalls).toHaveLength(1);

		await decodeAndCache({
			cacheKey: getCacheKey(undefined, file, planB.window),
			audioUrl: undefined,
			mediaFile: file,
			plan: planB,
		});
		// A different window is a different decode — the cache cannot hand back
		// the wrong slice of audio.
		expect(decodeCalls).toHaveLength(2);
	});

	test("the byte budget evicts the oldest entry and keeps the newest", async () => {
		const oldFile = makeVideoFile("old.mp4");
		const newFile = makeVideoFile("new.mp4");
		const plan = resolveDecodePlan({ sourceDurationTicks: secondsToTicks(30) });
		decodeCalls.length = 0;

		const oldKey = getCacheKey(undefined, oldFile, plan.window);
		const newKey = getCacheKey(undefined, newFile, plan.window);
		await decodeAndCache({
			cacheKey: oldKey,
			audioUrl: undefined,
			mediaFile: oldFile,
			plan,
		});
		await decodeAndCache({
			cacheKey: newKey,
			audioUrl: undefined,
			mediaFile: newFile,
			plan,
		});
		expect(decodeCalls).toHaveLength(2);

		// Squeeze the budget below what the two entries hold.
		evictDecodeCacheToBudget({ budgetBytes: 0 });

		// The newest entry survived, so re-reading it costs no decode.
		await decodeAndCache({
			cacheKey: newKey,
			audioUrl: undefined,
			mediaFile: newFile,
			plan,
		});
		expect(decodeCalls).toHaveLength(2);

		// The evicted one is re-decoded on demand — cache, not source of truth.
		await decodeAndCache({
			cacheKey: oldKey,
			audioUrl: undefined,
			mediaFile: oldFile,
			plan,
		});
		expect(decodeCalls).toHaveLength(3);
	});

	test("an entry larger than the whole budget is never dropped", async () => {
		const file = makeVideoFile("huge.mp4");
		const plan = resolveDecodePlan({ sourceDurationTicks: secondsToTicks(30) });
		const key = getCacheKey(undefined, file, plan.window);
		await decodeAndCache({
			cacheKey: key,
			audioUrl: undefined,
			mediaFile: file,
			plan,
		});
		decodeCalls.length = 0;

		evictDecodeCacheToBudget({ budgetBytes: 0 });
		await decodeAndCache({
			cacheKey: key,
			audioUrl: undefined,
			mediaFile: file,
			plan,
		});
		// Dropping it would mean re-decoding on every single mount.
		expect(decodeCalls).toHaveLength(0);
	});
});
