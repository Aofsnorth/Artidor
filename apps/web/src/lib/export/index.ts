import type { FrameRate } from "artidor-wasm";
import { EXPORT_MIME_TYPES } from "./mime-types";

export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm", "hevc"] as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

export interface ExportOptions {
	format: ExportFormat;
	quality: ExportQuality;
	fps?: FrameRate;
	includeAudio?: boolean;
}

export interface ExportResult {
	success: boolean;
	buffer?: ArrayBuffer;
	error?: string;
	cancelled?: boolean;
	cached?: boolean;
}

export interface ExportState {
	isExporting: boolean;
	progress: number;
	result: ExportResult | null;
}

/**
 * Human-readable label for each export format. Used in the export dialog.
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
	mp4: "MP4 (H.264) - Better compatibility",
	webm: "WebM (VP9) - Smaller file size",
	hevc: "MP4 (H.265) - Best compression",
};

/**
 * The file extension produced by each format. HEVC still ships in an MP4
 * container (it's a different video codec, not a different container), so all
 * MP4-derived formats share the `.mp4` extension.
 */
export const EXPORT_FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
	mp4: "mp4",
	webm: "webm",
	hevc: "mp4",
};

export function getExportMimeType({
	format,
}: {
	format: ExportFormat;
}): string {
	return EXPORT_MIME_TYPES[format];
}

export function getExportFileExtension({
	format,
}: {
	format: ExportFormat;
}): string {
	return `.${EXPORT_FORMAT_EXTENSIONS[format]}`;
}

export function downloadBuffer({
	buffer,
	filename,
	mimeType,
}: {
	buffer: ArrayBuffer;
	filename: string;
	mimeType: string;
}): void {
	const blob = new Blob([buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const downloadLink = document.createElement("a");
	downloadLink.href = url;
	downloadLink.download = filename;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
	URL.revokeObjectURL(url);
}
