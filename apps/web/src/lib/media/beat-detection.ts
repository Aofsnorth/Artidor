import { TICKS_PER_SECOND } from "@/lib/wasm";

export interface BeatDetectionOptions {
	minBpm?: number;
	maxBpm?: number;
	thresholdRatio?: number;
	minBeatGapMs?: number;
}

export interface DetectedBeat {
	timeSeconds: number;
	ticks: number;
	energy: number;
}

const DEFAULT_OPTIONS: Required<BeatDetectionOptions> = {
	minBpm: 60,
	maxBpm: 180,
	thresholdRatio: 1.35,
	minBeatGapMs: 200,
};

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
	const energies: number[] = [];

	for (let i = 0; i < samples.length - windowSize; i += hopSize) {
		let sum = 0;
		for (let j = 0; j < windowSize; j++) {
			const sample = samples[i + j] ?? 0;
			sum += sample * sample;
		}
		energies.push(Math.sqrt(sum / windowSize));
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

function average(values: number[]): number {
	if (values.length === 0) return 0;
	let sum = 0;
	for (const v of values) sum += v;
	return sum / values.length;
}
