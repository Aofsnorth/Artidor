import type { RetimeConfig } from "@/lib/timeline";
import { getSourceTimeAtClipTime } from "./resolve";
import { buildSpeedRampRetime, getSpeedRampDuration, sampleSpeedCurve } from "./speed-ramp";

/** Measure consumed source ticks using the original clip's curve duration. */
export function getSourceSpanAtClipTime({
	clipTime,
	retime,
	clipDuration,
}: {
	clipTime: number;
	retime?: RetimeConfig;
	clipDuration?: number;
}): number {
	return Math.max(0, getSourceTimeAtClipTime({ clipTime, retime, clipDuration }));
}

/** Slice and renormalize a speed ramp instead of restarting it in each half. */
export function splitRetimeAtClipTime({
	retime,
	splitClipTime,
	clipDuration,
}: {
	retime?: RetimeConfig;
	splitClipTime: number;
	clipDuration?: number;
}): {
	left: RetimeConfig | undefined;
	right: RetimeConfig | undefined;
} {
	const duration = clipDuration ?? getSpeedRampDuration(retime);
	if (
		retime?.mode !== "curve" || !retime.keyframes?.length ||
		!duration || !Number.isFinite(duration) || !Number.isFinite(splitClipTime) ||
		splitClipTime <= 0 || splitClipTime >= duration
	) {
		return { left: retime, right: retime };
	}
	const fraction = splitClipTime / duration;
	const speed = sampleSpeedCurve({ curve: retime.keyframes, t: fraction });
	return {
		left: { ...retime, ...buildSpeedRampRetime({
			duration: splitClipTime,
			preservePitch: retime.maintainPitch,
			keyframes: [
				...retime.keyframes.filter((key) => key.time < fraction)
					.map((key) => ({ ...key, time: key.time / fraction })),
				{ time: 1, speed },
			],
		}) },
		right: { ...retime, ...buildSpeedRampRetime({
			duration: duration - splitClipTime,
			preservePitch: retime.maintainPitch,
			keyframes: [
				{ time: 0, speed },
				...retime.keyframes.filter((key) => key.time > fraction)
					.map((key) => ({ ...key, time: (key.time - fraction) / (1 - fraction) })),
			],
		}) },
	};
}

export function adjustRetimeForTrimChange({
	retime,
}: {
	retime?: RetimeConfig;
	clipTrimTime: number;
	side: "start" | "end";
}): RetimeConfig | undefined {
	return retime;
}
