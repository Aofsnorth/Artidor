import type { RetimeConfig } from "@/lib/timeline";

/**
 * Speed curve with control points along the clip.
 * Each keyframe is at a normalized local time (0-1) with a speed multiplier.
 */
export interface SpeedKeyframe {
	time: number; // 0..1 normalized
	speed: number; // speed multiplier
}

export type SpeedCurve = SpeedKeyframe[];

export const MIN_RETIME_RATE_DEFAULT = 0.1;
export const MAX_RETIME_RATE_DEFAULT = 100;

export interface SpeedRampConfig {
	mode: "curve";
	keyframes: SpeedCurve;
	preservePitch: boolean;
}

/**
 * Speed-ramp presets: typical cinematic curves.
 */
export const SPEED_RAMP_PRESETS: Array<{
	id: string;
	name: string;
	keyframes: SpeedCurve;
}> = [
	{
		id: "hero",
		name: "Hero",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.4, speed: 1 },
			{ time: 0.7, speed: 0.3 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "bullet-time",
		name: "Bullet Time",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.2, speed: 1 },
			{ time: 0.5, speed: 0.2 },
			{ time: 0.8, speed: 1 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "montage",
		name: "Montage",
		keyframes: [
			{ time: 0, speed: 0.5 },
			{ time: 0.3, speed: 1.5 },
			{ time: 0.5, speed: 1 },
			{ time: 0.7, speed: 1.8 },
			{ time: 1, speed: 0.5 },
		],
	},
	{
		id: "jump-cut",
		name: "Jump Cut",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.45, speed: 1 },
			{ time: 0.55, speed: 4 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "smooth-ramp",
		name: "Smooth Ramp",
		keyframes: [
			{ time: 0, speed: 0.5 },
			{ time: 0.5, speed: 2 },
			{ time: 1, speed: 0.5 },
		],
	},
	{
		id: "fast-forward",
		name: "Fast Forward",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.3, speed: 4 },
			{ time: 1, speed: 4 },
		],
	},
	{
		id: "slow-zoom",
		name: "Slow Zoom",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.5, speed: 0.3 },
			{ time: 1, speed: 0.3 },
		],
	},
	// CapCut-style "velocity" presets — sharp ramps with an ease curve so
	// the speed change feels intentional rather than mechanical. Mirrors
	// the "Flash In" / "Flash Out" / "Smooth In-Out" presets CapCut ships
	// in the speed panel.
	{
		id: "velocity-flash-in",
		name: "Flash In",
		keyframes: [
			{ time: 0, speed: 3 },
			{ time: 0.15, speed: 3 },
			{ time: 0.3, speed: 1 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "velocity-flash-out",
		name: "Flash Out",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.7, speed: 1 },
			{ time: 0.85, speed: 3 },
			{ time: 1, speed: 3 },
		],
	},
	{
		id: "velocity-smooth-in-out",
		name: "Smooth In-Out",
		keyframes: [
			{ time: 0, speed: 0.5 },
			{ time: 0.25, speed: 1.4 },
			{ time: 0.75, speed: 1.4 },
			{ time: 1, speed: 0.5 },
		],
	},
	{
		id: "velocity-quick-pulse",
		name: "Quick Pulse",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.4, speed: 1 },
			{ time: 0.5, speed: 0.25 },
			{ time: 0.6, speed: 1 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "velocity-glide-in",
		name: "Glide In",
		keyframes: [
			{ time: 0, speed: 4 },
			{ time: 0.5, speed: 1.5 },
			{ time: 1, speed: 1 },
		],
	},
	{
		id: "velocity-glide-out",
		name: "Glide Out",
		keyframes: [
			{ time: 0, speed: 1 },
			{ time: 0.5, speed: 1.5 },
			{ time: 1, speed: 4 },
		],
	},
];

/**
 * Sorted-curve cache.
 *
 * `sampleSpeedCurve` is the innermost call of the 1024-step integration in
 * `clipTimeToSourceTime`, and that integration runs per video node per render
 * frame plus once per audio sample during mixdown (~480k times for a 10s
 * 48kHz clip). Copying and sorting the curve on every one of those steps
 * allocated and sorted a fresh array ~500 million times for a single clip.
 *
 * A speed curve is immutable configuration: every writer
 * (`buildSpeedRampRetime`, the speed-ramp editor tab) builds a new array
 * rather than mutating one, so the curve array identity is a valid cache key.
 * A new array is a new key and is re-sorted. `WeakMap` lets discarded curves
 * be garbage collected.
 */
const sortedSpeedCurveCache = new WeakMap<SpeedCurve, SpeedCurve>();

function getSortedSpeedCurve({ curve }: { curve: SpeedCurve }): SpeedCurve {
	const cached = sortedSpeedCurveCache.get(curve);
	if (cached !== undefined) {
		return cached;
	}

	const sorted = [...curve].sort((a, b) => a.time - b.time);
	sortedSpeedCurveCache.set(curve, sorted);
	return sorted;
}

/**
 * `sampleSpeedCurve` against an already-sorted curve. Split out so the
 * integration loop can resolve the cache once instead of once per step.
 * Arithmetic is identical to `sampleSpeedCurve`.
 */
function sampleSortedSpeedCurve({
	sorted,
	t,
}: {
	sorted: SpeedCurve;
	t: number;
}): number {
	if (sorted.length === 0) return 1;
	if (sorted.length === 1) return sorted[0].speed;

	if (t <= sorted[0].time) return sorted[0].speed;
	if (t >= sorted[sorted.length - 1].time) {
		return sorted[sorted.length - 1].speed;
	}

	for (let i = 0; i < sorted.length - 1; i++) {
		const p0 = sorted[i];
		const p1 = sorted[i + 1];
		if (t >= p0.time && t <= p1.time) {
			const ratio = (t - p0.time) / Math.max(1e-6, p1.time - p0.time);
			return p0.speed + (p1.speed - p0.speed) * ratio;
		}
	}
	return sorted[sorted.length - 1].speed;
}

/**
 * Linear-interpolated speed value at a normalized time t (0..1).
 */
export function sampleSpeedCurve({
	curve,
	t,
}: {
	curve: SpeedCurve;
	t: number;
}): number {
	if (curve.length === 0) return 1;
	if (curve.length === 1) return curve[0].speed;

	return sampleSortedSpeedCurve({ sorted: getSortedSpeedCurve({ curve }), t });
}

/**
 * Map from clip-time to source-time.
 * Given a curve of playback-rate values and total duration, find the
 * source-time that corresponds to a particular clip-time by integrating speed.
 *
 * The integration is deliberately left as a fixed `samples`-step trapezoid
 * walk over [0, t]. A cumulative lookup table was considered and rejected:
 * because the step is `t / samples`, the sample positions themselves depend on
 * the queried `t`, so a table built for one `t` cannot answer a different `t`
 * to within 1e-6 without re-integrating, and reusing one would silently change
 * every returned source time (and therefore the export). Reusing the sorted
 * curve via `getSortedSpeedCurve` removes the per-step allocation instead.
 */
export function clipTimeToSourceTime({
	curve,
	clipTime,
	totalDuration,
	samples = 1024,
}: {
	curve: SpeedCurve;
	clipTime: number;
	totalDuration: number;
	samples?: number;
}): number {
	if (curve.length === 0) return clipTime;
	if (totalDuration <= 0) return 0;
	const t = Math.max(0, Math.min(1, clipTime / totalDuration));
	const dt = t / samples;
	// Resolved once for the whole loop: the sorted copy is cached per curve
	// array, so every one of the ~1024 steps below is a cheap read.
	const sorted = getSortedSpeedCurve({ curve });
	let cumulative = 0;
	let prevSpeed = sampleSortedSpeedCurve({ sorted, t: 0 });
	for (let i = 1; i <= samples; i++) {
		const ti = dt * i;
		const speed = sampleSortedSpeedCurve({ sorted, t: ti });
		// Average playback rate over the segment.
		const avgSpeed = (prevSpeed + speed) / 2;
		// dt of normalized time = dt * totalDuration in clip time.
		// Source time advances faster when the playback rate is higher.
		const segmentSource = dt * totalDuration * Math.max(0.001, avgSpeed);
		cumulative += segmentSource;
		prevSpeed = speed;
		if (ti >= t) break;
	}
	return cumulative;
}

/**
 * Build a RetimeConfig from a speed curve.
 */
export function buildSpeedRampRetime({
	keyframes,
	preservePitch = true,
	duration,
}: {
	keyframes: SpeedCurve;
	preservePitch?: boolean;
	duration?: number;
}): RetimeConfig {
	return {
		rate: 1,
		maintainPitch: preservePitch,
		mode: "curve",
		keyframes: keyframes.map((k) => ({ time: k.time, speed: k.speed })),
		...(duration !== undefined ? { duration } : {}),
	} as RetimeConfig;
}

export function isSpeedRampRetime(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	const v = value as { mode?: unknown };
	return v.mode === "curve";
}

/**
 * Cache of the derived curve array, keyed on the `retime` config object.
 *
 * `getSourceTimeAtClipTime` (used per rendered video node and once per audio
 * sample during mixdown) re-derived the curve on every call. A brand new
 * array each time defeated `getSortedSpeedCurve`, because the cache is keyed
 * on array identity. The mapping from a `RetimeConfig` to its curve is pure,
 * and a retime config is immutable once stored on an element — a new config
 * object is a new key — so the derived array can be reused. Callers must treat
 * the result as read-only, which is what they already did (the previous
 * per-call array was only ever read, never kept).
 */
const speedCurveFromRetimeCache = new WeakMap<RetimeConfig, SpeedCurve>();

export function getSpeedCurveFromRetime(
	retime: RetimeConfig | undefined,
): SpeedCurve {
	if (!retime || !isSpeedRampRetime(retime)) return [];
	const cached = speedCurveFromRetimeCache.get(retime);
	if (cached !== undefined) {
		return cached;
	}
	const keyframes = (retime as { keyframes?: unknown }).keyframes;
	if (!Array.isArray(keyframes)) return [];
	const curve = keyframes.map((k) => {
		const kf = k as { time?: unknown; speed?: unknown };
		return {
			time: typeof kf.time === "number" ? kf.time : 0,
			speed: typeof kf.speed === "number" ? kf.speed : 1,
		};
	});
	speedCurveFromRetimeCache.set(retime, curve);
	return curve;
}

/**
 * Get the duration associated with a speed-ramp retime. The renderer needs
 * this to know the fixed clip duration for the curve.
 */
export function getSpeedRampDuration(
	retime: RetimeConfig | undefined,
): number | undefined {
	if (!retime) return undefined;
	const r = retime as { duration?: unknown };
	return typeof r.duration === "number" ? r.duration : undefined;
}
