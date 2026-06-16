import type {
	TranscriptionSegment,
	TranscriptionWord,
	CaptionChunk,
} from "@/lib/transcription/types";
import {
	DEFAULT_WORDS_PER_CAPTION,
	MIN_CAPTION_DURATION_SECONDS,
} from "@/lib/transcription/caption-defaults";

export function buildCaptionChunks({
	segments,
	wordsPerChunk = DEFAULT_WORDS_PER_CAPTION,
	minDuration = MIN_CAPTION_DURATION_SECONDS,
}: {
	segments: TranscriptionSegment[];
	wordsPerChunk?: number;
	minDuration?: number;
}): CaptionChunk[] {
	// Prefer real per-word timestamps: collect every word across segments and
	// cut chunks on actual word boundaries. This is the accurate path and
	// avoids the linear-interpolation drift of the fallback below.
	const allWords: TranscriptionWord[] = [];
	for (const segment of segments) {
		if (segment.words && segment.words.length > 0) {
			allWords.push(...segment.words);
		}
	}
	if (allWords.length > 0) {
		return buildFromWords({ words: allWords, wordsPerChunk, minDuration });
	}

	// Fallback (older models without word timestamps): distribute the
	// segment's words evenly across its duration.
	return buildFromSegments({ segments, wordsPerChunk, minDuration });
}

function buildFromWords({
	words,
	wordsPerChunk,
	minDuration,
}: {
	words: TranscriptionWord[];
	wordsPerChunk: number;
	minDuration: number;
}): CaptionChunk[] {
	const captions: CaptionChunk[] = [];
	for (let i = 0; i < words.length; i += wordsPerChunk) {
		const group = words.slice(i, i + wordsPerChunk);
		if (group.length === 0) continue;
		const text = group
			.map((w) => w.word)
			.join(" ")
			.trim();
		if (!text) continue;

		const startTime = group[0]?.start ?? 0;
		const lastEnd = group[group.length - 1]?.end ?? startTime;
		// Clamp the cue end to the NEXT chunk's first word start so adjacent
		// cues never overlap, and enforce a minimum on-screen duration.
		const nextWord = words[i + wordsPerChunk];
		const hardEnd = nextWord ? nextWord.start : lastEnd;
		const rawDuration = Math.max(lastEnd, hardEnd) - startTime;
		const duration = Math.max(minDuration, rawDuration > 0 ? rawDuration : 0);

		captions.push({ text, startTime, duration });
	}
	return captions;
}

function buildFromSegments({
	segments,
	wordsPerChunk,
	minDuration,
}: {
	segments: TranscriptionSegment[];
	wordsPerChunk: number;
	minDuration: number;
}): CaptionChunk[] {
	const captions: CaptionChunk[] = [];
	let globalEndTime = 0;

	for (const segment of segments) {
		const words = segment.text.trim().split(/\s+/);
		if (words.length === 0 || (words.length === 1 && words[0] === "")) continue;

		const segmentDuration = segment.end - segment.start;
		// Guard against zero/negative segment spans (would make wordsPerSecond
		// Infinity/NaN). Fall back to the minimum cue duration per chunk.
		const wordsPerSecond =
			segmentDuration > 0 ? words.length / segmentDuration : 0;

		const chunks: string[] = [];
		for (let i = 0; i < words.length; i += wordsPerChunk) {
			chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
		}

		let chunkStartTime = segment.start;
		for (const chunk of chunks) {
			const chunkWords = chunk.split(/\s+/).length;
			const chunkDuration =
				wordsPerSecond > 0
					? Math.max(minDuration, chunkWords / wordsPerSecond)
					: minDuration;
			const adjustedStartTime = Math.max(chunkStartTime, globalEndTime);

			captions.push({
				text: chunk,
				startTime: adjustedStartTime,
				duration: chunkDuration,
			});

			globalEndTime = adjustedStartTime + chunkDuration;
			chunkStartTime += chunkDuration;
		}
	}

	return captions;
}
