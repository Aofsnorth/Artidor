# Feature: Preview Performance — Adaptive Quality + Loading Indicator

Branch: `feat/snap-external-drop-and-audio-db-fix` (continued on same branch
as the snap/audio-dB work — user requested "lanjutkan" on that branch).

## Problem

When editing large / high-resolution videos, the preview feels laggy:

1. **No visual feedback during slow decode.** The render loop is async
   (`renderer.renderToCanvas` returns a Promise). While a frame is being
   decoded/composited, the canvas holds the previous frame with no
   loading indicator. For large files the first-seek / scrub decode can
   take 100–500 ms+, which the user perceives as a frozen preview.
2. **Static preview-quality tiers.** `preview-quality.ts` picks a tier
   from device hints once (`auto`) or uses a fixed manual tier. It does
   not adapt to *actual* render performance. If the machine struggles at
   `medium`, it stays at `medium` until the user manually drops to `low`.
3. **No frame-drop awareness.** The render loop already skips ahead
   correctly (via `pendingRender` + `renderingRef`), but neither the user
   nor the quality system knows this is happening.

## Goal

- A subtle, non-blocking loading indicator appears on the preview canvas
  whenever a render is taking longer than a short threshold (~80 ms), so
  the user sees *why* the preview is momentarily frozen instead of
  perceiving a hang.
- `auto` preview quality dynamically downgrades the render scale when
  recent renders are consistently slower than the frame budget, and
  recovers when performance improves. Explicit tiers (high/medium/low)
  remain manual and are not overridden.
- Audio/video sync is preserved: the loading overlay is purely visual
  (pointer-events: none), playback clock and WebAudio scheduling are
  untouched. Video frames continue to be fetched at the audio-clock-
  derived time, skipping ahead when behind.

## Non-Goals

- No proxy/transcode pipeline (large feature, requires separate approval
  per ROADMAP "Not Allowed Without Approval" → "New dependency-heavy
  features").
- No change to the export pipeline (export builds its own full-res
  renderer).
- No change to the manual quality tiers (high/medium/low) — only `auto`
  adapts.
- No change to the audio manager or playback clock.
- No change to the video cache / mediabunny decode layer.
- No new dependencies.

## Roadmap Alignment

- [ ] P0 Critical
- [x] P1 Important — "Performance on heavy projects" + "Editor UX
      reliability"
- [ ] P2 Nice to Have
- [ ] Not on roadmap, approval required

## What's New

- [x] Yes
- [ ] No

Reason: user-visible performance improvement (loading indicator on slow
preview + adaptive auto quality for smoother large-video editing).

## Acceptance Criteria

- [ ] Opening a large video and scrubbing shows a subtle loading
      indicator when the frame decode takes >80 ms; the indicator
      disappears the moment the frame is painted.
- [ ] The loading indicator never blocks pointer events, playback, or
      audio.
- [ ] `auto` quality drops the render scale after N consecutive slow
      renders and recovers after N consecutive fast renders (hysteresis
      prevents oscillation).
- [ ] Explicit `high`/`medium`/`low` tiers are unchanged — adaptive
      logic only runs when `quality === "auto"`.
- [ ] Audio stays in sync with video during slow renders (video skips
      ahead to current audio time; audio never pauses for the loading
      overlay).
- [ ] Unit tests pass for the perf tracker and adaptive scale logic.
- [ ] `bun run lint:web`, `bunx tsc --noEmit`, `bun run test` all green.

## Affected Areas

- [x] `apps/web`
- [ ] `rust`
- [ ] `packages/mcp-server`
- [ ] docs (What's New feed only)
- [x] tests

## Files Changed

```
apps/web/src/lib/perf/render-perf-tracker.ts          (new — ring buffer + hysteresis)
apps/web/src/lib/perf/render-perf-tracker.test.ts     (new — unit tests)
apps/web/src/lib/perf/preview-quality.ts              (adaptive scale for "auto")
apps/web/src/lib/perf/preview-quality.test.ts         (adaptive scale tests)
apps/web/src/components/editor/panels/preview/index.tsx (loading overlay + perf wiring)
apps/web/src/components/editor/panels/preview/preview-loading-overlay.tsx (new — overlay UI)
apps/web/src/lib/whats-new/feed.ts                    (What's New entry)
```
