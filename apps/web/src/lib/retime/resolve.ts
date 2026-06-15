import type { RetimeConfig } from "@/lib/timeline";
import { clampRetimeRate } from "@/lib/retime/rate";
import {
	clipTimeToSourceTime as curveClipToSource,
	getSpeedCurveFromRetime,
	getSpeedRampDuration,
} from "@/lib/retime/speed-ramp";

function getSafeRate({ rate }: { rate: number }): number {
	return clampRetimeRate({ rate });
}

function getCurveDuration(
	retime: RetimeConfig | undefined,
): number | undefined {
	return getSpeedRampDuration(retime);
}

/**
 * Is this retime a curve-based speed ramp?
 */
function isCurveRetime(retime: RetimeConfig | undefined): boolean {
	if (!retime) return false;
	const r = retime as { mode?: unknown; keyframes?: unknown };
	return (
		r.mode === "curve" && Array.isArray(r.keyframes) && r.keyframes.length > 0
	);
}
export function getSourceTimeAtClipTime({
	clipTime,
	retime,
	clipDuration,
}: {
	clipTime: number;
	retime?: RetimeConfig;
	clipDuration?: number;
}): number {
	if (isCurveRetime(retime)) {
		const curve = getSpeedCurveFromRetime(retime);
		const duration =
			clipDuration ?? (retime as { duration?: number }).duration ?? 0;
		if (duration <= 0) return clipTime;
		return curveClipToSource({
			curve,
			clipTime,
			totalDuration: duration,
		});
	}
	return clipTime * getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getClipTimeAtSourceTime({
	sourceTime,
	retime,
	clipDuration,
}: {
	sourceTime: number;
	retime?: RetimeConfig;
	clipDuration?: number;
}): number {
	if (isCurveRetime(retime)) {
		const curve = getSpeedCurveFromRetime(retime);
		// For a curve, the clip time at source time is found by inverting the
		// clip-to-source mapping. We do this by binary search since the curve
		// is monotonically non-decreasing for non-negative speeds.
		const duration = clipDuration ?? getCurveDuration(retime) ?? 0;
		if (duration <= 0) return 0;
		const target = Math.max(0, sourceTime);
		let lo = 0;
		let hi = duration;
		// 24 iterations is more than enough for 64-bit ticks precision.
		for (let i = 0; i < 32; i++) {
			const mid = (lo + hi) / 2;
			const source = curveClipToSource({
				curve,
				clipTime: mid,
				totalDuration: duration,
			});
			if (source < target) {
				lo = mid;
			} else {
				hi = mid;
			}
		}
		return (lo + hi) / 2;
	}
	return sourceTime / getSafeRate({ rate: retime?.rate ?? 1 });
}

/**
 * The effective playback rate at a given clip time, taking the speed curve
 * into account. For constant rate this is just `retime.rate`. For curve
 * mode this is the interpolated speed value at `clipTime`.
 */
export function getEffectiveRateAt({
	clipTime,
	retime,
	clipDuration,
}: {
	clipTime?: number;
	retime?: RetimeConfig;
	clipDuration?: number;
}): number {
	if (isCurveRetime(retime)) {
		const curve = getSpeedCurveFromRetime(retime);
		if (curve.length === 0) return getSafeRate({ rate: retime?.rate ?? 1 });
		if (clipTime === undefined) {
			// No specific time given — return the start speed.
			return clampRetimeRate({ rate: curve[0]?.speed ?? 1 });
		}
		const duration = clipDuration ?? getCurveDuration(retime) ?? 0;
		if (duration <= 0) return getSafeRate({ rate: retime?.rate ?? 1 });
		const t = Math.max(0, Math.min(1, clipTime / duration));
		const speed = sampleSpeed({ curve, t });
		return getSafeRate({ rate: speed });
	}
	return getSafeRate({ rate: retime?.rate ?? 1 });
}

/**
 * Total clip duration given the source span. For curve mode we still report
 * the fixed clip duration (the user-facing time). Source time / average rate
 * would give a slightly different number depending on the curve; the fixed
 * `clipDuration` is the right answer for layout.
 */
export function getTimelineDurationForSourceSpan({
	sourceSpan,
	retime,
}: {
	sourceSpan: number;
	retime?: RetimeConfig;
}): number {
	if (sourceSpan <= 0) {
		return 0;
	}
	if (isCurveRetime(retime)) {
		return getCurveDuration(retime) ?? sourceSpan;
	}
	return sourceSpan / getSafeRate({ rate: retime?.rate ?? 1 });
}

function sampleSpeed({
	curve,
	t,
}: {
	curve: ReturnType<typeof getSpeedCurveFromRetime>;
	t: number;
}): number {
	if (curve.length === 0) return 1;
	if (curve.length === 1) return curve[0]?.speed ?? 1;
	const sorted = [...curve].sort((a, b) => a.time - b.time);
	if (t <= (sorted[0]?.time ?? 0)) return sorted[0]?.speed ?? 1;
	const last = sorted[sorted.length - 1];
	if (last && t >= last.time) return last.speed;
	for (let i = 0; i < sorted.length - 1; i++) {
		const p0 = sorted[i];
		const p1 = sorted[i + 1];
		if (!p0 || !p1) continue;
		if (t >= p0.time && t <= p1.time) {
			const ratio = (t - p0.time) / Math.max(1e-6, p1.time - p0.time);
			return p0.speed + (p1.speed - p0.speed) * ratio;
		}
	}
	return last?.speed ?? 1;
}
