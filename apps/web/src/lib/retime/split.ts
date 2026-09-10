import type { RetimeConfig } from "@/lib/timeline";
import { getSourceTimeAtClipTime } from "./resolve";
import { sampleSpeedCurve } from "./speed-ramp";

export function getSourceSpanAtClipTime({
	clipTime,
	retime,
}: {
	clipTime: number;
	retime?: RetimeConfig;
}): number {
	return Math.max(0, getSourceTimeAtClipTime({ clipTime, retime }));
}

/**
 * Split a curve (speed-ramp) retime at a clip-time boundary.
 *
 * The curve stores normalized times (0..1) over the WHOLE clip. After a split,
 * each half owns a different sub-range of that curve:
 *
 * - LEFT keeps the curve from 0 to `t` renormalized onto [0,1], where
 *   `t = splitClipTime / duration`.
 * - RIGHT keeps the curve from `t` to 1, ALSO renormalized to [0,1] — the
 *   right half's own local time starts at 0 at the cut, so its first speed
 *   sample is exactly the curve's speed at the cut point. This is what makes
 *   playback continue seamlessly across the cut instead of replaying the
 *   ramp from speed(0).
 *
 * Constant-rate retimes are duration-invariant: both halves carry the same
 * config. Non-curve configs are returned untouched.
 */
export function splitRetimeAtClipTime({
	retime,
	splitClipTime,
	duration,
}: {
	retime?: RetimeConfig;
	splitClipTime: number;
	/** Explicit owning-clip duration; falls back to `retime.duration` when omitted. */
	duration?: number;
}): {
	left: RetimeConfig | undefined;
	right: RetimeConfig | undefined;
} {
	if (!retime) {
		return { left: undefined, right: undefined };
	}

	const mode = retime.mode === "curve" ? "curve" : undefined;
	if (mode !== "curve") {
		// Constant-rate (or future modes): carried as-is on both halves.
		return { left: retime, right: retime };
	}

	const keyframes = retime.keyframes;
	if (!Array.isArray(keyframes) || keyframes.length === 0) {
		return { left: retime, right: retime };
	}

	const clipDuration = duration ?? retime.duration;
	if (
		clipDuration === undefined ||
		!Number.isFinite(clipDuration) ||
		clipDuration <= 0
	) {
		// Unknown duration: cannot renormalize; keep the original on both halves
		// rather than producing a garbage curve.
		return { left: retime, right: retime };
	}

	const t = Math.max(0, Math.min(1, splitClipTime / clipDuration));
	if (t <= 0) {
		return { left: undefined, right: retime };
	}
	if (t >= 1) {
		return { left: retime, right: undefined };
	}

	const curve = keyframes.map((k) => ({
		time: k.time,
		speed: k.speed,
	}));

	// Endpoints must be exact (skill rule: verify endpoints, not lengths):
	// left starts at the curve's speed(0), ends at speed(t);
	// right starts at speed(t), ends at the curve's speed(1).
	const leftCurve = remapCurveRange({
		curve,
		from: 0,
		to: t,
		endpoints: {
			first: sampleCurveAt({ curve, t: 0 }),
			last: sampleCurveAt({ curve, t }),
		},
	});
	const rightCurve = remapCurveRange({
		curve,
		from: t,
		to: 1,
		endpoints: {
			first: sampleCurveAt({ curve, t }),
			last: sampleCurveAt({ curve, t: 1 }),
		},
	});

	const base: RetimeConfig = { ...retime };
	const leftDuration = splitClipTime;
	const rightDuration = clipDuration - splitClipTime;

	return {
		left: { ...base, keyframes: leftCurve, duration: leftDuration },
		right: { ...base, keyframes: rightCurve, duration: rightDuration },
	};
}

/**
 * Renormalize the curve segment [from, to] onto [0, 1], with exact endpoint
 * speeds pinned. Samples between endpoints preserve the original segment's
 * internal shape (times are scaled; speeds are carried verbatim).
 */
function remapCurveRange({
	curve,
	from,
	to,
	endpoints,
}: {
	curve: Array<{ time: number; speed: number }>;
	from: number;
	to: number;
	endpoints: { first: number; last: number };
}): Array<{ time: number; speed: number }> {
	const span = to - from;
	const segment = curve
		.filter((k) => k.time > from && k.time < to)
		.map((k) => ({
			time: (k.time - from) / span,
			speed: k.speed,
		}));

	const result: Array<{ time: number; speed: number }> = [
		{ time: 0, speed: endpoints.first },
		...segment,
		{ time: 1, speed: endpoints.last },
	];
	return result.sort((a, b) => a.time - b.time);
}

function sampleCurveAt({
	curve,
	t,
}: {
	curve: Array<{ time: number; speed: number }>;
	t: number;
}): number {
	if (curve.length === 0) return 1;
	if (curve.length === 1) return curve[0]?.speed ?? 1;
	return sampleSpeedCurve({ curve, t });
}

/**
 * Trim-time retime adjustment (drag-resize). Currently a verified no-op:
 * no caller passes trim through here (grep: zero call sites outside this
 * module), so there is no removed behavior anyone can depend on. Kept as
 * the named seam so the future trim path has one place to renormalize the
 * curve against the post-trim visible duration instead of scattering
 * ad-hoc curve math across callers.
 *
 * When a caller arrives, the correct implementation is: curve retimes
 * re-anchor `duration` to the post-trim visible duration (keyframe times
 * are normalized 0..1 over the clip); constant rates carry as-is.
 */
// ponytail: deliberately not implemented; implement when a trim caller lands.
export function adjustRetimeForTrimChange({
	retime,
	clipTrimTime,
	side,
}: {
	retime?: RetimeConfig;
	clipTrimTime: number;
	side: "start" | "end";
}): RetimeConfig | undefined {
	void clipTrimTime;
	void side;
	return retime;
}
