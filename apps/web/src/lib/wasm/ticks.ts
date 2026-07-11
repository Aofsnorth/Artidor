// The tick rate is fixed in the Rust time core (`TICKS_PER_SECOND = 120_000`).
// Keep this module wasm-free so timeline utilities, tests, SSR, and initial
// editor render don't eagerly instantiate `artidor-wasm` just to read a
// constant. Runtime WASM APIs are imported directly where real WASM work is
// needed.
export const TICKS_PER_SECOND = 120_000;
