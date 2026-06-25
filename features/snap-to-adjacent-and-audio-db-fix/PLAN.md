# Plan

## Approach

### 1. Snap-to-adjacent for external media drops

The snap infrastructure already exists in `lib/timeline/snap-utils.ts`:

- `snapElementEdge({ targetTime, elementDuration, tracks, playheadTime, zoomLevel, snapToStart, bookmarks })` — finds the nearest snap point and returns the snapped time + the snap point.
- `useTimelineStore` exposes `snappingEnabled` (boolean).

`use-timeline-drag-drop.ts` previously only applied frame-snapping
(`roundToFrame`) to the drop position. Extend it so that when
`isExternalDrop && snappingEnabled`, it runs the same
`startSnap` / `endSnap` pair used by the internal drag handler
(`use-element-interaction.ts`), picks the closer one, and overwrites
`target.xPosition` with the snapped time. Apply this both in
`handleDragOver` (visual feedback during drag) and in `executeFileDrop`
(the OS-file-drop path which runs fresh on drop because there's no
pre-computed drop target for it).

### 2. Additive dB combination

Switch the track slider from a linear percentage (0–100%, default 100)
to a dB value (`VOLUME_DB_MIN..VOLUME_DB_MAX`, default 0). Combine with
the inspector's dB element volume:

```
combinedDb = clampDb(trackSliderDb + elementVolumeDb)
finalGain  = dBToLinear(combinedDb)
```

Files:

- `lib/timeline/audio-state.ts` — add `linearToDb(linear)` helper
  (needed when working with `clip.volume`, which is stored as linear).
- `components/editor/panels/timeline/index.tsx` — slider min/max becomes
  `VOLUME_DB_MIN..VOLUME_DB_MAX`, default `0`, label `X.X dB` (was
  `X %`). Stop writing the slider value into per-element `volume` (it
  was double-counting the gain path).
- `components/editor/panels/timeline/timeline-element.tsx` — both
  `AudioElementContent` and `TiledMediaContent` combine slider dB + element
  dB additively for the waveform visual scale.
- `core/managers/audio-manager.ts` — same combination in
  `handleTimelineChange` (live gain updates) and in the initial gain
  setter for `scheduleClipIterator`.

### 3. Replay-mute fix (mid-session)

`lib/media/audio.ts > collectAudioClips` now passes
`ignoreFades: true` when computing `clip.volume`, so the fast-path
automation in `audio-manager.ts > scheduleClipGainAutomation` sees the
true base gain instead of `0` (which was `baseGain * (0/fadeIn) == 0`).
The fast path was already correct for static-volume + fade; the bug
was that the input `clip.volume` was being poisoned at
`localTime = 0`.

### 4. Toolbar vertical scroll (mid-session)

`components/editor/panels/timeline/timeline-toolbar.tsx` — replace
`<ScrollArea className="scrollbar-hidden">` with
`<ScrollArea className="scrollbar-hidden overflow-x-auto overflow-y-hidden">`.

## Files to Read First

- `AGENTS.md`, `RULES.md`, `PERMISSIONS.md`, `CHECKLIST.md` — harness
  policy.
- `ROADMAP.md` — confirm P1 alignment.
- `apps/web/src/lib/timeline/snap-utils.ts` — snap primitives.
- `apps/web/src/hooks/timeline/use-timeline-drag-drop.ts` — drop flow.
- `apps/web/src/hooks/timeline/element/use-element-interaction.ts` —
  reference for the existing internal-drag snap pattern.
- `apps/web/src/lib/timeline/audio-state.ts` — dB math + `ignoreFades`.
- `apps/web/src/core/managers/audio-manager.ts` — playback gain.
- `apps/web/src/lib/media/audio.ts` — `collectAudioClips` /
  `collectAudioElements`.
- `apps/web/src/components/editor/panels/timeline/index.tsx` — track
  slider UI.

## Files Expected to Change

(see FEATURE.md → "Files Changed")

## Test Plan

- Unit:
  - `apps/web/src/lib/timeline/__tests__/audio-state.test.ts` (new):
    `clampDb`, `dBToLinear` / `linearToDb` round-trip, additive dB
    combination (`slider +30 + element -30 → 0`, clamps, etc.),
    `resolveEffectiveAudioGain` with/without `ignoreFades`, fade-in/out
    boundary behaviour.
  - `apps/web/src/lib/timeline/__tests__/snap-utils.test.ts` (new):
    `snapElementEdge` start/end snap to adjacent edges, no-snap when
    outside threshold, closest-edge selection across multiple clips.
    `findNearestClipEdge` start/end detection and threshold cut-off.
- Integration: covered by existing migration + util tests
  (`bun run test` → 203 passing).
- E2E: not added (out of scope; manual QA only).
- Manual QA:
  1. Open editor, drop a video clip. Drag a second video from the
     library near the right edge of the first → magnet on → snaps to
     end. Magnet off → no snap.
  2. Drop an OS file directly onto the timeline near an existing clip →
     same snap behaviour.
  3. Set track slider to `+10 dB`, set inspector volume to `-20 dB` on
     one clip → playback audibly around `-10 dB` (≈ 0.316 linear).
  4. Set fade-in `1 s` on a clip, press play, stop, press play again →
     audio plays (fades in from silence) on both plays.
  5. Confirm toolbar does not scroll vertically even with many tools.

## Rollback Plan

Single branch `feat/snap-external-drop-and-audio-db-fix`. Revert the
merge commit or `git revert <merge-sha>`. Because the track-slider
semantics change (`%` → `dB`) is a behaviour change, users with stored
projects that had non-default slider values will see different levels
until they re-adjust. A migration in `apps/web/src/services/storage/migrations/`
could remap old percentages, but is not added here per "smallest safe
change" — call out in What's New instead.
