import type { FrameRate } from "artidor-wasm";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/lib/timeline/scale";
import { frameRateToFloat } from "@/lib/fps/utils";

/**
 * frame intervals for labels - starts at 2 so there's always at least
 * one tick between labels even at max zoom.
 * pattern: 2, 3, 5, 10, 15 (matches CapCut)
 */
const LABEL_FRAME_INTERVALS = [2, 3, 5, 10, 15] as const;

/**
 * frame intervals for ticks - can go down to 1 for max granularity.
 */
const TICK_FRAME_INTERVALS = [1, 2, 3, 5, 10, 15] as const;

/**
 * second intervals for when we're zoomed out past frame-level detail.
 */
const SECOND_MULTIPLIERS = [
	1, 2, 3, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600,
] as const;

/**
 * minimum pixel spacing between labels to keep them readable
 */
const MIN_LABEL_SPACING_PX = 120;

/**
 * minimum pixel spacing between ticks. much denser than labels.
 */
const MIN_TICK_SPACING_PX = 18;

export interface RulerConfig {
	/** time interval in seconds between each label */
	labelIntervalSeconds: number;
	/** time interval in seconds between each tick */
	tickIntervalSeconds: number;
}

/**
 * determines the optimal label and tick intervals based on zoom level and FPS.
 *
 * labels and ticks scale independently:
 * - labels need wide spacing (~50px) to stay readable
 * - ticks can be denser (~8px) to show finer subdivisions
 *
 * example at different zoom levels:
 * - very zoomed in: labels every 2f, ticks every 1f
 * - zoomed in: labels every 10f, ticks every 1f
 * - zoomed out: labels every 15f, ticks every 3f
 * - very zoomed out: labels every 1s, ticks every 5f
 */
export function getRulerConfig({
	zoomLevel,
	fps,
}: {
	zoomLevel: number;
	fps: FrameRate;
}): RulerConfig {
	const fpsFloat = frameRateToFloat(fps);
	const pixelsPerSecond = BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
	const pixelsPerFrame = pixelsPerSecond / fpsFloat;

	const labelIntervalSeconds = findOptimalInterval({
		pixelsPerFrame,
		pixelsPerSecond,
		fps: fpsFloat,
		minSpacingPx: MIN_LABEL_SPACING_PX,
		frameIntervals: LABEL_FRAME_INTERVALS,
	});

	const rawTickIntervalSeconds = findOptimalInterval({
		pixelsPerFrame,
		pixelsPerSecond,
		fps: fpsFloat,
		minSpacingPx: MIN_TICK_SPACING_PX,
		frameIntervals: TICK_FRAME_INTERVALS,
	});

	// ensure tick interval divides evenly into label interval so labels always land on ticks
	const tickIntervalSeconds = ensureTickDividesLabel({
		tickIntervalSeconds: rawTickIntervalSeconds,
		labelIntervalSeconds,
		pixelsPerFrame,
		pixelsPerSecond,
		fps: fpsFloat,
	});

	return { labelIntervalSeconds, tickIntervalSeconds };
}

/**
 * adjusts tick interval to ensure it divides evenly into the label interval.
 * this guarantees labels always land on tick positions.
 */
function ensureTickDividesLabel({
	tickIntervalSeconds,
	labelIntervalSeconds,
	pixelsPerFrame,
	pixelsPerSecond,
	fps,
}: {
	tickIntervalSeconds: number;
	labelIntervalSeconds: number;
	pixelsPerFrame: number;
	pixelsPerSecond: number;
	fps: number;
}): number {
	const labelFrames = Math.round(labelIntervalSeconds * fps);
	const tickFrames = Math.round(tickIntervalSeconds * fps);

	// if tick already divides label evenly, we're good
	if (labelFrames % tickFrames === 0) {
		return tickIntervalSeconds;
	}

	// find the smallest tick interval that divides the label interval and has adequate spacing
	for (const candidateFrames of TICK_FRAME_INTERVALS) {
		if (labelFrames % candidateFrames === 0) {
			const candidateSpacing = pixelsPerFrame * candidateFrames;
			// accept if spacing meets minimum threshold
			if (candidateSpacing >= MIN_TICK_SPACING_PX) {
				return candidateFrames / fps;
			}
		}
	}

	// try second-level tick intervals that divide the label interval cleanly
	for (const candidateSeconds of SECOND_MULTIPLIERS) {
		const ratio = labelIntervalSeconds / candidateSeconds;
		const isDivisor = Math.abs(ratio - Math.round(ratio)) < 0.0001;
		if (isDivisor) {
			const candidateSpacing = pixelsPerSecond * candidateSeconds;
			if (candidateSpacing >= MIN_TICK_SPACING_PX) {
				return candidateSeconds;
			}
		}
	}

	// fallback: use the label interval itself (no intermediate ticks)
	return labelIntervalSeconds;
}

function findOptimalInterval({
	pixelsPerFrame,
	pixelsPerSecond,
	fps,
	minSpacingPx,
	frameIntervals,
}: {
	pixelsPerFrame: number;
	pixelsPerSecond: number;
	fps: number;
	minSpacingPx: number;
	frameIntervals: readonly number[];
}): number {
	// try frame-level intervals first
	for (const frameInterval of frameIntervals) {
		const pixelSpacing = pixelsPerFrame * frameInterval;
		if (pixelSpacing >= minSpacingPx) {
			return frameInterval / fps;
		}
	}

	// then try second-level intervals
	for (const secondMultiplier of SECOND_MULTIPLIERS) {
		const pixelSpacing = pixelsPerSecond * secondMultiplier;
		if (pixelSpacing >= minSpacingPx) {
			return secondMultiplier;
		}
	}

	return 60;
}

/**
 * checks if a time should have a label based on the label interval.
 *
 * Uses integer-frame comparison instead of float modulo: floating-point
 * division of `time / labelIntervalSeconds` accumulates error as the
 * timeline widens, and labels near a tick boundary would flicker between
 * "show" and "hide" across re-renders. Comparing the rounded frame index
 * against an expected frame step is exact.
 */
export function shouldShowLabel({
	time,
	labelIntervalSeconds,
	fps,
}: {
	time: number;
	labelIntervalSeconds: number;
	fps: number;
}): boolean {
	const labelIntervalFrames = labelIntervalSeconds * fps;
	if (!Number.isFinite(labelIntervalFrames) || labelIntervalFrames <= 0) {
		return false;
	}
	const timeFrames = time * fps;
	const rounded = Math.round(timeFrames);
	const remainder = rounded % Math.round(labelIntervalFrames);
	// account for wrap-around: 0 and N are the same tick
	const step = Math.round(labelIntervalFrames);
	return remainder === 0 || remainder === step;
}

/**
 * formats a ruler tick label.
 *
 * - on second boundaries: "MM:SS" (e.g., "00:00", "01:30")
 * - between seconds: "Xf" (e.g., "5f", "15f")
 */
export function formatRulerLabel({
	timeInSeconds,
	fps,
}: {
	timeInSeconds: number;
	fps: FrameRate;
}): string {
	const fpsFloat = frameRateToFloat(fps);
	if (isSecondBoundary({ timeInSeconds, fps: fpsFloat })) {
		return `${formatTimestamp({ timeInSeconds })}:00`;
	}

	const frameWithinSecond = getFrameWithinSecond({
		timeInSeconds,
		fps: fpsFloat,
	});
	return `${formatTimestamp({ timeInSeconds })}:${frameWithinSecond
		.toString()
		.padStart(2, "0")}`;
}

/**
 * checks if a time falls exactly on a second boundary.
 *
 * Integer-frame based — a second is `fps` frames, so we check whether
 * the rounded total frame count is divisible by the rounded fps.
 */
function isSecondBoundary({
	timeInSeconds,
	fps,
}: {
	timeInSeconds: number;
	fps: number;
}): boolean {
	const totalFrames = Math.round(timeInSeconds * fps);
	const fpsRounded = Math.round(fps);
	return totalFrames % fpsRounded === 0;
}

/**
 * gets the frame number within the current second.
 */
function getFrameWithinSecond({
	timeInSeconds,
	fps,
}: {
	timeInSeconds: number;
	fps: number;
}): number {
	const totalFrames = Math.round(timeInSeconds * fps);
	const fpsRounded = Math.round(fps);
	return totalFrames % fpsRounded;
}

/**
 * formats a timestamp as HH:MM:SS to match the editor timecode style.
 */
function formatTimestamp({ timeInSeconds }: { timeInSeconds: number }): string {
	const totalSeconds = Math.floor(timeInSeconds);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const hh = hours.toString().padStart(2, "0");
	const mm = minutes.toString().padStart(2, "0");
	const ss = seconds.toString().padStart(2, "0");

	return `${hh}:${mm}:${ss}`;
}
