/**
 * Shared types for beat detection — used by both the main thread
 * (beat-detection.ts) and the Web Worker (beat-detection-worker.ts).
 * Keeping them in a separate file avoids circular imports.
 */

export interface BeatDetectionOptions {
	minBpm?: number;
	maxBpm?: number;
	thresholdRatio?: number;
	minBeatGapMs?: number;
}

export interface DetectedBeat {
	timeSeconds: number;
	ticks: number;
	energy: number;
}
