import { describe, expect, it } from "bun:test";
import {
	dbToLinearAmplitude,
	findSilenceIntervals,
} from "@/lib/media/silence-analysis";

// 1 second of 8000Hz samples.
const SAMPLE_RATE = 8000;

function synth(seconds: number, amplitude: number): Float32Array {
	const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
	for (let i = 0; i < samples.length; i++) {
		// A quiet hum at the given amplitude.
		samples[i] = amplitude * Math.sin((2 * Math.PI * 100 * i) / SAMPLE_RATE);
	}
	return samples;
}

describe("silence analysis (ported from DonkeyCut defaults)", () => {
	it("converts dB to linear amplitude", () => {
		expect(dbToLinearAmplitude(0)).toBe(1);
		expect(dbToLinearAmplitude(-6)).toBeCloseTo(0.501, 2);
		expect(dbToLinearAmplitude(-30)).toBeCloseTo(0.0316, 3);
	});

	it("finds a quiet run between loud sections", () => {
		// 1s loud, 0.5s silent, 1s loud.
		const samples = new Float32Array(SAMPLE_RATE * 2.5);
		samples.set(synth(1, 0.5), 0);
		samples.set(synth(0.5, 0.0005), SAMPLE_RATE);
		samples.set(synth(1, 0.5), SAMPLE_RATE * 1.5);

		const intervals = findSilenceIntervals({
			samples,
			sampleRate: SAMPLE_RATE,
			thresholdDb: -30,
			minSilenceSeconds: 0.35,
		});

		expect(intervals.length).toBe(1);
		const interval = intervals[0];
		expect(interval).toBeDefined();
		expect(interval?.startSeconds).toBeGreaterThanOrEqual(0.9);
		expect(interval?.endSeconds).toBeLessThanOrEqual(1.6);
		expect(interval?.durationSeconds).toBeGreaterThanOrEqual(0.35);
	});

	it("drops runs shorter than the minimum silence", () => {
		// 1s loud, 0.2s silent, 1s loud.
		const samples = new Float32Array(SAMPLE_RATE * 2.2);
		samples.set(synth(1, 0.5), 0);
		samples.set(synth(0.2, 0.0005), SAMPLE_RATE);
		samples.set(synth(1, 0.5), SAMPLE_RATE * 1.2);

		const intervals = findSilenceIntervals({
			samples,
			sampleRate: SAMPLE_RATE,
			thresholdDb: -30,
			minSilenceSeconds: 0.35,
		});

		expect(intervals.length).toBe(0);
	});

	it("treats a fully quiet buffer as one interval", () => {
		const samples = synth(2, 0.0005);
		const intervals = findSilenceIntervals({
			samples,
			sampleRate: SAMPLE_RATE,
			thresholdDb: -30,
			minSilenceSeconds: 0.35,
		});
		expect(intervals.length).toBe(1);
		expect(intervals[0]?.durationSeconds).toBeCloseTo(2, 1);
	});
});
