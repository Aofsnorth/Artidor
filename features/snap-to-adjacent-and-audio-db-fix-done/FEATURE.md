# Feature: Snap-to-Adjacent for External Media Drops + Additive dB Audio Combination

Branch: `feat/snap-external-drop-and-audio-db-fix`

## Problem

1. **No snap-to-adjacent for external media drops.** When the magnet
   (snapping) toggle is on, dragging existing clips around the timeline
   snaps to neighbouring clip edges, but the same behaviour was missing
   for *external* drags — OS file drops from the desktop, library-asset
   drags from the asset panel, and similar. Users had to manually align
   new clips pixel-perfectly against existing ones, which made the
   magnet toggle feel inconsistent.

2. **Audio dB math is wrong.** The track-level volume slider was a
   linear percentage (`0–100%`, default `100`) multiplied against the
   per-element inspector volume (stored in dB, `VOLUME_DB_MIN..MAX`,
   default `0`). The two domains are mathematically incompatible:
   multiplying a linear percentage by a linear gain that's already been
   dB-decoded yields nonsense numbers and makes the slider's effect
   inconsistent with the inspector card. The user-facing expectation
   (track slider `60 dB` + inspector `-30 dB` should net to `+30 dB`)
   requires both fields to live in the same domain and add.

3. **Replay silence when fade in/out is set** (discovered mid-session).
   `collectAudioClips` called `resolveEffectiveAudioGain({ localTime: 0 })`
   *without* `ignoreFades: true`, so for a clip with `fadeIn > 0` the
   base `clip.volume` was multiplied by `0 / fadeIn == 0`. The fast-path
   automation then used `baseGain = 0` and never ramped up to a useful
   level, leaving the entire clip silent on every replay. (Live fade
   adjustments during playback worked because `handleTimelineChange`
   recomputed the gain each tick.)

4. **Timeline toolbar could scroll vertically** (discovered mid-session).
   `TimelineToolbar` wrapped its 40 px row in a generic `<ScrollArea>`
   (`overflow-auto`). The toolbar should only scroll horizontally on
   narrow viewports, never vertically. Reported by user as "kenapa bisa
   di-scroll ke bawah ya?".

## Goal

- The magnet (snapping) toggle snaps external media drops to adjacent
  clip edges, mirroring the existing internal-drag behaviour.
- Track slider and inspector volume combine **additively in dB**, with
  the slider living in the dB domain (`VOLUME_DB_MIN..VOLUME_DB_MAX`,
  default `0`). UI displays both in dB.
- Replay from start with `fadeIn > 0` plays audio correctly (fades in
  from 0 over `fadeIn` seconds instead of staying muted).
- The timeline toolbar row only scrolls horizontally.

## Non-Goals

- No UI redesign of the track header.
- No change to the inspector's `Volume` field semantics (still dB).
- No change to element-level keyframe handling.
- No change to the export pipeline.
- No change to the existing window.confirm replacement scope
  (folder delete) carried in from a prior session.

## Roadmap Alignment

- [ ] P0 Critical — no data loss
- [x] P1 Important — Timeline stability + Editor UX reliability
- [ ] P2 Nice to Have
- [ ] Not on roadmap, approval required

Both fixes are P1 under the "Stabilization" focus in `ROADMAP.md`.

## What's New

- [x] Yes
- [ ] No

Reason: user-visible behaviour change (track slider now in dB, snap
behaviour for external drops, replay-mute fix, toolbar vertical-scroll
fix).

## Acceptance Criteria

- [x] Drag an external media file from the OS / asset panel onto a
      track with existing clips within `DEFAULT_SNAP_THRESHOLD_PX` (10 px)
      → clip snaps to the nearest edge when magnet is on.
- [x] Magnet off → no snap.
- [x] Track slider value lives in dB (`VOLUME_DB_MIN..VOLUME_DB_MAX`),
      default `0`. UI shows `X.X dB` (was `X %`).
- [x] Final gain = `10 ^ ( clampDb(trackSliderDb + elementVolumeDb) / 20 )`.
      Slider `+30 dB` + inspector `-30 dB` → `0 dB` net → linear `1.0`.
      Slider `0 dB` + inspector `0 dB` → `0 dB` net → linear `1.0`.
      Slider `0 dB` + inspector `-30 dB` → `-30 dB` net → linear `~0.0316`.
- [x] Replay from start with `fadeIn > 0` plays audio (fades in from
      silence over `fadeIn` seconds).
- [x] Timeline toolbar does not scroll vertically.
- [x] 203 unit tests pass, 0 lint errors, `tsc --noEmit` clean.

## Affected Areas

- [x] `apps/web`
- [ ] `rust`
- [ ] `packages/mcp-server`
- [ ] `docs`
- [x] tests

## Files Changed (cumulative on this branch)

```text
apps/web/src/components/editor/panels/timeline/index.tsx           (track slider: % → dB)
apps/web/src/components/editor/panels/timeline/timeline-element.tsx (visual gain: additive dB)
apps/web/src/core/managers/audio-manager.ts                         (playback gain: additive dB)
apps/web/src/hooks/timeline/use-timeline-drag-drop.ts              (snap-to-adjacent on drop)
apps/web/src/lib/timeline/audio-state.ts                           (add ignoreFades + linearToDb)
apps/web/src/lib/timeline/__tests__/audio-state.test.ts            (new tests)
apps/web/src/lib/timeline/__tests__/snap-utils.test.ts             (new tests)
apps/web/src/lib/whats-new/feed.ts                                 (What's New entries)
```
