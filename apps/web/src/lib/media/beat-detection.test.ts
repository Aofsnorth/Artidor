import { describe, expect, test } from "bun:test";
import { detectBeats } from "./beat-detection";

const SAMPLE_RATE = 8000;

function generateImpulseTrain(
	bpm: number,
	durationSeconds: number,
	noise = 0.0,
): Float32Array {
	const totalSamples = Math.floor(durationSeconds * SAMPLE_RATE);
	const samples = new Float32Array(totalSamples);
	const beatIntervalSeconds = 60 / bpm;
	const samplesPerBeat = beatIntervalSeconds * SAMPLE_RATE;

	for (let i = 0; i < totalSamples; i++) {
		const beatPhase = (i % samplesPerBeat) / samplesPerBeat;
		// Short energy pulse at the start of each beat window.
		const pulse = beatPhase < 0.05 ? 1.0 : 0.0;
		const n = (Math.random() - 0.5) * 2 * noise;
		samples[i] = pulse + n;
	}
	return samples;
}

describe("detectBeats", () => {
	test("returns empty array for empty samples", () => {
		expect(
			detectBeats({ samples: new Float32Array(0), sampleRate: 8000 }),
		).toEqual([]);
	});

	test("returns empty array for non-positive sample rate", () => {
		expect(
			detectBeats({ samples: new Float32Array([0.5, 0.5]), sampleRate: 0 }),
		).toEqual([]);
	});

	test("detects beats in a regular impulse train", () => {
		const bpm = 120;
		const durationSeconds = 4;
		const samples = generateImpulseTrain(bpm, durationSeconds, 0.02);

		const beats = detectBeats({ samples, sampleRate: SAMPLE_RATE });

		// 120 BPM over 4 seconds should yield ~8 beats, allow small timing drift.
		expect(beats.length).toBeGreaterThanOrEqual(7);
		expect(beats.length).toBeLessThanOrEqual(10);

		const expectedInterval = 60 / bpm;
		for (let i = 1; i < beats.length; i++) {
			const interval = beats[i].timeSeconds - beats[i - 1].timeSeconds;
			expect(interval).toBeGreaterThanOrEqual(expectedInterval - 0.05);
			expect(interval).toBeLessThanOrEqual(expectedInterval + 0.05);
		}
	});

	test("respects minBeatGapMs to suppress double beats", () => {
		const bpm = 120;
		const samples = generateImpulseTrain(bpm, 2, 0.02);

		const beats = detectBeats({
			samples,
			sampleRate: SAMPLE_RATE,
			options: { minBeatGapMs: 500 },
		});

		// 500ms gap should roughly halve the detected beats vs default 200ms.
		expect(beats.length).toBeGreaterThanOrEqual(2);
		expect(beats.length).toBeLessThanOrEqual(4);
	});

	test("returns deterministic results for the same input", () => {
		const samples = generateImpulseTrain(120, 2, 0.02);

		const a = detectBeats({ samples, sampleRate: SAMPLE_RATE });
		const b = detectBeats({ samples, sampleRate: SAMPLE_RATE });

		expect(a.length).toBe(b.length);
		for (let i = 0; i < a.length; i++) {
			expect(a[i].timeSeconds).toBeCloseTo(b[i].timeSeconds, 6);
			expect(a[i].ticks).toBe(b[i].ticks);
		}
	});
});
