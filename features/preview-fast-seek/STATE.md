# State

## Status: Implemented — all SOP checks green

## Changes

### New files
- `apps/web/src/services/video-cache/gop-index.ts` — GOP index builder + binary search
- `apps/web/src/services/video-cache/gop-index.test.ts` — 8 unit tests
- `features/preview-fast-seek/FEATURE.md` — this feature doc

### Modified files
- `apps/web/src/services/video-cache/service.ts`:
  - `VideoSinkData` gains `gopIndex` + `gopIndexPromise` fields
  - `startGOPIndexBuild()` — builds index in background on sink init
  - `ensureGOPIndex()` — waits for build if still in progress
  - `seekToTime()` — uses `findNearestKeyframe()` to jump to nearest
    keyframe, then iterates forward to target. Falls back to old path
    if index not ready.
- `apps/web/src/lib/whats-new/feed.ts` — What's New entry

## SOP Checks

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | exit 0 (5 pre-existing warnings) |
| `bun test apps/web/src` | 203 pass, 0 fail (8 new GOP tests) |
| `bun run build:web` | 1 successful |

## How it works

1. On video import, `VideoCache.initializeSink()` calls
   `startGOPIndexBuild()` in the background (non-blocking).
2. `buildGOPIndex()` uses mediabunny's `EncodedPacketSink` with
   `metadataOnly: true` to scan keyframe timestamps without loading
   packet data. Takes 50-200ms for a 15-min video.
3. On seek, `seekToTime()` calls `ensureGOPIndex()` (waits if still
   building), then `findNearestKeyframe()` (binary search O(log n))
   to find the keyframe at or before the target time.
4. `sink.canvases(keyframeTime)` starts iteration from the keyframe,
   then `iterateToTime()` walks forward to the target frame.

## Rollback

Revert the commit. No data migration, no stored-state change. GOP index
is in-memory only, rebuilt on each session.
