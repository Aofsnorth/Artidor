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

// Remove artifacts that a `--target web` build must NOT ship. wasm-pack
// overwrites its own outputs but never deletes foreign files left in the
// out-dir, so a `--target bundler` glue file (`artidor_wasm_bg.js`) from an
// earlier build survives every subsequent `--target web` rebuild. Its mere
// presence next to the `.wasm` makes Turbopack wire the worker's
// `"./artidor_wasm_bg.js"` wasm import to the (cyclic, bundler-style) file
// instead of the web loader's inline imports, producing a LinkError
// ("function import requires a callable") at WebAssembly.instantiate().
// Stripping it here keeps the on-disk package matching `package.json.files`.
const staleArtifacts = ["artidor_wasm_bg.js", ".gitignore"];
for (const name of staleArtifacts) {
	fs.rmSync(path.join(pkgDir, name), { force: true });
}

// Neutralize React Fast Refresh false-positives in the generated glue.
//
// The web loader (`artidor_wasm.js`) lives under the Turbopack root (the
// package is symlinked into node_modules but resolves to `rust/wasm/pkg`), so
// Turbopack runs the React Refresh SWC transform over it in dev. That
// transform flags any function whose body calls a `use[A-Z]*` method as a
// custom hook and wraps the enclosing wasm import shim in a `$RefreshSig$()`
// signature helper. On the main thread the helper returns the function
// unchanged, but inside a Web Worker the refresh hooks are absent, so the
// runtime substitutes a DUMMY context whose `signature()` returns a function
// that yields `undefined`. The wrapped wasm import (`__wbg_useProgram_*`,
// which calls `.useProgram(...)` on a WebGL2 context) therefore becomes
// `undefined` and `WebAssembly.instantiate()` throws
// `LinkError: ... function import requires a callable` — but only in the
// export worker, only in dev.
//
// Rewriting the `.useMethod(` calls to computed access `["useMethod"](` is
// behavior-identical but invisible to the detector, which only matches
// non-computed member expressions. This keeps the standard `--target web`
// output working in workers without disabling Fast Refresh app-wide.
const loaderPath = path.join(pkgDir, "artidor_wasm.js");
let loaderSource = fs.readFileSync(loaderPath, "utf8");
const hookShapedCall = /\.(use[A-Z][A-Za-z0-9]*)\(/g;
let rewrites = 0;
loaderSource = loaderSource.replace(hookShapedCall, (_match, method) => {
	rewrites += 1;
	return `["${method}"](`;
});
if (rewrites > 0) {
	fs.writeFileSync(loaderPath, loaderSource);
	console.log(
		`[wasm-package-init] rewrote ${rewrites} hook-shaped method call(s) to computed access`,
	);
}

console.log("[wasm-package-init] set main to auto-init.js");
