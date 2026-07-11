/**
 * Web Worker for beat detection — runs the entire algorithm off the
 * main thread so the UI never freezes, even for long audio files.
 *
 * The worker receives raw PCM samples (Float32Array, transferred) and
 * returns detected beats. It posts progress updates during computation
 * so the UI can show a progress bar.
 *
 * Algorithm: energy-based onset detection with adaptive thresholding.
 *  1. Compute RMS energy in overlapping windows
 *  2. Find local maxima above average energy * threshold ratio
 *  3. Filter by minimum beat gap to avoid duplicates
 */

/// <reference lib="webworker" />

import { secondsToBeatTicks } from "./beat-time";
import type {
	BeatDetectionOptions,
	DetectedBeat,
} from "./beat-detection-types";

const DEFAULT_OPTIONS: Required<BeatDetectionOptions> = {
	minBpm: 60,
	maxBpm: 180,
	thresholdRatio: 1.35,
	minBeatGapMs: 200,
};

export type WorkerRequest =
	| {
			type: "detect";
			samples: Float32Array;
			sampleRate: number;
			options?: BeatDetectionOptions;
	  }
	| { type: "cancel" };

export type WorkerResponse =
	| { type: "progress"; progress: number }
	| { type: "complete"; beats: DetectedBeat[] }
	| { type: "error"; error: string }
	| { type: "cancelled" };

let cancelled = false;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const message = event.data;
	switch (message.type) {
		case "detect":
			cancelled = false;
			handleDetect({
				samples: message.samples,
				sampleRate: message.sampleRate,
				options: message.options,
			});
			break;
		case "cancel":
			cancelled = true;
			self.postMessage({ type: "cancelled" } satisfies WorkerResponse);
			break;
	}
};

function postProgress(progress: number): void {
	if (cancelled) return;
	self.postMessage({ type: "progress", progress } satisfies WorkerResponse);
}

function handleDetect({
	samples,
	sampleRate,
	options = {},
}: {
	samples: Float32Array;
	sampleRate: number;
	options?: BeatDetectionOptions;
}): void {
	try {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		if (samples.length === 0 || sampleRate <= 0) {
			self.postMessage({
				type: "complete",
				beats: [],
			} satisfies WorkerResponse);
			return;
		}

		const windowSize = Math.max(256, Math.floor(sampleRate * 0.02));
		const hopSize = Math.max(64, Math.floor(windowSize / 2));
		const totalHops = Math.ceil((samples.length - windowSize) / hopSize);
		const energies: number[] = new Array(totalHops);

		// Phase 1: Energy computation (the expensive part)
		for (
			let i = 0, hop = 0;
			i < samples.length - windowSize;
			i += hopSize, hop++
		) {
			if (cancelled) return;
			let sum = 0;
			for (let j = 0; j < windowSize; j++) {
				const sample = samples[i + j] ?? 0;
				sum += sample * sample;
			}
			energies[hop] = Math.sqrt(sum / windowSize);

			// Post progress every 5% to avoid flooding the main thread
			if (hop % Math.max(1, Math.floor(totalHops / 20)) === 0) {
				postProgress((hop / totalHops) * 0.7);
			}
		}

		if (cancelled) return;

		// Phase 2: Peak picking (fast)
		const minGapSamples = Math.floor(
			(opts.minBeatGapMs / 1000) * (sampleRate / hopSize),
		);
		const threshold = average(energies) * opts.thresholdRatio;

		const beats: DetectedBeat[] = [];
		let lastIndex = -minGapSamples;

		for (let i = 1; i < energies.length - 1; i++) {
			if (cancelled) return;
			const e = energies[i] ?? 0;
			const prev = energies[i - 1] ?? 0;
			const next = energies[i + 1] ?? 0;
			if (e < threshold) continue;
			if (e <= prev || e < next) continue;
			if (i - lastIndex < minGapSamples) continue;

			const timeSeconds = (i * hopSize) / sampleRate;
			beats.push({
				timeSeconds,
				ticks: secondsToBeatTicks(timeSeconds),
				energy: e,
			});
			lastIndex = i;
		}

		postProgress(1);
		self.postMessage({ type: "complete", beats } satisfies WorkerResponse);
	} catch (err) {
		self.postMessage({
			type: "error",
			error: err instanceof Error ? err.message : "Beat detection failed",
		} satisfies WorkerResponse);
	}
}

function average(values: number[]): number {
	if (values.length === 0) return 0;
	let sum = 0;
	for (const v of values) sum += v;
	return sum / values.length;
}
