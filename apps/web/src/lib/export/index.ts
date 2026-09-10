import type { FrameRate } from "artidor-wasm";
import { EXPORT_MIME_TYPES } from "./mime-types";

export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm", "hevc", "av1"] as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

export interface ExportOptions {
	format: ExportFormat;
	quality: ExportQuality;
	fps?: FrameRate;
	includeAudio?: boolean;
	/**
	 * Override the number of parallel segment workers. Defaults to auto-detect
	 * based on CPU cores and available memory. Set to 1 to force single-worker.
	 */
	workerCount?: number;
}

/**
 * Reference to a disk-backed (streaming) export result.
 *
 * The muxed bytes live in an OPFS temp file — never in JS RAM. Open with
 * `openStreamedExportFile(fileName)` (one `File`, zero-copy) for preview and
 * download; delete with `deleteExportTempFileByName(fileName)` when the
 * result is replaced or dismissed.
 */
export interface StreamedExportRef {
	/** Byte length of the muxed file (verified readable by the bridge). */
	byteLength: number;
	/**
	 * Base name inside the OPFS `exports/` dir, including the negotiated
	 * container extension (mp4/webm — may differ from the requested format
	 * after codec fallback).
	 */
	fileName: string;
}

export interface ExportResult {
	success: boolean;
	buffer?: ArrayBuffer;
	/** Disk-backed result: set instead of `buffer` (never both). */
	streamed?: StreamedExportRef;
	error?: string;
	cancelled?: boolean;
	cached?: boolean;
}

/** True when the result carries playable bytes (in-RAM or on-disk). */
export function hasExportContent({
	result,
}: {
	result: ExportResult;
}): boolean {
	return Boolean(result.buffer || result.streamed);
}

/** Byte length regardless of backing (RAM buffer or OPFS file). */
export function exportResultByteLength({
	result,
}: {
	result: ExportResult;
}): number {
	return result.buffer?.byteLength ?? result.streamed?.byteLength ?? 0;
}

/**
 * Container extension carried by a streamed temp file name
 * (`export-<uuid>.mp4|.webm`). Allow-listed so a corrupt name can never
 * smuggle an executable-looking suffix into the download filename.
 */
export function streamedExportFileExtension({
	fileName,
}: {
	fileName: string;
}): string {
	const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
	return ext === ".webm" ? ".webm" : ".mp4";
}

/**
 * Download filename for an export result. Streamed results take their
 * extension from the OPFS temp file (negotiated container), buffer results
 * keep the caller-provided filename as-is.
 */
export function filenameForExportResult({
	filename,
	result,
}: {
	filename: string;
	result: ExportResult;
}): string {
	if (!result.streamed) return filename;
	const stem = filename.includes(".")
		? filename.slice(0, filename.lastIndexOf("."))
		: filename;
	return `${stem}${streamedExportFileExtension({ fileName: result.streamed.fileName })}`;
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
	av1: "MP4 (AV1) - Best compression (modern)",
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
	av1: "mp4",
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
