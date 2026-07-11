/**
 * Post-build setup for the artidor-wasm npm package.
 *
 * wasm-pack's `--target web` output requires consumers to call the async
 * `init()` function before any WASM exports can be used. That does not match
 * how this project consumes the package (direct synchronous imports from
 * `artidor-wasm` in Next.js and Bun). This script creates a small
 * auto-initializing entry point (`auto-init.js`) that awaits `init()` and then
 * re-exports everything, and updates `package.json` to use it as the package
 * main.
 *
 * Keeping this as a build-time script lets us stay on the standard web target
 * (which works with Bun) without manually editing generated files after each
 * build.
 */
import fs from "node:fs";
import path from "node:path";

const pkgDir = "rust/wasm/pkg";
const pkgJsonPath = path.join(pkgDir, "package.json");
const autoInitPath = path.join(pkgDir, "auto-init.js");

const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

pkg.main = "auto-init.js";
pkg.files = [
	"artidor_wasm_bg.wasm",
	"artidor_wasm.js",
	"artidor_wasm.d.ts",
	"auto-init.js",
];
pkg.sideEffects = ["./auto-init.js", "./snippets/*"];

fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

const autoInit = `import init, { initSync } from "./artidor_wasm.js";
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
`;

fs.writeFileSync(autoInitPath, autoInit);

console.log("[wasm-package-init] set main to auto-init.js");
