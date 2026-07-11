import type { DetectedBeat } from "./beat-detection-types";
import { TICKS_PER_SECOND } from "../wasm/ticks";

export function offsetBeatsToTimeline({
	clipStartTicks,
	beats,
}: {
	clipStartTicks: number;
	beats: DetectedBeat[];
}): DetectedBeat[] {
	const clipStartSeconds = clipStartTicks / TICKS_PER_SECOND;
	return beats.map((beat) => ({
		...beat,
		ticks: clipStartTicks + beat.ticks,
		timeSeconds: clipStartSeconds + beat.timeSeconds,
	}));
}
