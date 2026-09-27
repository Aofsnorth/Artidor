import type {
	AnimationChannel,
	AnimationInterpolation,
	AnimationValue,
	DiscreteAnimationChannel,
	DiscreteValue,
	ScalarAnimationChannel,
	ScalarAnimationKey,
	ScalarSegmentType,
} from "@/lib/animation/types";
import { clamp } from "@/utils/math";
import {
	getBezierPoint,
	getDefaultLeftHandle,
	getDefaultRightHandle,
	solveBezierProgressForTime,
} from "./bezier";

function byTimeAscending({
	leftTime,
	rightTime,
}: {
	leftTime: number;
	rightTime: number;
}): number {
	return leftTime - rightTime;
}

function lerpNumber({
	leftValue,
	rightValue,
	progress,
}: {
	leftValue: number;
	rightValue: number;
	progress: number;
}): number {
	return leftValue + (rightValue - leftValue) * progress;
}

function normalizeRightHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: ScalarAnimationKey["rightHandle"];
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	if (!handle) {
		return undefined;
	}

	const span = Math.max(1, rightKey.time - leftKey.time);
	return {
		dt: Math.min(span, Math.max(0, handle.dt)),
		dv: handle.dv,
	};
}

function normalizeLeftHandle({
	handle,
	leftKey,
	rightKey,
}: {
	handle: ScalarAnimationKey["leftHandle"];
	leftKey: ScalarAnimationKey;
	rightKey: ScalarAnimationKey;
}) {
	if (!handle) {
		return undefined;
	}

	const span = Math.max(1, rightKey.time - leftKey.time);
	return {
		dt: Math.max(-span, Math.min(0, handle.dt)),
		dv: handle.dv,
	};
}

function normalizeScalarKey({
	key,
}: {
	key: ScalarAnimationKey;
}): ScalarAnimationKey {
	return {
		...key,
		tangentMode: key.tangentMode ?? "flat",
		segmentToNext: key.segmentToNext ?? "linear",
	};
}

function normalizeScalarChannel({
	channel,
}: {
	channel: ScalarAnimationChannel;
}): ScalarAnimationChannel {
	const sortedKeys = [...channel.keys]
		.map((key) => normalizeScalarKey({ key }))
		.sort((leftKey, rightKey) =>
			byTimeAscending({
				leftTime: leftKey.time,
				rightTime: rightKey.time,
			}),
		);
	const nextKeys = sortedKeys.map((key, index) => {
		const previousKey = sortedKeys[index - 1];
		const nextKey = sortedKeys[index + 1];
		return {
			...key,
			leftHandle:
				previousKey != null
					? normalizeLeftHandle({
							handle: key.leftHandle,
							leftKey: previousKey,
							rightKey: key,
						})
					: undefined,
			rightHandle:
				nextKey != null
					? normalizeRightHandle({
							handle: key.rightHandle,
							leftKey: key,
							rightKey: nextKey,
						})
					: undefined,
		};
	});

	return {
		...channel,
		keys: nextKeys,
	};
}

/**
 * Normalized-channel cache.
 *
 * `normalizeChannel` copies, defaults and sorts the whole keyframe array, and
 * it used to run on every single evaluation — once per animated property per
 * element per render frame (8 transform properties x every element on the
 * timeline), which made sampling the most expensive part of the render loop.
 *
 * Animation channels are immutable once written: every writer
 * (`keyframes.ts`) builds a brand new channel object rather than mutating one,
 * so the channel object identity is a valid cache key. A new channel object is
 * a new key and is re-normalized; an old channel that is mutated in place
 * would be the only way to get a stale hit, and no code path does that.
 * `WeakMap` is used so channels dropped by undo history / element deletion
 * can still be garbage collected.
 */
const normalizedChannelCache = new WeakMap<object, AnimationChannel>();

export function normalizeChannel<TChannel extends AnimationChannel>({
	channel,
}: {
	channel: TChannel;
}): TChannel {
	const cached = normalizedChannelCache.get(channel);
	if (cached !== undefined) {
		return cached as TChannel;
	}

	const normalized: AnimationChannel =
		channel.kind === "scalar"
			? normalizeScalarChannel({
					channel,
				})
			: ({
					...channel,
					keys: [...channel.keys].sort((leftKeyframe, rightKeyframe) =>
						byTimeAscending({
							leftTime: leftKeyframe.time,
							rightTime: rightKeyframe.time,
						}),
					),
				} as AnimationChannel);

	normalizedChannelCache.set(channel, normalized);
	return normalized as TChannel;
}

/**
 * Lower bound over a time-ascending key array: the index of the first key
 * whose `time` is greater than or equal to `time`, or `keys.length` when every
 * key is earlier. Used to locate the keyframe segment containing `time`
 * without scanning every key.
 */
function findLowerBoundKeyIndex({
	keys,
	time,
}: {
	keys: ScalarAnimationKey[];
	time: number;
}): number {
	let low = 0;
	let high = keys.length;
	while (low < high) {
		const middle = (low + high) >>> 1;
		if (keys[middle].time < time) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}
	return low;
}

function extrapolateScalarEdge({
	mode,
	edgeKey,
	neighborKey,
	time,
}: {
	mode: "hold" | "linear";
	edgeKey: ScalarAnimationKey;
	neighborKey: ScalarAnimationKey | undefined;
	time: number;
}) {
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

export function getScalarSegmentInterpolation({
	segment,
}: {
	segment: ScalarSegmentType;
}): AnimationInterpolation {
	if (segment === "step") {
		return "hold";
	}

	return segment === "bezier" ? "bezier" : "linear";
}

export function getScalarChannelValueAtTime({
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

	const normalizedChannel = normalizeChannel({
		channel,
	});
	const keys = normalizedChannel.keys;
	const firstKey = keys[0];
	const lastKey = keys[keys.length - 1];
	if (!firstKey || !lastKey) {
		return fallbackValue;
	}

	if (time <= firstKey.time) {
		if (time < firstKey.time) {
			return extrapolateScalarEdge({
				mode: normalizedChannel.extrapolation?.before ?? "hold",
				edgeKey: firstKey,
				neighborKey: keys[1],
				time,
			});
		}

		return firstKey.value;
	}

	if (time >= lastKey.time) {
		if (time > lastKey.time) {
			return extrapolateScalarEdge({
				mode: normalizedChannel.extrapolation?.after ?? "hold",
				edgeKey: lastKey,
				neighborKey: keys[keys.length - 2],
				time,
			});
		}

		return lastKey.value;
	}

	// The keys are time-ascending, so the containing segment is found with a
	// lower-bound binary search instead of a linear scan over every key. The
	// result is identical to the previous scan:
	//  - `time` exactly on a key returns that key's value. The lower bound
	//    yields the leftmost key with `time`, which is the one the scan hit
	//    first.
	//  - otherwise the segment is (upperIndex - 1, upperIndex) — the first
	//    segment whose right key time is >= `time`.
	const upperIndex = findLowerBoundKeyIndex({ keys, time });
	const rightKey = keys[upperIndex];
	if (rightKey != null && rightKey.time === time) {
		return rightKey.value;
	}

	const leftKey = keys[upperIndex - 1];
	if (leftKey == null || rightKey == null) {
		// Unreachable: the guards above already handled every time outside
		// [firstKey.time, lastKey.time], which bounds the lower bound to
		// [1, keys.length - 1]. Kept so the lookup stays total.
		return lastKey.value;
	}

	if (leftKey.segmentToNext === "step") {
		return leftKey.value;
	}

	const span = rightKey.time - leftKey.time;
	if (span === 0) {
		return rightKey.value;
	}

	const progress = clamp({
		value: (time - leftKey.time) / span,
		min: 0,
		max: 1,
	});
	if (leftKey.segmentToNext === "linear") {
		return lerpNumber({
			leftValue: leftKey.value,
			rightValue: rightKey.value,
			progress,
		});
	}

	const curveProgress = solveBezierProgressForTime({
		time,
		leftKey,
		rightKey,
	});
	const bezierRightHandle =
		leftKey.rightHandle ?? getDefaultRightHandle({ leftKey, rightKey });
	const bezierLeftHandle =
		rightKey.leftHandle ?? getDefaultLeftHandle({ leftKey, rightKey });
	return getBezierPoint({
		progress: curveProgress,
		p0: leftKey.value,
		p1: leftKey.value + bezierRightHandle.dv,
		p2: rightKey.value + bezierLeftHandle.dv,
		p3: rightKey.value,
	});
}

export function getDiscreteChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: DiscreteAnimationChannel | undefined;
	time: number;
	fallbackValue: DiscreteValue;
}): DiscreteValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	const normalizedChannel = normalizeChannel({
		channel,
	});
	let currentValue = fallbackValue;
	for (const key of normalizedChannel.keys) {
		if (time < key.time) {
			break;
		}
		currentValue = key.value;
	}
	return currentValue;
}

export function getChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: AnimationChannel | undefined;
	time: number;
	fallbackValue: AnimationValue;
}): AnimationValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	if (channel.kind === "scalar") {
		return typeof fallbackValue === "number"
			? getScalarChannelValueAtTime({
					channel,
					time,
					fallbackValue,
				})
			: fallbackValue;
	}

	if (typeof fallbackValue !== "string" && typeof fallbackValue !== "boolean") {
		return fallbackValue;
	}

	return getDiscreteChannelValueAtTime({
		channel,
		time,
		fallbackValue,
	});
}
