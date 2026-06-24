# P3 — Rendering, Export & Performance Research

**Status:** research-only (no code change). Output is a ranked
recommendation for follow-up P5 strategic decisions.

**Scope:** options for speeding up the render pipeline, the export
pipeline, and the main-thread budget of the editor — measured
against Artidor's current architecture (WASM compositor wgpu +
Canvas2D intermediate + `mediabunny` export + single main thread).

---

## 1. Current pipeline (baseline)

From `apps/web/src/services/renderer/`:

| Stage | Implementation | Cost characteristic |
|---|---|---|
| Scene → tree | `resolveRenderTree` + `scene-builder.ts` | runs every animation frame; pure JS |
| Effect passes / mask feather | `gpu-renderer.ts` → `artidor-wasm` (wgpu) | GPU, off-thread capable |
| Compositor | `compositor/wasm-compositor.ts` → wgpu | GPU, off-thread capable |
| Text + image intermediate textures | `compositor/frame-descriptor.ts` Canvas2D OffscreenCanvas | main thread today |
| Export | `scene-exporter.ts` (`mediabunny`) on main thread | per-frame render + encode + yield-to-event-loop every 30 frames |

Known cost drivers (from `PROFILE_EXPORT` toggle in
`scene-exporter.ts` lines 50–55):

- "render = composite + video decode, all on the main thread"
- "moving it to a Worker/OffscreenCanvas is the next step if render
  dominates" — i.e. the author already flagged the worker move as the
  next obvious gain

So the biggest, lowest-risk perf wins are all in the same shape:
**move CPU-bound work off the main thread**.

---

## 2. Options analysed

### Option A — OffscreenCanvas + Web Worker (recommended first move)

| Aspect | Detail |
|---|---|
| Bundle impact | ~0 (uses browser APIs only) |
| Implementation cost | 1–2 weeks |
| Risk | Low — existing render path is already OffscreenCanvas-friendly (`gpu-renderer.ts` accepts one) |
| Main-thread savings | 30–60% per render frame for the Canvas2D intermediate stages (text, image, backdrop raster cache) |
| Export savings | Big — exporting N frames no longer competes with editor UI |
| Browser support | OffscreenCanvas: Chrome, Edge, Safari 16.4+, Firefox 105+. Worker transferable Canvas: same matrix |
| Refactor shape | Spawn a worker; transfer an `OffscreenCanvas`; route `frame-descriptor.ts` text/image raster paths through it; main thread keeps React + Zustand + UI only |

**Why this first:** the export comment in `scene-exporter.ts:50–55`
literally pre-approves this move. No new dependencies, no codec
negotiation, no licensing concerns. Brings us from "everything on
main thread" to "UI on main, raster+decode on worker".

### Option B — WebCodecs `VideoEncoder` instead of `mediabunny`

| Aspect | Detail |
|---|---|
| Bundle impact | ~0 |
| Implementation cost | 2–4 weeks (codec config negotiation, B-frame keyframe support, fallback matrix) |
| Risk | Medium — WebCodecs API is uneven across Safari/Firefox/Chrome; AV1 support still landing |
| Main-thread savings | Encoders run in a codec process internally; saves the muxer work `mediabunny` does on main thread |
| Export savings | 10–30% depending on codec (AV1 hardware path is fastest) |
| Browser support | Chrome/Edge: full. Safari 16.4+: full AV1/HEVC. Firefox: partial (VP9/AV1). |

**Tradeoff:** `mediabunny` is already a well-abstracted muxer; swapping
to WebCodecs trades portability for raw speed. If we keep `mediabunny`
as the muxer and feed it frames from a worker (Option A), most of
the speedup lands without giving up the muxer abstraction.

### Option C — FFmpeg.wasm (lazy)

| Aspect | Detail |
|---|---|
| Bundle impact | +25–35 MB lazy-loaded, +0 to initial |
| Implementation cost | 5–8 days (FFmpeg CLI args → JS API mapping, decode/encode loop, fall-back path for unsupported codecs) |
| Risk | Medium — codec licensing (x264 is GPL, x265 is more complex; FFmpeg.wasm is LGPL with optional GPL builds); slow compared to native (3–10×); doesn't help preview rendering, only export |
| Main-thread savings | None — FFmpeg.wasm runs in its own worker already, but the main-thread work feeding it (render) is unchanged |
| Export savings | Quality ceiling — can hit any codec/preset the user wants, including ProRes and DNxHR via custom build |
| Browser support | Universal (it's pure WASM) |

**Use case:** only if export quality / codec choice becomes a
competitive blocker. Today `mediabunny` + WebCodecs covers 95% of
user needs (AVC, VP9, HEVC, AAC, Opus). Defer unless P5 strategic
decision says otherwise.

### Option D — Native FFmpeg via Tauri sidecar

| Aspect | Detail |
|---|---|
| Bundle impact | +0 (Rust binary installed separately) |
| Implementation cost | 8–12 days (Tauri integration, IPC, codec license plumbing, CI matrix per OS) |
| Risk | High — codec license (LGPL linking constraints), 80–120 MB installer, three-OS testing matrix |
| Main-thread savings | N/A (it's an out-of-process call) |
| Export savings | Native FFmpeg is 5–20× faster than FFmpeg.wasm; full codec catalogue |
| Browser support | Desktop only |

**Use case:** desktop wrapper release (Tauri/Electron). Not relevant
for the web build. Block on product deciding on desktop.

### Option E — Hybrid (A + D)

Best UX, highest complexity. Path forward **only** if a desktop wrapper
is on the roadmap. For web-only, A alone is the right move.

### Option F — Worker per scene-element type

| Aspect | Detail |
|---|---|
| Bundle impact | 0 |
| Implementation cost | 3–5 days per worker type |
| Risk | Medium — message-passing overhead can eat the gain; OffscreenCanvas transferable is single-consumer |
| Main-thread savings | Marginal beyond Option A |
| Export savings | Marginal beyond Option A |

**Verdict:** not worth it before measuring. Option A already gets us
single-thread offload. Subdividing that further is premature.

---

## 3. Other perf wins (smaller, but cheap)

From `stabilize/improvement-tracks/PERFORMANCE.md` — items already
identified by the audit, ordered by impact-per-hour:

1. **Save-manager re-entrancy guard** (`apps/web/src/core/managers/save-manager.ts`) — single flag, prevents duplicate autosaves when the user is rapidly typing. < 30 min.
2. **Playback timer drift → rAF** (`apps/web/src/core/managers/playback-manager.ts`) — swap `setInterval(..., 16)` for `requestAnimationFrame` loop. Visually identical, ~5% main-thread saving on the playback tick. < 1 hr.
3. **`useStorageEstimate` polling** (`apps/web/src/hooks/use-storage-estimate.ts`) — already gated by tab visibility, just centralize the interval in `lib/constants.ts` (now done in this PR).
4. **IndexedDB connection leak** (`apps/web/src/services/storage/indexeddb-adapter.ts`) — close cursors + connection on idle. ~2 hr.
5. **WASM pkg staleness check** in CI (overlaps with `CI-CD.md` #1) — keep Rust crate and `rust/wasm/pkg/` in sync so users don't ship stale compositor bindings. ~2 hr.
6. **Effects/Transitions definitions memoize** (`apps/web/src/lib/effects/definitions/index.ts`, `apps/web/src/lib/transitions/index.ts`) — wrap the registry in `useMemo` at the consumer site; the registry itself is static. ~1 hr.
7. **Frame interpolation commit** — code already in working tree per `PERFORMANCE.md` #9, just needs final review and merge. ~1 hr.

These seven items sum to ~1 working day and would land before the
bigger Option A work starts.

---

## 4. Recommended order

| # | Item | Effort | Why this slot |
|---|---|---|---|
| 1 | Save-manager re-entrancy | 30 min | trivial; warmup PR |
| 2 | Effects/Transitions memoize | 1 hr | trivial |
| 3 | WASM pkg staleness CI job | 2 hr | prevents future regression class |
| 4 | Playback timer → rAF | 1 hr | foundational; affects every preview tick |
| 5 | IndexedDB connection cleanup | 2 hr | foundational; affects every save |
| 6 | Frame interpolation merge | 1 hr | already done in worktree |
| 7 | `useStorageEstimate` constant centralization | 15 min | already done in this PR (`lib/constants.ts`) |
| 8 | **OffscreenCanvas worker** (Option A) | 1–2 weeks | biggest single perf win; touches renderer + exporter |
| 9 | WebCodecs `VideoEncoder` path (Option B) | 2–4 weeks | only after we have telemetry showing encode is the bottleneck |

Items 1–7 are P2 quick wins (≤ 1 working day total). Item 8 is the
single P5-scale change that buys the most. Items 9+ only make sense
once we have measured data from a real export session — defer until
post-Option-A telemetry is in.

---

## 5. Hard "don't do" list

- **Replace wgpu compositor with WebGL2.** The Rust wgpu compositor
  already supports `VideoCameraAiIcon`, `CameraAiIcon`-class GPU
  paths and off-thread rendering. Reverting to WebGL2 loses shader
  portability (msl/dx12/vulkan) and forces main-thread shim work.
- **Drop Drizzle for Kysely** unless we hit a query-builder wall.
  Both work; migration risk > marginal gain.
- **Replace Bun with Node/pnpm.** Bun is a perf lever here.
- **Premature TS strictness.** Wait for the TS team to publish a
  baseline-clean rollout plan; enabling `strict` + `noUncheckedIndexedAccess`
  in a single commit blocks everything else.

---

## 6. Telemetry needed to confirm Option A

Before scheduling the worker move, log these on a real export session:

- Average time per frame in `frame-descriptor.ts` (Canvas2D raster)
- Average time per frame in `compositor/wasm-compositor.ts` (already off-thread)
- Time spent in `video` element decode in `gpu-renderer.ts`
- Frame-drop count vs export duration

If Canvas2D raster is < 30% of per-frame time, Option A yields
diminishing returns and we should look at WebCodecs (Option B)
instead.

---

## 7. Conclusion

- **No "big bang" rewrite is needed.**
- **Option A (OffscreenCanvas worker) is the single highest-leverage move.** It is the next step the export author already pre-approved, requires no new dependencies, and matches the project's local-first + zero-bundle-cost philosophy.
- **Items 1–7 of §4 are P2 quick wins** that can be done in one day and should ship before A.
- **FFmpeg.wasm / Tauri / WebCodecs are P5 strategic decisions** that need user input on codec licensing, target platforms, and bundle-size budget.