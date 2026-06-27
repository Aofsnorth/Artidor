/**
 * Tauri runtime detection.
 *
 * Determines whether the web app is running inside a Tauri desktop window
 * or in a regular browser. When running in Tauri, the app switches from
 * the WASM compositor to native Tauri commands for better performance.
 *
 * Detection uses the `@tauri-apps/api` internal `isTauri()` check, which
 * inspects `window.__TAURI_INTERNALS__`. This is set by Tauri's WebView
 * injection and is not present in regular browsers.
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

	// Check for Tauri internals injection. Tauri 2.0 sets
	// `window.__TAURI_INTERNALS__` with a `convertFileSrc` and
	// `invoke` function.
	if (typeof window === "undefined") {
		cachedIsTauri = false;
		return false;
	}

	cachedIsTauri =
		"__TAURI_INTERNALS__" in window || "__TAURI__" in window;

	return cachedIsTauri;
}
