# Apps/Web Maximum Performance Optimization — Complementary Research & Gap Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan was produced by deep research and direct code analysis; **no code was changed during research**.
>
> **Relationship to existing plans:** This document complements (not replaces) the following existing plans:
> - `features/web-performance-optimization/PLAN.md` — bundle + runtime Phase 1, zero-copy GPU Phase 2, deeper renderer Phase 3.
> - `docs/performance/OPTIMIZATION_PLAN.md` — comprehensive P0–P8 roadmap (GPU, cache, export, React, bundle, audio, network).
> - `docs/superpowers/plans/2026-07-11-apps-web-performance-hardening.md` — CI/security baseline + measured bundle/timeline/export optimization.
> - `docs/superpowers/plans/2026-07-10-capcut-killer-core.md` — perf harness, proxy preview, smart timeline, beat sync, AI macros.
>
> This plan focuses on **gaps and additional angles** discovered during deep research that are either missing or only lightly covered in the existing plans.

**Goal:** Capture the additional performance gaps found in `apps/web` by deep research and direct code analysis, so they can be implemented alongside the existing performance plans. Covers export, timeline, editor, preview, storage, and load.

**Architecture:** Keep the existing architecture (Next.js 16 + React 19 + Zustand + Rust/WASM/WGPU + WebCodecs via MediaBunny). Optimize in-place: reduce unnecessary work, pool allocations, avoid per-frame React churn, move I/O off the main thread, and adopt browser-native high-performance APIs (OPFS, `content-visibility`, IntersectionObserver, `requestIdleCallback`, React Compiler). No speculative renderer rewrite.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Tailwind, Bun, Rust/WASM, WGPU, WebCodecs/MediaBunny, IndexedDB, OPFS.

## Global Constraints

- Preserve current user changes and project behavior.
- No speculative large rewrite; architecture stays as-is.
- Browser-native APIs before dependencies; existing dependencies before new ones.
- One verified root cause per change; measure before and after when possible.
- TDD for behavior changes: failing test/check first, minimal fix, verify green.
- Validate lint, typecheck, tests, build, security workflows after every batch.
- Do not edit `.env*`, secrets, auth, security, CI, or license files.
- No new dependency without the justification documented in `docs/harness/DEPENDENCY_DECISIONS.md` and approval for high-risk ones.
- Update What's New for every user-facing performance improvement.

---

## 1. Research Summary: What Makes Web Video Editors Fast

### 1.1 CapCut Web (web.dev case study)

- **WebAssembly + SIMD**: CapCut used Emscripten to port the C++ engine; SIMD improved processing performance by ~300% vs. non-SIMD WASM.
- **WebAssembly Exception Handling**: switching to WASM EH reduced bundle size by 15% and improved runtime performance.
- **Decode → display pipeline**: decoded frames are displayed on the editing canvas below the preview. CapCut uses SIMD-optimized decoders and hardware paths where possible.
- **Template sharing**: one million+ templates shared code between native and web via WASM, proving the Rust/WASM direction in Artidor is correct.

**Implication for Artidor:** continue migrating logic to Rust/WASM; ensure SIMD is enabled for the WASM build; avoid duplicating decode/encode logic in JS.

### 1.2 WebCodecs Best Practices (MDN, Chrome for Developers, WebCodecs Fundamentals)

- **Hardware acceleration is the single biggest lever**: `VideoEncoder` with `hardwareAcceleration: "prefer-hardware"` can be 10–100× faster than software.
- **Always close resources**: `VideoFrame`, `AudioData`, and codec instances hold native resources; failing to `.close()` them leaks memory and can crash the tab after <100 active frames.
- **Monitor encoder queue size**: `VideoEncoder.encodeQueueSize` must be bounded to avoid unbounded memory growth.
- **Use workers for frame handling**: individual frame/chunk callbacks can clutter the main thread; move them to a Web Worker. `VideoFrame` is transferable.
- **isConfigSupported**: probe before `configure()` to avoid runtime rejections.
- **First frame should be a key frame**; typical keyframe interval every 30–60 frames.

**Implication for Artidor:** export-worker already uses WebCodecs and hardware acceleration; the main risk is resource lifecycle and queue backpressure. Preview decoding should use bounded LRU caches and explicit `VideoFrame.close()`.

### 1.3 WebGPU/WebGL vs. Canvas 2D (Joan León, MasterSelects, Rendley, WebGPU benchmarks)

| Pipeline | 1080p frame time | Sustainable FPS |
|---|---|---|
| Canvas 2D `getImageData` | ~45 ms | ~8 fps |
| WebGL fragment shader | ~4 ms | ~60 fps |
| WebGPU compute shader | ~2 ms | ~60 fps |

- **GPU-first compositing** is the only way to hit real-time 60 fps with effects.
- **Keep frames on the GPU**: avoid CPU readback (`getImageData`, `readPixels`) and GPU-CPU-GPU round trips.
- **Texture pooling** and ping-pong framebuffers are essential for multi-pass effects.
- **Flat layer arrays** match GPU execution better than deep nested scene trees.

**Implication for Artidor:** the WASM/WGPU compositor is already the right path. The main JS-side wins are: eliminate CPU BGRA→RGBA conversion in Tauri native export, pool `OffscreenCanvas` textures, avoid temporary canvases, and keep scene graph resolution cheap.

### 1.4 Storage: OPFS vs. IndexedDB vs. Cache API

- **IndexedDB**: good for structured metadata; bad for large binary blobs because of structured-clone overhead and no random access.
- **OPFS (Origin Private File System)**: 3× faster project loads reported by LumaField; synchronous access handles in workers; ideal for 200 MB+ media files and random-access reads.
- **Cache API**: best for immutable static assets (WASM binaries, icon sprites, AI models); not for user media.
- **localStorage**: 5–10 MB limit, synchronous, only for small UI state.

**Implication for Artidor:** project metadata and small state can stay in IndexedDB; large media files should move to OPFS, especially for the export worker and thumbnail/waveform caching.

### 1.5 React/Next.js Performance (Vercel rules, React Compiler, bundle analysis)

- **Eliminate waterfalls**: `Promise.all` for independent fetches, start promises early, await late.
- **Bundle optimization**: `@next/bundle-analyzer` to find bloat; `optimizePackageImports` for barrel imports; dynamic imports for heavy routes/components.
- **Re-render optimization**: React Compiler (React 19) can automatically memoize components and hooks; it is a build-time transform with no runtime cost. It fixes 60–70% of re-render bugs at Meta but does not fix architectural issues.
- **Zustand selectors**: use stable selectors; return primitives when possible; use `useShallow` for objects/arrays; avoid returning new objects from selectors unless memoized.
- **DOM-level**: `content-visibility: auto` + `contain-intrinsic-size` for off-screen panels/lists; IntersectionObserver for lazy behavior instead of scroll listeners.

**Implication for Artidor:** enable React Compiler, run bundle analysis, standardize icon imports, lazy-load editor panels, and fix Zustand subscription patterns in the timeline stores.

### 1.6 Memory Management in Heavy Web Apps

- **Chrome DevTools Memory panel**: heap snapshots, allocation timeline, detached elements.
- **Common leaks**: detached DOM trees, unbounded Maps/Sets, unclosed `VideoFrame`, object URLs, global event listeners, retained closure captures.
- **Rule of thumb**: if live JS heap grows linearly during repeated operations, there is a leak.

**Implication for Artidor:** audit export history map, unbounded frame caches, object URL lifetimes, and `window` event listeners.

---

## 2. Current Codebase Bottlenecks (Found by Direct Analysis)

### 2.1 Editor / Bundle Load

| Location | Issue | Impact |
|---|---|---|
| `apps/web/src/app/editor/[project_id]/page.tsx` | Panel components (`AssetsPanel`, `PropertiesPanel`, `Timeline`, `PreviewPanel`, `EffectsView`, `TransitionsView`, `AdjustmentsView`, `PluginsView`) are statically imported, not lazy-loaded. | Heavy initial editor bundle. |
| Same file | Floating panels render the same component twice (dock placeholder + floating window). | Duplicate React subtree work and DOM. |
| `editor-header.tsx`, `export-button.tsx`, `loading.tsx`, `export-modal.tsx` | Mixed icon libraries: `@hugeicons/core-free-icons`, `lucide-react`, `react-icons/fa6`. | Duplicate SVG bundles, inconsistent tree-shaking. |
| `apps/web/src/app/layout.tsx` | Two Google Fonts (`Inter` + `Playfair_Display`) loaded for every route. | Extra font request/blocking on first paint. |
| `export-button.tsx` | 944 lines; `page.tsx` 718 lines. | Large, hard-to-split chunks. |
| `next.config.ts` | No `@next/bundle-analyzer` configured; `optimizePackageImports` already present but needs validation. | No quantitative bundle visibility. |

### 2.2 Timeline / State Management

| Location | Issue | Impact |
|---|---|---|
| `core/managers/playback-manager.ts` | `updateTime()` dispatches `playback-update` `window` event every frame via `requestAnimationFrame`. | Forces every listener (timeline, preview, UI) to wake up 60×/s. |
| `hooks/timeline/use-timeline-playhead.ts` | Subscribes to `playback-update` and runs a separate `requestAnimationFrame` auto-scroll loop when `autoScrollEnabled && isPlaying`. | Double rAF loops; duplicated scroll math. |
| Same file | `getSelectedKeyframeTimes()` scans all tracks/elements on every `playback-update`. | O(n) scan every frame when keyframes selected. |
| `hooks/timeline/use-timeline-playhead.ts` | `handleScrub` calls `findSnapPoints` on every pointer move (coalesced to rAF, but still per-frame work). | Expensive snap math during drag. |
| `stores/timeline-store.ts`, `editor-ui-store.ts` | State updates spread entire objects (`trackHeights`, `trackSliders`, `trackOpacity`, `floatingPanels`). | All subscribers re-render even if only one property changed. |
| `core/managers/timeline-manager.ts` | `getGroupMembers` / `expandSelectionByGroup` scan all tracks/elements. | O(n) on large timelines. |
| Timeline panels | No virtualization; all tracks/elements are rendered into the DOM regardless of viewport. | DOM bloat and style recalc on long timelines. |

### 2.3 Preview / Rendering

| Location | Issue | Impact |
|---|---|---|
| `services/renderer/compositor/unified-compositor.ts` | Native Tauri export path does CPU BGRA→RGBA conversion in JS loop (lines 117–124). | ~8M iterations per 1080p frame on export. |
| `services/renderer/compositor/wasm-compositor.ts` | `ensureOffscreenCanvas()` creates a new `OffscreenCanvas` for every texture upload that isn't already one. | GC pressure and allocation churn. |
| `services/renderer/gpu-renderer.ts` | Same per-effect `OffscreenCanvas` allocation pattern. | GC pressure. |
| `services/renderer/canvas-renderer.ts` | Per-frame scale pass iterates over every `frame.items` when preview is downscaled. | O(n) CPU work per frame. |
| `services/renderer/scene-builder.ts` | Scene graph is rebuilt from scratch on every render; arrays `slice().sort()` per track. | Wasted object creation. |
| `services/renderer/resolve.ts` | Effect passes resolved every frame; recursive `Promise.all` over scene tree. | Frame jank on deep trees. |
| `stores/preview-canvas-scope.ts` | `samplePreviewCanvas()` creates a new temporary `<canvas>` element every call. | DOM allocation + layout thrash. |
| `hooks/use-raf-loop.ts` | Well-optimized (stops when disabled, visibility-aware). | Good pattern to preserve. |

### 2.4 Export / Storage

| Location | Issue | Impact |
|---|---|---|
| `services/renderer/export-worker.ts` | Entire export buffer built in memory via `BufferTarget`; no streaming. | OOM risk on long/4K exports. |
| `services/renderer/parallel-export.ts` | All segment buffers held in memory simultaneously before concatenation. | Memory scales with worker count. |
| `services/renderer/export-worker-bridge.ts` | Audio `Float32Array` copied before transfer (line 218). | Wasted CPU/memory for large audio. |
| `services/renderer/export-codec.ts` | Codec probes are sequential (`await` in loop). | Slower export startup. |
| `core/managers/project-manager.ts` | `exportHistory` Map grows unbounded (memory leak). | Memory grows with repeated exports. |
| `services/storage/indexeddb-adapter.ts` | Opens the database on **every** operation; no connection pooling; no batch API. | ~50–200 ms overhead per DB op. |
| `services/storage/indexeddb-adapter.ts` | `getAll()` loads entire store into memory. | Slow startup with many projects. |
| Media storage | Large media files stored in IndexedDB via `storageService`. | OPFS would be faster and more scalable. |

### 2.5 Memory / Resource Lifecycle

- `MediaManager.clearProjectMedia` and `clearAllAssets` revoke object URLs correctly, but there is no LRU cap on `videoCache` decoded frames.
- No evidence of `VideoFrame.close()` audit in preview decoding path (must verify).
- Export worker warm-reuse holds 50–100 MB GPU/WASM memory; `disposeWarmWorker` exists but must be audited for all paths.

---

## 3. Gap-Focused Optimization Roadmap

Items marked **(new gap)** are not covered in detail by the existing plans. Items marked **(complement)** add a different angle to an existing plan item.

### P0 — Critical: correctness, prevent crashes/OOM, biggest React churn wins

1. **Fix per-frame playback event storm** (new gap) — `PlaybackManager` dispatches `playback-update` every rAF frame; double rAF loop in `use-timeline-playhead.ts`.
2. **Fix Zustand object-spread re-renders** in `timeline-store.ts` and `editor-ui-store.ts` (new gap) — entire objects are replaced on single-property updates.
3. **IndexedDB connection pooling + batch API** (new gap) — database opened on every operation; no batching.
4. **Fix BGRA→RGBA CPU conversion in native Tauri export path** (new gap) — `unified-compositor.ts` loops over 8M pixels per 1080p frame in JS.
5. **Texture / OffscreenCanvas pooling in compositor and GPU renderer** (complement) — `ensureOffscreenCanvas` creates a new canvas per upload.
6. **Temporary canvas pooling in `preview-canvas-scope.ts`** (new gap) — creates a new DOM `<canvas>` every scope sample.
7. **Export history LRU + TTL** (new gap) — `project-manager.ts` export history Map grows unbounded.

### P1 — High: measured wins, medium effort

8. **Enable React Compiler** (new gap) — React 19 build-time automatic memoization is not enabled.
9. **Memoize `getSelectedKeyframeTimes` / snap points** (new gap) — scans all tracks on every playback event.
10. **Parallel codec probing + codec result cache** (complement) — `export-codec.ts` probes sequentially.
11. **Audio zero-copy transfer to export worker** (new gap) — `Float32Array` is copied before transfer.
12. **Scene graph memoization / caching** (complement) — rebuilt from scratch per frame.
13. **Bundle analysis baseline** (complement) — no analyzer configured to measure impact.
14. **Mixed icon libraries + duplicate panel rendering** (complement) — icons and panel duplicates bloat the bundle.

### P2 — Medium/Low: polish and future-proofing

15. **Font subsetting / route-specific loading** (new gap) — two Google Fonts loaded globally.
16. **CSS `content-visibility` on off-screen panels** (complement) — simple win for hidden panels.
17. **OPFS for large media files** (complement) — media bytes currently in IndexedDB.
18. **Streaming or chunked export output** (complement) — entire buffer held in memory.

---

## 3.5 Mapping to Existing Plans

| This plan item | Existing plan coverage | Why this document still adds value |
|---|---|---|
| Per-frame playback event storm | Lightly noted in `docs/performance/OPTIMIZATION_PLAN.md` | Concrete file paths (`playback-manager.ts`, `use-timeline-playhead.ts`) and throttling strategy. |
| Zustand object-spread re-renders | Not explicitly covered | Specific stores and update patterns identified. |
| IndexedDB connection pooling | Not covered | Directly addresses ~50–200 ms per storage operation. |
| BGRA→RGBA CPU conversion | Not covered (existing plan focuses on upload zero-copy) | 8M pixel JS loop per export frame is a separate bottleneck. |
| Texture / OffscreenCanvas pooling | Covered by `features/web-performance-optimization/PLAN.md` Phase 2 | Adds JS-side pooling as a complementary win even before Rust changes. |
| `preview-canvas-scope` temporary canvas | Not covered | Small DOM churn win in inspector scopes. |
| Export history LRU | Not covered | Fixes a real memory leak. |
| React Compiler | Not covered | Build-time win for React 19. |
| `getSelectedKeyframeTimes` memo | Not covered | Removes O(n) scan every frame. |
| Parallel codec probing | Covered by `docs/performance/OPTIMIZATION_PLAN.md` P3 | Adds implementation detail and cache. |
| Audio zero-copy | Not covered | Removes large audio copy during export. |
| Scene graph memoization | Covered by `docs/performance/OPTIMIZATION_PLAN.md` P4 | Adds project revision counter + cache invalidation detail. |
| Bundle analyzer | Covered by `docs/performance/OPTIMIZATION_PLAN.md` P6 | Adds first task to establish baseline before other changes. |
| Icon/panel duplication | Partially covered by `features/web-performance-optimization/PLAN.md` Phase 1 | Adds duplicate panel instance fix and icon consolidation. |
| OPFS for media | Covered by `docs/performance/OPTIMIZATION_PLAN.md` and noted in architecture | Adds migration fallback detail. |
| Streaming export | Covered by `docs/performance/OPTIMIZATION_PLAN.md` P3 | Adds MediaBunny streaming target evaluation step. |

---

## 4. Implementation Tasks

### Task 1: Add Bundle Analysis & Measure Current Baseline

**Files:**
- Create: `scripts/analyze-bundle.mjs` (or use `@next/bundle-analyzer`)
- Modify: `apps/web/next.config.ts`
- Modify: `package.json` (add script if needed)

**Interfaces:**
- Produces `bun run analyze:web` command that opens treemap.

- [ ] **Step 1: Add `@next/bundle-analyzer` dev dependency** (if not present). Check with `bun pm view @next/bundle-analyzer` and follow `DEPENDENCY_POLICY.md`.
- [ ] **Step 2: Add conditional analyzer wrapper to `next.config.ts`**:
  ```ts
  const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
  ```
  (Use `import` if config is ESM-only.)
- [ ] **Step 3: Add script to `package.json`**:
  ```json
  "analyze:web": "cross-env ANALYZE=true bun run build:web"
  ```
- [ ] **Step 4: Run baseline analysis and capture screenshots/sizes** of the largest client chunks.
- [ ] **Step 5: Commit**:
  ```bash
  git add package.json apps/web/next.config.ts scripts/analyze-bundle.mjs
  git commit -m "chore: add bundle analyzer baseline"
  ```

---

### Task 2: Standardize Icon Library & Remove Duplicate Bundles

**Files:**
- Modify: `apps/web/src/components/editor/editor-header.tsx`
- Modify: `apps/web/src/components/editor/export-button.tsx`
- Modify: `apps/web/src/components/editor/export-modal.tsx`
- Modify: `apps/web/src/app/editor/[project_id]/loading.tsx`
- Modify: `apps/web/next.config.ts` (add `optimizePackageImports` for `lucide-react` if kept, or remove `lucide-react`/`react-icons` entirely)

**Interfaces:**
- All editor icons come from `@hugeicons/core-free-icons` only.

- [ ] **Step 1: Replace `react-icons/fa6` FaDiscord in `editor-header.tsx` with an `@hugeicons` equivalent (or inline SVG if no equivalent exists).**
- [ ] **Step 2: Replace `lucide-react` icons in `export-button.tsx`, `export-modal.tsx`, `loading.tsx` with `@hugeicons` equivalents.**
- [ ] **Step 3: Remove `lucide-react` and `react-icons` from `apps/web/package.json` if no other file uses them.** Use `grep` to confirm.
- [ ] **Step 4: If `lucide-react` must stay for non-editor pages, add it to `optimizePackageImports` in `next.config.ts`.**
- [ ] **Step 5: Run `bun run analyze:web`, compare chunk sizes, and record delta.**
- [ ] **Step 6: Run lint, typecheck, build, tests.**
- [ ] **Step 7: Commit**:
  ```bash
  git commit -m "perf: standardize icons to hugeicons to reduce editor bundle"
  ```

---

### Task 3: Lazy-Load Editor Panels

**Files:**
- Modify: `apps/web/src/app/editor/[project_id]/page.tsx`

**Interfaces:**
- `AssetsPanel`, `PropertiesPanel`, `Timeline`, `PreviewPanel`, `EffectsView`, `TransitionsView`, `AdjustmentsView`, `PluginsView` are loaded via `React.lazy` + `Suspense`.
- Loading skeletons match panel dimensions to avoid layout shift.

- [ ] **Step 1: Convert static imports to `lazy()` imports**:
  ```ts
  const AssetsPanel = lazy(() => import("@/components/editor/panels/assets"));
  const PropertiesPanel = lazy(() => import("@/components/editor/panels/properties"));
  const Timeline = lazy(() => import("@/components/editor/panels/timeline"));
  const PreviewPanel = lazy(() => import("@/components/editor/panels/preview"));
  const EffectsView = lazy(() => import("@/components/editor/panels/assets/views/effects"));
  const TransitionsView = lazy(() => import("@/components/editor/panels/assets/views/transitions"));
  const AdjustmentsView = lazy(() => import("@/components/editor/panels/assets/views/adjustments"));
  const PluginsView = lazy(() => import("@/components/editor/panels/assets/views/plugins"));
  ```
- [ ] **Step 2: Wrap lazy panels in lightweight `Suspense` boundaries with dimension-matched skeletons.**
- [ ] **Step 3: Verify panels still mount and E2E tests pass.**
- [ ] **Step 4: Run `bun run analyze:web` and record first-load JS reduction.**
- [ ] **Step 5: Commit**.

---

### Task 4: Fix Duplicate Panel Rendering in Floating Windows

**Files:**
- Modify: `apps/web/src/app/editor/[project_id]/page.tsx`
- Create or modify: `components/editor/panels/panel-portal.tsx` (if needed)

**Interfaces:**
- When a panel is undocked, only one React instance exists; it is rendered into the floating window via a portal, and the dock shows a placeholder.

- [ ] **Step 1: Replace the current pattern (render actual panel in both dock and floating window) with a portal pattern** so only one component instance is mounted.
- [ ] **Step 2: Keep `DockPlaceholder` as a static placeholder.**
- [ ] **Step 3: Test docking/undocking each panel; verify no state loss.**
- [ ] **Step 4: Commit**.

---

### Task 5: Throttle / Deduplicate Playback Events

**Files:**
- Modify: `apps/web/src/core/managers/playback-manager.ts`
- Modify: `apps/web/src/hooks/timeline/use-timeline-playhead.ts`
- Modify: `apps/web/src/hooks/use-raf-loop.ts` (verify it remains optimized)

**Interfaces:**
- `PlaybackManager` exposes a `subscribe(listener)` callback that is throttled to 30 Hz or coalesced, not fired every rAF frame.
- `use-timeline-playhead` removes the duplicate rAF auto-scroll loop and drives scrolling from the same throttled subscription.
- `playback-update` window event is still dispatched for compatibility but at a lower rate (e.g., 30 Hz) or only when the time actually changes to a new frame.

- [ ] **Step 1: Add a throttled `notify` path in `PlaybackManager` that calls listeners at 30 Hz while playing, immediate while scrubbing/seeking.**
- [ ] **Step 2: Update `use-timeline-playhead` to subscribe to the throttled playback stream instead of the window event + separate rAF loop.**
- [ ] **Step 3: Keep the window event for legacy consumers but throttle it to 30 Hz.**
- [ ] **Step 4: Add a regression test that measures listener invocations during 1 second of playback and asserts ≤ 35.**
- [ ] **Step 5: Verify playhead, auto-scroll, and preview still sync visually.**
- [ ] **Step 6: Commit**.

---

### Task 6: Memoize Expensive Timeline Scans

**Files:**
- Modify: `apps/web/src/hooks/timeline/use-timeline-playhead.ts`
- Modify: `apps/web/src/lib/timeline/snap-utils.ts` (if needed)

**Interfaces:**
- `getSelectedKeyframeTimes` returns a cached result until selection changes.
- `findSnapPoints` is not called on every mouse move; snap points are recomputed only when the underlying scene changes.

- [ ] **Step 1: Wrap `getSelectedKeyframeTimes` in a memo keyed by selection signature.**
- [ ] **Step 2: Debounce `handleScrub` snap calculation or compute snap points outside the hot path.**
- [ ] **Step 3: Add unit tests for memo invalidation.**
- [ ] **Step 4: Commit**.

---

### Task 7: Fix Zustand Object-Spread Re-renders

**Files:**
- Modify: `apps/web/src/stores/timeline-store.ts`
- Modify: `apps/web/src/stores/editor-ui-store.ts`
- Modify: callers that depend on these stores

**Interfaces:**
- Updates to nested maps/objects use `createWithEqualityFn` or immutable helpers that produce shallow-equal objects when the underlying data is unchanged.
- Components use stable selectors and return primitives where possible.

- [ ] **Step 1: Replace `create` with `createWithEqualityFn` and use `shallow` for object-returning selectors.**
- [ ] **Step 2: Update `setTrackHeight`, `setTrackSlider`, `setTrackOpacity`, `popOutPanel`, `dockPanel`, `setFloatingPanelPosition` to only return new objects when the relevant slice changed.**
- [ ] **Step 3: Audit all components consuming these stores; replace whole-store subscriptions with selectors.**
- [ ] **Step 4: Add regression tests for selector stability.**
- [ ] **Step 5: Commit**.

---

### Task 8: Enable React Compiler (React 19)

**Files:**
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/babel.config.js` or `.babelrc` if present
- Modify: `apps/web/tsconfig.json` if needed

**Interfaces:**
- React Compiler is enabled in Next.js build; build output shows compilation summary (number of components optimized, bailed-out, errors).

- [ ] **Step 1: Install `babel-plugin-react-compiler` if needed (check Next.js 16/React 19 built-in support first).**
- [ ] **Step 2: Add `experimental: { reactCompiler: true }` to `next.config.ts` if Next.js supports it natively.**
- [ ] **Step 3: Run `bun run build:web` and fix any compiler errors.**
- [ ] **Step 4: Measure build time and runtime re-render improvement via React DevTools Profiler.**
- [ ] **Step 5: Commit**.

---

### Task 9: IndexedDB Connection Pooling & Batch API

**Files:**
- Modify: `apps/web/src/services/storage/indexeddb-adapter.ts`
- Modify: `apps/web/src/services/storage/service.ts` (or wherever it is consumed)

**Interfaces:**
- `IndexedDBAdapter` opens one database connection per dbName/storeName and reuses it.
- New methods: `batchSet(entries)`, `batchGet(keys)`, `cursor(range?)` for pagination.
- `getAll()` is deprecated or replaced with `cursor()`.

- [ ] **Step 1: Cache `IDBDatabase` connection in the adapter; close only on explicit dispose or page unload.**
- [ ] **Step 2: Add `batchSet` and `batchGet` using a single readwrite/readonly transaction.**
- [ ] **Step 3: Add `cursorIterate` for project/media lists to avoid loading everything into memory.**
- [ ] **Step 4: Update `storageService` to use batch methods for bulk saves/loads.**
- [ ] **Step 5: Add tests for connection reuse, batch operations, and cursor iteration.**
- [ ] **Step 6: Commit**.

---

### Task 10: OPFS for Large Media Files

**Files:**
- Create: `apps/web/src/services/storage/opfs-adapter.ts`
- Modify: `apps/web/src/services/storage/service.ts`
- Modify: `apps/web/src/services/storage/indexeddb-adapter.ts`
- Modify: media import/export paths

**Interfaces:**
- `OpfsAdapter` stores large binary blobs by file path; supports streaming read/write and synchronous access handles inside workers.
- Metadata (file names, offsets, thumbnails) stays in IndexedDB; actual bytes move to OPFS.
- Fallback to IndexedDB if OPFS is unavailable or quota is denied.

- [ ] **Step 1: Audit current media storage path; identify where raw `File`/`Blob` bytes are stored.**
- [ ] **Step 2: Implement `OpfsAdapter` with `writeFile(name, stream)`, `readFile(name, offset, length)`, `deleteFile(name)`, `getSize(name)`.**
- [ ] **Step 3: Update media persistence to store bytes in OPFS and metadata in IndexedDB.**
- [ ] **Step 4: Update export worker to read media from OPFS directly in the worker.**
- [ ] **Step 5: Add quota/availability checks and fallback to IndexedDB.**
- [ ] **Step 6: Add migration for existing projects stored in IndexedDB.**
- [ ] **Step 7: Test import, export, and project load on Chrome/Edge/Firefox/Safari.**
- [ ] **Step 8: Commit**.

---

### Task 11: Bounded Video Frame Cache & `VideoFrame.close()` Audit

**Files:**
- Modify: `apps/web/src/services/video-cache/service.ts` (or wherever `videoCache` is defined)
- Modify: `apps/web/src/services/renderer/resolve.ts`
- Modify: `apps/web/src/services/renderer/nodes/video-node.ts` (if logic lives there)

**Interfaces:**
- `videoCache` is an LRU with max 8–16 decoded `ImageBitmap`/`VideoFrame` entries, explicit eviction, and `.close()` on eviction.
- Preview decoding loop always closes frames after use or transfers them to the compositor without leaking.

- [ ] **Step 1: Inspect existing `videoCache` implementation.**
- [ ] **Step 2: Add LRU cap and explicit `frame.close()` on eviction.**
- [ ] **Step 3: Audit all `VideoFrame` creation sites for `.close()` and add lint rule or helper if possible.**
- [ ] **Step 4: Add test that simulates seeking through a 60-second clip and asserts the active frame count stays bounded.**
- [ ] **Step 5: Commit**.

---

### Task 12: Fix Native Export BGRA→RGBA Conversion

**Files:**
- Modify: `apps/web/src/services/renderer/compositor/unified-compositor.ts`
- Modify: Rust native compositor command if it controls output format (`apps/desktop-web/src-tauri/src/lib.rs` or related)

**Interfaces:**
- Native Tauri render returns RGBA directly, or the JS side uses a WebGL/WASM SIMD path to convert without a per-pixel JS loop.
- If RGBA is not possible from native side, use `ImageData` with the correct color space or a small WASM helper.

- [ ] **Step 1: Check if the Rust native compositor can output RGBA; if yes, change the format and remove the JS conversion loop.**
- [ ] **Step 2: If not, implement a WebGL/WebGPU one-pass conversion or a WASM helper in `artidor-wasm`.**
- [ ] **Step 3: Benchmark 1080p export frame time before and after.**
- [ ] **Step 4: Commit**.

---

### Task 13: Texture / OffscreenCanvas Pooling

**Files:**
- Modify: `apps/web/src/services/renderer/compositor/wasm-compositor.ts`
- Modify: `apps/web/src/services/renderer/gpu-renderer.ts`
- Modify: `apps/web/src/stores/preview-canvas-scope.ts`

**Interfaces:**
- `TexturePool` creates/returns `OffscreenCanvas` instances keyed by width/height; reused across frames.
- `samplePreviewCanvas` uses a pooled temporary canvas instead of `document.createElement("canvas")`.

- [ ] **Step 1: Implement `OffscreenCanvasPool` utility keyed by `${width}x${height}`.**
- [ ] **Step 2: Replace `new OffscreenCanvas(...)` in `wasm-compositor` and `gpu-renderer` with pool borrow/return.**
- [ ] **Step 3: Replace temporary DOM canvas in `preview-canvas-scope.ts` with a pooled `OffscreenCanvas`.**
- [ ] **Step 4: Add pool size cap and eviction.**
- [ ] **Step 5: Add tests for pool reuse.**
- [ ] **Step 6: Commit**.

---

### Task 14: Scene Graph Memoization & Cache

**Files:**
- Modify: `apps/web/src/services/renderer/scene-builder.ts`
- Modify: `apps/web/src/services/renderer/resolve.ts`

**Interfaces:**
- `buildScene` is memoized by project revision id + active scene id; returns a cached scene if the timeline has not changed.
- Sorted track arrays are cached until track order or element list changes.
- Effect pass resolution is cached by effect parameters.

- [ ] **Step 1: Add a project revision counter that increments on every timeline mutation.**
- [ ] **Step 2: Cache built scene keyed by revision + scene id.**
- [ ] **Step 3: Cache sorted track arrays keyed by element list signature.**
- [ ] **Step 4: Cache effect passes keyed by effect id + parameter hash.**
- [ ] **Step 5: Add tests for cache invalidation.**
- [ ] **Step 6: Commit**.

---

### Task 15: Streaming / Memory-Limited Export

**Files:**
- Modify: `apps/web/src/services/renderer/export-worker.ts`
- Modify: `apps/web/src/services/renderer/parallel-export.ts`
- Modify: `apps/web/src/services/renderer/export-worker-bridge.ts`

**Interfaces:**
- Export uses a streaming target (e.g., `FileSystemWritableFileStream` via File System Access API or OPFS file handle) instead of holding the entire buffer in memory.
- Parallel export concatenates segments in a streaming fashion, not by holding all buffers.
- Worker memory is bounded; exports beyond available memory show a clear warning or fall back to a single-segment export.

- [ ] **Step 1: Evaluate MediaBunny's streaming target support; switch `BufferTarget` to a streaming target if available.**
- [ ] **Step 2: If MediaBunny does not support streaming, implement chunked buffer + explicit write to OPFS / File System Access API.**
- [ ] **Step 3: Implement streaming concatenation in `parallel-export.ts`.**
- [ ] **Step 4: Add memory estimate guard and adaptive segment count.**
- [ ] **Step 5: Add tests for large export cancellation and memory stability.**
- [ ] **Step 6: Commit**.

---

### Task 16: Parallel Codec Probing & Cache

**Files:**
- Modify: `apps/web/src/services/renderer/export-codec.ts`

**Interfaces:**
- `negotiateVideoCodec` probes candidates in parallel with `Promise.all` and caches the result per `(format, quality, width, height, fps)`.
- Cache is invalidated only when hardware/software preference changes.

- [ ] **Step 1: Replace sequential `await` loop with `Promise.all` over `isConfigSupported` probes.**
- [ ] **Step 2: Add an in-memory cache keyed by config fingerprint.**
- [ ] **Step 3: Add test for cache hit and invalidation.**
- [ ] **Step 4: Commit**.

---

### Task 17: Timeline Virtualization & `content-visibility`

**Files:**
- Modify: `apps/web/src/components/editor/panels/timeline/*` (track list, clip list)
- Modify: `apps/web/src/app/globals.css` (add utility classes)

**Interfaces:**
- Only visible tracks/clips are rendered; off-screen items use `content-visibility: auto` with `contain-intrinsic-size`.
- IntersectionObserver (or sentinel elements) drives range updates instead of scroll listeners.

- [ ] **Step 1: Measure current DOM node count on a 1000-clip timeline.**
- [ ] **Step 2: Apply `content-visibility: auto` to track rows and clip containers as a quick win.**
- [ ] **Step 3: Implement windowed track/clip rendering with overscan for large timelines.**
- [ ] **Step 4: Test scrolling, selection, and drag-drop still work.**
- [ ] **Step 5: Commit**.

---

### Task 18: Memory Leak & Resource Lifecycle Audit

**Files:**
- Modify: `apps/web/src/core/managers/project-manager.ts`
- Modify: `apps/web/src/services/renderer/export-worker-bridge.ts`
- Modify: `apps/web/src/services/renderer/export-worker.ts`
- Modify: all `window.addEventListener` sites in editor hooks

**Interfaces:**
- `exportHistory` Map has an LRU/TTL cap.
- Warm worker is disposed on editor unmount and after idle timeout.
- All `window` event listeners added in `useEffect` are removed on cleanup.
- Object URLs are revoked after use.

- [ ] **Step 1: Implement `LRUMap` utility or use a bounded Map + timestamp.**
- [ ] **Step 2: Cap `exportHistory` to last 25 exports or 30 days.**
- [ ] **Step 3: Audit all `window.addEventListener` in editor hooks for cleanup.**
- [ ] **Step 4: Audit object URL lifecycle.**
- [ ] **Step 5: Add a heap-snapshot-based test or manual QA checklist.**
- [ ] **Step 6: Commit**.

---

### Task 19: Audio Zero-Copy Transfer

**Files:**
- Modify: `apps/web/src/services/renderer/export-worker-bridge.ts`
- Modify: `apps/web/src/services/renderer/export-worker.ts`

**Interfaces:**
- Audio `Float32Array` channels are transferred directly (no `.slice()` or `new Float32Array(src)` copy) using `structuredClone` or `postMessage` transferables.

- [ ] **Step 1: Remove the copy in bridge serialization and worker deserialization.**
- [ ] **Step 2: Ensure transferables list includes the channel buffers so they are zero-copy.**
- [ ] **Step 3: Test export with a large audio track and verify memory/time improvement.**
- [ ] **Step 4: Commit**.

---

### Task 20: Measurement, What's New & Final Validation Gate

**Files:**
- Modify: `apps/web/src/lib/whats-new/feed.ts`
- Modify: `apps/web/src/app/changelog/page.tsx` if it exists
- Modify: `tests/performance.spec.ts` (from existing CapCut plan) or create new

**Interfaces:**
- A repeatable performance benchmark exists: editor boot time, timeline long-task count under 1000 clips, export dialog open time, 30-second export wall time.
- What's New feed has entries for each user-facing performance improvement.

- [ ] **Step 1: Ensure `tests/performance.spec.ts` covers the optimizations above.**
- [ ] **Step 2: Add a `Performance` section to What's New for each batch that ships.**
- [ ] **Step 3: Run full validation: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, `bun run test`, `bun run build:web`, `bunx playwright test`, `cargo check`, `cargo test`, `semgrep scan`, `gitleaks detect --source .`.**
- [ ] **Step 4: Record benchmark results in PR description.**
- [ ] **Step 5: Commit**.

---

## 5. Suggested Execution Order

The tasks are designed to be mostly independent, but the following order minimizes risk and maximizes early wins:

1. **Task 1** (bundle analyzer) — measure everything first.
2. **Task 2** (icons) + **Task 3** (lazy panels) + **Task 4** (duplicate panels) — quick load-time wins.
3. **Task 5** (playback throttle) + **Task 6** (memoize scans) + **Task 7** (Zustand spreads) + **Task 8** (React Compiler) — big React re-render reduction.
4. **Task 9** (IndexedDB pooling) + **Task 10** (OPFS) — storage speed and capacity.
5. **Task 11** (frame cache) + **Task 12** (BGRA conversion) + **Task 13** (canvas pooling) + **Task 14** (scene memoization) — preview/render frame time.
6. **Task 15** (streaming export) + **Task 16** (codec cache) + **Task 19** (audio zero-copy) — export speed and memory.
7. **Task 17** (timeline virtualization) + **Task 18** (memory leak audit) — long-project stability.
8. **Task 20** (benchmarks + What's New) — validate and ship.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Lazy-loading panels causes layout shift or broken E2E selectors | Provide dimension-matched skeletons; update selectors to wait for panels. |
| Throttling playback events breaks audio/video sync | Keep frame-accurate time in the manager; only throttle React/UI updates. |
| React Compiler breaks some components | Fix compiler errors; use `useMemo`/`useCallback` only where compiler cannot infer. |
| OPFS not available on all browsers | Feature-detect and fall back to IndexedDB. |
| Texture pooling leaks or returns wrong-size canvas | Key pool by exact dimensions; reset context on borrow. |
| Streaming export changes output format compatibility | Validate muxed output against existing tests; keep `BufferTarget` path as fallback. |
| Memory leak audit finds unrelated bugs | Scope the fix to the identified leak; open separate issues for unrelated findings. |

---

## 7. Rollback Notes

- Every task is a small, reversible change. Rollback is `git revert <commit>` per task.
- Keep the existing `BufferTarget` export path until streaming export is proven.
- Keep IndexedDB media storage until OPFS is fully migrated and tested.
- Keep the unthrottled playback event path behind a feature flag during validation if needed.

---

## 8. Dependencies Likely Needed

| Package | Purpose | Risk | Approval |
|---|---|---|---|
| `@next/bundle-analyzer` | Bundle visualization | Low dev-only | Normal review |
| `babel-plugin-react-compiler` | React 19 automatic memoization | Low build-only | Normal review |

Existing platform APIs (OPFS, `content-visibility`, IntersectionObserver, `requestIdleCallback`) should be used before any new dependency. No new runtime dependencies are expected for the core optimizations.

---

## 9. QA Checklist (Before Each Batch)

- [ ] Lint passes (`bun run lint:web`).
- [ ] Typecheck passes (`cd apps/web && bunx tsc --noEmit`).
- [ ] Unit tests pass (`bun run test`).
- [ ] Build passes (`bun run build:web`).
- [ ] E2E smoke passes (`bunx playwright test`).
- [ ] Rust checks pass (`cargo check`, `cargo test`) if WASM/Rust files touched.
- [ ] Security checks pass (`semgrep scan`, `gitleaks detect --source .`).
- [ ] What's New updated for user-facing changes.
- [ ] Benchmark before/after recorded.

---

## 10. Definition of Done for This Plan

This plan is complete when it is saved, reviewed, and approved for implementation. Code changes happen only after this planning phase; no files were modified during research.
