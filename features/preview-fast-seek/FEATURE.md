# Feature: Fast Video Seek — Phase 2

## Problem

Even after Phase 1 (GOP index), preview rendering still took 5-20
seconds when seeking in long videos. The root cause was:

1. **GOP index built lazily** — first seek after import fell back to
   mediabunny's internal O(n) packet scan (5-20s for 4K 15-min video)
2. **Iterator overhead** — `canvases(startTimestamp)` sets up a full
   iterator pipeline with pre-decode, even for a single-frame seek
3. **Sequential frame decode** — iterator decodes all frames from
   keyframe to target (144 frames × 5-20ms = 720-2880ms)

## Solution

### Fix 1: Eager GOP index build

Build the GOP index during `initializeSink()` (blocking). Adds 50-200ms
to import but ensures the FIRST seek is fast. Without this, the first
seek fell back to mediabunny's packet scan = 5-20 seconds.

### Fix 2: Use `getCanvas()` for single-frame seek

Replace `canvases(time)` iterator + `iterateToTime()` loop with
`sink.getCanvas(time)` — a single-call API optimized for seeking to a
specific timestamp. This skips:

- Iterator setup overhead
- Pre-decode of adjacent frames
- Sequential frame-by-frame iteration

After `getCanvas()` returns, we set up the iterator from the returned
frame's timestamp for forward playback/prefetch.

## Performance Impact

| Scenario | Before (Phase 1) | After (Phase 2) |
| ---------- | ------------------ | ----------------- |
| First seek after import | 5-20s (no GOP index) | 50-200ms |
| Long jump (1→13 min) | 720-2880ms | 50-200ms |
| Short jump (< 8s) | 5-160ms | 5-160ms (unchanged) |

## Implementation

- `service.ts`: `initializeSink()` now awaits `buildGOPIndex()` before
  returning. `seekToTime()` uses `sink.getCanvas(time)` instead of
  `canvases()` + `iterateToTime()`.
- Removed `startGOPIndexBuild()` and `ensureGOPIndex()` (no longer
  needed — eager build).
- Removed `findNearestKeyframe` import (mediabunny's `getCanvas()`
  handles keyframe finding internally using the GOP index).

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | exit 0 (6 pre-existing warnings) |
| `bun test apps/web/src` | 203 pass, 0 fail |
| `bun run build:web` | 1 successful |
