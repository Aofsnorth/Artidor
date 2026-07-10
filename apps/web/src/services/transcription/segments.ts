import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import type { TranscriptionSegment } from "@/lib/transcription/types";

export const SEGMENT_TIMESTAMP_MODE = true;

/** Converts Whisper's timestamped chunks into caption-ready segments. */
export function toTranscriptionSegments({
	result,
	durationSeconds,
}: {
	result: AutomaticSpeechRecognitionOutput;
	durationSeconds: number;
}): TranscriptionSegment[] {
	const segments: TranscriptionSegment[] = [];

	for (const chunk of result.chunks ?? []) {
		const text = chunk.text.trim();
		const [start, end] = chunk.timestamp;

		if (
			text &&
			Number.isFinite(start) &&
			Number.isFinite(end) &&
			end >= start
		) {
			segments.push({ text, start, end });
		}
	}

	if (segments.length > 0) return segments;

	const text = result.text.trim();
	if (!text) return [];

	return [
		{
			text,
			start: 0,
			end: Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0,
		},
	];
}
