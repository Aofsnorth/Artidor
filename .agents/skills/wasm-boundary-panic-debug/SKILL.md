---
name: wasm-boundary-panic-debug
description: Use when a wasm call in Artidor throws a trap ("memory access out of bounds", "unreachable") or a Rust panic appears in the browser console, especially when the blamed function looks mathematically harmless. Covers the tsify/JS-number boundary panic, the attach-a-panic-hook probe, bisect-by-input, and the guarded-caller pattern. Also use when adding any exported function that returns MediaTime (i64) or other large integers.
---

# Wasm boundary panic debugging (Artidor)

## When to use

- A wasm export traps in the browser: `RuntimeError: memory access out of bounds` or `unreachable`, and the Rust math looks safe (all `checked_*`).
- The E2E suite reports a pageerror on a button that merely triggers a wasm call (e.g. `Go to start`), but the blamed function passes input probes.
- You are adding an export whose return type is `MediaTime` (i64 newtype) or any i64/u64 larger than 2^53.

## Root cause this repo hit (proven 2026-09-27, commit 450d2851)

`MediaTime` is `#[derive(tsify_next::Tsify)]` with `into_wasm_abi`. tsify's
conversion panics with `(Converting type failed) Error: <N> can't be
represented as a JavaScript number` when the i64 exceeds `2^53`
(Number.MAX_SAFE_INTEGER). One panic aborts the whole wasm instance; every
later GPU/wasm call then dies with misleading `memory access out of bounds`
and cascading `RefCell already borrowed` panics (`rust/wasm/src/gpu.rs`
take/restore helpers). The button that "crashes" in E2E is often just the
first caller after the poisoned state, not the guilty function.

## Procedure

1. **Attach the real panic hook.** The default wasm panic prints nothing.
   In a Bun/Node probe, call `initializeGpu()` first (it runs
   `console_error_panic_hook.set_once()`), capture `console.error`, and
   reproduce. The true Rust panic message and file:line appear there.
   Without this you are guessing.
2. **Bisect by input against the built pkg** (`rust/wasm/pkg/artidor_wasm.js`
   runs in Bun directly). Sweep categories: normal, float, NaN, Infinity,
   undefined/null fields, u32-max values, strings, BigInt-vs-number. A clean
   `Error: invalid type: ...` is serde rejecting input — fine. A trap is the
   bug.
3. **Mind the 2^53 boundary.** Any result (or intermediate) crossing
   `Number.MAX_SAFE_INTEGER` panics inside tsify's conversion even when the
   Rust math itself is checked and correct. `parseTimecode` hit this with a
   u32-sized hours field: `429496729 * 3600 * 120000 ≈ 1.86e17 > 2^53`.
   Native `cargo test` passes (i64 holds it); the wasm boundary does not.
4. **Fix at the boundary, not the symptom.** Compute with `checked_mul` /
   `checked_add`, then fold out-of-range results into `None` (see
   `safe_media_time` + `MAX_JS_SAFE_TICKS` in `rust/crates/time/src/timecode.rs`).
   Callers already treat `None` as "invalid input".
5. **Guard UI event handlers that call wasm** (blur/keydown/render paths).
   Wrap in try/catch and degrade to the existing error state
   (`apps/web/src/components/editable-timecode.tsx` safe* helpers). A wasm
   trap thrown from a blur handler is a fatal page error; caught, it is just
   a red input field.
6. **Re-verify with the Playwright spec that failed**
   (`bunx playwright test tests/15-click-all-buttons.spec.ts`) plus the
   bisect probe — every previously-trapping input must return a clean value.

## When NOT to use

- The trap reproduces with obviously invalid input and a clean serde error
  message in Bun — that is input validation working, no bug.
- GPU/WebGPU errors (`createBuffer`, texture format, device lost) — those
  follow the device-loss recovery path (`wasm-compositor.ts` beginRecovery);
  see the export stability notes in `docs/features/editor-perf-100-pass/export.md`.
- Pure JS TypeErrors — no wasm involved.

## Pitfalls

- `wasm-function[N]` addresses in the trap stack identify the wasm binary
  layout, not your source. Resolve the caller chain from the JS frames
  (glue → exported fn → app code) instead.
- Bun (JSC) reports the panic trap as `Unreachable code should not be
  executed`; Chrome reports `memory access out of bounds` for the same
  poisoned-instance state. Do not chase the message wording.
- A green `cargo test` on native proves nothing about the wasm boundary —
  native i64 holds values the JS-number conversion rejects.
- `bun install` after checking out a Dependabot branch can rewrite
  `bun.lock`; restore it before switching branches or you will drag stray
  lockfile churn into main.
