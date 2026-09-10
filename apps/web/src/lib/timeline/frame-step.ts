import { TICKS_PER_SECOND } from "@/lib/wasm";

/** Exact tick-grid frame size; invalid/unrepresentable rates cannot be stepped. */
export function ticksPerFrame({
	fps,
}: {
	fps: { numerator: number; denominator: number };
}): number | null {
	if (
		!Number.isSafeInteger(fps.numerator) ||
		!Number.isSafeInteger(fps.denominator)
	)
		return null;
	if (fps.numerator <= 0 || fps.denominator <= 0) return null;
	const ticks = TICKS_PER_SECOND * fps.denominator;
	if (!Number.isSafeInteger(ticks) || ticks % fps.numerator !== 0) return null;
	return ticks / fps.numerator;
}

/**
 * One frame-step (in ticks) from `time` in `direction` (+1/-1), snapped onto
 * the frame grid with pure integer-tick arithmetic — no WASM runtime needed,
 * so the stepping semantics hold in tests and before WASM init.
 *
 * A mid-frame time (e.g. left by a playhead drag) snaps to the NEXT boundary
 * forward, or the containing boundary backward; on-grid times step one frame.
 * Returns null when the frame rate is not representable on the tick grid.
 */
export function stepTimeByFrame({
	time,
	fps,
	direction,
}: {
	time: number;
	fps: { numerator: number; denominator: number };
	direction: 1 | -1;
}): number | null {
	const step = ticksPerFrame({ fps });
	if (step === null) return null;
	if (!Number.isFinite(time)) return 0;
	const clamped = Math.max(0, Math.round(time));
	const offGrid = clamped % step;
	if (direction === 1) {
		return offGrid === 0 ? clamped + step : clamped - offGrid + step;
	}
	if (offGrid !== 0) return clamped - offGrid;
	return Math.max(0, clamped - step);
}

/** Focused playhead keys consume arrows once; Shift jumps five seconds. */
export function handlePlayheadArrow({
	event,
	time,
	duration,
	fps,
	seek,
}: {
	event: Pick<
		KeyboardEvent,
		| "key"
		| "shiftKey"
		| "altKey"
		| "ctrlKey"
		| "metaKey"
		| "preventDefault"
		| "stopPropagation"
	>;
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
