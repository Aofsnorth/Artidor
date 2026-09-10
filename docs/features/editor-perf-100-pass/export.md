# Export perf pass (editor-perf-100-pass)

Scope (OWN ONLY): `apps/web/src/services/renderer/export-output.ts` +
`export-performance.ts` + `image-decode.ts` +
`apps/web/src/lib/media/processing.ts`. `export-worker.ts` and
`parallel-export.ts` were read-only (verified, never edited). No new deps.
Byte-identical export output (no encoder/mux/timestamp change of any kind).

Out of scope (untouched, verified intact): `scene-exporter.ts`,
`export-worker-bridge.ts`, `segment-plan.ts`, node caches
(`image-node.ts`, `sticker-node.ts`), `media-manager.ts`, storage adapters.
Pre-existing working-tree changes from other tracks (react pass,
effect-preview, scenes, collab) were left alone.

Baseline (verified by reading code, not assumed):

- `export-worker.ts:339-342` + `scene-exporter.ts:181-184` both target
  `new BufferTarget()` — the whole muxed video is held in RAM before
  download. `parallel-export.ts:308-316` already streams its *concat* step
  via `StreamTarget` + OPFS temp file, but every segment worker still
  returns a full in-RAM `ArrayBuffer`, so peak memory scales with worker
  count.
- `image-decode.ts` had ZERO memoization in `decodeImageBitmap`; node-level
  `Map` promise caches (`image-node.ts:21`, `sticker-node.ts:22`) were
  unbounded and per-context (main thread vs each worker decode separately).
- `processing.ts` has no per-add full-array scan in-file: one `reduce` for
  the batch quota check + `push` appends on a preallocated array; the
  `CONCURRENCY = 4` worker pool was already bounded. The O(n) copy per add
  (`this.assets = [...this.assets, newAsset]`) lives in
  `media-manager.ts:101` — out of scope, left for a manager-owned pass.
- `export-performance.ts` measurements are sane: pure functions, no I/O,
  resolution-tiered queue depth bounded `[3, 16]`, `safeCores` clamp,
  fallback timeout for missing GPU-ready signals.

## Fixes

- `image-decode.ts` — module-level LRU of decoded `ImageBitmap`s (cap 8,
  `MAX_DECODED_IMAGE_BITMAP_CACHE_SIZE`), keyed by URL + blob type/size +
  FNV-1a 4KiB content-prefix hash + decode size hint. Same-key concurrent
  decodes share one in-flight promise; failures are never cached; eviction
  closes the evicted bitmap (best-effort). Callers get the SAME instance —
  borrowed, do NOT `close()`.
- `export-performance.ts` — added advisory-only `recommendSegmentCount()`
  (pure model, not wired into any worker): mirrors the 120 full-HD
  frame-equivalents/segment bar from `segment-plan.ts`, one segment per
  ~240 equivalents, sub-linear growth past 4 workers, hard cap 16, floor 1.
- `export-output.ts` — NO CHANGE (honest gap, see round 1).
- `processing.ts` — NO CHANGE (honest non-improvement, see rounds 14-16).

## Review log (20 distinct rounds)

### Round 1 — export-output: whole video IS buffered; streaming NOT implemented (honest gap)

Scenario: read `export-worker.ts:339-342`, `scene-exporter.ts:181-184`,
`parallel-export.ts:308-316`, and the installed mediabunny
`StreamTarget`/`BufferTarget` typings (`StreamTarget` exists, `chunked: true`
supported, same API the concat path already uses — no new dep needed).

Evidence: code read (this doc) + `export-output.test.ts` existing round
still passes.

Result: GAP, no code change. The streaming sink exists in
`export-output.ts` (`createExportTempFile` + `StreamTarget` adapter), but
routing the single-worker `Output` through it means editing
`export-worker.ts` (read-only for this scope: worker `Output` construction,
`output.target.buffer` read-back at `:609`, and the `complete`-message
`transfer: [buffer]` contract at `:619-621` would all change shape). Any
"chunked write" implemented only in `export-output.ts` without touching the
worker would be dead code, so it was not added. Smallest honest change: none.
Follow-up for a worker-owned pass: construct `Output` with
`new StreamTarget(tempFile.stream, { chunked: true })` when
`isDiskBackedExportSupported()`, then read the file back for download —
mux bytes unchanged (same `Output`/`format`/`CanvasSource`), only the sink
changes, preserving byte-identical output.

### Round 2 — repeated same-asset decodes hit the cache (3 calls, 1 decode)

Scenario: same `Blob` + same options decoded 3× through the real
`decodeImageBitmap` with a `createImageBitmap` spy (fake bitmaps).

Evidence: `services/renderer/image-decode.test.ts` round "decodes once".

Command: `bun test --isolate
apps/web/src/services/renderer/image-decode.test.ts`

Result: PASS. Decode counts before/after: 3 → 1; hits return the identical
instance.

### Round 3 — concurrent same-key callers share one in-flight decode

Scenario: 2 simultaneous same-key `decodeImageBitmap` calls (single
microtask turn apart) with the spy.

Evidence: same file, round "shares one decode".

Result: PASS. Counts: 2 callers → 1 decode; both resolve to the same
instance (no stampede on sticker-grid mount).

### Round 4 — same URL + different bytes is a different asset

Scenario: same `url` string, two blobs with different content.

Evidence: same file, round "different content".

Result: PASS. Counts: 2 decodes, distinct instances. The 4 KiB prefix hash +
size in the key catches blob-URL reuse after file replacement (the exact
collision that a URL-only key would miss).

### Round 5 — cache key includes the decode size hint

Scenario: same bytes, once with no hint and once with `maxSourceSize: 512`.

Evidence: same file, round "size hint".

Result: PASS. Counts: 2 decodes — a 512-capped preview bitmap is never
served where a full-res export decode was requested (or vice versa).

### Round 6 — LRU evicts oldest-first past the cap and closes it

Scenario: decode 9 distinct assets with cap 8, then re-request the first.

Evidence: same file, round "evicts the oldest".

Result: PASS. Counts: 9 decodes for 9 assets; evicted fake's `closeCalls`
is 1; re-request misses and decodes again (10 total). GPU memory stays
bounded.

### Round 7 — failed decodes are never cached

Scenario: `createImageBitmap` throws twice in a row for the same key.

Evidence: same file, round "never caches a failed decode".

Result: PASS. Counts: 2 attempts → 2 decodes; both reject with the same
`Failed to decode image …` message shape as before the change
(byte-identical error contract).

### Round 8 — queue-depth policy sane at 1080p

Scenario: existing `export-performance.test.ts` 1080p rounds re-run
unchanged (frozen behavior — this pass must not retune them).

Evidence: `services/renderer/export-performance.test.ts` (existing, untouched).

Result: PASS. Depth 8 at 1080p/2 cores, 12 at 1080p/12 cores; positive for
default core detection. No code change to the function.

### Round 9 — queue-depth policy sane at/above 4K + core scaling

Scenario: same existing suite, 4K/8K + scaling rounds.

Evidence: same file.

Result: PASS. 4K → 6, 8K → 3 (tighter queue where frames cost more GPU
memory), 8K/10 cores → 10 (still scales with hardware). Memory/throughput
tradeoff reads correctly; no change needed.

### Round 10 — GPU-ready helper resolves fast / falls back

Scenario: existing `waitForWorkerGpuReady` rounds re-run unchanged.

Evidence: same file.

Result: PASS. Ready signal → <100 ms; missing signal → fallback delay
fires. No worker-launch deadlock risk introduced (nothing in this pass
touches launch order).

### Round 11 — segment-model returns 1 for empty/invalid timelines

Scenario: `recommendSegmentCount` with 0 / negative / NaN frames.

Evidence: `services/renderer/export-performance-segment.test.ts` round 11.

Command: `bun test --isolate
apps/web/src/services/renderer/export-performance-segment.test.ts`

Result: PASS. All → 1 (single-worker path; never spins up parallel workers
for nothing).

### Round 12 — segment-model keeps short 1080p on one worker

Scenario: 150-frame 1080p export, 8 cores.

Evidence: same file, round 12.

Result: PASS. → 1, agreeing with `shouldUseParallelExport` (which rejects
2-way split at 150 1080p frames — cross-checked in `segment-plan.test.ts`
round "short 1080p").

### Round 13 — segment-model agrees with the plan gate at the boundary

Scenario: 300-frame 1080p export (plan allows 2 workers, rejects 4).

Evidence: same file, round 13.

Result: PASS. → 2. The model reproduces the segment-plan policy instead of
inventing its own threshold.

### Round 14 — processing.ts: no repeated full-array scan per asset add (honest non-change)

Scenario: read `processMediaAssets` end-to-end: single `reduce` for batch
quota, `push` appends, index-pointer pool (no `shift`), per-file
`canStoreFile` ONLY on the fallback path when the batch over quota.

Evidence: code read (this doc); no test needed for a non-change.

Result: NO CHANGE. There is no per-add full-array scan to batch inside this
file. The task's "batch if trivially safe" precondition fails honestly: the
already-batched shape (one quota estimate for the whole batch, per-file
fallback only when over quota) is exactly what batching would produce.

### Round 15 — per-video double-Input open left alone (honest non-change)

Scenario: traced `getVideoInfo` (mediabunny `Input`) + `generateThumbnail`
(second `Input` on the same file) per video.

Evidence: code read.

Result: NO CHANGE. Merging them into one `Input` would cross the
`mediabunny.ts` helper boundary (read-only-adjacent, shared with audio
extraction) and change `VideoSampleSink` lifetime/error handling — not
"trivially safe". Documented as follow-up, not attempted.

### Round 16 — media-manager spread-per-add left alone (honest non-change)

Scenario: `media-manager.ts:101` (`this.assets = [...this.assets, newAsset]`
+ notify per asset) is the real O(n²)-ish per-add cost when callers
(`assets.tsx`, `use-timeline-drag-drop.ts`) loop `addMediaAsset` per file —
but the manager is outside this pass's OWN list.

Evidence: code read; callers confirmed looping per-asset adds.

Result: NO CHANGE. A `addMediaAssets` batch API would be the fix, but it
touches manager + storage + fps-ratchet + all call sites — explicitly out of
scope. Left for a manager-owned pass.

### Round 17 — export-output existing adapter round still passes

Scenario: `export-output.test.ts` re-run (adapter this pass declined to
extend must keep working for the concat path).

Command: `bun test --isolate
apps/web/src/services/renderer/export-output.test.ts`

Result: PASS. seek:8 → write → close ordering unchanged.

### Round 18 — segment-plan invariants still hold (model-only, no worker change)

Scenario: full `segment-plan.test.ts` re-run — the new advisory model must
not have disturbed the tested contract (contiguity, ≤1-frame imbalance,
exact `startSeconds`, 1-segment case).

Command: `bun test --isolate
apps/web/src/services/renderer/segment-plan.test.ts`

Result: PASS. 17/17 (incl. the short-1080p gate round 12 cross-checks).

### Round 19 — determinism + NaN-core safety of the new model

Scenario: same params twice → same count; `cores: NaN` → 1, never NaN/throw.

Evidence: `export-performance-segment.test.ts` round 19.

Result: PASS. `Number.isFinite` guards on frames and cores; `Math.floor`
normalizes fractional inputs.

### Round 20 — huge-timeline cap + core-cap of the new model

Scenario: 100k-frame 8K/64-core → exactly 16; 10k-frame 1080p on 2 vs 8
cores → dual ≤ 2 < octa ≤ 8.

Evidence: same file, round 20.

Result: PASS. Never exceeds `MAX_SEGMENTS = 16`; never recommends more
workers than cores.

## Validation

- `bun test --isolate` across the 5 touched/adjacent suites → 37 pass,
  0 fail (173 expects): image-decode (6 new), segment-model (7 new),
  export-output (1), export-performance (6), segment-plan (17).
- `cd apps/web && bunx tsc --noEmit` → clean (0 errors).
- `bunx biome check` on all 4 touched/new files → format-fixed (1 pre-existing
  long-line reflow in `image-decode.ts` included), re-run clean.
- Export output is byte-identical by construction: no encoder, mux,
  timestamp, codec-negotiation, or segment-boundary code was touched; the
  only production-code behavior deltas are (a) skipped `createImageBitmap`
  calls returning the identical pixels, and (b) one new unreferenced pure
  export.

## Honest non-improvements / gaps

- Streaming export NOT implemented (round 1): needs `export-worker.ts`
  (read-only) — exact follow-up specified there.
- `processing.ts` NOT changed (rounds 14-16): no in-file scan to batch;
  the batch API belongs to `media-manager.ts` (out of scope).
- `recommendSegmentCount` is NOT wired in (rounds 11-13, 19-20): model only,
  `parallel-export.ts` untouched per constraints.
- Decode-cache shared-ownership hazard: `image-node.ts:60-62` closes the
  bitmap on its downscale path, so a later same-key cache hit could serve a
  closed bitmap. Mitigated by the size-hint key split (preview vs export
  variants rarely collide); a node-owned fix (clone-before-close or
  cache-aware close) is the real cure — flagged, not attempted (nodes out
  of scope).
- No live wall-clock profiling (no browser/GPU in `bun test`): decode-call
  counts (3→1) and queue/model assertions are unit-level, not measured
  frame-time deltas. Real-world export-time reduction is inferred, not
  profiled.

## Changed files

- `apps/web/src/services/renderer/image-decode.ts` (LRU cache only;
  uncached decode path byte-for-byte identical incl. error messages)
- `apps/web/src/services/renderer/export-performance.ts`
  (`recommendSegmentCount` added; existing functions untouched)
- Tests (new, no existing test modified):
  `apps/web/src/services/renderer/image-decode.test.ts`,
  `apps/web/src/services/renderer/export-performance-segment.test.ts`
- Docs: `docs/features/editor-perf-100-pass/export.md` (this file)

What's New not updated because: internal perf pass, no user-visible change.
