# Artidor Web Performance Optimization Plan

> **Status**: Research complete, ready for implementation
> **Date**: 2026-07-12
> **Goal**: Make Artidor web app faster than CapCut across all surfaces (preview, timeline, editor, export, audio)
> **Constraint**: Smallest safe changes, no architecture rewrites, production-grade

---

## Table of Contents

1. [Current Architecture Summary](#1-current-architecture-summary)
2. [Competitive Analysis: CapCut vs Artidor](#2-competitive-analysis-capcut-vs-artidor)
3. [Identified Bottlenecks](#3-identified-bottlenecks)
4. [Optimization Plan (Prioritized)](#4-optimization-plan-prioritized)
   - [P0 — Critical: GPU & Rendering Pipeline](#p0--critical-gpu--rendering-pipeline)
   - [P1 — High: Frame Caching & Scrubbing](#p1--high-frame-caching--scrubbing)
   - [P2 — High: Preview Rendering Offloading](#p2--high-preview-rendering-offloading)
   - [P3 — High: Export Pipeline](#p3--high-export-pipeline)
   - [P4 — Medium: Video Decode Pipeline](#p4--medium-video-decode-pipeline)
   - [P5 — Medium: State Management & React Re-renders](#p5--medium-state-management--react-re-renders)
   - [P6 — Medium: Bundle Size & Loading](#p6--medium-bundle-size--loading)
   - [P7 — Low: Audio Pipeline](#p7--low-audio-pipeline)
   - [P8 — Low: Network & Infrastructure](#p8--low-network--infrastructure)
5. [Implementation Order](#5-implementation-order)
6. [Risk Assessment](#6-risk-assessment)
7. [Rollback Plan](#7-rollback-plan)

---

## 1. Current Architecture Summary

### Rendering Stack
- **GPU Compositor**: Rust → WASM (WGPU) with 70+ WGSL effect shaders, 16 blend modes, JFA mask feathering
- **Preview**: Main-thread WASM compositor via `renderFrame()` (synchronous)
- **Export**: Web Worker with OffscreenCanvas + WebCodecs (mediabunny), parallel multi-segment
- **Canvas**: OffscreenCanvas everywhere, Canvas 2D for intermediate, WGPU for final composite

### Caching
- **Frame cache**: 30 composited ImageBitmaps (FIFO, ~30MB at 1080p)
- **Video LRU**: 64 frames per video (~1.1s at 60fps), FIFO eviction
- **Prefetch**: 12 frames ahead (~200ms buffer)
- **Texture dedup**: Double-buffered ID sets, identity-based skip
- **Raster cache**: 32-entry LRU for static layers (solid colors, gradients)
- **GOP index**: O(log n) seeking via keyframe index

### State Management
- **Zustand** (v5) with 40+ stores, `persist` middleware → localStorage
- **EditorCore** managers with `useSyncExternalStore` + subsystem filtering
- **Playback subsystem excluded by default** (was causing 97 re-renders/sec)
- **IndexedDB** for projects, **OPFS** for media files
- **Command pattern** undo/redo (no history limit)

### Export
- **Parallel multi-segment**: Splits timeline across workers (capped 16, min 60 frames/segment)
- **Codec chain**: Hardware AVC/HEVC/AV1 → Software → VP9/WebM fallback
- **Pipeline depth**: 16 frames (render → snapshot → encode)
- **Warm worker reuse**: Saves 5-30s WASM+GPU init
- **Lossless concatenation**: Bitstream copy via mediabunny

### React
- **208+ TSX components**, all client-side ("use client")
- **Timeline virtualization**: Track-level + element-level culling
- **React.memo** on critical components (PropertiesPanel, TimelineElement, etc.)
- **Dynamic imports**: Dialogs, AI tools, WASM, ML models
- **No bundle analyzer** configured

---

## 2. Competitive Analysis: CapCut vs Artidor

| Aspect | CapCut Web | Artidor (current) | Artidor (target) |
|--------|-----------|-------------------|------------------|
| Core engine | C++ → WASM (Emscripten) | Rust → WASM (wasm-pack) | Rust → WASM (same) |
| GPU rendering | WebGPU via WASM | WGPU via WASM | WGPU + zero-copy textures |
| Video decode | WebCodecs | mediabunny (WebCodecs) | WebCodecs + parallel decode |
| Frame cache | Unknown (proprietary) | 30 frames | 300 GPU + 900 RAM (3-tier) |
| Export | WebCodecs hardware | WebCodecs + parallel segments | + streaming output |
| Scrubbing | Smooth (native heritage) | 30-frame cache, limited | 3-tier cache + prewarm |
| Preview thread | Unknown | Main thread | Web Worker (OffscreenCanvas) |
| Bundle size | Heavy (1M+ templates) | Moderate (~19 deps in editor) | Lean (dedupe + tree-shake) |
| Cold start | Slow (large WASM) | Fast (lazy WASM preload) | Same + service worker cache |

**Key advantage Artidor has over CapCut**: Rust is lighter than C++ Emscripten, and the architecture is already GPU-first. The gap is in caching depth and main-thread offloading.

**Key advantage CapCut has over Artidor**: Native app heritage means smoother scrubbing and preview. CapCut likely has deeper frame caching and possibly worker-based preview.

---

## 3. Identified Bottlenecks

### Critical (blocks 60fps preview)
1. **Synchronous WASM compositor on main thread** — `renderFrame()` blocks during heavy GPU work
2. **Frame cache only 30 frames** — backward scrub beyond 0.5s requires full re-render
3. **Canvas→GPU texture copy per frame** — not zero-copy like `texture_external`
4. **No parallel video decoding** — multi-video projects decode sequentially

### High (degrades UX)
5. **No prewarm cache filling** — scrubbing to uncached areas always hits decode
6. **No direction-aware cache writes** — wastes write overhead during forward scrub
7. **Video LRU only 64 frames** — 1.1s buffer is tight for scrubbing long clips
8. **No streaming export output** — entire video buffered in memory
9. **No COEP header** — SharedArrayBuffer unavailable (export-worker.ts line 380)
10. **Rust timeline math exported but unused by JS** — parallel JS implementation

### Medium (degrades scale)
11. **No bundle analyzer** — can't measure bundle impact
12. **Duplicate heavy deps**: `@huggingface/transformers` + `@xenova/transformers`
13. **4 icon libraries**: hugeicons, lucide-react, react-icons (bundle bloat)
14. **No virtualization for asset grids, stickers, sounds**
15. **AI Edit panel 3,590 lines** — monolithic, hard to optimize
16. **Limited `useShallow` usage** — only 1 file uses it
17. **No undo history size limit** — memory leak risk in long sessions
18. **No GPU memory monitoring** — can't auto-reduce cache under pressure

### Low (polish)
19. **No service worker / PWA** — no offline support, no WASM cache across sessions
20. **Audio mixing on main thread during export** — could use AudioWorklet
21. **No adaptive render queue depth** — fixed 16, could tune per hardware
22. **`productionBrowserSourceMaps: false`** — can't debug production issues

---

## 4. Optimization Plan (Prioritized)

### P0 — Critical: GPU & Rendering Pipeline

#### P0.1: Zero-Copy Video Texture Import (`texture_external`)

**Current**: `uploadTexture()` copies Canvas → GPU texture via `copy_external_image_to_texture()`. Every video frame requires a GPU-to-GPU copy.

**Target**: Use `device.import_external_texture()` for video frames to create a `GPUExternalTexture` that references the video source directly — zero copy.

**Files to change**:
- `rust/crates/gpu/src/context.rs` — add `import_external_texture()` method
- `rust/crates/compositor/src/compositor.rs` — support `texture_external` binding in layer pipeline
- `rust/crates/compositor/shaders/layer.wgsl` — sample from `texture_external` when available
- `rust/wasm/src/compositor.rs` — add `uploadExternalTexture()` WASM export
- `apps/web/src/services/renderer/compositor/wasm-compositor.ts` — route video sources to external texture path

**Tradeoff**: `GPUExternalTexture` is only valid for one render pass — can't be cached. Use for video frames (always changing), keep regular `uploadTexture` for static images/textures (cacheable).

**Expected impact**: 30-50% reduction in per-frame GPU time for video-heavy projects.

**Risk**: Medium. Requires shader changes and careful fallback for browsers without `import_external_texture` support.

---

#### P0.2: Single-Pass Composite Shader (Fused Effects + Blend + Mask)

**Current**: Per-layer pipeline does: render layer → apply effects (separate passes) → apply mask → blend into scene. Multiple GPU passes per layer.

**Target**: Fuse effects + mask + blend into a **single WGSL shader pass** per layer (MasterSelects approach). All 70+ effects execute inline in the fragment shader via a uniform-driven effect chain.

**Files to change**:
- `rust/crates/compositor/src/compositor.rs` — restructure render pass to single draw call per layer
- `rust/crates/compositor/shaders/layer.wgsl` — inline effect chain, mask sampling, blend mode
- `rust/crates/effects/src/pipeline.rs` — generate fused shader code from effect list
- `rust/crates/effects/shaders/*.wgsl` — convert to shader functions (not full passes)

**Expected impact**: 40-60% reduction in GPU draw calls. 2-3x faster compositing for multi-layer scenes.

**Risk**: High. Large shader rewrite. Must preserve visual identical output. Mitigation: A/B test against current pipeline, keep old path as fallback.

---

#### P0.3: Move Preview Rendering to Web Worker

**Current**: Preview renders on main thread. `renderFrame()` is synchronous and blocks during GPU work, causing jank during heavy effects.

**Target**: Move the entire preview render loop to a Web Worker with `OffscreenCanvas` transferred from main thread. Main thread only handles input events and UI updates.

**Files to change**:
- `apps/web/src/services/renderer/preview-worker.ts` — **NEW**: Web Worker for preview rendering
- `apps/web/src/components/editor/panels/preview/index.tsx` — transfer canvas to worker, send render commands via postMessage
- `apps/web/src/services/renderer/canvas-renderer.ts` — split into main-thread facade + worker-side implementation
- `apps/web/src/hooks/use-raf-loop.ts` — move rAF loop into worker

**Architecture**:
```
Main Thread                    Web Worker (preview-worker)
├── React UI                   ├── rAF loop
├── Input events               ├── CanvasRenderer
├── Zustand stores             ├── WASM compositor
├── postMessage(renderCmd) →   ├── buildScene + resolveRenderTree
│                              ├── compositor.render()
│   ← postMessage(frameDone)   └── frame cache management
└── Canvas display (transferred OffscreenCanvas)
```

**Expected impact**: Main thread stays at 60fps even during heavy renders. UI never janks.

**Risk**: High. Canvas transfer complexity, state synchronization. Mitigation: Keep main-thread path as fallback, feature-flag the worker path.

---

### P1 — High: Frame Caching & Scrubbing

#### P1.1: 3-Tier Scrubbing Cache (GPU VRAM + Last-Frame + RAM Preview)

**Current**: Single-tier 30-frame ImageBitmap cache (FIFO, ~30MB).

**Target**: 3-tier cache inspired by MasterSelects/freecut:

| Tier | Storage | Size | Purpose |
|------|---------|------|---------|
| T1: GPU VRAM | `wgpu::Texture` | 300 frames | Instant scrub (no decode, no upload) |
| T2: Last-frame | Per-video `wgpu::Texture` | 1 per video | Seek transition fallback |
| T3: RAM Preview | `ImageBitmap` | 900 frames | Long-range backward scrub |

**Files to change**:
- `apps/web/src/services/renderer/scrubbing-cache.ts` — **NEW**: 3-tier cache manager
- `apps/web/src/services/renderer/compositor/wasm-compositor.ts` — expose GPU texture pool to cache
- `rust/crates/compositor/src/compositor.rs` — add texture pool management (pooled textures for T1)
- `rust/wasm/src/compositor.rs` — export `acquirePooledTexture()` / `releasePooledTexture()`
- `apps/web/src/components/editor/panels/preview/index.tsx` — replace 30-frame cache with 3-tier

**Memory budget**:
- T1: 300 × ~1MB (1080p BGRA) = ~300MB VRAM
- T3: 900 × ~1MB (ImageBitmap) = ~900MB RAM
- Total: ~1.2GB (within 8GB+ RAM target hardware)

**Expected impact**: Scrubbing becomes instant when cache is warm — zero decode, zero upload. 10x scrubbing speed improvement.

**Risk**: Medium. GPU memory pressure on low-end GPUs. Mitigation: Adaptive sizing based on `navigator.deviceMemory` and GPU adapter info.

---

#### P1.2: Direction-Aware Cache Writes + Prewarm

**Current**: Every rendered frame is cached. During forward scrub, decode (~1ms) is faster than cache write (~2-5ms `createImageBitmap` + GPU upload), so caching is pure overhead.

**Target**:
- **Forward sequential scrub**: Skip cache writes (decode is faster)
- **Backward scrub**: Write to all tiers (cache hit expected)
- **Prewarm**: During idle time, fill cache 3 frames ahead of scrub position
- **Forward jump >3s**: Restart decode stream (avoid reading hundreds of samples)

**Files to change**:
- `apps/web/src/services/renderer/scrubbing-cache.ts` — direction-aware write logic
- `apps/web/src/components/editor/panels/preview/index.tsx` — prewarm logic in rAF loop
- `apps/web/src/services/video-cache/service.ts` — forward jump restart threshold

**Expected impact**: 15-20% faster forward scrubbing. Prewarm eliminates "loading" flash on common scrub patterns.

**Risk**: Low. Additive change, no existing behavior broken.

---

#### P1.3: Increase Video LRU Cache (64 → 240 frames)

**Current**: 64 frames per video (~1.1s at 60fps).

**Target**: 240 frames per video (~4s at 60fps, ~8s at 30fps). Matches freecut's cache size.

**Files to change**:
- `apps/web/src/services/video-cache/service.ts` — `MAX_CACHED_FRAMES_PER_MEDIA = 240`

**Memory impact**: 240 × ~1MB = ~240MB per video. Acceptable for 8GB+ RAM. Add adaptive scaling for low-memory devices.

**Expected impact**: 4x more cache hits during scrubbing, dramatically fewer decode stalls.

**Risk**: Low. Single constant change. Add device-memory-based scaling.

---

### P2 — High: Preview Rendering Offloading

*(Covered in P0.3 above — move preview to Web Worker)*

#### P2.1: Use `transferToImageBitmap()` for Final Blit

**Current**: Final blit from compositor canvas to display canvas uses `ctx.drawImage()` (Canvas 2D).

**Target**: Use `transferToImageBitmap()` on the compositor OffscreenCanvas to get a GPU-backed ImageBitmap, then draw it to the display canvas. This avoids intermediate copies.

**Files to change**:
- `apps/web/src/services/renderer/canvas-renderer.ts` — use `transferToImageBitmap()` in blit path

**Expected impact**: 1-3ms savings per frame on the blit path.

**Risk**: Low. API is well-supported in Chrome/Edge/Firefox.

---

### P3 — High: Export Pipeline

#### P3.1: Streaming Export Output

**Current**: `BufferTarget` collects entire video in memory. Long videos (>1hr) could OOM.

**Target**: Stream output to disk via:
- **Browser**: `FileSystemAccessAPI` (showSaveFilePicker) → writable stream → chunks flushed to disk
- **Fallback**: Chunked Blob download (segments downloaded as they complete)

**Files to change**:
- `apps/web/src/lib/export/index.ts` — add streaming download path
- `apps/web/src/services/renderer/export-worker.ts` — replace `BufferTarget` with streaming target
- `apps/web/src/core/managers/renderer-manager.ts` — detect FileSystemAccessAPI support

**Expected impact**: Eliminates memory pressure for long exports. Enables >1hr video export without OOM.

**Risk**: Medium. FileSystemAccessAPI not available in all browsers. Keep BufferTarget fallback.

---

#### P3.2: Adaptive Render Queue Depth

**Current**: Fixed `RENDER_QUEUE_DEPTH = 16`.

**Target**: Auto-tune based on hardware:
- High-end GPU + hardware encoder: 24 (deeper pipeline, more parallelism)
- Mid-range: 16 (current)
- Low-end / software encoder: 8 (less memory pressure)

**Files to change**:
- `apps/web/src/services/renderer/export-worker.ts` — adaptive queue depth
- `apps/web/src/lib/export/hardware.ts` — add GPU tier detection

**Expected impact**: 10-20% faster export on high-end hardware, less OOM on low-end.

**Risk**: Low. Conservative defaults, only increases on capable hardware.

---

#### P3.3: Parallel Video Decoding for Multi-Video Projects

**Current**: Each video has its own sink, but decoding is sequential per video. Multi-video projects (picture-in-picture, split screen) decode one video at a time per sink.

**Target**: Decode multiple videos in parallel using multiple `VideoDecoder` instances. Schedule decode requests across videos to maximize GPU decoder utilization.

**Files to change**:
- `apps/web/src/services/video-cache/service.ts` — add parallel decode coordinator
- `apps/web/src/services/renderer/nodes/video-node.ts` — batch decode requests

**Expected impact**: 2-3x faster preview/export for multi-video projects.

**Risk**: Medium. GPU decoder has limited concurrent streams (typically 2-4). Must cap parallelism.

---

### P4 — Medium: Video Decode Pipeline

#### P4.1: Direct WebCodecs VideoDecoder (Bypass mediabunny for Preview)

**Current**: All decoding goes through mediabunny's `Input` + `CanvasSink` abstraction.

**Target**: For preview path, use `VideoDecoder` directly for lower overhead. Keep mediabunny for export (needs muxing/demuxing).

**Files to change**:
- `apps/web/src/services/video-cache/service.ts` — add direct WebCodecs path for preview
- `apps/web/src/services/renderer/nodes/video-node.ts` — use direct decoded frames

**Expected impact**: 10-20% faster decode, less abstraction overhead.

**Risk**: Medium. Must handle demuxing manually for direct WebCodecs. Keep mediabunny fallback.

---

#### P4.2: Use Rust Timeline Math (Replace JS Parallel Implementation)

**Current**: Rust exports `mediaTimeFromSeconds`, `mediaTimeToFrame`, etc. but JS has its own parallel implementation in `src/lib/timeline/` and `src/lib/wasm/ticks.ts`.

**Target**: Replace JS timeline math calls with WASM calls. Single source of truth in Rust.

**Files to change**:
- `apps/web/src/lib/timeline/*.ts` — replace JS math with `artidor-wasm` calls
- `apps/web/src/lib/wasm/ticks.ts` — re-export from WASM instead of hardcoding `TICKS_PER_SECOND`
- `apps/web/src/services/renderer/resolve.ts` — use WASM time conversion

**Expected impact**: Eliminates drift risk between JS and Rust. Minor perf gain from WASM precision.

**Risk**: Low. WASM functions are already exported and tested. Just swap call sites.

---

### P5 — Medium: State Management & React Re-renders

#### P5.1: Systematic `useShallow` Adoption

**Current**: Only 1 file (`ai-edit.tsx`) uses `useShallow`. Most components use multiple individual selectors.

**Target**: Audit all components with 3+ individual Zustand selectors and convert to `useShallow`.

**Files to change**:
- `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx` — 10+ individual selectors
- `apps/web/src/components/editor/panels/assets/assets.tsx` — multiple selectors
- `apps/web/src/components/editor/panels/properties/index.tsx` — multiple selectors
- Systematic audit of all `use*Store((s) => ...)` patterns

**Expected impact**: 20-40% fewer re-renders in complex panels.

**Risk**: Low. Pure refactor, no behavior change.

---

#### P5.2: Undo History Size Limit

**Current**: `CommandManager` has no history limit. Long sessions accumulate unlimited command objects.

**Target**: Cap at 500 commands with FIFO eviction.

**Files to change**:
- `apps/web/src/core/managers/commands.ts` — add `MAX_HISTORY = 500`, evict oldest when exceeded

**Expected impact**: Prevents memory leaks in long editing sessions (hours).

**Risk**: Low. 500 commands is generous (most undo chains are <50).

---

#### P5.3: Virtualize Asset Grids, Stickers, Sounds

**Current**: Only font-picker uses `react-window`. Asset grid, stickers, sounds render all items.

**Target**: Add `react-window` virtualization to:
- Asset grid (media library)
- Sticker picker
- Sound effects list
- Transitions list

**Files to change**:
- `apps/web/src/components/editor/panels/assets/assets.tsx` — virtualize grid
- `apps/web/src/components/editor/panels/assets/views/stickers.tsx` — virtualize
- `apps/web/src/components/editor/panels/assets/views/sounds.tsx` — virtualize

**Expected impact**: Smooth scrolling with 1000+ assets. Currently janky with 100+.

**Risk**: Low. `react-window` already in dependencies.

---

#### P5.4: Split AI Edit Panel (3,590 lines → 5-6 focused components)

**Current**: `ai-edit.tsx` is 3,590 lines — chat, quick actions, status, message rendering, tool results all in one file.

**Target**: Split into:
- `ai-chat-messages.tsx` — message list + rendering
- `ai-quick-actions.tsx` — quick action buttons
- `ai-status-bar.tsx` — status indicator + queue
- `ai-input.tsx` — input box + send
- `ai-tool-results.tsx` — tool result rendering
- `ai-edit.tsx` — orchestrator (imports above)

**Expected impact**: Faster re-renders (only affected sub-component re-renders), easier to optimize.

**Risk**: Low. Pure decomposition, no behavior change.

---

### P6 — Medium: Bundle Size & Loading

#### P6.1: Add Bundle Analyzer

**Current**: No bundle analysis configured. Can't measure bundle impact of changes.

**Target**: Install `@next/bundle-analyzer`, add `analyze` script.

**Files to change**:
- `apps/web/package.json` — add `@next/bundle-analyzer` dev dep + `analyze` script
- `apps/web/next.config.ts` — wrap config with bundle analyzer

**Expected impact**: Visibility into bundle composition. Enables data-driven optimization.

**Risk**: None. Dev-only tool.

---

#### P6.2: Remove Duplicate Dependencies

**Current**:
- `@huggingface/transformers` (v4) AND `@xenova/transformers` (v2) — duplicate ML libraries
- 4 icon libraries: `@hugeicons/*`, `lucide-react`, `react-icons`

**Target**:
- Remove `@xenova/transformers` — migrate all usage to `@huggingface/transformers` (it's the successor)
- Consolidate to 2 icon libs max: `lucide-react` (primary) + `@hugeicons/react` (if specific icons needed)
- Remove `react-icons` if all icons available in lucide

**Files to change**:
- `apps/web/package.json` — remove duplicates
- All files importing `@xenova/transformers` → migrate to `@huggingface/transformers`
- All files importing `react-icons` → migrate to `lucide-react`

**Expected impact**: 5-15MB bundle size reduction.

**Risk**: Medium. Must verify all icon replacements are visually identical.

---

#### P6.3: Lazy-Load Heavy Editor Views

**Current**: All editor panels loaded eagerly. `assets.tsx` (1,311 lines), `timeline-toolbar.tsx` (1,125 lines) loaded on editor mount.

**Target**: Lazy-load non-critical views:
- Assets panel views (effects, transitions, stickers, sounds, AI edit) — load on tab switch
- Properties panel tabs — load on tab activation
- Timeline graph editor — load on expand

**Files to change**:
- `apps/web/src/components/editor/panels/assets/assets.tsx` — lazy-load tab views
- `apps/web/src/components/editor/panels/properties/index.tsx` — lazy-load tab content
- `apps/web/src/components/editor/panels/timeline/graph-editor/` — lazy-load

**Expected impact**: 30-50% faster initial editor load. Only preview + basic timeline load immediately.

**Risk**: Low. Views load on demand with Suspense fallback.

---

#### P6.4: Service Worker for WASM & Static Asset Caching

**Current**: No service worker. WASM re-fetched on every visit.

**Target**: Add service worker that caches:
- `artidor-wasm` WASM binary (2-5MB) — cache compiled module
- Static assets (transition previews, flag SVGs)
- Editor shell (JS/CSS chunks)

**Files to change**:
- `apps/web/public/sw.js` — **NEW**: service worker with cache-first strategy
- `apps/web/src/app/layout.tsx` — register service worker

**Expected impact**: Near-instant editor load on repeat visits. WASM compile cached across sessions.

**Risk**: Low. Cache-first for immutable assets, network-first for dynamic content.

---

### P7 — Low: Audio Pipeline

#### P7.1: AudioWorklet for Real-Time Audio Processing

**Current**: Audio mixing and effects on main thread via Web Audio API.

**Target**: Move audio processing to `AudioWorkletNode` for off-main-thread processing.

**Files to change**:
- `apps/web/src/core/managers/audio-manager.ts` — add AudioWorklet path
- `apps/web/public/audio-worklets/mixer.js` — **NEW**: audio mixing worklet

**Expected impact**: Eliminates audio glitching during heavy GPU renders. Audio never janks.

**Risk**: Medium. AudioWorklet API complexity. Keep current path as fallback.

---

#### P7.2: Offline Audio Rendering for Export

**Current**: Audio mixing happens on main thread during export preparation.

**Target**: Use `OfflineAudioContext` for faster-than-realtime audio rendering during export.

**Files to change**:
- `apps/web/src/services/renderer/export-worker.ts` — use `OfflineAudioContext` for audio mix

**Expected impact**: 10-50x faster audio preparation (renders at max speed, not real-time).

**Risk**: Low. `OfflineAudioContext` is well-supported.

---

### P8 — Low: Network & Infrastructure

#### P8.1: Add COEP Header for SharedArrayBuffer

**Current**: Only `Cross-Origin-Opener-Policy` is set. `Cross-Origin-Embedder-Policy` is missing. SharedArrayBuffer in `export-worker.ts` (line 380) will fail in production.

**Target**: Add `Cross-Origin-Embedder-Policy: require-corp` header.

**Files to change**:
- `apps/web/next.config.ts` — add COEP header
- `apps/web/src/app/editor/[project_id]/proxy.ts` — add COEP to editor route

**Expected impact**: Enables SharedArrayBuffer for zero-copy worker communication. Unlocks future optimizations.

**Risk**: Medium. COEP `require-corp` can break cross-origin resources without CORP headers. Must audit all external resources. Alternative: `credentialless` (newer, less breaking).

---

#### P8.2: Preload Critical Resources

**Current**: WASM preloaded via `requestIdleCallback`. No `<link rel="preload">` for critical assets.

**Target**: Add preload hints for:
- WASM binary (`<link rel="preload" as="fetch">`)
- Critical fonts (already handled by `next/font`)
- Editor route chunk (`<link rel="modulepreload">`)

**Files to change**:
- `apps/web/src/app/layout.tsx` — add preload links
- `apps/web/src/app/editor/[project_id]/page.tsx` — preload editor-critical chunks

**Expected impact**: 200-500ms faster editor load (WASM starts downloading immediately).

**Risk**: None. Preload hints are progressive enhancement.

---

## 5. Implementation Order

### Phase 1: Quick Wins (1-2 sessions)
1. P6.1: Add bundle analyzer (visibility)
2. P1.3: Increase video LRU cache 64 → 240 (single constant)
3. P5.2: Undo history size limit (single file)
4. P8.1: Add COEP header (config change)
5. P6.2: Remove duplicate dependencies (package.json cleanup)
6. P4.2: Use Rust timeline math (swap call sites)

### Phase 2: Caching & Scrubbing (2-3 sessions)
7. P1.1: 3-tier scrubbing cache (major feature)
8. P1.2: Direction-aware cache writes + prewarm
9. P2.1: `transferToImageBitmap()` for final blit

### Phase 3: React & Bundle (2-3 sessions)
10. P5.1: Systematic `useShallow` adoption
11. P5.3: Virtualize asset grids
12. P5.4: Split AI Edit panel
13. P6.3: Lazy-load heavy editor views
14. P6.4: Service worker

### Phase 4: GPU Pipeline (3-4 sessions)
15. P0.1: Zero-copy video texture import
16. P0.2: Single-pass composite shader
17. P0.3: Move preview to Web Worker

### Phase 5: Export & Audio (2-3 sessions)
18. P3.1: Streaming export output
19. P3.2: Adaptive render queue depth
20. P3.3: Parallel video decoding
21. P7.1: AudioWorklet
22. P7.2: Offline audio rendering

### Phase 6: Polish (1-2 sessions)
23. P4.1: Direct WebCodecs for preview
24. P8.2: Preload critical resources

---

## 6. Risk Assessment

| Optimization | Risk | Mitigation |
|-------------|------|------------|
| P0.1: Zero-copy textures | Medium | Fallback to current copy path |
| P0.2: Fused shader | High | A/B test, keep old path as fallback |
| P0.3: Preview worker | High | Feature flag, main-thread fallback |
| P1.1: 3-tier cache | Medium | Adaptive sizing for low-memory devices |
| P3.1: Streaming export | Medium | BufferTarget fallback |
| P8.1: COEP header | Medium | Use `credentialless` if `require-corp` breaks resources |
| P6.2: Remove deps | Medium | Verify all replacements visually identical |

---

## 7. Rollback Plan

Every optimization is designed to be:
1. **Feature-flagged** — can be disabled at runtime
2. **Fallback-preserving** — original path retained as fallback
3. **Incrementally deployable** — each can ship independently

**Global rollback**: Add a `performance.optimizations` feature flag in `feature-flags-store.ts` that gates all optimizations. Set to `false` to revert to current behavior.

---

## Research Sources

- [CapCut web.dev case study](https://web.dev/case-studies/capcut) — CapCut's WASM + WebCodecs architecture
- [MASterSelects (Sportinger)](https://github.com/Sportinger/MASterSelects) — GPU-first video editor with 3-tier cache, zero-copy textures
- [freecut (walterlow)](https://github.com/walterlow/freecut) — 3-tier scrubbing cache with direction-aware writes
- [webgpu-video-encoding (apssouza22)](https://github.com/apssouza22/webgpu-video-encoding) — WebGPU + WebCodecs pipeline
- [Browser-Native Video Editor Architecture](https://www.sysdesai.com/news/fGeaSNEW3r6I) — WebGL2 + WebCodecs + Web Worker architecture
- [fast-video-cut (nimone)](https://github.com/nimone/fast-video-cut) — Hardware-accelerated WebCodecs NLE
- [Joan León: Video editing in browser with WebGPU](https://joanleon.dev/en/webgpu-video-browser/) — WebGPU video effects pipeline
- [Vercel React Best Practices](https://github.com/vercel/nextjs) — 70 React/Next.js performance rules
- [Next.js 15 Performance Guide](https://www.verlua.com/blog/nextjs-performance-optimization) — RSC, dynamic imports, PPR
