# Design: Parallel Implementation of Four Areas

## Goal

Implement the four researched areas in parallel using subagents, with minimal, safe changes:

1. Precision bug fixes (timeline overlap, snap, drag, effect bounds)
2. Apply-effect UX improvements (drop feedback, time bounds epsilon)
3. Auto-caption CapCut-style presets
4. Preview/export performance optimizations

## Architecture

- Each area is independent and will be implemented by a separate subagent.
- All changes are in `apps/web/src` unless noted.
- No new dependencies.
- Tests are added or updated for behavior changes.
- Implementation order is parallel; each area is self-contained and reviewable.

## Area 1: Precision Bug

- `apps/web/src/lib/timeline/placement/overlap.ts`: add `EPSILON` to the overlap check so elements that touch within a tiny tolerance are not considered overlapping.
- `apps/web/src/lib/timeline/snap-utils.ts`: add `EPSILON` to the snap distance check to avoid missed snaps due to floating-point precision.
- `apps/web/src/lib/timeline/drag-utils.ts`: add `EPSILON` to the tick rounding to avoid drift at high zoom levels.
- `apps/web/src/services/renderer/resolve.ts`: increase the effect bounds epsilon from `1e-6` to `1e-3` to prevent effects from being skipped at exact boundaries.

## Area 2: Apply Effect UX

- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts`: add user feedback (toast/error) when an effect is dropped on a non-effect track.
- `apps/web/src/lib/timeline/placement/track-factory.ts`: verify effect tracks are created with `hidden: false` (already correct).

## Area 3: Auto-caption CapCut Style

- `apps/web/src/lib/text/presets.ts`: add a `caption` category and CapCut-style presets (e.g., Karaoke, Pop, Minimal).
- `apps/web/src/lib/text/animator.ts`: add a word-highlight animator if needed for karaoke mode.
- `apps/web/src/components/editor/panels/assets/views/captions.tsx`: add a style preset selector in the captions panel.
- `apps/web/src/lib/subtitles/build-subtitle-text-element.ts`: apply the selected preset style to generated caption text elements.
- `apps/web/src/lib/presets/types.ts`: update preset category types to include `caption`.

## Area 4: Performance

- `apps/web/src/services/renderer/export-codec.ts`: memoize `negotiateVideoCodec` per session to avoid repeated `VideoEncoder.isConfigSupported` probes.
- `apps/web/src/services/renderer/export-performance.ts`: make render queue depth dynamic based on `navigator.hardwareConcurrency`.
- `apps/web/src/services/video-cache/service.ts`: increase `MAX_CACHED_FRAMES_PER_MEDIA` from 64 to 128.
- `apps/web/src/components/editor/panels/preview/index.tsx`: increase `FRAME_CACHE_SIZE` from 30 to 60.

## Execution

- Use `writing-plans` to create the implementation plan.
- Use `subagent-driven-development` to execute each area in parallel.
- Run sensors: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, `bun run test`, `bun run build:web`, `cargo check`, `cargo test`, `semgrep scan`.
