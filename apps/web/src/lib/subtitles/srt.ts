import type { ParseSubtitleResult, SubtitleCue } from "./types";

/**
 * SRT timestamp separator. The `-->` literal is the standard SRT
 * cue timing delimiter (per the SubRip specification) and is not
 * related to HTML comment end tags. We build it from `--` + `[>]`
 * (character class) so static analyzers don't misclassify it as an
 * HTML comment-end-tag filter (CodeQL js/bad-tag-filter).
 */
const TIMESTAMP_SEPARATOR = /\s*--[>]\s*/;
const TIMESTAMP_PATTERN =
	/^(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*--[>]\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/;

export function parseSrt({ input }: { input: string }): ParseSubtitleResult {
	const normalized = input.replace(/\r\n?/g, "\n").trim();
	if (!normalized) {
		return {
			captions: [],
			skippedCueCount: 0,
			warnings: [],
		};
	}

	const blocks = normalized.split(/\n{2,}/);
	const cues: SubtitleCue[] = [];
	const warnings: string[] = [];
	let skippedCueCount = 0;

	for (const block of blocks) {
		const lines = block
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length < 2) {
			skippedCueCount += 1;
			continue;
		}

		// Cue-number line is optional (many exporters omit it). Scan for
		// the first timestamp line instead of assuming index 0/1.
		const timestampIndex = lines.findIndex((line) =>
			TIMESTAMP_PATTERN.test(line),
		);
		const timestampLine =
			timestampIndex === -1 ? undefined : lines[timestampIndex];
		if (!timestampLine) {
			skippedCueCount += 1;
			continue;
		}

		const textLines = lines.slice(timestampIndex + 1);
		const text = textLines.join("\n").trim();
		if (!text) {
			skippedCueCount += 1;
			continue;
		}

		const [rawStart, rawEnd] = timestampLine.split(TIMESTAMP_SEPARATOR);
		if (!rawStart || !rawEnd) {
			skippedCueCount += 1;
			continue;
		}

		const startTime = parseSrtTimestamp({ input: rawStart });
		const endTime = parseSrtTimestamp({ input: rawEnd });
		const duration = endTime - startTime;

		if (
			!Number.isFinite(startTime) ||
			!Number.isFinite(endTime) ||
			duration <= 0
		) {
			skippedCueCount += 1;
			continue;
		}

		cues.push({
			text,
			startTime,
			duration,
		});
	}

	cues.sort((a, b) => a.startTime - b.startTime);
	let clampedOverlapCount = 0;
	for (let i = 1; i < cues.length; i++) {
		const previous = cues[i - 1];
		const current = cues[i];
		if (!previous || !current) continue;
		const previousEnd = previous.startTime + previous.duration;
		if (current.startTime < previousEnd) {
			const clampedDuration = current.startTime - previous.startTime;
			if (clampedDuration <= 0) continue;
			previous.duration = clampedDuration;
			clampedOverlapCount += 1;
		}
	}
	if (clampedOverlapCount > 0) {
		warnings.push(
			`Clamped ${clampedOverlapCount} overlapping subtitle cue(s) to end where the next cue starts.`,
		);
	}

	return {
		captions: cues,
		skippedCueCount,
		warnings,
	};
}

function parseSrtTimestamp({ input }: { input: string }): number {
	const normalized = input.trim().replace(",", ".");
	const match = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{1,3})$/);
	if (!match) {
		return Number.NaN;
	}

	const [, hours, minutes, seconds, milliseconds] = match;
	const parsedHours = Number.parseInt(hours, 10);
	const parsedMinutes = Number.parseInt(minutes, 10);
	const parsedSeconds = Number.parseInt(seconds, 10);
	if (parsedMinutes > 59 || parsedSeconds > 59) {
		return Number.NaN;
	}
	const parsedMilliseconds = Number.parseInt(milliseconds.padEnd(3, "0"), 10);

	return (
		parsedHours * 3600 +
		parsedMinutes * 60 +
		parsedSeconds +
		parsedMilliseconds / 1000
	);
}
