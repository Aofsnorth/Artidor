/**
 * Tauri native filesystem bridge.
 *
 * When running inside Tauri, replaces IndexedDB storage with native
 * filesystem operations. Projects are saved as `.artpr` files on disk,
 * and media files are referenced by native path (no blob URLs).
 *
 * When NOT running in Tauri (web), this module is never imported —
 * the app falls back to IndexedDB + OPFS storage.
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./detect";

export interface NativeFileMetadata {
	name: string;
	size: number;
	path: string;
}

/** Check if native filesystem is available (i.e., running in Tauri). */
export function hasNativeFs(): boolean {
	return isTauri();
}

/** Save project content to a native file via save dialog. Returns path or null if cancelled. */
export async function saveProjectFile(
	content: string,
	suggestedName?: string,
): Promise<string | null> {
	const result = await invoke<string | null>("save_project_file", {
		content,
		suggestedName: suggestedName ?? null,
	});
	return result ?? null;
}

/** Load project content from a native file via open dialog. Returns content + path, or null if cancelled. */
export async function loadProjectFile(): Promise<{
	content: string;
	path: string;
} | null> {
	const result = await invoke<[string, string] | null>("load_project_file");
	if (!result) return null;
	return { content: result[0], path: result[1] };
}

/** Open a native media file picker. Returns selected file paths. */
export async function pickMediaFiles(): Promise<string[]> {
	return invoke<string[]>("pick_media_files");
}

/** Read a native file as bytes. */
export async function readFileBytes(path: string): Promise<Uint8Array> {
	const bytes = await invoke<number[]>("read_file_bytes", { path });
	return new Uint8Array(bytes);
}

/** Read a native file as text. */
export async function readFileText(path: string): Promise<string> {
	return invoke<string>("read_file_text", { path });
}

/** Get file metadata (name, size, path) without reading the full file. */
export async function getFileMetadata(path: string): Promise<NativeFileMetadata> {
	return invoke<NativeFileMetadata>("get_file_metadata", { path });
}

/**
 * Convert a native file path to a URL the webview can load.
 * Uses Tauri's `convertFileSrc` which maps to `asset://localhost/` protocol.
 * The webview streams the file directly from disk — no blob URL needed.
 */
export async function fileToAssetUrl(path: string): Promise<string> {
	// Use the Tauri JS API directly — it's more reliable than our custom command.
	const { convertFileSrc } = await import("@tauri-apps/api/core");
	return convertFileSrc(path);
}
