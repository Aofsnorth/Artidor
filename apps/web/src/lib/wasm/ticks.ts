import { TICKS_PER_SECOND as _TICKS_PER_SECOND } from "artidor-wasm";

// `_TICKS_PER_SECOND()` reads the wasm instance, which is NOT instantiated
// during SSR / `next build` prerendering — calling it there throws
// "Cannot read properties of undefined (reading 'TICKS_PER_SECOND')" and
// fails the build when a page like /projects is prerendered.
//
// The tick rate is a fixed constant (rust/crates/time/src/media_time.rs:
// `TICKS_PER_SECOND = 120_000`, asserted in tests), so use it as the
// server-side value and read the authoritative one from wasm in the browser.
// Any server-rendered timecodes are re-derived on hydration anyway.
export const TICKS_PER_SECOND =
	typeof window === "undefined" ? 120_000 : _TICKS_PER_SECOND();
