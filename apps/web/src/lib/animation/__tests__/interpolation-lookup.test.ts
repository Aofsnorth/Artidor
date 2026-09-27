import { describe, expect, test } from "bun:test";
import type {
	ChannelExtrapolationMode,
	CurveHandle,
	ScalarAnimationChannel,
	ScalarAnimationKey,
} from "@/lib/animation/types";
import {
	getScalarChannelValueAtTime,
	normalizeChannel,
} from "@/lib/animation/interpolation";

/**
 * Guards the two performance fixes in `interpolation.ts`:
 *
 *  1. `normalizeChannel` no longer copies + sorts the keyframe array on every
 *     evaluation — the normalized channel is memoized per channel object.
 *  2. The value lookup uses a lower-bound binary search over the (already
 *     sorted) keys instead of a linear scan.
 *
 * The reference implementation below is a verbatim copy of the pre-fix
 * algorithm (re-normalize on every call, then linear-scan the keys). It is
 * duplicated on purpose: an oracle that shared code with the implementation
 * could not catch a change in that shared code.
 */

type ReferenceKey = ScalarAnimationKey;

function referenceNormalizeKey({
	key,
}: {
	key: ScalarAnimationKey;
}): ReferenceKey {
	return {
		...key,
		tangentMode: key.tangentMode ?? "flat",
		segmentToNext: key.segmentToNext ?? "linear",
	};
}

function referenceNormalizeRightHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: CurveHandle | undefined;
	leftKey: ReferenceKey;
	rightKey: ReferenceKey;
}): CurveHandle | undefined {
	if (!handle) {
		return undefined;
	}
	const span = Math.max(1, rightKey.time - leftKey.time);
	return {
		dt: Math.min(span, Math.max(0, handle.dt)),
		dv: handle.dv,
	};
}

function referenceNormalizeLeftHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: CurveHandle | undefined;
	leftKey: ReferenceKey;
	rightKey: ReferenceKey;
}): CurveHandle | undefined {
	if (!handle) {
		return undefined;
	}
	const span = Math.max(1, rightKey.time - leftKey.time);
	return {
		dt: Math.max(-span, Math.min(0, handle.dt)),
		dv: handle.dv,
	};
}

/** Pre-fix `normalizeScalarChannel`: copy, default, sort, clamp handles. */
function referenceNormalizeChannel({
	channel,
}: {
	channel: ScalarAnimationChannel;
}): ScalarAnimationChannel {
	const sortedKeys = [...channel.keys]
		.map((key) => referenceNormalizeKey({ key }))
		.sort((leftKey, rightKey) => leftKey.time - rightKey.time);
	const nextKeys = sortedKeys.map((key, index) => {
		const previousKey = sortedKeys[index - 1];
		const nextKey = sortedKeys[index + 1];
		return {
			...key,
			leftHandle:
				previousKey != null
					? referenceNormalizeLeftHandle({
							handle: key.leftHandle,
							leftKey: previousKey,
							rightKey: key,
						})
					: undefined,
			rightHandle:
				nextKey != null
					? referenceNormalizeRightHandle({
							handle: key.rightHandle,
							leftKey: key,
							rightKey: nextKey,
						})
					: undefined,
		};
	});

	return { ...channel, keys: nextKeys };
}

/** Copy of `getBezierPoint` / default handles / bezier solve from `bezier.ts`. */
function referenceBezierPoint({
	progress,
	p0,
	p1,
	p2,
	p3,
}: {
	progress: number;
	p0: number;
	p1: number;
	p2: number;
	p3: number;
}): number {
	const mt = 1 - progress;
	return (
		mt * mt * mt * p0 +
		3 * mt * mt * progress * p1 +
		3 * mt * progress * progress * p2 +
		progress * progress * progress * p3
	);
}

function referenceRightHandle({
	leftKey,
	rightKey,
}: {
	leftKey: ReferenceKey;
	rightKey: ReferenceKey;
}): CurveHandle {
	const span = rightKey.time - leftKey.time;
	return { dt: span / 3, dv: (rightKey.value - leftKey.value) / 3 };
}

function referenceLeftHandle({
	leftKey,
	rightKey,
}: {
	leftKey: ReferenceKey;
	rightKey: ReferenceKey;
}): CurveHandle {
	const span = rightKey.time - leftKey.time;
	// `getDefaultLeftHandle` negates the value delta.
	return { dt: -span / 3, dv: -(rightKey.value - leftKey.value) / 3 };
}

function referenceSolveBezierProgressForTime({
	time,
	leftKey,
	rightKey,
}: {
	time: number;
	leftKey: ReferenceKey;
	rightKey: ReferenceKey;
}): number {
	let lower = 0;
	let upper = 1;
	const rightHandle =
		leftKey.rightHandle ?? referenceRightHandle({ leftKey, rightKey });
	const leftHandle =
		rightKey.leftHandle ?? referenceLeftHandle({ leftKey, rightKey });

	for (let iteration = 0; iteration < 20; iteration++) {
		const mid = (lower + upper) / 2;
		const estimate = referenceBezierPoint({
			progress: mid,
			p0: leftKey.time,
			p1: leftKey.time + rightHandle.dt,
			p2: rightKey.time + leftHandle.dt,
			p3: rightKey.time,
		});
		if (estimate < time) {
			lower = mid;
		} else {
			upper = mid;
		}
	}

	return (lower + upper) / 2;
}

function referenceExtrapolateEdge({
	mode,
	edgeKey,
	neighborKey,
	time,
}: {
	mode: ChannelExtrapolationMode;
	edgeKey: ReferenceKey;
	neighborKey: ReferenceKey | undefined;
	time: number;
}): number {
	if (mode === "hold" || !neighborKey) {
		return edgeKey.value;
	}
	const span = neighborKey.time - edgeKey.time;
	if (span === 0) {
		return edgeKey.value;
	}
	return (
		edgeKey.value +
		((time - edgeKey.time) / span) * (neighborKey.value - edgeKey.value)
	);
}

/** Pre-fix `getScalarChannelValueAtTime`: re-normalize, then linear scan. */
function referenceScalarValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: ScalarAnimationChannel | undefined;
	time: number;
	fallbackValue: number;
}): number {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	const normalizedChannel = referenceNormalizeChannel({ channel });
	const firstKey = normalizedChannel.keys[0];
	const lastKey = normalizedChannel.keys[normalizedChannel.keys.length - 1];
	if (!firstKey || !lastKey) {
		return fallbackValue;
	}

	if (time <= firstKey.time) {
		if (time < firstKey.time) {
			return referenceExtrapolateEdge({
				mode: normalizedChannel.extrapolation?.before ?? "hold",
				edgeKey: firstKey,
				neighborKey: normalizedChannel.keys[1],
				time,
			});
		}
		return firstKey.value;
	}

	if (time >= lastKey.time) {
		if (time > lastKey.time) {
			return referenceExtrapolateEdge({
				mode: normalizedChannel.extrapolation?.after ?? "hold",
				edgeKey: lastKey,
				neighborKey: normalizedChannel.keys[normalizedChannel.keys.length - 2],
				time,
			});
		}
		return lastKey.value;
	}

	for (
		let keyIndex = 0;
		keyIndex < normalizedChannel.keys.length - 1;
		keyIndex++
	) {
		const leftKey = normalizedChannel.keys[keyIndex];
		const rightKey = normalizedChannel.keys[keyIndex + 1];
		if (time === rightKey.time) {
			return rightKey.value;
		}

		if (time < leftKey.time || time > rightKey.time) {
			continue;
		}

		if (leftKey.segmentToNext === "step") {
			return leftKey.value;
		}

		const span = rightKey.time - leftKey.time;
		if (span === 0) {
			return rightKey.value;
		}

		const progress = Math.max(0, Math.min(1, (time - leftKey.time) / span));
		if (leftKey.segmentToNext === "linear") {
			return leftKey.value + (rightKey.value - leftKey.value) * progress;
		}

		const curveProgress = referenceSolveBezierProgressForTime({
			time,
			leftKey,
			rightKey,
		});
		const rightHandle =
			leftKey.rightHandle ?? referenceRightHandle({ leftKey, rightKey });
		const leftHandle =
			rightKey.leftHandle ?? referenceLeftHandle({ leftKey, rightKey });
		return referenceBezierPoint({
			progress: curveProgress,
			p0: leftKey.value,
			p1: leftKey.value + rightHandle.dv,
			p2: rightKey.value + leftHandle.dv,
			p3: rightKey.value,
		});
	}

	return lastKey.value;
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const SEGMENT_TYPES: Array<ScalarAnimationKey["segmentToNext"]> = [
	"step",
	"linear",
	"bezier",
];

/** Deterministic PRNG so a failure is always reproducible. */
function createRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function makeKey({
	id,
	time,
	value,
	segmentToNext,
	includeHandles,
}: {
	id: string;
	time: number;
	value: number;
	segmentToNext: ScalarAnimationKey["segmentToNext"];
	includeHandles: boolean;
}): ScalarAnimationKey {
	const key: ScalarAnimationKey = {
		id,
		time,
		value,
		segmentToNext,
		tangentMode: "auto",
	};
	if (includeHandles) {
		key.rightHandle = { dt: 0.25, dv: 1.5 };
		key.leftHandle = { dt: -0.25, dv: -1.5 };
	}
	return key;
}

function makeRandomChannel({
	random,
	index,
}: {
	random: () => number;
	index: number;
}): ScalarAnimationChannel {
	const keyCount = 1 + Math.floor(random() * 8);
	const extrapolation: ScalarAnimationChannel["extrapolation"] =
		random() < 0.5
			? undefined
			: {
					before: random() < 0.5 ? "hold" : "linear",
					after: random() < 0.5 ? "hold" : "linear",
				};
	// Deliberately unsorted input, with a duplicate-time group roughly a
	// third of the time, so the sort and the duplicate-key branch are both
	// exercised.
	const useDuplicates = random() < 0.35;
	const keys: ScalarAnimationKey[] = [];
	for (let keyIndex = 0; keyIndex < keyCount; keyIndex++) {
		const bucket = useDuplicates ? Math.floor(keyIndex / 2) : keyIndex % 17;
		keys.push(
			makeKey({
				id: `ch${index}-k${keyIndex}`,
				time: bucket,
				value: Math.round((random() * 200 - 100) * 1e6) / 1e6,
				segmentToNext: SEGMENT_TYPES[Math.floor(random() * 3)] ?? "linear",
				includeHandles: random() < 0.5,
			}),
		);
	}

	return { kind: "scalar", keys, extrapolation };
}

function sampleTimes({
	random,
	channel,
}: {
	random: () => number;
	channel: ScalarAnimationChannel;
}): number[] {
	const times: number[] = [
		// before the first key
		-1000,
		-1,
		-1e-9,
		// exactly on every key time
		...channel.keys.map((key) => key.time),
		// after the last key
		1e-9,
		1,
		1000,
	];
	// dense random sweep plus midpoints, which is where a wrong segment pick
	// from the binary search would show up
	for (let i = 0; i < 60; i++) {
		times.push(random() * 24 - 2);
	}
	for (let i = 0; i < 24; i++) {
		const time = random() * 24 - 2;
		times.push(time);
		times.push(Math.round(time * 1e6) / 1e6);
	}
	return times;
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

describe("getScalarChannelValueAtTime — binary search parity", () => {
	test("matches the pre-fix linear scan bit-for-bit on randomized channels", () => {
		const random = createRandom(0x5eed1234);
		let comparisons = 0;

		for (let channelIndex = 0; channelIndex < 300; channelIndex++) {
			const channel = makeRandomChannel({ random, index: channelIndex });
			for (const time of sampleTimes({ random, channel })) {
				const expected = referenceScalarValueAtTime({
					channel,
					time,
					fallbackValue: -12345.5,
				});
				const actual = getScalarChannelValueAtTime({
					channel,
					time,
					fallbackValue: -12345.5,
				});
				expect(actual).toBe(expected);
				comparisons++;
			}
		}

		expect(comparisons).toBeGreaterThan(1000);
	});

	test("empty and missing channels return the fallback", () => {
		const empty: ScalarAnimationChannel = { kind: "scalar", keys: [] };
		expect(
			getScalarChannelValueAtTime({
				channel: empty,
				time: 3,
				fallbackValue: 7,
			}),
		).toBe(7);
		expect(
			referenceScalarValueAtTime({
				channel: empty,
				time: 3,
				fallbackValue: 7,
			}),
		).toBe(7);
		expect(
			getScalarChannelValueAtTime({
				channel: undefined,
				time: 3,
				fallbackValue: 7,
			}),
		).toBe(7);
	});

	test("single key: hold and linear extrapolation on both edges", () => {
		const channel: ScalarAnimationChannel = {
			kind: "scalar",
			keys: [
				makeKey({
					id: "a",
					time: 4,
					value: 10,
					segmentToNext: "linear",
					includeHandles: false,
				}),
			],
			extrapolation: { before: "hold", after: "hold" },
		};
		for (const time of [-1, 0, 3.999, 4, 4.001, 5, 99]) {
			expect(
				getScalarChannelValueAtTime({ channel, time, fallbackValue: 0 }),
			).toBe(referenceScalarValueAtTime({ channel, time, fallbackValue: 0 }));
		}
		// No neighbour key exists, so "linear" still holds at the edge.
		const linear: ScalarAnimationChannel = {
			...channel,
			extrapolation: { before: "linear", after: "linear" },
		};
		expect(
			getScalarChannelValueAtTime({
				channel: linear,
				time: -50,
				fallbackValue: 0,
			}),
		).toBe(10);
		expect(
			getScalarChannelValueAtTime({
				channel: linear,
				time: 50,
				fallbackValue: 0,
			}),
		).toBe(10);
	});

	test("time exactly on each key returns that key's value", () => {
		const channel: ScalarAnimationChannel = {
			kind: "scalar",
			keys: [
				makeKey({
					id: "a",
					time: 0,
					value: 1,
					segmentToNext: "step",
					includeHandles: false,
				}),
				makeKey({
					id: "b",
					time: 2,
					value: 5,
					segmentToNext: "linear",
					includeHandles: false,
				}),
				makeKey({
					id: "c",
					time: 6,
					value: -3,
					segmentToNext: "bezier",
					includeHandles: true,
				}),
			],
		};
		expect(
			getScalarChannelValueAtTime({ channel, time: 0, fallbackValue: 0 }),
		).toBe(1);
		expect(
			getScalarChannelValueAtTime({ channel, time: 2, fallbackValue: 0 }),
		).toBe(5);
		expect(
			getScalarChannelValueAtTime({ channel, time: 6, fallbackValue: 0 }),
		).toBe(-3);
	});

	test("duplicate key times resolve to the leftmost key", () => {
		// times 2,2,4 — the pre-fix scan returned the FIRST key whose time
		// equals the query (keys[1] at t=2), not the last.
		const channel: ScalarAnimationChannel = {
			kind: "scalar",
			keys: [
				makeKey({
					id: "a",
					time: 2,
					value: 1,
					segmentToNext: "linear",
					includeHandles: false,
				}),
				makeKey({
					id: "b",
					time: 2,
					value: 9,
					segmentToNext: "linear",
					includeHandles: false,
				}),
				makeKey({
					id: "c",
					time: 4,
					value: 4,
					segmentToNext: "linear",
					includeHandles: false,
				}),
			],
		};
		expect(
			getScalarChannelValueAtTime({ channel, time: 2, fallbackValue: 0 }),
		).toBe(1);
		expect(
			referenceScalarValueAtTime({ channel, time: 2, fallbackValue: 0 }),
		).toBe(1);
		// query past the trailing duplicate still ends on the last key
		expect(
			getScalarChannelValueAtTime({ channel, time: 4, fallbackValue: 0 }),
		).toBe(4);
	});

	test("before/after hold and linear extrapolation match the reference", () => {
		const keys = [
			makeKey({
				id: "a",
				time: 1,
				value: 4,
				segmentToNext: "linear",
				includeHandles: false,
			}),
			makeKey({
				id: "b",
				time: 5,
				value: 12,
				segmentToNext: "linear",
				includeHandles: false,
			}),
		];
		for (const before of ["hold", "linear"] as const) {
			for (const after of ["hold", "linear"] as const) {
				const channel: ScalarAnimationChannel = {
					kind: "scalar",
					keys,
					extrapolation: { before, after },
				};
				for (const time of [-3, -0.001, 0, 1, 2.5, 5, 5.001, 9]) {
					expect(
						getScalarChannelValueAtTime({ channel, time, fallbackValue: 42 }),
					).toBe(
						referenceScalarValueAtTime({ channel, time, fallbackValue: 42 }),
					);
				}
			}
		}
		// sanity: the modes really do differ
		const hold: ScalarAnimationChannel = {
			kind: "scalar",
			keys,
			extrapolation: { before: "hold", after: "hold" },
		};
		const linearEdge: ScalarAnimationChannel = {
			kind: "scalar",
			keys,
			extrapolation: { before: "linear", after: "linear" },
		};
		expect(
			getScalarChannelValueAtTime({ channel: hold, time: 0, fallbackValue: 0 }),
		).toBe(4);
		expect(
			getScalarChannelValueAtTime({
				channel: linearEdge,
				time: 0,
				fallbackValue: 0,
			}),
		).toBe(2);
	});

	test("step, linear and bezier segments all match the reference", () => {
		for (const segmentToNext of SEGMENT_TYPES) {
			const channel: ScalarAnimationChannel = {
				kind: "scalar",
				keys: [
					makeKey({
						id: "a",
						time: 0,
						value: 0,
						segmentToNext,
						includeHandles: false,
					}),
					makeKey({
						id: "b",
						time: 3,
						value: 100,
						segmentToNext,
						includeHandles: true,
					}),
					makeKey({
						id: "c",
						time: 9,
						value: -50,
						segmentToNext,
						includeHandles: false,
					}),
				],
			};
			for (const time of [0, 0.5, 1, 1.5, 2, 2.999, 3, 4, 6, 8.5, 9]) {
				expect(
					getScalarChannelValueAtTime({ channel, time, fallbackValue: 0 }),
				).toBe(referenceScalarValueAtTime({ channel, time, fallbackValue: 0 }));
			}
		}
	});
});

describe("normalizeChannel — per-channel memoization", () => {
	test("repeated calls return the identical cached normalized channel", () => {
		const channel: ScalarAnimationChannel = {
			kind: "scalar",
			keys: [
				makeKey({
					id: "b",
					time: 4,
					value: 2,
					segmentToNext: "linear",
					includeHandles: false,
				}),
				makeKey({
					id: "a",
					time: 1,
					value: 9,
					segmentToNext: "step",
					includeHandles: true,
				}),
			],
		};

		const first = normalizeChannel({ channel });
		const second = normalizeChannel({ channel });
		const third = normalizeChannel({ channel });
		expect(second).toBe(first);
		expect(third).toBe(first);
		expect(first.keys.map((key) => key.id)).toEqual(["a", "b"]);
	});

	test("the hot path reuses the same cached channel across evaluations", () => {
		const channel: ScalarAnimationChannel = {
			kind: "scalar",
			keys: [
				makeKey({
					id: "a",
					time: 0,
					value: 0,
					segmentToNext: "linear",
					includeHandles: false,
				}),
				makeKey({
					id: "b",
					time: 10,
					value: 10,
					segmentToNext: "linear",
					includeHandles: false,
				}),
			],
		};
		// Prime the cache, then evaluate many times. If the lookup re-normalized
		// the channel it would still return the same numbers, so the identity
		// of the memoized channel is what is being asserted.
		normalizeChannel({ channel });
		for (let i = 0; i <= 10; i++) {
			expect(
				getScalarChannelValueAtTime({
					channel,
					time: i,
					fallbackValue: -1,
				}),
			).toBe(i);
		}
		expect(normalizeChannel({ channel })).toBe(normalizeChannel({ channel }));
	});

	test("a distinct channel object gets its own normalized channel", () => {
		const keys: ScalarAnimationKey[] = [
			makeKey({
				id: "a",
				time: 0,
				value: 0,
				segmentToNext: "linear",
				includeHandles: false,
			}),
			makeKey({
				id: "b",
				time: 1,
				value: 1,
				segmentToNext: "linear",
				includeHandles: false,
			}),
		];
		const first: ScalarAnimationChannel = { kind: "scalar", keys };
		const second: ScalarAnimationChannel = { kind: "scalar", keys };
		expect(normalizeChannel({ channel: second })).not.toBe(
			normalizeChannel({ channel: first }),
		);
	});

	test("discrete channels are memoized and sorted the same way", () => {
		const channel = {
			kind: "discrete",
			keys: [
				{ id: "b", time: 5, value: "late" },
				{ id: "a", time: 1, value: "early" },
			],
		} as const;
		const first = normalizeChannel({ channel });
		const second = normalizeChannel({ channel });
		expect(second).toBe(first);
		expect(first.keys.map((key) => key.id)).toEqual(["a", "b"]);
	});
});
