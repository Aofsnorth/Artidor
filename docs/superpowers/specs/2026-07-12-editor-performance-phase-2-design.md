# Editor Performance Phase 2 Design

## Goal

Reduce structurally unnecessary work in export and timeline hot paths, then restore reliable landing-page text contrast. Preserve output, timeline behavior, project data, and existing fallbacks.

## Scope

1. Export worker first-message timeout uses its documented 10-second cap.
2. Timeline playback has one frame owner for playhead/autoscroll updates instead of a duplicate rAF follower.
3. Export audio collection deduplicates identical decode work and bounds concurrent decodes.
4. Landing artwork receives a stronger dark scrim so translucent light text remains readable.
5. Add focused tests, QA records, and a What's New entry.

## Architecture

### Export timeout

Extract the timeout-selection rule into a pure helper. The bridge schedules the timer with that selected value. A unit test covers disabled, first-message, and post-message behavior.

### Timeline

Keep `playback-update` / `playback-seek` as the existing update owner. Remove the second autoscroll rAF loop. Preserve scroll bounds, anchor position, seek behavior, selection clearing, and scrub behavior.

### Audio decode

Inside one `collectAudioElements` invocation, represent each candidate as a deferred decode task. Run tasks through a small bounded worker pool. Cache decode promises by source identity plus trim range and selected audio track, because those parameters determine decoded PCM. Repeated timeline instances then reuse the same promise while distinct trim/track requests remain isolated. Cache lifetime is one collection/export to avoid retaining `AudioBuffer`s globally.

### Landing contrast

Darken the existing `PageShell` atmospheric overlay. Do not touch every text component or redesign cards. The shell owns artwork contrast; one stronger scrim fixes all transparent descendants consistently.

## Impact Map

- `apps/web/src/services/renderer/export-worker-bridge.ts`: timeout rule only.
- `apps/web/src/services/renderer/export-worker-bridge.test.ts`: regression test.
- `apps/web/src/hooks/timeline/use-timeline-playhead.ts`: remove duplicate loop.
- `apps/web/src/lib/media/audio.ts`: bounded task scheduling and request-local decode cache.
- `apps/web/src/lib/media/audio.test.ts`: scheduler/cache behavior.
- `apps/web/src/components/landing/page-shell.tsx`: darker shared scrim.
- `apps/web/src/lib/whats-new/feed.ts`: user-facing performance/accessibility note.
- `features/editor-performance-phase-2/*`: feature, plan, risk, QA, state.

## Risks

- High: export/audio behavior. Wrong cache keys could reuse incorrect trims or tracks.
- Medium: timeline autoscroll cadence. Event-driven updates must remain smooth.
- Low: landing contrast. Artwork becomes darker but content remains unchanged.

## Verification

- Focused RED/GREEN unit tests for timeout and audio helper behavior.
- `bun run lint:web`
- `cd apps/web && bunx tsc --noEmit`
- `bun run test`
- `bun run build:web`
- Manual QA notes for playback autoscroll, repeated audio clips, export cancellation, and landing contrast.

## Deferred Work

Full audio DSP worker migration, incremental export sinks, compositor retained scene graph, interval-indexed timeline clips, and effect catalogue expansion remain separate batches. They need dedicated baselines and correctness fixtures.
