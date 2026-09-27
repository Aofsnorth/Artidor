import { beforeAll, describe, expect, mock, test } from "bun:test";

/**
 * `@/lib/media/audio` pulls in `mediabunny` (decode pipeline) and, through
 * `@/lib/timeline/audio-state` -> `@/lib/animation/binding-values`, `culori`.
 * Neither is exercised by the mixdown, so stub whatever the environment is
 * missing.
 *
 * The stub is installed ONLY when the real package cannot be resolved: bun
 * module mocks persist across test files, so stubbing a package that is
 * actually installed would leak a fake colour/decode implementation into
 * sibling suites.
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

type MixAudioChannels = typeof import("../audio").mixAudioChannels;
type CollectedAudioElement = import("../audio").CollectedAudioElement;
type ResolveModule = typeof import("@/lib/retime/resolve");
type AudioStateModule = typeof import("@/lib/timeline/audio-state");
type SpeedRampModule = typeof import("@/lib/retime/speed-ramp");

let mixAudioChannels: MixAudioChannels;
let getSourceTimeAtClipTime: ResolveModule["getSourceTimeAtClipTime"];
let hasAnimatedVolume: AudioStateModule["hasAnimatedVolume"];
let resolveEffectiveAudioGain: AudioStateModule["resolveEffectiveAudioGain"];
let hasAnimatedPan: AudioStateModule["hasAnimatedPan"];
let resolveEffectiveAudioPan: AudioStateModule["resolveEffectiveAudioPan"];
let buildSpeedRampRetime: SpeedRampModule["buildSpeedRampRetime"];

beforeAll(async () => {
	({ mixAudioChannels } = await import("../audio"));
	({ getSourceTimeAtClipTime } = await import("@/lib/retime/resolve"));
	({
		hasAnimatedVolume,
		resolveEffectiveAudioGain,
		hasAnimatedPan,
		resolveEffectiveAudioPan,
	} = await import("@/lib/timeline/audio-state"));
	({ buildSpeedRampRetime } = await import("@/lib/retime/speed-ramp"));
});

/**
 * Guards the mixdown fix in `media/audio.ts`: the loop-invariant work
 * (`hasAnimatedVolume`, `hasAnimatedPan`, the static volume/pan/fade values)
 * used to be recomputed for every output sample, twice per sample because the
 * mix runs once per channel — ~1M redundant keyframe queries for a 10s
 * 48kHz stereo clip.
 *
 * `referenceMixAudioChannels` below is a verbatim copy of the pre-fix loop. It
 * is duplicated on purpose: an oracle that shared code with the implementation
 * could not catch a change in that shared code.
 */
function referenceMixAudioChannels({
	element,
	buffer,
	trimStart,
	retime,
	outputBuffer,
	outputLength,
	sampleRate,
}: {
	element: CollectedAudioElement;
	buffer: AudioBuffer;
	trimStart: number;
	retime?: CollectedAudioElement["retime"];
	outputBuffer: AudioBuffer;
	outputLength: number;
	sampleRate: number;
}): void {
	const { startTime, duration: elementDuration } = element;

	const outputStartSample = Math.floor(startTime * sampleRate);
	const renderedLength = Math.ceil(elementDuration * sampleRate);

	const outputChannels = 2;
	for (let channel = 0; channel < outputChannels; channel++) {
		const outputData = outputBuffer.getChannelData(channel);
		const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
		const sourceData = buffer.getChannelData(sourceChannel);

		for (let i = 0; i < renderedLength; i++) {
			const outputIndex = outputStartSample + i;
			if (outputIndex >= outputLength) break;

			const clipTime = i / sampleRate;
			const sourceTime =
				trimStart +
				getSourceTimeAtClipTime({
					clipTime,
					retime,
					clipDuration: elementDuration,
				});
			const sourceIndex = sourceTime * buffer.sampleRate;
			if (sourceIndex >= sourceData.length) break;

			const lowerIndex = Math.floor(sourceIndex);
			const upperIndex = Math.min(sourceData.length - 1, lowerIndex + 1);
			const fraction = sourceIndex - lowerIndex;

			// Resolve volume/gain
			let gain = hasAnimatedVolume({ element: element.timelineElement })
				? resolveEffectiveAudioGain({
						element: element.timelineElement,
						localTime: clipTime,
					})
				: element.volume;

			// Apply Fade In
			if (element.fadeInDuration && element.fadeInDuration > 0) {
				if (clipTime < element.fadeInDuration) {
					gain *= clipTime / element.fadeInDuration;
				}
			}

			// Apply Fade Out
			if (element.fadeOutDuration && element.fadeOutDuration > 0) {
				const timeFromEnd = elementDuration - clipTime;
				if (timeFromEnd < element.fadeOutDuration) {
					gain *= Math.max(0, timeFromEnd / element.fadeOutDuration);
				}
			}

			// Apply Stereo Panning (pan ranges from -100 to 100)
			const panVal = hasAnimatedPan({ element: element.timelineElement })
				? resolveEffectiveAudioPan({
						element: element.timelineElement,
						localTime: clipTime,
					})
				: (element.pan ?? 0);
			const p = Math.min(100, Math.max(-100, panVal)) / 100;
			// Channel 0 is Left, Channel 1 is Right
			const channelGain =
				channel === 0 ? 1 - Math.max(0, p) : 1 - Math.max(0, -p);

			outputData[outputIndex] +=
				(sourceData[lowerIndex] * (1 - fraction) +
					sourceData[upperIndex] * fraction) *
				gain *
				channelGain;
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const TICKS_PER_SECOND = 120_000;
const SAMPLE_RATE = 8_000;

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

/** Deterministic pseudo-audio so a failure is reproducible. */
function makeSourceChannels({
	channelCount,
	length,
	seed,
}: {
	channelCount: number;
	length: number;
	seed: number;
}): Float32Array[] {
	let state = seed >>> 0;
	const next = () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
	return Array.from({ length: channelCount }, (_, channelIndex) => {
		const data = new Float32Array(length);
		for (let i = 0; i < length; i++) {
			data[i] = (next() * 2 - 1) * 0.9 + channelIndex * 0.05 - (i % 17) * 0.01;
		}
		return data;
	});
}

function makeScalarAnimations({
	propertyPath,
	channelId,
	keyTimesSeconds,
	values,
	segmentToNext = "linear",
}: {
	propertyPath: "volume" | "pan";
	channelId: string;
	keyTimesSeconds: number[];
	values: number[];
	segmentToNext?: "linear" | "step" | "bezier";
}): CollectedAudioElement["timelineElement"]["animations"] {
	return {
		bindings: {
			[propertyPath]: {
				path: propertyPath,
				kind: "number",
				components: [{ key: "value", channelId }],
			},
		},
		channels: {
			[channelId]: {
				kind: "scalar",
				keys: keyTimesSeconds.map((timeSeconds, index) => ({
					id: `${channelId}-${index}`,
					time: timeSeconds * TICKS_PER_SECOND,
					value: values[index] ?? 0,
					segmentToNext,
					tangentMode: "auto",
				})),
			},
		},
	} as CollectedAudioElement["timelineElement"]["animations"];
}

function makeElement({
	id = "el-1",
	startTime = 0,
	duration = 0.05,
	volume = 0.8,
	pan = 0,
	fadeInDuration,
	fadeOutDuration,
	animations,
}: {
	id?: string;
	startTime?: number;
	duration?: number;
	volume?: number;
	pan?: number;
	fadeInDuration?: number;
	fadeOutDuration?: number;
	animations?: CollectedAudioElement["timelineElement"]["animations"];
}): CollectedAudioElement {
	const timelineElement = {
		id,
		name: id,
		type: "video",
		startTime: startTime * TICKS_PER_SECOND,
		duration: duration * TICKS_PER_SECOND,
		trimStart: 0,
		trimEnd: 0,
		muted: false,
		volume,
		pan,
		...(fadeInDuration !== undefined ? { fadeInDuration } : {}),
		...(fadeOutDuration !== undefined ? { fadeOutDuration } : {}),
		...(animations !== undefined ? { animations } : {}),
	} as unknown as CollectedAudioElement["timelineElement"];

	return {
		timelineElement,
		buffer: makeAudioBuffer({
			channels: [new Float32Array(1)],
			sampleRate: SAMPLE_RATE,
		}),
		startTime,
		duration,
		trimStart: 0,
		trimEnd: 0,
		volume,
		muted: false,
		...(pan !== undefined ? { pan } : {}),
		...(fadeInDuration !== undefined ? { fadeInDuration } : {}),
		...(fadeOutDuration !== undefined ? { fadeOutDuration } : {}),
	};
}

function assertMixdownMatchesReference({
	element,
	trimStart = 0,
	retime,
	channelCount = 2,
	sourceLength = SAMPLE_RATE,
	outputLength = SAMPLE_RATE,
	sampleRate = SAMPLE_RATE,
	seed = 7,
}: {
	element: CollectedAudioElement;
	trimStart?: number;
	retime?: CollectedAudioElement["retime"];
	channelCount?: number;
	sourceLength?: number;
	outputLength?: number;
	sampleRate?: number;
	seed?: number;
}): void {
	const source = makeAudioBuffer({
		channels: makeSourceChannels({
			channelCount,
			length: sourceLength,
			seed,
		}),
		sampleRate,
	});
	const actual = makeAudioBuffer({
		channels: [new Float32Array(outputLength), new Float32Array(outputLength)],
		sampleRate,
	});
	const expected = makeAudioBuffer({
		channels: [new Float32Array(outputLength), new Float32Array(outputLength)],
		sampleRate,
	});

	mixAudioChannels({
		element,
		buffer: source,
		trimStart,
		retime,
		outputBuffer: actual,
		outputLength,
		sampleRate,
	});
	referenceMixAudioChannels({
		element,
		buffer: source,
		trimStart,
		retime,
		outputBuffer: expected,
		outputLength,
		sampleRate,
	});

	for (let channel = 0; channel < 2; channel++) {
		const actualData = actual.getChannelData(channel);
		const expectedData = expected.getChannelData(channel);
		for (let i = 0; i < outputLength; i++) {
			expect(actualData[i]).toBe(expectedData[i]);
		}
	}
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

describe("mixAudioChannels — hoisted loop invariants", () => {
	test("static volume and pan, stereo source", () => {
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.65, pan: -30 }),
			channelCount: 2,
		});
	});

	test("mono source is used for both output channels", () => {
		assertMixdownMatchesReference({
			element: makeElement({ volume: 1, pan: 45 }),
			channelCount: 1,
		});
	});

	test("pan beyond the -100..100 range is clamped the same way", () => {
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.5, pan: 250 }),
		});
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.5, pan: -250 }),
		});
	});

	test("missing pan falls back to 0", () => {
		const element = makeElement({ volume: 0.4 });
		assertMixdownMatchesReference({ element });
	});

	test("fade in and fade out are applied identically", () => {
		assertMixdownMatchesReference({
			element: makeElement({
				volume: 0.9,
				fadeInDuration: 0.02,
				fadeOutDuration: 0.03,
			}),
		});
	});

	test("zero and negative fade durations are ignored identically", () => {
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.7, fadeInDuration: 0 }),
		});
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.7, fadeOutDuration: 0 }),
		});
		assertMixdownMatchesReference({
			element: makeElement({ volume: 0.7, fadeInDuration: -1 }),
		});
	});

	test("animated volume is sampled identically at every clip time", () => {
		assertMixdownMatchesReference({
			element: makeElement({
				volume: -6,
				animations: makeScalarAnimations({
					propertyPath: "volume",
					channelId: "vol",
					keyTimesSeconds: [0, 0.02, 0.05],
					values: [-24, 0, -12],
				}),
			}),
		});
	});

	test("animated pan is sampled identically at every clip time", () => {
		assertMixdownMatchesReference({
			element: makeElement({
				pan: 10,
				animations: makeScalarAnimations({
					propertyPath: "pan",
					channelId: "pan",
					keyTimesSeconds: [0, 0.03],
					values: [-100, 100],
				}),
			}),
		});
	});

	test("animated volume and pan together with fades", () => {
		assertMixdownMatchesReference({
			element: makeElement({
				volume: -3,
				fadeInDuration: 0.01,
				fadeOutDuration: 0.015,
				animations: {
					...makeScalarAnimations({
						propertyPath: "volume",
						channelId: "vol",
						keyTimesSeconds: [0, 0.05],
						values: [-30, 0],
					}),
					...makeScalarAnimations({
						propertyPath: "pan",
						channelId: "pan",
						keyTimesSeconds: [0, 0.05],
						values: [-80, 80],
					}),
				} as CollectedAudioElement["timelineElement"]["animations"],
			}),
		});
	});

	test("step-segmented animated volume", () => {
		assertMixdownMatchesReference({
			element: makeElement({
				volume: -6,
				animations: makeScalarAnimations({
					propertyPath: "volume",
					channelId: "vol",
					keyTimesSeconds: [0, 0.025],
					values: [-20, -4],
					segmentToNext: "step",
				}),
			}),
		});
	});

	test("non-zero start time offsets the mix window", () => {
		assertMixdownMatchesReference({
			element: makeElement({ startTime: 0.017, volume: 0.6, pan: 20 }),
		});
	});

	test("output shorter than the element truncates identically", () => {
		assertMixdownMatchesReference({
			element: makeElement({ duration: 0.08, volume: 0.6 }),
			outputLength: 300,
		});
	});

	test("a short source stops the mix at the same sample", () => {
		assertMixdownMatchesReference({
			element: makeElement({ duration: 0.05, volume: 0.6 }),
			sourceLength: 137,
		});
	});

	test("constant-rate retime with a trim offset", () => {
		assertMixdownMatchesReference({
			element: makeElement({ duration: 0.03, volume: 0.6 }),
			trimStart: 0.01,
			retime: {
				rate: 2,
				maintainPitch: false,
			} as CollectedAudioElement["retime"],
		});
	});

	test("speed-curve retime stays sample-identical", () => {
		const retime = buildSpeedRampRetime({
			keyframes: [
				{ time: 0, speed: 0.5 },
				{ time: 0.5, speed: 3 },
				{ time: 1, speed: 1 },
			],
			duration: 0.05,
		});
		assertMixdownMatchesReference({
			element: makeElement({ duration: 0.05, volume: 0.6 }),
			retime,
			sourceLength: 4096,
		});
	});

	test("repeated mixdown runs do not drift", () => {
		const element = makeElement({
			duration: 0.02,
			volume: 0.55,
			pan: -12,
			animations: makeScalarAnimations({
				propertyPath: "volume",
				channelId: "vol",
				keyTimesSeconds: [0, 0.02],
				values: [-18, -2],
			}),
		});
		const source = makeAudioBuffer({
			channels: makeSourceChannels({ channelCount: 2, length: 512, seed: 3 }),
			sampleRate: SAMPLE_RATE,
		});
		const first = makeAudioBuffer({
			channels: [new Float32Array(512), new Float32Array(512)],
			sampleRate: SAMPLE_RATE,
		});
		const later = [1, 2].map(() =>
			makeAudioBuffer({
				channels: [new Float32Array(512), new Float32Array(512)],
				sampleRate: SAMPLE_RATE,
			}),
		);
		for (const outputBuffer of [first, ...later]) {
			mixAudioChannels({
				element,
				buffer: source,
				trimStart: 0,
				outputBuffer,
				outputLength: 512,
				sampleRate: SAMPLE_RATE,
			});
		}
		for (const outputBuffer of later) {
			expect(Array.from(outputBuffer.getChannelData(0))).toEqual(
				Array.from(first.getChannelData(0)),
			);
			expect(Array.from(outputBuffer.getChannelData(1))).toEqual(
				Array.from(first.getChannelData(1)),
			);
		}
	});
});
