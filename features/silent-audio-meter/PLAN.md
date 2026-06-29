# Plan

## Approach

1. Reproduce: load a no-audio video, play, observe both meter
   components. Capture `getAnalysers()` output and
   `getByteTimeDomainData` values to confirm whether the analyser
   returns 128 (true silence) or has a DC offset / spurious signal.
2. Define a single source of truth for "is the meter silent right
   now": combine `timelineHasAudio`, `doesElementHaveEnabledAudio`,
   element/track `muted`, and the live `isPlaying` state. Implement as
   a small pure typed helper `isMeterSilent(...)` so it is unit
   testable and reusable by both meter components.
3. In both meter components, when `isMeterSilent` is true:
   - do not read/update levels from the analyser,
   - decay existing levels toward 0 (not the current floor of 5),
   - suppress "active" particle spawning / visualizer activity.
4. Keep the existing decay/attack math intact for the non-silent
   path — smallest possible change.
5. Add a unit test for `isMeterSilent` covering: empty timeline, video
   with no audio, muted element, muted track, real audio.
6. Update What's New with a `fix` entry.

## Files to Read First

- `apps/web/src/components/editor/audio-meters-card.tsx`
- `apps/web/src/components/editor/vertical-audio-meter.tsx`
- `apps/web/src/core/managers/audio-manager.ts` (`getAnalysers`)
- `apps/web/src/lib/media/audio.ts` (`timelineHasAudio`,
  `collectAudibleCandidates`)
- `apps/web/src/lib/timeline/audio-separation.ts`
  (`doesElementHaveEnabledAudio`)
- `apps/web/src/lib/timeline/audio-state.ts`
  (`resolveEffectiveAudioGain`)
- `apps/web/src/lib/media/media-utils.ts` (`mediaSupportsAudio`)
- `apps/web/src/hooks/use-editor.ts` (what `useEditor` exposes)

## Files Expected to Change

- `apps/web/src/lib/media/audio.ts` — add `isMeterSilent` helper (or a
  new small module `apps/web/src/lib/media/meter-silence.ts` if a
  separate home is cleaner; prefer existing file to avoid new files).
- `apps/web/src/components/editor/audio-meters-card.tsx` — gate
  analyser reads + particle spawn on `!isMeterSilent`.
- `apps/web/src/components/editor/vertical-audio-meter.tsx` — gate
  analyser reads + visualizer activity on `!isMeterSilent`.
- `apps/web/src/lib/whats-new/feed.ts` — add `fix` entry.
- New test file under
  `apps/web/src/lib/media/__tests__/meter-silence.test.ts` (or
  co-located test) for the helper.

## Test Plan

- Unit: `isMeterSilent` truth table (empty timeline, no-audio media,
  muted element, muted track, real audio, mixed).
- Integration: none required (UI-only).
- E2E: not required for this scope; covered by manual QA.
- Manual QA:
  1. Import a video with no audio track → play → meter flat.
  2. Import a video with audio → mute element → play → meter flat.
  3. Import a video with audio → play → meter reacts normally.
  4. Empty timeline → meter idle before and during play.

## Rollback Plan

Single revert of the implementing commit. The helper is additive; the
component changes are guarded by the helper, so reverting restores the
prior behavior exactly. No data/schema changes, no dependency changes.
