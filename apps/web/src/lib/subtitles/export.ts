import type { SubtitleCue } from "./types";

/**
 * Subtitle export — the inverse of parse.ts/srt.ts/ass.ts. Writes a cue list
 * (seconds-based, as the editor holds them) back out to .srt or .ass text.
 */

function pad(value: number, length: number): string {
	return Math.floor(value).toString().padStart(length, "0");
}

/** seconds -> "HH:MM:SS,mmm" (SRT). Rounds to whole milliseconds first
 * so 59.9996s never renders as an invalid "59,1000" timestamp. */
function formatSrtTimestamp(seconds: number): string {
	const totalMillis = Math.round(Math.max(0, seconds) * 1000);
	const hours = Math.floor(totalMillis / 3_600_000);
	const minutes = Math.floor((totalMillis % 3_600_000) / 60_000);
	const secs = Math.floor((totalMillis % 60_000) / 1000);
	const millis = totalMillis % 1000;
	return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

/** seconds -> "H:MM:SS.cc" (ASS, centiseconds). Same rounding-carry rule
 * as the SRT formatter so 59.999s never renders as an invalid ".100". */
function formatAssTimestamp(seconds: number): string {
	const totalCentis = Math.round(Math.max(0, seconds) * 100);
	const hours = Math.floor(totalCentis / 360_000);
	const minutes = Math.floor((totalCentis % 360_000) / 6000);
	const secs = Math.floor((totalCentis % 6000) / 100);
	const centis = totalCentis % 100;
	return `${hours}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(centis, 2)}`;
}

export function exportCuesToSrt({ cues }: { cues: SubtitleCue[] }): string {
	return cues
		.map((cue, index) => {
			const start = formatSrtTimestamp(cue.startTime);
			const end = formatSrtTimestamp(cue.startTime + cue.duration);
			return `${index + 1}\n${start} --> ${end}\n${cue.text}`;
		})
		.join("\n\n")
		.concat("\n");
}

const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,72,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2,1,2,40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

export function exportCuesToAss({ cues }: { cues: SubtitleCue[] }): string {
	const events = cues
		.map((cue) => {
			const start = formatAssTimestamp(cue.startTime);
			const end = formatAssTimestamp(cue.startTime + cue.duration);
			// ASS uses \N for hard line breaks and commas are field separators.
			const text = cue.text.replace(/\r?\n/g, "\\N");
			return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
		})
		.join("\n");
	return `${ASS_HEADER}\n${events}\n`;
}

export function downloadSubtitleFile({
	content,
	fileName,
}: {
	content: string;
	fileName: string;
}): void {
	const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
