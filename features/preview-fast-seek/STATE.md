# State

## Status: Implemented — all SOP checks green

## Changes

### Modified files
- `apps/web/src/services/video-cache/service.ts`:
  - `initializeSink()`: GOP index now built eagerly (blocking) — adds
    50-200ms to import but ensures first seek is fast
  - `seekToTime()`: replaced `canvases()` iterator + `iterateToTime()`
    with `sink.getCanvas(time)` — single-call seek, no iterator overhead
  - Removed `startGOPIndexBuild()` and `ensureGOPIndex()` (dead code)
  - Removed `findNearestKeyframe` import (mediabunny handles internally)
  - Removed `gopIndexPromise` field (no longer needed)
- `apps/web/src/lib/whats-new/feed.ts` — What's New entry

## SOP Checks

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | exit 0 (6 pre-existing warnings) |
| `bun test apps/web/src` | 203 pass, 0 fail |
| `bun run build:web` | 1 successful |

## How it works

1. On video import, `initializeSink()` calls `buildGOPIndex()` and
   awaits the result (50-200ms for 15-min video). The GOP index is
   stored on the sink data.
2. On seek, `seekToTime()` calls `sink.getCanvas(time)` — a single-call
   API that mediabunny optimizes internally (using its own keyframe
   index + hardware-accelerated WebCodecs decode).
3. After `getCanvas()` returns, the iterator is set up from the returned
   frame's timestamp for forward playback/prefetch.

## Rollback

Revert the commit. No data migration, no stored-state change. GOP index
is in-memory only, rebuilt on each session.
