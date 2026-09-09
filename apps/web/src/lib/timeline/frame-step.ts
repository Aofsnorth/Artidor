import { roundToFrame } from "artidor-wasm";
import { TICKS_PER_SECOND } from "@/lib/wasm";

/** Exact tick-grid frame size; invalid/unrepresentable rates cannot be stepped. */
export function ticksPerFrame({
	fps,
}: {
	fps: { numerator: number; denominator: number };
}): number | null {
	if (!Number.isSafeInteger(fps.numerator) || !Number.isSafeInteger(fps.denominator)) return null;
	if (fps.numerator <= 0 || fps.denominator <= 0) return null;
	const ticks = TICKS_PER_SECOND * fps.denominator;
	if (!Number.isSafeInteger(ticks) || ticks % fps.numerator !== 0) return null;
	return ticks / fps.numerator;
}

/** Round the current time to a frame BEFORE stepping; return null for invalid rates. */
export function stepTimeByFrame({
	time, fps, direction,
}: {
	time: number;
	fps: { numerator: number; denominator: number };
	direction: 1 | -1;
}): number | null {
	const step = ticksPerFrame({ fps });
	if (step === null) return null;
	if (!Number.isFinite(time)) return 0;
	const base = roundToFrame({ time: Math.round(Math.max(0, time)), rate: fps });
	if (base == null) return null;
	return Math.max(0, base + direction * step);
}

/** Focused playhead keys consume arrows once; Shift jumps five seconds. */
export function handlePlayheadArrow({ event, time, duration, fps, seek }: {
	event: Pick<KeyboardEvent, "key" | "shiftKey" | "altKey" | "ctrlKey" | "metaKey" | "preventDefault" | "stopPropagation">;
	time: number;
	duration: number;
	fps: { numerator: number; denominator: number };
	seek: (args: { time: number }) => void;
}): void {
	if (event.altKey || event.ctrlKey || event.metaKey) return;
	if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
	event.preventDefault();
	event.stopPropagation();
	const direction = event.key === "ArrowRight" ? 1 : -1;
	const next = event.shiftKey
		? time + direction * 5 * TICKS_PER_SECOND
		: stepTimeByFrame({ time, fps, direction });
	if (next === null) return;
	seek({ time: Math.max(0, Math.min(duration, next)) });
}
