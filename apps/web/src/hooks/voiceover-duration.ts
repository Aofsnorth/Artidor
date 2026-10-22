/**
 * Resolve the timeline duration for a finished voiceover recording.
 *
 * The recorded asset's decoded duration is authoritative when it is
 * available. Otherwise fall back to the wall-clock time measured between
 * `start()` completing and `stop()` being pressed — never to React state,
 * which is captured stale by the recorder's `onstop` closure and was the
 * cause of every voiceover landing at the 0.25s minimum.
 */
export function resolveVoiceoverDurationTicks({
	recordedSeconds,
	elapsedMs,
	ticksPerSecond,
}: {
	recordedSeconds?: number;
	elapsedMs: number;
	ticksPerSecond: number;
}): number {
	const hasDecodedDuration =
		typeof recordedSeconds === "number" &&
		Number.isFinite(recordedSeconds) &&
		recordedSeconds > 0;
	const durationMs = hasDecodedDuration
		? recordedSeconds * 1000
		: Math.max(0, elapsedMs);

	return Math.max(
		ticksPerSecond / 4,
		Math.round((durationMs / 1000) * ticksPerSecond),
	);
}
