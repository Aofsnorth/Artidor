/**
 * Tauri runtime detection.
 *
 * Determines whether the web app is running inside a Tauri desktop window
 * or in a regular browser. When running in Tauri, the app switches from
 * the WASM compositor to native Tauri commands for better performance.
 *
 * Detection uses the `__TAURI_INTERNALS__` injection on the global object.
 * Tauri 2.0 sets `window.__TAURI_INTERNALS__` in the WebView, and Web
 * Workers see `self.__TAURI_INTERNALS__` instead — we check both via the
 * portable `globalThis` reference.
 *
 * IMPORTANT: this module is imported transitively by the export Web Worker
 * (via `services/renderer/compositor/unified-compositor` → `lib/tauri/detect`).
 * Anything we do at module load runs in a context where neither `window`
 * nor `document` exist. Only `self`/`globalThis` is guaranteed available.
 * All work must therefore be lazy — no top-level access of any DOM global.
 */

let cachedIsTauri: boolean | null = null;

/**
 * Returns `true` if the app is running inside a Tauri desktop window.
 *
 * The result is cached after the first check because the Tauri internals
 * object does not change during the app lifecycle.
 */
export function isTauri(): boolean {
	if (cachedIsTauri !== null) return cachedIsTauri;

	// Use `globalThis` so the check is portable to Web Workers, where
	// `window` is `undefined` but `self.__TAURI_INTERNALS__` is still set
	// by Tauri's WebView injection. Checking only `window` (the previous
	// implementation) was correct in the main thread but threw
	// `ReferenceError: window is not defined` in the export worker, which
	// then stalled the export at 5% and timed out to the main thread.
	const g = globalThis as
		| typeof globalThis
		| (Window & typeof globalThis)
		| (WorkerGlobalScope & typeof globalThis);
	cachedIsTauri =
		"__TAURI_INTERNALS__" in g || "__TAURI__" in g;

	return cachedIsTauri;
}
