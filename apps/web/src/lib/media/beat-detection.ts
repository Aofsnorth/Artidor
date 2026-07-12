/**
 * Beat detection — energy-based onset detection with adaptive thresholding.
 *
 * Two entry points:
 *  - `detectBeats` (synchronous) — for tests and short clips. Runs on
 *    the main thread. Do NOT call this for long audio files.
 *  - `detectBeatsAsync` (async) — delegates to a Web Worker so the UI
 *    never freezes. Returns a promise that resolves with the detected
 *    beats. Supports progress callbacks and cancellation.
 *
 * The algorithm runs entirely off the main thread in the worker:
 *  1. Compute RMS energy in overlapping windows
 *  2. Find local maxima above average energy * threshold ratio
 *  3. Filter by minimum beat gap to avoid duplicates
 */

import { TICKS_PER_SECOND } from "@/lib/wasm";
import type {
	BeatDetectionOptions,
	DetectedBeat,
} from "./beat-detection-types";
import type { WorkerRequest, WorkerResponse } from "./beat-detection-worker";

export type {
	BeatDetectionOptions,
	DetectedBeat,
} from "./beat-detection-types";

const DEFAULT_OPTIONS: Required<BeatDetectionOptions> = {
	minBpm: 60,
	maxBpm: 180,
	thresholdRatio: 1.35,
	minBeatGapMs: 200,
};

/**
 * Synchronous beat detection — for tests and short clips only.
 * Do NOT call this on the main thread for long audio files;
 * use {@link detectBeatsAsync} instead.
 */
export function detectBeats({
	samples,
	sampleRate,
	options = {},
}: {
	samples: Float32Array;
	sampleRate: number;
	options?: BeatDetectionOptions;
}): DetectedBeat[] {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	if (samples.length === 0 || sampleRate <= 0) return [];

	const windowSize = Math.max(256, Math.floor(sampleRate * 0.02));
	const hopSize = Math.max(64, Math.floor(windowSize / 2));
	const totalHops = Math.ceil((samples.length - windowSize) / hopSize);
	const energies = new Float32Array(totalHops);

	for (
		let i = 0, hop = 0;
		i < samples.length - windowSize;
		i += hopSize, hop++
	) {
		let sum = 0;
		for (let j = 0; j < windowSize; j++) {
			const sample = samples[i + j];
			sum += sample * sample;
		}
		energies[hop] = Math.sqrt(sum / windowSize);
	}

	if (energies.length === 0) return [];

	const minGapSamples = Math.floor(
		(opts.minBeatGapMs / 1000) * (sampleRate / hopSize),
	);
	const threshold = average(energies) * opts.thresholdRatio;

	const beats: DetectedBeat[] = [];
	let lastIndex = -minGapSamples;

	for (let i = 1; i < energies.length - 1; i++) {
		const e = energies[i] ?? 0;
		const prev = energies[i - 1] ?? 0;
		const next = energies[i + 1] ?? 0;
		if (e < threshold) continue;
		if (e <= prev || e < next) continue;
		if (i - lastIndex < minGapSamples) continue;

		const timeSeconds = (i * hopSize) / sampleRate;
		beats.push({
			timeSeconds,
			ticks: Math.round(timeSeconds * TICKS_PER_SECOND),
			energy: e,
		});
		lastIndex = i;
	}

	return beats;
}

// ---------------------------------------------------------------------------
// Web Worker pool — a single reusable worker for all beat detection calls.
// Created lazily on first use, terminated on page unload.
// ---------------------------------------------------------------------------

let worker: Worker | null = null;

function getWorker(): Worker {
	if (worker) return worker;
	worker = new Worker(new URL("./beat-detection-worker.ts", import.meta.url), {
		type: "module",
	});
	// Terminate the singleton worker when the page is unloaded to avoid
	// leaking it in environments where the page lifecycle is extended
	// (e.g. bfcache, Tauri webview).
	if (typeof window !== "undefined") {
		window.addEventListener("pagehide", () => terminateBeatWorker(), {
			once: true,
		});
	}
	return worker;
}

/**
 * Terminate the singleton beat-detection worker and release its resources.
 * Safe to call multiple times. The worker will be recreated on next use.
 */
export function terminateBeatWorker(): void {
	if (worker) {
		worker.terminate();
		worker = null;
	}
}

/**
 * Async beat detection via Web Worker. Runs the entire algorithm off
 * the main thread so the UI never freezes — no setTimeout yields, no
 * chunked processing, no jank. The worker posts progress updates
 * (0..1) during computation.
 *
 * The samples Float32Array is **transferred** (not copied) to the
 * worker for zero-copy efficiency. The caller should not use the
 * samples array after calling this.
 *
 * @param onProgress Optional callback receiving progress (0..1).
 * @param signal Optional AbortSignal for cancellation.
 */
export async function detectBeatsAsync({
	samples,
	sampleRate,
	options = {},
	onProgress,
	signal,
}: {
	samples: Float32Array;
	sampleRate: number;
	options?: BeatDetectionOptions;
	onProgress?: (progress: number) => void;
	signal?: AbortSignal;
}): Promise<DetectedBeat[]> {
	if (samples.length === 0 || sampleRate <= 0) return [];

	const w = getWorker();

	return new Promise<DetectedBeat[]>((resolve, reject) => {
		let settled = false;

		const handleMessage = (event: MessageEvent<WorkerResponse>) => {
			const response = event.data;
			switch (response.type) {
				case "progress":
					onProgress?.(response.progress);
					break;
				case "complete":
					cleanup();
					settled = true;
					resolve(response.beats);
					break;
				case "error":
					cleanup();
					settled = true;
					reject(new Error(response.error));
					break;
				case "cancelled":
					cleanup();
					settled = true;
					reject(new DOMException("Beat detection cancelled", "AbortError"));
					break;
			}
		};

		const handleAbort = () => {
			if (settled) return;
			w.postMessage({ type: "cancel" } satisfies WorkerRequest);
		};

		function cleanup(): void {
			w.removeEventListener("message", handleMessage);
			signal?.removeEventListener("abort", handleAbort);
		}

		w.addEventListener("message", handleMessage);
		signal?.addEventListener("abort", handleAbort);

		// Transfer the samples buffer for zero-copy efficiency.
		w.postMessage(
			{
				type: "detect",
				samples,
				sampleRate,
				options,
			} satisfies WorkerRequest,
			[samples.buffer],
		);
	});
}

function average(values: ArrayLike<number>): number {
	if (values.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}
	return sum / values.length;
}
