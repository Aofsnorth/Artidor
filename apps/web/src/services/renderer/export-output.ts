import type { StreamTargetChunk } from "mediabunny";
import type { ExportFormat } from "@/lib/export";

interface RandomAccessWritable {
	seek(position: number): Promise<void>;
	write(data: Uint8Array<ArrayBuffer>): Promise<void>;
	close(): Promise<void>;
}

/** Adapts File System Access writes to mediabunny's positioned chunks. */
export function createRandomAccessWritableStream(
	file: RandomAccessWritable,
): WritableStream<StreamTargetChunk> {
	return new WritableStream({
		async write(chunk) {
			await file.seek(chunk.position);
			await file.write(chunk.data);
		},
		close: () => file.close(),
		abort: () => file.close(),
	});
}

/** Container-correct temp extension: WebM stays WebM, MP4-family stays MP4. */
export function exportTempExtensionForFormat(format: ExportFormat): string {
	return format === "webm" ? "webm" : "mp4";
}

export interface ExportTempFile {
	handle: FileSystemFileHandle;
	stream: WritableStream<StreamTargetChunk>;
	/** Base name inside the OPFS `exports/` directory (includes extension). */
	name: string;
	remove: () => Promise<void>;
}

const EXPORT_TEMP_DIR = "exports";
const EXPORT_TEMP_FILE_PREFIX = "export-";
const STALE_EXPORT_TEMP_FILE_AGE_MS = 24 * 60 * 60 * 1000;
const STALE_SWEEP_MAX_ENTRIES = 200;

async function getExportsDirectory({
	create,
}: {
	create: boolean;
}): Promise<FileSystemDirectoryHandle> {
	const root = await navigator.storage.getDirectory();
	return root.getDirectoryHandle(EXPORT_TEMP_DIR, { create });
}

/** Rejects path traversal / foreign names before any OPFS access. */
function isSafeExportTempName(name: string): boolean {
	return (
		name.startsWith(EXPORT_TEMP_FILE_PREFIX) &&
		!name.includes("/") &&
		!name.includes("\\") &&
		!name.includes("..") &&
		name.length < 128
	);
}

/**
 * Creates a temporary OPFS file for disk-backed muxing.
 *
 * The extension follows the negotiated container (decided by the caller AFTER
 * codec negotiation, which can flip mp4 → webm) so a streamed file that outlives
 * the worker (Part 2 download path) keeps the right container suffix.
 */
export async function createExportTempFile(
	extension?: string,
): Promise<ExportTempFile> {
	const directory = await getExportsDirectory({ create: true });
	const suffix = extension?.replace(/^\.+/, "") || "tmp";
	const name = `export-${crypto.randomUUID()}.${suffix}`;
	const handle = await directory.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	return {
		handle,
		stream: createRandomAccessWritableStream(writable),
		name,
		remove: () => directory.removeEntry(name),
	};
}

/**
 * Best-effort OPFS temp-file creation for the worker.
 *
 * Never throws: Firefox/Safari workers may lack `navigator.storage.getDirectory`
 * entirely, so any failure silently resolves to `null` and the caller falls
 * back to `BufferTarget`.
 */
export async function tryCreateExportTempFile(
	extension: string,
): Promise<ExportTempFile | null> {
	try {
		return await createExportTempFile(extension);
	} catch {
		return null;
	}
}

/**
 * Best-effort temp-file cleanup (cancel/error paths). Never throws — cleanup
 * must not mask the original cancellation or error message.
 */
export async function discardExportTempFile(
	temp: ExportTempFile | null | undefined,
): Promise<void> {
	if (!temp) return;
	try {
		await temp.remove();
	} catch {
		// Intentionally ignored: the export already settled.
	}
}

/**
 * Opens a handed-over streamed export file from the OPFS `exports/` dir.
 *
 * Used by the Part 2 main-thread path: the worker leaves the muxed file on
 * disk and posts `complete-streamed`; the UI creates one object URL from the
 * returned `File` for both preview and download (no ArrayBuffer copy).
 *
 * Throws an explicit error on unsafe names or missing files so callers show
 * a real message instead of failing silently.
 */
export async function openStreamedExportFile(fileName: string): Promise<File> {
	if (!isSafeExportTempName(fileName)) {
		throw new Error(`Refusing to open unsafe export file name: ${fileName}`);
	}
	const directory = await getExportsDirectory({ create: false });
	const handle = await directory.getFileHandle(fileName);
	return handle.getFile();
}

/**
 * Best-effort deletion of a handed-over streamed file by base name.
 *
 * Lifecycle hook for (a) dialog closed without download, (b) a new export
 * replacing the previous result, (c) cancel, (d) bridge error/timeout.
 * Never throws — cleanup must not mask the export outcome. Unsafe names
 * resolve silently without touching OPFS.
 */
export async function deleteExportTempFileByName(
	fileName: string,
): Promise<void> {
	if (!isSafeExportTempName(fileName)) return;
	try {
		const directory = await getExportsDirectory({ create: false });
		await directory.removeEntry(fileName);
	} catch {
		// Intentionally ignored: stale/missing files need no action.
	}
}

/**
 * Boot sweep: deletes orphaned `export-*` temp files older than `maxAgeMs`
 * (default 24 h) from the OPFS `exports/` dir.
 *
 * Bounded (`STALE_SWEEP_MAX_ENTRIES`), never throws, and never deletes files
 * newer than the age cutoff — a fresh file may belong to another tab that is
 * still previewing its export.
 */
export async function sweepStaleExportTempFiles({
	maxAgeMs = STALE_EXPORT_TEMP_FILE_AGE_MS,
	now = Date.now(),
}: {
	maxAgeMs?: number;
	now?: number;
} = {}): Promise<{ removed: number; kept: number }> {
	try {
		const directory = await getExportsDirectory({ create: false });
		if (typeof directory.values !== "function") return { removed: 0, kept: 0 };
		let removed = 0;
		let kept = 0;
		let examined = 0;
		for await (const entry of directory.values()) {
			if (examined >= STALE_SWEEP_MAX_ENTRIES) break;
			examined++;
			const name =
				typeof entry === "string" ? entry : (entry as { name?: unknown }).name;
			if (typeof name !== "string" || !isSafeExportTempName(name)) continue;
			try {
				const handle = await directory.getFileHandle(name);
				const file = await handle.getFile();
				const age = now - (file.lastModified ?? now);
				if (age > maxAgeMs) {
					await directory.removeEntry(name);
					removed++;
				} else {
					kept++;
				}
			} catch {
				// Per-entry failures stay counted as kept: never over-delete.
				kept++;
			}
		}
		return { removed, kept };
	} catch {
		return { removed: 0, kept: 0 };
	}
}

export function isDiskBackedExportSupported(): boolean {
	try {
		return (
			typeof navigator !== "undefined" &&
			typeof navigator.storage !== "undefined" &&
			navigator.storage !== null &&
			"getDirectory" in navigator.storage
		);
	} catch {
		return false;
	}
}
