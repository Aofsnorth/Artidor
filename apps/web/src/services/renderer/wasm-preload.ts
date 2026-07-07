/**
 * WASM module preload — warms the browser's module cache so the export
 * worker's `import("artidor-wasm")` is near-instant on first export.
 *
 * The export worker dynamically imports `artidor-wasm` (the WASM GPU
 * compositor). On a cold browser cache, this means:
 *   1. Fetch the .wasm binary (~2-5MB)
 *   2. Compile the WASM module
 *   3. Instantiate the module
 *
 * Steps 1-2 take 2-8 seconds on a typical connection. By preloading
 * the module on the main thread during editor idle time, the browser
 * caches the compiled module. When the export worker imports the same
 * URL, it hits the cache and skips fetch+compile — only instantiation
 * remains (~100ms).
 *
 * This is a progressive enhancement: if the preload fails (e.g. WASM
 * not supported, network error), the export worker will import normally
 * at export time. No error is surfaced to the user.
 *
 * Called via `requestIdleCallback` after the editor mounts, so it never
 * competes with the editor's own initialization work.
 */

let preloaded = false;

/**
 * Preload the artidor-wasm module into the browser's module cache.
 * Safe to call multiple times — only the first call does work.
 */
export function preloadWasmModule(): void {
	if (preloaded) return;
	preloaded = true;

	const schedule = (cb: () => void) => {
		if ("requestIdleCallback" in window) {
			(window as Window).requestIdleCallback(cb, { timeout: 5000 });
		} else {
			setTimeout(cb, 2000);
		}
	};

	schedule(() => {
		void import("artidor-wasm")
			.then(() => {
				console.info("[preload] artidor-wasm module cached for export");
			})
			.catch((error) => {
				// Non-fatal — export will import normally if preload fails.
				console.warn(
					"[preload] artidor-wasm preload failed (non-fatal):",
					error instanceof Error ? error.message : error,
				);
			});
	});
}
