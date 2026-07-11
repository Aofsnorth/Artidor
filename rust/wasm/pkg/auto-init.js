import init, { initSync } from "./artidor_wasm.js";
export * from "./artidor_wasm.js";
export { init };

if (typeof process !== "undefined" && process.versions?.node) {
	const { readFileSync } = await import("node:fs");
	const { fileURLToPath } = await import("node:url");
	const { dirname, join } = await import("node:path");
	const wasmPath = join(
		dirname(fileURLToPath(import.meta.url)),
		"artidor_wasm_bg.wasm",
	);
	initSync({ module: readFileSync(wasmPath) });
} else {
	await init();
}
