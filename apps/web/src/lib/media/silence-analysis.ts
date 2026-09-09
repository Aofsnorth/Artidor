/**
 * Silence detection ported from DonkeyCut's detect_silence defaults
 * (Apache 2.0, github.com/DonkeyCut/Donkey): scan an audio clip's RMS level
 * in short windows and return the runs that sit under the threshold for at
 * least the minimum silence duration. Decoding reuses the shared
 * `decodeAudioToFloat32` path (AudioContext mixdown to mono).
 */

import { decodeAudioToFloat32 } from "./audio";

export interface SilenceInterval {
	/** Silence start, in seconds from the clip's trimmed start. */
	startSeconds: number;
	/** Silence end, in seconds from the clip's trimmed start. */
	endSeconds: number;
	/** Length of the quiet run in seconds. */
	durationSeconds: number;
}

export interface DetectSilenceOptions {
	/** Quiet threshold in dB (0 = loudest). Default -30, as in DonkeyCut. */
	thresholdDb?: number;
	/** Minimum quiet run to report, in seconds. Default 0.35. */
	minSilenceSeconds?: number;
	/** Analysis window length, in seconds. Default 0.02 (20ms). */
	windowSeconds?: number;
}

export interface DetectSilenceResult {
	intervals: SilenceInterval[];
	/** Total seconds under the threshold. */
	totalSilenceSeconds: number;
}

/** Convert dBFS to a linear amplitude threshold. */
export function dbToLinearAmplitude(db: number): number {
	return 10 ** (db / 20);
}

/**
 * Find quiet runs in decoded mono samples. Exposed separately so tests can
 * feed synthetic buffers without touching WebAudio.
 */
export function findSilenceIntervals({
	samples,
	sampleRate,
	thresholdDb = -30,
	minSilenceSeconds = 0.35,
	windowSeconds = 0.02,
}: {
	samples: Float32Array;
	sampleRate: number;
	thresholdDb?: number;
	minSilenceSeconds?: number;
	windowSeconds?: number;
}): SilenceInterval[] {
	const windowSize = Math.max(1, Math.round(windowSeconds * sampleRate));
	const threshold = dbToLinearAmplitude(thresholdDb);
	const intervals: SilenceInterval[] = [];

	let quietStart: number | null = null;

	const closeRun = (endSample: number) => {
		if (quietStart === null) return;
		const startSeconds = quietStart / sampleRate;
		const endSeconds = endSample / sampleRate;
		const duration = endSeconds - startSeconds;
		if (duration >= minSilenceSeconds) {
			intervals.push({
				startSeconds,
				endSeconds,
				durationSeconds: duration,
			});
		}
		quietStart = null;
	};

	for (let start = 0; start < samples.length; start += windowSize) {
		const end = Math.min(start + windowSize, samples.length);
		let sumSquares = 0;
		for (let i = start; i < end; i++) {
			sumSquares += samples[i] * samples[i];
		}
		const rms = Math.sqrt(sumSquares / Math.max(1, end - start));

		if (rms < threshold) {
			if (quietStart === null) quietStart = start;
		} else {
			closeRun(end);
		}
	}
	closeRun(samples.length);

	return intervals;
}

/**
 * Decode a media file's audio (with optional trim window, in seconds) and
 * report every quiet run under the threshold.
 */
export async function detectSilence({
	file,
	trimStartSeconds = 0,
	durationSeconds,
	thresholdDb = -30,
	minSilenceSeconds = 0.35,
}: {
	file: Blob;
	trimStartSeconds?: number;
	/** Clip length in seconds; omit to analyze to the end of the file. */
	durationSeconds?: number;
	thresholdDb?: number;
	minSilenceSeconds?: number;
}): Promise<DetectSilenceResult> {
	const { samples, sampleRate } = await decodeAudioToFloat32({
		audioBlob: file,
		sampleRate: 8000,
	});

	const startSample = Math.max(
		0,
		Math.min(samples.length, Math.round(trimStartSeconds * sampleRate)),
	);
	const endSample =
		durationSeconds === undefined
			? samples.length
			: Math.min(
					samples.length,
					startSample + Math.round(durationSeconds * sampleRate),
				);
	const clip = samples.subarray(startSample, endSample);

	const intervals = findSilenceIntervals({
		samples: clip,
		sampleRate,
		thresholdDb,
		minSilenceSeconds,
	});

	const totalSilenceSeconds = intervals.reduce(
		(total, interval) => total + interval.durationSeconds,
		0,
	);

	return { intervals, totalSilenceSeconds };
}
