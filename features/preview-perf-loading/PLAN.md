# Plan

## Approach

### 1. Render performance tracker (`lib/perf/render-perf-tracker.ts`)

A small, dependency-free utility that the preview render loop feeds render
durations into. It exposes:

- `recordRender(durationMs)` — push a sample into a bounded ring buffer.
- `getAverageRenderMs()` — arithmetic mean of the buffer.
- `isStruggling(frameBudgetMs, minSamples)` — true when the average
  render time exceeds the frame budget and enough samples have been
  collected.
- `isRecovered(frameBudgetMs, minSamples)` — true when the average is
  comfortably below the budget (with hysteresis: recovery threshold is
  lower than the struggle threshold so the tier doesn't oscillate).

The ring buffer size is fixed (e.g. 30 samples ≈ 0.5 s at 60 fps) so
memory is bounded and the metric reflects recent history, not the whole
session.

### 2. Adaptive quality for `auto` (`lib/perf/preview-quality.ts`)

Add `resolveAdaptiveScale`:

```ts
resolveAdaptiveScale({
  quality, isPlaying, gpuDegraded,
  avgRenderMs, frameBudgetMs,
}): number
```

- When `quality !== "auto"`, delegates to the existing
  `resolvePreviewScale` (manual tiers are never overridden).
- When `quality === "auto"`:
  1. Compute the base tier scale via `resolvePreviewScale`.
  2. If `avgRenderMs > frameBudgetMs * STRUGGLE_FACTOR` (e.g. 1.5×),
     drop one tier (high → medium → low) and re-resolve.
  3. If `avgRenderMs < frameBudgetMs * RECOVER_FACTOR` (e.g. 0.7×),
     recover one tier.
  4. Clamp to [0.2, 1] as before.

Hysteresis factors (1.5× to drop, 0.7× to recover) prevent oscillation:
the system needs to be *significantly* slow to drop and *comfortably*
fast to recover.

### 3. Loading overlay (`preview/preview-loading-overlay.tsx`)

A purely visual component:

- Renders an absolutely-positioned, `pointer-events: none` overlay inside
  the preview viewport.
- Shows a subtle spinner + "Rendering…" label with `opacity-0` →
  `opacity-100` transition (150 ms) so sub-threshold renders never flash.
- Controlled by a `isVisible` prop driven by the render loop.

### 4. Wire into `PreviewCanvas` (`preview/index.tsx`)

- Create a `renderPerfTracker` instance via `useRef` (stable across
  re-renders).
- In the `render` callback:
  - Record `performance.now()` at render start.
  - On render completion, compute duration and call
    `tracker.recordRender(duration)`.
  - Compute `frameBudgetMs = 1000 / fps`.
  - Set `isLoading` state when `renderingRef` is true AND
    `now - renderStartTime > LOADING_THRESHOLD_MS` (80 ms). A separate
    rAF or the existing rAF loop checks the elapsed time each tick.
  - Replace the `resolvePreviewScale` call with `resolveAdaptiveScale`
    when `quality === "auto"`, feeding the tracker's average.
- Render `<PreviewLoadingOverlay isVisible={isLoading} />` inside the
  viewport container.

### 5. Audio sync preservation (no code change — verified)

The render loop already reads `editor.playback.getCurrentTime()` which
is derived from the playback manager's rAF clock (wall-time based). The
audio manager schedules via WebAudio's `audioContext.currentTime` clock.
Both advance independently of the video render — when video is slow, the
render loop skips ahead to the current playback time on the next
successful frame. The loading overlay does NOT touch either clock, so
A/V sync is structurally preserved.

## Files to Read First

- `apps/web/src/lib/perf/preview-quality.ts` — existing tier logic.
- `apps/web/src/components/editor/panels/preview/index.tsx` — render loop.
- `apps/web/src/hooks/use-raf-loop.ts` — rAF driver.
- `apps/web/src/services/renderer/canvas-renderer.ts` — async render.
- `apps/web/src/services/video-cache/service.ts` — decode layer (context
  only; not modified).
- `apps/web/src/core/managers/playback-manager.ts` — playback clock
  (context only; not modified).

## Test Plan

- Unit (`render-perf-tracker.test.ts`):
  - Ring buffer caps at max size.
  - `getAverageRenderMs` is correct.
  - `isStruggling` requires `minSamples` before returning true.
  - `isRecovered` threshold is lower than `isStruggling` (hysteresis).
- Unit (`preview-quality.test.ts`, appended):
  - `resolveAdaptiveScale` delegates to `resolvePreviewScale` for
    non-auto tiers.
  - `resolveAdaptiveScale` drops a tier when avg render > 1.5× budget.
  - `resolveAdaptiveScale` recovers a tier when avg render < 0.7× budget.
  - `resolveAdaptiveScale` clamps to [0.2, 1].
- Manual QA:
  1. Open a 4K / long video project. Scrub the timeline → loading
     indicator appears during slow decodes, disappears when the frame
     paints.
  2. Press play on a heavy project with `auto` quality → after a few
     slow frames the preview scale visibly drops (sharper → softer),
     playback becomes smoother; after the heavy section passes, the
     scale recovers.
  3. Set quality to `high` explicitly → no adaptive change (stays 1×).
  4. Confirm audio stays in sync during slow renders (no drift, no
     pause).

## Rollback Plan

Single branch. Revert the commits for this feature. No data migration,
no stored-state change (the perf tracker is in-memory only; the
adaptive scale is computed per-frame and not persisted).
