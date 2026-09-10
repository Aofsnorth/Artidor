import type { ParseSubtitleResult, SubtitleCue } from "./types";

/**
 * WebVTT timestamp separator. Built from `--` + `[>]` (character class) so
 * static analyzers don't misclassify the `-->` literal as an HTML
 * comment-end-tag filter (CodeQL js/bad-tag-filter) — same trick as srt.ts.
 */
const TIMESTAMP_SEPARATOR = /\s*--[>]\s*/;
const TIMESTAMP_PREFIX =
	/((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})\s*--[>]\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})/;

export function parseVtt({ input }: { input: string }): ParseSubtitleResult {
	const normalized = input
		.replace(/^\uFEFF/, "")
		.replace(/\r\n?/g, "\n")
		.trim();
	if (!normalized) {
		return { captions: [], skippedCueCount: 0, warnings: [] };
	}

	const blocks = normalized.split(/\n{2,}/);
	const cues: SubtitleCue[] = [];
	const warnings: string[] = [];
	let skippedCueCount = 0;
	let seenHeader = false;

	for (const block of blocks) {
		const rawLines = block.split("\n");
		const lines = rawLines.map((line) => line.trim());

		// First block may be the WEBVTT header (with optional header text).
		if (!seenHeader) {
			seenHeader = true;
			const first = lines[0] ?? "";
			if (first === "WEBVTT" || first.startsWith("WEBVTT ")) {
				// Header-only block (possibly with header text on following
				// lines) carries no cues — skip it.
				const rest = lines.slice(1);
				if (
					rest.length === 0 ||
					!rest.some((line) => TIMESTAMP_SEPARATOR.test(line))
				) {
					continue;
				}
				// Unusual: header and a cue in one block — fall through and
				// let the cue detection below handle it.
			}
		}

		const nonEmpty = lines.filter((line) => line.length > 0);
		if (nonEmpty.length === 0) continue;

		// Skip NOTE / STYLE / REGION blocks — metadata, not cues.
		const firstLine = nonEmpty[0] ?? "";
		if (
			firstLine === "NOTE" ||
			firstLine.startsWith("NOTE ") ||
			firstLine.startsWith("NOTE\t") ||
			firstLine === "STYLE" ||
			firstLine === "REGION"
		) {
			continue;
		}

		const timestampIndex = nonEmpty.findIndex((line) =>
			TIMESTAMP_PREFIX.test(line),
		);
		if (timestampIndex === -1) {
			skippedCueCount += 1;
			continue;
		}

		const timestampLine = nonEmpty[timestampIndex] ?? "";
		const match = timestampLine.match(TIMESTAMP_PREFIX);
		if (!match) {
			skippedCueCount += 1;
			continue;
		}
		const [, rawStart, rawEnd] = match;
		if (!rawStart || !rawEnd) {
			skippedCueCount += 1;
			continue;
		}

		const text = nonEmpty
			.slice(timestampIndex + 1)
			.join("\n")
			.trim();
		if (!text) {
			skippedCueCount += 1;
			continue;
		}

		const startTime = parseVttTimestamp({ input: rawStart });
		const endTime = parseVttTimestamp({ input: rawEnd });
		const duration = endTime - startTime;
		if (
			!Number.isFinite(startTime) ||
			!Number.isFinite(endTime) ||
			duration <= 0
		) {
			skippedCueCount += 1;
			continue;
		}

		cues.push({ text, startTime, duration });
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

	return { captions: cues, skippedCueCount, warnings };
}

function parseVttTimestamp({ input }: { input: string }): number {
	const normalized = input.trim().replace(",", ".");
	const match = normalized.match(/^(?:(\d{1,2}):)?(\d{2}):(\d{2})\.(\d{1,3})$/);
	if (!match) return Number.NaN;

	const [, hours, minutes, seconds, milliseconds] = match;
	const parsedHours = hours ? Number.parseInt(hours, 10) : 0;
	const parsedMinutes = Number.parseInt(minutes ?? "0", 10);
	const parsedSeconds = Number.parseInt(seconds ?? "0", 10);
	if (parsedMinutes > 59 || parsedSeconds > 59) return Number.NaN;
	const parsedMilliseconds = Number.parseInt(
		(milliseconds ?? "0").padEnd(3, "0"),
		10,
	);

	return (
		parsedHours * 3600 +
		parsedMinutes * 60 +
		parsedSeconds +
		parsedMilliseconds / 1000
	);
}
