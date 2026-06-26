/**
 * Client-side style extractor. The goal is to give the LLM enough signal
 * to imitate a reference edit without uploading the actual video to a
 * server — everything below runs in the browser via Web APIs only.
 *
 * Pipeline:
 *   1. Decode a frame sampler from the file (HTMLVideoElement + captureStream
 *      fallback) at ~1 fps.
 *   2. For every frame, compute:
 *        - average per-pixel luma delta vs the previous frame to find cuts.
 *        - a coarse 4x4 color histogram for dominant-color extraction.
 *   3. From the cut timestamps, compute cpm / avg shot length.
 *   4. Sample the audio (when available) for beat-tempo estimation.
 *
 * The implementation is intentionally tolerant: missing APIs, codecs the
 * browser can't decode, or files under 1s are all reported as
 * "best-effort" partial profiles. The AI just sees `notes: [...]` and
 * the partial numbers and adapts.
 *
 * Heavy lifting is delegated to small async helpers so the caller can
 * stream progress updates through the chat UI.
 */

import { EMPTY_STYLE_PROFILE, type StyleProfile } from "./extractor";

const TICKS_PER_SECOND = 120_000;
const SAMPLE_FPS = 1;
const MAX_SAMPLES = 600; // 10 minutes at 1 fps
const COLOR_BUCKETS = 16; // 4x4x4 RGB cube
const ENERGY_BUCKETS = 32;

export interface ExtractorProgress {
	stage: "loading" | "sampling" | "analyzing" | "audio" | "done" | "error";
	progress: number; // 0..1
	message?: string;
}

export async function extractStyle({
	file,
	onProgress,
}: {
	file: File;
	onProgress?: (p: ExtractorProgress) => void;
}): Promise<StyleProfile> {
	const report = (p: ExtractorProgress) => onProgress?.(p);

	try {
		report({ stage: "loading", progress: 0.05, message: "Decoding video" });

		const video = document.createElement("video");
		video.muted = true;
		video.playsInline = true;
		video.preload = "auto";
		const url = URL.createObjectURL(file);
		// Blob URLs from URL.createObjectURL are same-origin and only
		// decode the media container of the user-selected File — they
		// cannot carry HTML/script payloads. The explicit `blob:`
		// prefix check guards against any future code path that might
		// pass a non-blob URL through here.
		if (!url.startsWith("blob:")) {
			throw new Error("Refusing to load non-blob URL into video element");
		}
		video.src = url;

		await new Promise<void>((resolve, reject) => {
			const onLoaded = () => resolve();
			const onError = () =>
				reject(new Error("Could not decode the video file."));
			video.addEventListener("loadedmetadata", onLoaded, { once: true });
			video.addEventListener("error", onError, { once: true });
			// Safety timeout for exotic codecs.
			setTimeout(() => reject(new Error("Decoder timed out")), 15_000);
		});

		const duration = Math.max(0, video.duration);
		if (duration === 0) {
			URL.revokeObjectURL(url);
			report({ stage: "error", progress: 1, message: "Empty video" });
			return { ...EMPTY_STYLE_PROFILE, notes: ["Empty video."] };
		}

		report({ stage: "sampling", progress: 0.15, message: "Sampling frames" });

		const width = Math.min(160, video.videoWidth);
		const height = Math.min(90, video.videoHeight);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) {
			URL.revokeObjectURL(url);
			report({ stage: "error", progress: 1, message: "No 2D context" });
			return { ...EMPTY_STYLE_PROFILE, notes: ["Browser lacks 2D canvas."] };
		}

		const sampleCount = Math.min(
			MAX_SAMPLES,
			Math.max(1, Math.floor(duration * SAMPLE_FPS)),
		);
		const dt = duration / sampleCount;

		const samples: Uint8ClampedArray[] = [];
		const luma: number[] = [];
		let _prevLuma: number | null = null;
		const colorHist = new Array<number>(
			COLOR_BUCKETS * COLOR_BUCKETS * COLOR_BUCKETS,
		).fill(0);

		for (let i = 0; i < sampleCount; i++) {
			const t = (i + 0.5) * dt;
			await seekVideo(video, t);
			ctx.drawImage(video, 0, 0, width, height);
			const data = ctx.getImageData(0, 0, width, height).data;
			samples.push(data);

			let lumaSum = 0;
			for (let p = 0; p < data.length; p += 4) {
				const r = data[p];
				const g = data[p + 1];
				const b = data[p + 2];
				// Rec. 709 luma.
				lumaSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
				const ri = Math.min(
					COLOR_BUCKETS - 1,
					Math.floor((r / 256) * COLOR_BUCKETS),
				);
				const gi = Math.min(
					COLOR_BUCKETS - 1,
					Math.floor((g / 256) * COLOR_BUCKETS),
				);
				const bi = Math.min(
					COLOR_BUCKETS - 1,
					Math.floor((b / 256) * COLOR_BUCKETS),
				);
				colorHist[
					ri * COLOR_BUCKETS * COLOR_BUCKETS + gi * COLOR_BUCKETS + bi
				]++;
			}
			const avgLuma = lumaSum / (width * height);
			luma.push(avgLuma);
			_prevLuma = avgLuma;

			if (i % 10 === 0) {
				report({
					stage: "sampling",
					progress: 0.15 + (i / sampleCount) * 0.6,
					message: `Sampled ${i + 1}/${sampleCount} frames`,
				});
			}
		}

		URL.revokeObjectURL(url);

		report({ stage: "analyzing", progress: 0.8, message: "Detecting cuts" });

		/* ---------- Cut detection: per-frame luma delta ---------- */
		const cutTimestamps: number[] = [];
		let totalMotion = 0;
		for (let i = 1; i < luma.length; i++) {
			const delta = Math.abs(luma[i] - luma[i - 1]);
			// 18 / 255 is the rough threshold where a human reads a "cut".
			if (delta > 18) {
				cutTimestamps.push(i * dt);
			}
			// Also accumulate sub-cut motion to score overall energy.
			totalMotion += Math.min(40, delta);
		}
		const motionIntensity = Math.min(1, totalMotion / (luma.length * 20));

		const cutFrequency =
			duration > 0 ? (cutTimestamps.length / duration) * 60 : 0;
		const avgShotLength =
			cutTimestamps.length > 0 ? duration / cutTimestamps.length : duration;

		/* ---------- Dominant colors: top 4 buckets of the histogram ---------- */
		const indexed = colorHist
			.map((count, i) => ({ count, i }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 4);
		const dominantColors = indexed.map(({ i }) => {
			const r = Math.floor(
				((i >> 8) & (COLOR_BUCKETS - 1)) * (256 / COLOR_BUCKETS),
			);
			const g = Math.floor(
				((i >> 4) & (COLOR_BUCKETS - 1)) * (256 / COLOR_BUCKETS),
			);
			const b = Math.floor((i & (COLOR_BUCKETS - 1)) * (256 / COLOR_BUCKETS));
			return `#${[r, g, b]
				.map((v) => v.toString(16).padStart(2, "0"))
				.join("")}`;
		});

		/* ---------- Energy curve: bucket average luma deltas ---------- */
		const energyCurve = new Array<number>(ENERGY_BUCKETS).fill(0);
		const energyCounts = new Array<number>(ENERGY_BUCKETS).fill(0);
		for (let i = 1; i < luma.length; i++) {
			const bucket = Math.min(
				ENERGY_BUCKETS - 1,
				Math.floor((i / luma.length) * ENERGY_BUCKETS),
			);
			energyCurve[bucket] += Math.abs(luma[i] - luma[i - 1]);
			energyCounts[bucket]++;
		}
		for (let i = 0; i < ENERGY_BUCKETS; i++) {
			energyCurve[i] =
				energyCounts[i] > 0 ? energyCurve[i] / energyCounts[i] : 0;
		}
		const maxE = Math.max(...energyCurve, 1);
		for (let i = 0; i < ENERGY_BUCKETS; i++) energyCurve[i] /= maxE;

		report({ stage: "audio", progress: 0.92, message: "Estimating tempo" });

		/* ---------- Audio tempo (best-effort) ---------- */
		const audioTempo = await estimateTempo(file);

		/* ---------- Notes ---------- */
		const notes: string[] = [];
		if (cutFrequency > 90)
			notes.push("Fast-paced: lots of cuts (music-video / action).");
		else if (cutFrequency > 40)
			notes.push("Moderate pacing, good for vlogs / promo.");
		else if (cutFrequency > 10)
			notes.push("Slow, contemplative — good for narrative / doc.");
		else notes.push("Very few cuts: long static takes.");

		if (motionIntensity > 0.6)
			notes.push("High on-screen motion — match with quick keyframes.");
		else if (motionIntensity < 0.2)
			notes.push("Mostly still shots — slow easing reads better.");
		if (audioTempo > 0)
			notes.push(
				`Audio tempo ~${Math.round(audioTempo)} BPM — beat-sync cuts welcome.`,
			);
		if (dominantColors[0])
			notes.push(
				`Dominant palette leans on ${dominantColors.slice(0, 2).join(" / ")}.`,
			);

		const cutRatio = Math.min(1, cutFrequency / 120);
		const fadeRatio = Math.max(0, 0.3 - motionIntensity * 0.4);
		const wipeRatio = Math.max(0, motionIntensity * 0.4 - 0.2);

		report({ stage: "done", progress: 1 });

		return {
			duration: Math.round(duration * TICKS_PER_SECOND),
			cutFrequency,
			avgShotLength: Math.round(avgShotLength * TICKS_PER_SECOND),
			motionIntensity,
			audioTempo,
			dominantColors,
			energyCurve,
			transitionHints: { cutRatio, fadeRatio, wipeRatio },
			notes,
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Unknown extractor error";
		report({ stage: "error", progress: 1, message });
		return {
			...EMPTY_STYLE_PROFILE,
			notes: [`Extractor failed: ${message}`],
		};
	}
}

/* -------------------------------------------------------------------------- */
/*                              Internal helpers                             */
/* -------------------------------------------------------------------------- */

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
	return new Promise((resolve) => {
		const handler = () => {
			video.removeEventListener("seeked", handler);
			resolve();
		};
		video.addEventListener("seeked", handler, { once: true });
		// Some browsers (Safari) need the tiny epsilon or they no-op the seek.
		video.currentTime = Math.min(video.duration - 0.001, Math.max(0, time));
	});
}

/**
 * Best-effort BPM estimate by decoding the audio with the Web Audio API
 * and running a simple autocorrelation on the downmixed mono signal.
 *
 * Returns 0 when audio can't be decoded. The function is forgiving — it
 * only fails on real errors, never on "no music detected".
 */
async function estimateTempo(file: File): Promise<number> {
	try {
		const arrayBuffer = await file.arrayBuffer();
		const ctx = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext
		)();
		const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
		await ctx.close();

		// Mix to mono.
		const channels = audioBuffer.numberOfChannels;
		const length = audioBuffer.length;
		const mono = new Float32Array(length);
		for (let c = 0; c < channels; c++) {
			const data = audioBuffer.getChannelData(c);
			for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
		}

		// Autocorrelation: try BPMs in 60..180 range.
		const sampleRate = audioBuffer.sampleRate;
		const minBpm = 60;
		const maxBpm = 180;
		let bestBpm = 0;
		let bestScore = 0;
		for (let bpm = minBpm; bpm <= maxBpm; bpm++) {
			const lag = Math.round((60 / bpm) * sampleRate);
			let sum = 0;
			for (let i = 0; i < length - lag; i += 64) {
				sum += mono[i] * mono[i + lag];
			}
			if (sum > bestScore) {
				bestScore = sum;
				bestBpm = bpm;
			}
		}
		return bestBpm;
	} catch {
		return 0;
	}
}
