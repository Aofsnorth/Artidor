/**
 * Full-pipeline beat analysis worker.
 *
 * Receives a File + trim info, does EVERYTHING off the main thread:
 *  1. Decode audio via AudioContext.decodeAudioData (available in workers)
 *  2. Trim to clip range
 *  3. Mix down to mono at target sample rate
 *  4. Run beat detection algorithm
 *  5. Post progress + return beats
 *
 * This replaces the old 3-step main-thread pipeline:
 *  extractClipAudio (mediabunny, main thread) →
 *  decodeAudioToFloat32 (AudioContext, main thread) →
 *  detectBeatsAsync (worker)
 *
 * The old pipeline froze the UI during steps 1-2 even with yielding,
 * because the decode internals are synchronous and heavy.
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

export type BeatAnalysisRequest = {
	type: "analyze";
	file: File;
	trimStartSeconds: number;
	durationSeconds: number;
	targetSampleRate: number;
	options?: BeatDetectionOptions;
};

export type BeatAnalysisResponse =
	| { type: "progress"; progress: number }
	| { type: "complete"; beats: DetectedBeat[] }
	| { type: "error"; error: string }
	| { type: "cancelled" };

let cancelled = false;

/**
 * Create a lightweight decoding context that works inside a Web Worker.
 * OfflineAudioContext is the spec-compliant worker API; we fall back to
 * AudioContext only in environments that still expose it in workers.
 */
function createDecoderContext(sampleRate: number): {
	decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer>;
	close?(): Promise<void>;
} {
	// Cast because lib.webworker.d.ts does not declare AudioContext on
	// DedicatedWorkerGlobalScope, but OfflineAudioContext is the spec-correct
	// worker API and AudioContext is also exposed in some browsers.
	const global = self as unknown as typeof globalThis;

	if (typeof global.OfflineAudioContext !== "undefined") {
		const Ctx = global.OfflineAudioContext;
		const ctx = new Ctx(1, 1, sampleRate);
		return { decodeAudioData: ctx.decodeAudioData.bind(ctx) };
	}
	if (typeof global.AudioContext !== "undefined") {
		const Ctx = global.AudioContext;
		const ctx = new Ctx({ sampleRate });
		return {
			decodeAudioData: ctx.decodeAudioData.bind(ctx),
			close: () => ctx.close(),
		};
	}
	throw new Error(
		"Audio decoding is not available in this worker. Try Chrome/Edge.",
	);
}

self.onmessage = async (event: MessageEvent<BeatAnalysisRequest>) => {
	const msg = event.data;
	if (msg.type !== "analyze") return;
	cancelled = false;

	try {
		const beats = await runFullPipeline(msg);
		if (cancelled) return;
		self.postMessage({
			type: "complete",
			beats,
		} satisfies BeatAnalysisResponse);
	} catch (err) {
		if (cancelled) return;
		self.postMessage({
			type: "error",
			error: err instanceof Error ? err.message : "Beat analysis failed",
		} satisfies BeatAnalysisResponse);
	}
};

async function runFullPipeline(
	msg: BeatAnalysisRequest,
): Promise<DetectedBeat[]> {
	const {
		file,
		trimStartSeconds,
		durationSeconds,
		targetSampleRate,
		options = {},
	} = msg;
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Phase 1: Decode audio (10%)
	postProgress(0.02);
	const arrayBuffer = await file.arrayBuffer();
	postProgress(0.05);

	// AudioContext is NOT reliably available in workers across browsers,
	// but OfflineAudioContext IS part of the Web Audio spec for workers.
	// We prefer OfflineAudioContext and fall back to AudioContext where it
	// exists, using a low sample rate to minimize data volume.
	const ctx = createDecoderContext(targetSampleRate);

	let audioBuffer: AudioBuffer;
	try {
		audioBuffer = await ctx.decodeAudioData(arrayBuffer);
	} finally {
		await ctx.close?.().catch(() => {});
	}
	postProgress(0.1);

	// Phase 2: Trim + mono mixdown (10% → 30%)
	const startSample = Math.floor(trimStartSeconds * audioBuffer.sampleRate);
	const endSample = Math.min(
		audioBuffer.length,
		Math.ceil((trimStartSeconds + durationSeconds) * audioBuffer.sampleRate),
	);
	const trimmedLength = Math.max(0, endSample - startSample);

	if (trimmedLength === 0) return [];

	const numChannels = audioBuffer.numberOfChannels;
	// If the decoded sample rate differs from target, we still work with
	// what we got — beat detection is robust to sample rate differences.
	const samples = new Float32Array(trimmedLength);

	// Cache channel buffers to avoid repeated method calls in the hot loop.
	const channels = new Array<Float32Array>(numChannels);
	for (let ch = 0; ch < numChannels; ch++) {
		channels[ch] = audioBuffer.getChannelData(ch);
	}

	for (let i = 0; i < trimmedLength; i++) {
		if (cancelled) return [];
		let sum = 0;
		for (let ch = 0; ch < numChannels; ch++) {
			sum += channels[ch][startSample + i];
		}
		samples[i] = sum / numChannels;
		if (i % 65536 === 0 && i > 0) postProgress(0.1 + 0.2 * (i / trimmedLength));
	}
	postProgress(0.3);

	// Phase 3: Beat detection (30% → 100%)
	return detectBeats(samples, audioBuffer.sampleRate, opts);
}

function detectBeats(
	samples: Float32Array,
	sampleRate: number,
	opts: Required<BeatDetectionOptions>,
): DetectedBeat[] {
	if (samples.length === 0 || sampleRate <= 0) return [];

	const windowSize = Math.max(256, Math.floor(sampleRate * 0.02));
	const hopSize = Math.max(64, Math.floor(windowSize / 2));
	const totalHops = Math.ceil((samples.length - windowSize) / hopSize);
	const energies = new Float32Array(totalHops);

	// Phase 3a: Energy computation (30% → 80%)
	for (
		let i = 0, hop = 0;
		i < samples.length - windowSize;
		i += hopSize, hop++
	) {
		if (cancelled) return [];
		let sum = 0;
		for (let j = 0; j < windowSize; j++) {
			const s = samples[i + j];
			sum += s * s;
		}
		energies[hop] = Math.sqrt(sum / windowSize);
		if (hop % Math.max(1, Math.floor(totalHops / 20)) === 0) {
			postProgress(0.3 + (hop / totalHops) * 0.5);
		}
	}

	if (cancelled) return [];

	// Phase 3b: Peak picking (80% → 100%)
	const minGapSamples = Math.floor(
		(opts.minBeatGapMs / 1000) * (sampleRate / hopSize),
	);
	const threshold = average(energies) * opts.thresholdRatio;

	const beats: DetectedBeat[] = [];
	let lastIndex = -minGapSamples;

	for (let i = 1; i < energies.length - 1; i++) {
		if (cancelled) return [];
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
	return beats;
}

function postProgress(progress: number): void {
	if (cancelled) return;
	self.postMessage({
		type: "progress",
		progress,
	} satisfies BeatAnalysisResponse);
}

function average(values: ArrayLike<number>): number {
	if (values.length === 0) return 0;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
	}
	return sum / values.length;
}

// Handle cancel messages
self.addEventListener("message", (event: MessageEvent) => {
	if (event.data?.type === "cancel") {
		cancelled = true;
		self.postMessage({ type: "cancelled" } satisfies BeatAnalysisResponse);
	}
});
