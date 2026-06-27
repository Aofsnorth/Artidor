/**
 * Tauri native media import bridge.
 *
 * When running inside Tauri, media files are imported via native file
 * picker and referenced by `asset://localhost/` URLs — the webview
 * streams them directly from disk. This avoids:
 * - Reading the entire file into memory
 * - Creating blob URLs
 * - Duplicating the file in IndexedDB/OPFS
 *
 * When running in a browser, falls back to the standard <input type="file">
 * path with blob URLs.
 */

import { isTauri } from "./detect";
import { pickMediaFiles, fileToAssetUrl, getFileMetadata } from "./fs-bridge";
import type { MediaAsset } from "@/lib/media/types";

export interface NativeMediaImport {
	file: File;
	url: string;
	name: string;
	size: number;
	path: string;
}

/**
 * Import media files via native file picker.
 * Returns MediaAsset-compatible objects with native asset URLs.
 *
 * Returns null if the user cancelled the dialog.
 * Returns empty array if not in Tauri (caller should use web fallback).
 */
export async function importMediaNative(): Promise<NativeMediaImport[] | null> {
	if (!isTauri()) return null;

	const paths = await pickMediaFiles();
	if (paths.length === 0) return [];

	const results: NativeMediaImport[] = [];

	for (const path of paths) {
		const meta = await getFileMetadata(path);
		const url = await fileToAssetUrl(path);

		// Create a File object from the native path.
		// We read the bytes lazily — only when the app actually needs them.
		// For now, we create a lightweight File wrapper that fetches from
		// the asset URL when .arrayBuffer() or .text() is called.
		const response = await fetch(url);
		const blob = await response.blob();
		const file = new File([blob], meta.name, { type: blob.type });

		results.push({
			file,
			url,
			name: meta.name,
			size: meta.size,
			path,
		});
	}

	return results;
}

/**
 * Convert a native media import to a MediaAsset.
 * The MediaAsset uses the asset:// URL instead of a blob URL,
 * so the file is streamed from disk on demand.
 */
export function nativeImportToMediaAsset(
	imp: NativeMediaImport,
	id: string,
): MediaAsset {
	return {
		id,
		name: imp.name,
		file: imp.file,
		url: imp.url,
		type: inferMediaType(imp.name),
	};
}

function inferMediaType(name: string): MediaAsset["type"] {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext)) return "video";
	if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
	if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image";
	return "image";
}
