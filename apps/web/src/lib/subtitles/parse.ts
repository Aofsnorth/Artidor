import { parseAss } from "./ass";
import { parseSrt } from "./srt";
import { parseVtt } from "./vtt";
import type { ParseSubtitleResult } from "./types";
export type { ParseSubtitleResult, SubtitleCue } from "./types";

export function parseSubtitleFile({
	fileName,
	input,
}: {
	fileName: string;
	input: string;
}): ParseSubtitleResult {
	const extension = getFileExtension({ fileName, input });

	switch (extension) {
		case "srt":
			return parseSrt({ input });
		case "vtt":
			return parseVtt({ input });
		case "ass":
		case "ssa":
			return parseAss({ input });
		default:
			throw new Error("Unsupported subtitle format");
	}
}

function getFileExtension({
	fileName,
	input,
}: {
	fileName: string;
	input: string;
}): string {
	// Content sniffing fallback: a .txt (or extensionless) upload that
	// starts with WEBVTT is a VTT file regardless of its name — sniff it
	// instead of rejecting the import.
	const trimmedName = fileName.trim();
	const baseName = trimmedName.split(/[\\/]/).pop() ?? trimmedName;
	const dotIndex = baseName.lastIndexOf(".");
	const namedExtension =
		dotIndex > 0 ? baseName.slice(dotIndex + 1).toLowerCase() : "";
	if (
		namedExtension === "srt" ||
		namedExtension === "vtt" ||
		namedExtension === "ass" ||
		namedExtension === "ssa"
	) {
		return namedExtension;
	}
	if (/^\uFEFF?WEBVTT(\s|$)/.test(input.replace(/\r\n?/g, "\n"))) {
		return "vtt";
	}
	return namedExtension;
}
