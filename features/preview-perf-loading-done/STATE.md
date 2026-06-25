# State

## Status: Implemented + committed + pushed — PR pending (gh not authenticated)

## Branch

`feat/snap-external-drop-and-audio-db-fix` (continued on same branch)

## Changes Shipped

### 1. Track slider UI revert (dB → %)

- Track volume slider is now a linear **0–100% percentage** (was decibels).
- Default value: **100** (was 0 dB).
- A **speaker icon** to the left of the slider toggles track mute
  (deafen). Icon switches between `VolumeHighIcon` (unmuted) and
  `VolumeOffIcon` (muted). Slider is disabled when muted.
- The **opacity slider** label "O" was replaced with a clickable
  **transparency icon** (`TransparencyIcon`). Clicking it toggles
  opacity between 0 (hidden) and 100 (fully visible).
- Both sliders are now aligned (same `w-7` left icon, `w-8` right value)
  and start further left (`pl-1` instead of `pl-[30px]`) for a longer
  slider range.

### 2. Audio combination logic (dB-additive → % × linear)

- `audio-manager.ts`: `trackSliderDb + elementDb` (additive dB) replaced
  with `elementLinear * (trackSliderPercent / 100)` (multiplicative).
  Both `handleTimelineChange` and `scheduleClipIterator` updated.
- `timeline-element.tsx`: visual waveform scaling updated to match —
  `dBToLinear(elementDb) * (trackSliderPercent / 100)`.
- Removed unused imports (`clampDb`, `linearToDb`, `dBToLinear` from
  audio-manager; `clampDb` from timeline-element).

### 3. Preview performance: adaptive quality + loading overlay

- **`render-perf-tracker.ts`** (new): bounded ring buffer (30 samples)
  with `recordRender`, `getAverageRenderMs`, `isStruggling`,
  `isRecovered` (hysteresis). In-memory only, never persisted.
- **`preview-quality.ts`**: `resolveAdaptiveScale` — when
  `quality === "auto"`, drops/recovers one tier based on avg render time
  vs. frame budget (struggle factor 1.5×, recover factor 0.7×). Manual
  tiers pass through unchanged.
- **`preview-loading-overlay.tsx`** (new): non-blocking
  (`pointer-events: none`) overlay with spinner + "Rendering…" label.
  150 ms CSS opacity transition so sub-threshold renders never flash.
- **`preview/index.tsx`**: render callback now records render duration
  into perf tracker, uses `resolveAdaptiveScale` for auto mode, and
  shows loading overlay when a render exceeds 80 ms.

### 4. What's New

- Added entry `2026-06-25-preview-perf-loading-and-track-slider-ui` to
  `feed.ts` (tag: `performance`).

## Files Changed

```
apps/web/src/lib/perf/render-perf-tracker.ts          (new)
apps/web/src/lib/perf/render-perf-tracker.test.ts     (new)
apps/web/src/lib/perf/preview-quality.ts              (resolveAdaptiveScale added)
apps/web/src/lib/perf/preview-quality.test.ts         (adaptive scale tests)
apps/web/src/components/editor/panels/preview/preview-loading-overlay.tsx (new)
apps/web/src/components/editor/panels/preview/index.tsx (perf tracker + overlay + adaptive)
apps/web/src/components/editor/panels/timeline/index.tsx (slider UI: %, icons, alignment)
apps/web/src/components/editor/panels/timeline/timeline-element.tsx (visual scaling)
apps/web/src/core/managers/audio-manager.ts           (combination logic)
apps/web/src/lib/timeline/__tests__/audio-state.test.ts (% combination tests)
apps/web/src/lib/whats-new/feed.ts                    (What's New entry)
```

## SOP Checks

| Check        | Result |
|-------------|--------|
| `bunx tsc --noEmit` | ✅ exit 0 |
| `bun run lint:web`  | ✅ exit 0 (2 pre-existing warnings) |
| `bun test apps/web/src/lib/perf/` | ✅ all assertions passed |
| `bun run build:web` | ✅ 1 successful, 1 total |

## Rollback

Single branch. Revert the commits for this feature. No data migration,
no stored-state change (perf tracker is in-memory; track slider values
in timeline-store are not persisted to disk).
