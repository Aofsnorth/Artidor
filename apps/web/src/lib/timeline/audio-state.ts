import { hasKeyframesForPath } from "@/lib/animation/keyframe-query";
import { resolveNumberAtTime } from "@/lib/animation/resolve";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "./audio-constants";
import type { TimelineElement } from "./types";
const DEFAULT_STEP_SECONDS = 1 / 60;

export type AudioCapableElement = Extract<
	TimelineElement,
	{ type: "audio" | "video" }
>;

export function clampDb(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(VOLUME_DB_MAX, Math.max(VOLUME_DB_MIN, value));
}

export function dBToLinear(db: number): number {
	return 10 ** (clampDb(db) / 20);
}

export function linearToDb(linear: number): number {
	if (!Number.isFinite(linear) || linear <= 0) {
		return VOLUME_DB_MIN;
	}
	return clampDb(20 * Math.log10(linear));
}

export function hasAnimatedVolume({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return hasKeyframesForPath({
		animations: element.animations,
		propertyPath: "volume",
	});
}

import { TICKS_PER_SECOND } from "@/lib/wasm";

export function resolveEffectiveAudioGain({
	element,
	trackMuted = false,
	localTime,
	ignoreFades = false,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	localTime: number;
	ignoreFades?: boolean;
}): number {
	if (trackMuted || element.muted === true) {
		return 0;
	}

	const resolvedDb = resolveNumberAtTime({
		baseValue: element.volume ?? 0,
		animations: element.animations,
		propertyPath: "volume",
		localTime: Math.round(localTime * TICKS_PER_SECOND),
	});

	let gain = dBToLinear(resolvedDb);

	if (!ignoreFades) {
		// Apply Fade In
		const fadeIn = element.fadeInDuration ?? 0;
		if (fadeIn > 0 && localTime < fadeIn) {
			gain *= localTime / fadeIn;
		}

		// Apply Fade Out
		const fadeOut = element.fadeOutDuration ?? 0;
		const elementDuration = element.duration / TICKS_PER_SECOND;
		if (fadeOut > 0) {
			const timeFromEnd = elementDuration - localTime;
			if (timeFromEnd < fadeOut) {
				gain *= Math.max(0, timeFromEnd / fadeOut);
			}
		}
	}

	return gain;
}

export function buildAudioGainAutomation({
	element,
	trackMuted = false,
	fromLocalTime,
	toLocalTime,
	stepSeconds = DEFAULT_STEP_SECONDS,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	fromLocalTime: number;
	toLocalTime: number;
	stepSeconds?: number;
}): Array<{ localTime: number; gain: number }> {
	const startTime = Math.max(0, fromLocalTime);
	const endTime = Math.max(startTime, toLocalTime);
	const safeStep =
		Number.isFinite(stepSeconds) && stepSeconds > 0
			? stepSeconds
			: DEFAULT_STEP_SECONDS;
	const points: Array<{ localTime: number; gain: number }> = [];

	for (let localTime = startTime; localTime < endTime; localTime += safeStep) {
		points.push({
			localTime,
			gain: resolveEffectiveAudioGain({
				element,
				trackMuted,
				localTime,
			}),
		});
	}

	points.push({
		localTime: endTime,
		gain: resolveEffectiveAudioGain({
			element,
			trackMuted,
			localTime: endTime,
		}),
	});

	return points;
}

export function hasAnimatedPan({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return hasKeyframesForPath({
		animations: element.animations,
		propertyPath: "pan",
	});
}

export function resolveEffectiveAudioPan({
	element,
	localTime,
}: {
	element: AudioCapableElement;
	localTime: number;
}): number {
	return resolveNumberAtTime({
		baseValue: element.pan ?? 0,
		animations: element.animations,
		propertyPath: "pan",
		localTime: Math.round(localTime * TICKS_PER_SECOND),
	});
}
