# State

## Status: Implemented — all SOP checks green

## Changes

### VideoCache (`apps/web/src/services/video-cache/service.ts`)

1. **LRU frame cache** (30 frames per video):
   - New `frameCache: Map<number, WrappedCanvas>` per sink
   - `getCachedFrame()` checks validity range before returning
   - `cacheFrame()` stores decoded frames with FIFO eviction
   - Cache hit skips decode entirely (0ms vs 5-80ms seek)
   - Makes backward scrubbing and short-range re-seeks instant

2. **Prefetch buffer 3 frames** (was 1):
   - `prefetchBuffer: WrappedCanvas[]` replaces single `nextFrame`
   - `prefetchNextFrame()` fills buffer up to 3 frames in one pass
   - Gives ~50ms buffer at 60fps (was ~16ms)
   - Absorbs single-frame decode spikes without stalling

3. **CanvasSink poolSize 6** (was 3):
   - More recycled canvases = less allocation churn
   - Supports prefetch buffer (3) + current frame (1) + compositor ref (1) + headroom (1)

### Preview loop (`apps/web/src/components/editor/panels/preview/index.tsx`)

1. **Cache adaptive scale for manual quality**:
   - `lastScaleInputsRef` tracks `(quality, isPlaying, gpuDegraded)`
   - For manual tiers (high/medium/low), skip `resolveAdaptiveScale` call
     when inputs unchanged — saves one function call + math per frame
   - Auto mode still recalculates every frame (needs avgRenderMs)

2. **Merge loading overlay check into main render loop**:
   - Removed separate rAF loop (was ~60 callbacks/sec overhead)
   - Loading threshold check now runs at top of `render()` callback
   - Eliminates one `requestAnimationFrame` + one `performance.now()` per frame

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | exit 0 (5 warnings, pre-existing) |
| `bun test apps/web/src` | 195 pass, 0 fail |
| `bun run build:web` | 1 successful |

## Files Changed

- `apps/web/src/services/video-cache/service.ts` — LRU cache + prefetch buffer + poolSize
- `apps/web/src/components/editor/panels/preview/index.tsx` — scale caching + merged rAF
- `apps/web/src/lib/whats-new/feed.ts` — What's New entry
- `features/preview-fast-decode/` — feature folder docs

## Rollback

Revert the commits. No data migration, no stored-state change. VideoCache
is in-memory only.
