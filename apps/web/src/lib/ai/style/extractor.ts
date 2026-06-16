/**
 * Style profile extracted from a reference video.
 *
 * The extractor runs entirely client-side and produces a small JSON
 * object that the AI uses as context when the user says things like
 * "make a video like this" or "match this edit style".
 *
 * What we measure:
 *  - duration:    total length of the reference, in ticks.
 *  - cutFrequency: cuts per minute (cpm). 0..200. vlog: 30..60,
 *                  music video: 60..120, action: 120..200.
 *  - avgShotLength: average cut-to-cut time, in ticks.
 *  - motionIntensity: 0..1 estimate derived from per-frame pixel deltas.
 *  - audioTempo: optional beats-per-minute estimate (0 if no audio).
 *  - dominantColors: top-N sampled colors from the opening 5% of frames.
 *  - energyCurve: sampled RMS energy over time, used to drive
 *                 beat-synced cuts when the user asks for them.
 *  - transitionHints: heuristics about which transition types likely
 *                     fit (cuts vs crossfades vs wipes).
 *  - notes: human-readable bullet points generated from the metrics.
 */
export interface StyleProfile {
	duration: number;
	cutFrequency: number;
	avgShotLength: number;
	motionIntensity: number;
	audioTempo: number;
	dominantColors: string[];
	energyCurve: number[];
	transitionHints: {
		cutRatio: number;
		fadeRatio: number;
		wipeRatio: number;
	};
	notes: string[];
}

export const EMPTY_STYLE_PROFILE: StyleProfile = {
	duration: 0,
	cutFrequency: 0,
	avgShotLength: 0,
	motionIntensity: 0,
	audioTempo: 0,
	dominantColors: [],
	energyCurve: [],
	transitionHints: { cutRatio: 0, fadeRatio: 0, wipeRatio: 0 },
	notes: [],
};
