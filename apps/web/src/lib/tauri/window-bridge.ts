/**
 * Tauri native window management bridge.
 *
 * When running inside Tauri, provides native window controls:
 * - Fullscreen toggle
 * - Window title
 * - Minimize / close
 *
 * When NOT running in Tauri, all methods are no-ops.
 */

import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./detect";

/** Toggle fullscreen mode. No-op in browser. */
export async function toggleFullscreen(): Promise<void> {
	if (!isTauri()) return;
	await invoke("toggle_fullscreen");
}

/** Set the window title. No-op in browser (sets document.title instead). */
export async function setWindowTitle(title: string): Promise<void> {
	if (!isTauri()) {
		document.title = title;
		return;
	}
	await invoke("set_window_title", { title });
}

/** Minimize the window. No-op in browser. */
export async function minimizeWindow(): Promise<void> {
	if (!isTauri()) return;
	await invoke("minimize_window");
}

/** Close the window (quit app). No-op in browser. */
export async function closeWindow(): Promise<void> {
	if (!isTauri()) return;
	await invoke("close_window");
}
