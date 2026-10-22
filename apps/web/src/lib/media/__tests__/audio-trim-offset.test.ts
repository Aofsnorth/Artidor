import { beforeAll, describe, expect, mock, test } from "bun:test";

/**
 * `audio.ts` imports mediabunny (decode pipeline) and, through the timeline
 * audio state, culori. Neither is exercised by this test, so stub only the
 * packages that cannot be resolved in the test environment.
 */
async function stubWhenMissing({
	specifier,
	factory,
}: {
	specifier: string;
	factory: () => Record<string, unknown>;
}): Promise<void> {
	try {
		await import(specifier);
	} catch {
		mock.module(specifier, factory);
	}
}

await stubWhenMissing({
	specifier: "mediabunny",
	factory: () => ({
		Input: class {},
		ALL_FORMATS: [],
		BlobSource: class {},
		AudioBufferSink: class {},
	}),
});
await stubWhenMissing({
	specifier: "culori",
	factory: () => ({
		converter: () => (color: Record<string, unknown>) => color,
		formatHex: () => "#000000",
		formatHex8: () => "#00000000",
		parse: () => null,
	}),
});

type AudioModule = typeof import("../audio");

let resolveCollectedTrimStartSeconds: AudioModule["resolveCollectedTrimStartSeconds"];
let mixAudioChannels: AudioModule["mixAudioChannels"];

beforeAll(async () => {
	({ resolveCollectedTrimStartSeconds, mixAudioChannels } = await import(
		"../audio"
	));
});

function makeAudioBuffer({
	channels,
	sampleRate,
}: {
	channels: Float32Array[];
	sampleRate: number;
}): AudioBuffer {
	const length = channels[0]?.length ?? 0;
	return {
		numberOfChannels: channels.length,
		length,
		sampleRate,
		duration: length / sampleRate,
		getChannelData: (channel: number) => channels[channel] as Float32Array,
	} as unknown as AudioBuffer;
}

describe("resolveCollectedTrimStartSeconds", () => {
	test("drops the offset when the buffer was decoded from trimStart", () => {
		expect(
			resolveCollectedTrimStartSeconds({
				elementTrimStartSeconds: 12.5,
				bufferStartsAtTrimStart: true,
			}),
		).toBe(0);
	});

	test("keeps the offset when the whole file was decoded", () => {
		expect(
			resolveCollectedTrimStartSeconds({
				elementTrimStartSeconds: 12.5,
				bufferStartsAtTrimStart: false,
			}),
		).toBe(12.5);
	});

	test("clamps negative offsets to zero", () => {
		expect(
			resolveCollectedTrimStartSeconds({
				elementTrimStartSeconds: -1,
				bufferStartsAtTrimStart: false,
			}),
		).toBe(0);
	});
});

describe("mixdown of a pre-trimmed buffer", () => {
	test("reads the source offset exactly once", () => {
		const sampleRate = 100;
		// Buffer sample 0 is the already-trimmed source position (0.5 s into
		// the file). Only that sample is non-zero, so double-applying the
		// trim would shift the read window to sample 50 and output silence.
		const left = new Float32Array(60);
		const right = new Float32Array(60);
		left[0] = 1;
		right[0] = 1;
		const source = makeAudioBuffer({
			channels: [left, right],
			sampleRate,
		});
		const output = makeAudioBuffer({
			channels: [new Float32Array(60), new Float32Array(60)],
			sampleRate,
		});

		const element = {
			timelineElement: {
				id: "video-1",
				type: "video",
				startTime: 0,
				duration: 0.6 * sampleRate * 120_000,
				trimStart: 0.5 * sampleRate * 120_000,
				trimEnd: 0,
				muted: false,
				volume: 1,
				pan: 0,
			},
			buffer: source,
			startTime: 0,
			duration: 0.6,
			trimStart: resolveCollectedTrimStartSeconds({
				elementTrimStartSeconds: 0.5,
				bufferStartsAtTrimStart: true,
			}),
			trimEnd: 0,
			volume: 1,
			muted: false,
			pan: 0,
		} as unknown as Parameters<AudioModule["mixAudioChannels"]>[0]["element"];

		mixAudioChannels({
			element,
			buffer: source,
			trimStart: element.trimStart,
			outputBuffer: output,
			outputLength: 60,
			sampleRate,
		});

		const mixed = output.getChannelData(0);
		expect(mixed[0]).toBeCloseTo(1, 6);
		for (let i = 1; i < mixed.length; i++) {
			expect(mixed[i]).toBe(0);
		}
	});
});
