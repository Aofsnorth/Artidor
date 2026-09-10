# Renderer perf pass (editor-perf-100-pass)

Scope (OWN ONLY): `apps/web/src/services/renderer/compositor/unified-compositor.ts`
+ `apps/web/src/services/renderer/compositor/wasm-compositor.ts` +
`apps/web/src/services/renderer/compositor/raster-cache.ts` +
`apps/web/src/services/renderer/effect-preview.ts` (owned). Everything else
— `preview/index.tsx`, `preview-frame-cache.ts`, `video-cache/service.ts`,
`lib/effects/*`, `gpu-renderer.ts`, `frame-descriptor.ts`, Rust/WASM — is
READ-ONLY and was used for verification only.

Rule check: `AGENTS.md` (plan → execute → verify; smallest safe change),
`RULES.md` (no unrelated refactor, no new deps, no visual/behavior change),
`CHECKLIST.md` + `docs/harness/DOCUMENTATION_POLICY.md` (this file is the
required doc gate), `PERMISSIONS.md` (L1 safe edit; no Rust/build/secret
paths). No visual/behavior change: every request still paints its own canvas;
the cache only skips redundant GPU work. No Rust changes; no WASM rebuild.

Baseline (verified by reading code first, not assumed):

- Main-thread path: `renderFrame()` sync on the main thread via
  `wasm-compositor.ts` → `artidor-wasm` (WGPU). `unified-compositor.ts` is a
  thin preview/export switch (WASM preview, Tauri-IPC export).
- `wasm-compositor.syncTextures` already zero-alloc: double-buffered ID sets,
  identity-based upload skip (`uploadedTextures` map).
- Preview composited-frame cache (`preview-frame-cache.ts`, read-only):
  budget-capped (96 MB) + `MAX_CACHE_ENTRIES = 30`, **already LRU**
  (touch-on-hit in both `cachePreviewFrame` and the `preview/index.tsx`
  blit path) — the task's "FIFO" premise was wrong; verified, not changed.
- Video cache (`video-cache/service.ts`, read-only): prefetch 6 + sink pool
  12; raw LRU-frame retention deliberately disabled
  (`resolveDecodedFrameCacheLimit` → 0 when pooled, `lruCachedFrames: 0`).
  There is no "video LRU 64 frames" to tune — verified, not changed.
- `raster-cache.ts` (owned): already a 32-entry LRU (touch-on-hit);
  `frame-descriptor.ts` also pools the texture map per frame. Text rasters
  skip caching for per-character animators.
- `effect-preview.ts` (owned): idle-chunked (`MAX_CONCURRENT_RENDERS = 4`,
  `requestIdleCallback` drain, cancellable jobs), deterministic procedural
  sources cached per `(pattern, effectType)`, no `getImageData` readback.
  No request dedupe existed — every card re-ran `resolveEffectPasses` + GPU.

## Fix (one real change + one micro-opt, same owned file)

- `effect-preview.ts` — bounded GPU-output result cache (request dedupe):
  `getEffectPreviewCacheKey` (effect + key-sorted params + render size +
  uniform dims), `effectPreviewResultCache` (32 entries ≈ 3.2 MB of 160×160
  bitmaps), `getEffectPreviewDedupeHits()` counter,
  `clearEffectPreviewCache()`. Fast path: default-params (`{}`) repeats probe
  the cache *before* the registry lookup and the source factory, so a repeat
  skips procedural-source build + `effectsRegistry.get` as well as the GPU
  pipeline; custom-params repeats skip the GPU via the resolved-params key.
  Only successful GPU renders are cached — fallback/source bitmaps (GPU
  warming up) never pin. LRU touch on every hit.
- `effect-preview.ts` — key builder uses string concat, not `Array.join`
  (bench: 21.8 ms vs 36.8 ms over 40k keys, identical output).
- `effect-preview.test.ts` (test for the owned file) — dedupe test seeds one
  bitmap, issues 3 identical default-params requests, asserts
  `rendered && !usedFallback` × 3 and `getEffectPreviewDedupeHits()` +3
  (avoided re-renders counted, zero GPU passes resolved); key test asserts
  insertion-order stability and param/uniform-dimensions separation.
- `previewSourceForTest` seam: injectable source factory (default `null` =
  production path) so dedupe tests run without canvas/WebGL.

## Review log (20 distinct rounds)

### Round 1 — dedupe: 3 duplicate requests → 3 cache hits, 0 re-renders

Scenario: seed one bitmap under the default-params key for `blur`, call
`renderPreview({ effectType: "blur", params: {} })` × 3 with a stub source.

Evidence: `effect-preview.test.ts` "coalesces duplicate (effect+params)
requests via the cache key".

Command: `bun test --isolate
apps/web/src/services/renderer/effect-preview.test.ts`

Result: PASS. `getEffectPreviewDedupeHits()` delta = 3; all outcomes
`{ rendered: true, usedFallback: false }`; `resolveEffectPasses` /
`gpuRenderer` never reached on repeats (short-circuit before registry
lookup).

### Round 2 — key correctness: order-stable, param/dim-separated

Scenario: build keys for `{x:1,y:2}` vs `{y:2,x:1}` vs `{x:1,y:3}` vs
1920×1080 uniforms.

Evidence: same file, "keys differ across params sizes…".

Result: PASS. Reordered keys equal; different param / different uniform dims
differ — no card can reuse a wrong bitmap.

### Round 3 — verify: frame cache is already LRU, not FIFO

Scenario: read `preview-frame-cache.ts` + `preview/index.tsx:385-387`.

Evidence: `cachePreviewFrame` deletes + re-sets on `cache.get` (touch);
the blit path also deletes + re-sets after a hit. Both insertion-ordered
`Map` ends = MRU.

Result: honest non-improvement. Task premise (FIFO) wrong; no FIFO→LRU
conversion exists to do. Hit behavior documented: repeat
`(frame, scale.toFixed(3))` blits ~0.5 ms vs 5–80 ms re-render. No owned
file changed (both files read-only).

### Round 4 — verify: no "video LRU 64 frames" exists

Scenario: read `video-cache/service.ts` (`PREFETCH_BUFFER_SIZE = 6`,
`SINK_POOL_SIZE = 12`, `resolveDecodedFrameCacheLimit` → 0 when pooled,
`lruCachedFrames: 0`).

Evidence: code read; `getStats()` hardcodes `lruCachedFrames: 0` with a
`ponytail:` comment explaining pooled-canvas staleness.

Result: honest non-improvement. Nothing to convert; retention is prefetch +
current-frame by design. Read-only file, untouched.

### Round 5 — tunable cap: fixed 30/32 is fine, documented why

Scenario: assessed `deviceMemory`/`hardwareConcurrency` caps for the frame
cache (30) and raster cache (32).

Evidence: `preview-frame-cache.ts` already scales by *bytes* (96 MB budget
→ 12 entries at 1080p, 3 at 4K, 30 only for tiny previews); raster entries
are full-canvas bitmaps whose count, not device RAM, bounds GPU upload
churn; `navigator.deviceMemory` is Chromium-only/undefined here (verified:
`undefined` in bun/Node probe); per-render navigator reads add main-thread
sync cost for zero correctness gain.

Result: honest non-improvement. Fixed caps kept; no owned file changed.

### Round 6 — key builder: concat beats Array.join, identical output

Scenario: 40k keys (mixed `{}` / `{intensity}`) via `[...].join("|")` vs
string concat.

Evidence: `/tmp/keybench.mjs` — join 36.8 ms, concat 21.8 ms (~40% faster),
outputs byte-identical.

Result: APPLIED. Builder uses concat in `effect-preview.ts`.

### Round 7 — dedupe value: 165-card resolve vs key-only hit path

Scenario: 165 × (`buildDefaultParamValues` + 2-pass `resolveEffectPasses`
shape) vs 165 × key-stringify + `Map.get`.

Evidence: `/tmp/morebench.mjs` — full 1.00 ms vs hit 0.06 ms (~16×).

Result: PASS (justifies the cache; the win is skipping resolve+GPU, the key
itself is ~0.4 µs). No code change beyond rounds 1/6.

### Round 8 — raw `{}` probe: skip registry + source build on repeats

Scenario: 5k default-params requests with early raw-key probe + hit-skip vs
full defaults path.

Evidence: `/tmp/rawbench.mjs` — probe+skip 0.95 ms (5 000 skips) vs
full-path 1.07 ms.

Result: APPLIED (raw-key probe before `effectsRegistry.get` + source
factory). Small per-call win; the real win is what it skips on hits.

### Round 9 — LRU touch cost quantified, kept deliberately

Scenario: 200k hits on a 32-entry `Map`: delete+set touch vs plain `get`.

Evidence: `/tmp/lrubench.mjs` — touch 145.9/180.8 ms vs plain 16.0/11.0 ms
(~10× per-hit overhead in micro-benchmark).

Result: honest non-improvement kept deliberately: absolute cost ≈ 0.8 µs
per hit, negligible next to the ~0.5 ms blit it preserves; dropping the
touch would regress hot-effect retention (evict-as-if-cold). No change.

### Round 10 — raster-cache hit path verified cheap (read-only evidence)

Scenario: 200k `getCachedRaster`-shaped hits (get + dims check + touch).

Evidence: `/tmp/rasterkey.mjs` — 14.8/15.1 ms (~0.07 µs/hit).

Result: honest non-improvement. Owned `raster-cache.ts` already optimal;
no change.

### Round 11 — syncTextures steady-state: all-skip, sub-ms (verify only)

Scenario: 120-layer frame × 300 frames, all uploaded, same source identity.

Evidence: `/tmp/syncbench.mjs` — 4.3/0.9 ms total, 36 000 skips, 0 uploads.

Result: honest non-improvement. `wasm-compositor.ts` already zero-alloc
(double-buffered sets) + identity-skip; no change.

### Round 12 — scheduleRender insert shape already optimal (verify only)

Scenario: 165-card mixed-priority inserts: backward-scan splice (current)
vs push+full-sort.

Evidence: `/tmp/morebench2.mjs` — scan 0.82/0.25 ms vs sort 2.34/0.77 ms.

Result: honest non-improvement. Current O(k) insert kept; no change.

### Round 13 — queue drain shift() is noise at 165 jobs (verify only)

Scenario: drain 165 jobs via `shift()` loop vs index cursor.

Evidence: `/tmp/morebench.mjs` — shift 1.085/0.044 ms vs index
0.005/0.029 ms (one outlier, rest noise).

Result: honest non-improvement. No rewrite of `pumpQueue`; no change.

### Round 14 — cancel findIndex scan is noise (verify only)

Scenario: 1 000 `findIndex` scans over a 165-job queue.

Evidence: `/tmp/morebench3.mjs` — 1.5/0.9 ms total (~1 µs/cancel).

Result: honest non-improvement. No id→index map added; no change.

### Round 15 — has+get double lookup avoided in new code (applied)

Scenario: 200k `has()+get()` vs single `get()` + undefined check.

Evidence: `/tmp/morebench3.mjs` — 2.3 ms vs 1.9 ms.

Result: APPLIED implicitly — all new probes use single `Map.get()` with
`undefined`/truthiness checks, never `has` + `get`.

### Round 16 — key replacer-array vs manual encode (kept replacer)

Scenario: 40k 3-param keys via `JSON.stringify(params, sortedKeys)` vs
manual sorted-string build.

Evidence: `/tmp/morebench2.mjs` — replacer 31.4 ms vs manual 34.5 ms,
byte-identical.

Result: honest non-improvement. Replacer form kept; no change.

### Round 17 — `Object.keys().length` fast-path is free (kept)

Scenario: 200k emptiness checks on `{}` and 1-key objects.

Evidence: `/tmp/morebench.mjs` — 9.1 ms / 7.0 ms (~0.04 µs/check).

Result: PASS (the `{}`-vs-custom branch costs nothing). No change.

### Round 18 — uniform-dims optional-chain hoisting is noise (not applied)

Scenario: 200k `(u?.width ?? 160)` chains vs hoisted consts.

Evidence: `/tmp/morebench2.mjs` — 0.7 ms vs 0.6 ms.

Result: honest non-improvement. Readability kept; no hoist.

### Round 19 — BGRA→RGBA loop left alone (read-only, evidence only)

Scenario: 1080p indexed-channel loop × 2 runs (the `renderNative` shape in
read-only `unified-compositor.ts`).

Evidence: `/tmp/morebench3.mjs` — 10.4/7.2 ms per frame; bulk-set+swap
variants cannot beat V8 bounds-check elimination on this shape.

Result: honest non-improvement. Export-path only (not preview hot path);
read-only file untouched. (Also: hoisting the per-call Tauri `import()` —
~20 µs/1k calls in `/tmp/invokebench.mjs` — was considered and rejected:
export-path only, dynamic import keeps browser bundles from loading Tauri.)

### Round 20 — key determinism: 10k identical builds agree

Scenario: 10k builds of the same logical key.

Evidence: `/tmp/seeded.mjs` — all 10 000 identical.

Result: PASS. Dedupe is stable across re-renders (no flicker/miss churn).

## Validation

- `bun test --isolate
  apps/web/src/services/renderer/effect-preview.test.ts
  apps/web/src/lib/perf/preview-frame-cache.test.ts` → 12 pass, 0 fail
  (23 expects).
- `bunx biome check` on both touched files → clean (format fixed, re-run
  clean).
- `tsc --noEmit -p apps/web/tsconfig.json` → no errors mentioning
  `effect-preview` (repo has pre-existing errors elsewhere; working tree
  also carries unrelated tracks' changes — see note).
- Bench evidence: `/tmp/keybench.mjs`, `/tmp/rawbench.mjs`,
  `/tmp/lrubench.mjs`, `/tmp/evictbench.mjs`, `/tmp/syncbench.mjs`,
  `/tmp/rasterkey.mjs`, `/tmp/morebench*.mjs`, `/tmp/invokebench.mjs`,
  `/tmp/seeded.mjs` (bun 1.3.14, this machine).

## Honest non-improvements (summary)

- Frame cache FIFO→LRU: already LRU (round 3). Read-only; untouched.
- Video LRU 64: does not exist; prefetch+pool by design (round 4).
  Read-only; untouched.
- Tunable device-based cap: fixed + byte-budget already; navigator signals
  unavailable/unreliable (round 5). Untouched.
- `syncTextures`, queue insert/drain/cancel, raster hit path, replacer
  encoding, optional-chain hoisting, BGRA loop, Tauri import hoist:
  measured, all noise or correctly-shaped already (rounds 9–19).
- No `bun bench` used: `bun:test` exports no `bench` (verified:
  `Export named 'bench' not found`, bun 1.3.14) — all hotspot evidence is
  `performance.now()` micro-benchmarks above, per-task-allowed ("bun bench
  evidence" read as bun-run benchmarks).
- No live-GPU numbers: `OffscreenCanvas`/WebGL unavailable in bun
  (verified `undefined`); dedupe wins are evidenced by avoided-work counts
  (round 1: 3/3 hits) + resolve-skip micro-benchmark (round 7), not by
  frame-time profiling.

## Changed files (this track only)

- `apps/web/src/services/renderer/effect-preview.ts` (result-cache dedupe
  + concat key builder + test seam)
- `apps/web/src/services/renderer/effect-preview.test.ts` (dedupe + key
  tests)
- `docs/features/editor-perf-100-pass/renderer.md` (this file)

Note: the working tree contains pre-existing changes from other tracks
(react pass, commands/scenes/clipboard) — left alone per scope. Owned
`unified-compositor.ts`, `wasm-compositor.ts`, `raster-cache.ts` verified
optimal, unchanged.

What's New not updated because: internal perf pass, no user-visible change.
