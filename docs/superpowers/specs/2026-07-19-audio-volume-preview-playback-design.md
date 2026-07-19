# Audio Volume and Preview Playback Fix

## Scope

- Make numeric audio volume scrubbing update its visible value immediately while preserving the existing dB data model and preview/commit flow.
- Keep the `dB` suffix inside the `NumberField` boundary on narrow inspector panels.
- Stop timeline video preview frames from jumping backward or repeating while playback time continues forward.
- Preserve unrelated Turbo dependency/schema changes already present in the working tree.

## Design

### Audio volume

`NumberField` remains controlled by its source value when idle. During icon scrubbing, it renders its own clamped scrub preview value, matching the value already sent through `onScrub`. The suffix receives reserved non-overlapping space and a small right inset.

### Preview playback

The timeline remains the only playback clock. `VideoCache` must return frames monotonically for monotonically increasing requests. After a point seek, forward iteration starts after the returned frame rather than replaying that same frame through the prefetch buffer. Stale prefetch results are discarded after a newer request.

## Validation

- Focused unit tests reproduce stale numeric scrub rendering and repeated post-seek frame delivery before the fixes.
- Full `bun run test`, lint, typecheck, build, and `bun audit` pass under Bun 1.3.14.
- Browser verification checks immediate dB text updates, no right-edge collision, and continuous preview playback.
