# Feature: Fast Video Preview Decode

## Problem

Preview video editor terlalu lambat saat edit video besar. Hanya export yang cepat, preview juga harus fast.

## Root Causes (from audit)

1. **VideoCache hanya prefetch 1 frame** — untuk 60fps, buffer hanya ~16ms
2. **Tidak ada LRU frame cache** — frame yang sama di-decode berulang
3. **CanvasSink poolSize = 3** — terlalu kecil untuk smooth playback
4. **Adaptive scale dihitung setiap frame** bahkan untuk quality manual
5. **Second rAF loop untuk loading overlay** — overhead tidak perlu
6. **No frame reuse untuk backward seek** — selalu re-decode

## Solution (Phase 1 — safe, no new deps)

1. **LRU frame cache** dengan size-based eviction (50MB budget)
2. **Prefetch 3 frames ahead** (dari 1) untuk smoother playback
3. **CanvasSink poolSize 6** (dari 3) untuk lebih banyak buffered frames
4. **Cache adaptive scale** saat quality manual — skip recalculation
5. **Merge loading overlay check** ke main render loop — eliminate 2nd rAF

## Out of Scope (Phase 2/3 — needs approval)

- WebCodecs VideoDecoder (high complexity, architectural change)
- OffscreenCanvas + Web Worker rendering
- GOP manager for instant seeking
- Proxy/preview-quality media files
- WebGL renderer for compositing
- Predictive pre-decode with direction-aware caching

## Research Sources

- Chrome team WebCodecs documentation
- CapCut Web architecture (WASM SIMD + OffscreenCanvas)
- FreeCut 3-tier caching (VRAM + RAM + disk)
- Remotion size-based LRU cache
- DaVinci Resolve proxy workflow
- Figma WebGL canvas renderer
