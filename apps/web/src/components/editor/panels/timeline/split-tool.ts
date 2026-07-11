import { TICKS_PER_SECOND } from "@/lib/wasm";

export function getSplitTimeFromClipPointer({
	clipStart,
	clipDuration,
	clientX,
	left,
	width,
	fps,
}: {
	clipStart: number;
	clipDuration: number;
	clientX: number;
	left: number;
	width: number;
	fps: number;
}): number | null {
	if (clipDuration <= 0 || width <= 0 || fps <= 0) return null;
	const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
	const rawTime = clipStart + clipDuration * ratio;
	const ticksPerFrame = TICKS_PER_SECOND / fps;
	const splitTime = Math.round(rawTime / ticksPerFrame) * ticksPerFrame;
	if (splitTime <= clipStart || splitTime >= clipStart + clipDuration) {
		return null;
	}
	return Math.round(splitTime);
}
