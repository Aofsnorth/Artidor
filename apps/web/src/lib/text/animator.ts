import type {
	TextAnimator,
	TextAnimatorPreset,
	TextAnimatorUnit,
} from "@/lib/timeline/types";

/** Ordered preset list for UI dropdowns. */
export const TEXT_ANIMATOR_PRESETS: ReadonlyArray<{
	value: TextAnimatorPreset;
	label: string;
}> = [
	{ value: "fade", label: "Fade in" },
	{ value: "rise", label: "Rise up" },
	{ value: "drop", label: "Drop in" },
	{ value: "zoom", label: "Zoom in" },
	{ value: "pop", label: "Pop" },
	{ value: "typewriter", label: "Typewriter" },
	{ value: "wave", label: "Wave (loop)" },
];

export const TEXT_ANIMATOR_UNITS: ReadonlyArray<{
	value: TextAnimatorUnit;
	label: string;
}> = [
	{ value: "character", label: "Per character" },
	{ value: "word", label: "Per word" },
];

export const DEFAULT_TEXT_ANIMATOR: TextAnimator = {
	preset: "rise",
	unit: "character",
	duration: 0.5,
	stagger: 0.05,
};

/**
 * Per-unit transform offsets produced by an animator at a given time. Offsets
 * are expressed in multiples of the (scaled) font size so the renderer can scale
 * them to the canvas; `rotate` is in degrees.
 */
export interface TextUnitAnimationState {
	opacity: number;
	offsetX: number;
	offsetY: number;
	scale: number;
	rotate: number;
}

const IDENTITY: TextUnitAnimationState = {
	opacity: 1,
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	rotate: 0,
};

function clamp01(value: number): number {
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

/** Smooth cubic ease-in-out. */
function easeInOut(p: number): number {
	return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

/** Overshooting "back out" easing, for the Pop preset. */
function backOut(p: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}

/**
 * Splits a single line of text into animatable units (characters or words).
 * Word units keep their trailing whitespace so layout advance stays correct;
 * character units are split on code points (so surrogate pairs stay intact).
 */
export function splitTextLineUnits({
	line,
	unit,
}: {
	line: string;
	unit: TextAnimatorUnit;
}): string[] {
	if (unit === "word") {
		return line.match(/\S+\s*/g) ?? (line.length > 0 ? [line] : []);
	}
	return Array.from(line);
}

/**
 * Computes the animation offsets for a single text unit at `localTimeSeconds`.
 *
 * Entrance presets stagger by `unitIndex * stagger` and play over `duration`,
 * settling to the identity transform once complete. The looping `wave` preset
 * ignores duration and oscillates continuously with a per-unit phase offset.
 */
export function computeTextUnitAnimation({
	animator,
	unitIndex,
	localTimeSeconds,
}: {
	animator: TextAnimator;
	unitIndex: number;
	localTimeSeconds: number;
}): TextUnitAnimationState {
	const { preset, duration, stagger } = animator;

	if (preset === "wave") {
		const cyclesPerSecond = 1 / Math.max(0.1, duration);
		const phasePerUnit = 0.6;
		const phase =
			localTimeSeconds * cyclesPerSecond * Math.PI * 2 -
			unitIndex * phasePerUnit;
		return { ...IDENTITY, offsetY: -0.18 * Math.sin(phase) };
	}

	const start = unitIndex * Math.max(0, stagger);

	if (preset === "typewriter") {
		return localTimeSeconds >= start ? IDENTITY : { ...IDENTITY, opacity: 0 };
	}

	const raw = clamp01((localTimeSeconds - start) / Math.max(0.0001, duration));
	const p = easeInOut(raw);

	switch (preset) {
		case "fade":
			return { ...IDENTITY, opacity: p };
		case "rise":
			return { ...IDENTITY, opacity: p, offsetY: (1 - p) * 0.9 };
		case "drop":
			return { ...IDENTITY, opacity: p, offsetY: (1 - p) * -0.9 };
		case "zoom":
			return { ...IDENTITY, opacity: p, scale: 0.2 + p * 0.8 };
		case "pop":
			return { ...IDENTITY, opacity: p, scale: backOut(raw) };
		default:
			return IDENTITY;
	}
}
