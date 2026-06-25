# State

Status: implemented + merged via PR #33. Reverted from dB to percentage
per user decision mid-session. All SOP checks green.

## Current

- Snap-to-adjacent implemented in `use-timeline-drag-drop.ts` for both
  `handleDragOver` (visual feedback during drag) and `executeFileDrop`
  (OS file drop).
- Track slider reverted from dB back to **percentage (0-100%)** per
  user decision. Gain combined multiplicatively:
  `elementLinear * (sliderPercent / 100)` in both playback and
  waveform visual scaling.
- Speaker icon added to volume slider — toggles mute/unmute.
- Opacity slider gets a TransparencyIcon — toggles opacity 0/100%.
- `clip.volume` no longer poisoned by fade-in on replay
  (`ignoreFades: true` in `collectAudioClips`).
- Timeline toolbar wrapper forced to `overflow-x-auto overflow-y-hidden`.
- 14 new unit tests added across `audio-state.test.ts` (8) and
  `snap-utils.test.ts` (6).
- Merged into `main` via PR #33.

## Decisions

- **Track slider: percentage, NOT dB.** Originally implemented as dB,
  then reverted to percentage (0-100%) per user preference. The
  multiplicative combination (`elementLinear * sliderPercent / 100`)
  is simpler and more intuitive for users than additive dB.
- **Snap threshold kept at default (10 px).** No new constant
  introduced; matches the existing internal-drag snap threshold.
- **`clip.volume` stays linear.** Storage is unchanged.
- **`ignoreFades` param added to `resolveEffectiveAudioGain`.** Cleanest
  way to express "give me the base gain without modulation"; both
  `collectAudioElements` and `collectAudioClips` opt in.
- **Toolbar fix uses class override, not new component.** The shared
  `ScrollArea` keeps its generic `overflow-auto`; the toolbar call site
  overrides to `overflow-x-auto overflow-y-hidden`. No refactor of the
  primitive, no regression risk for other callers.

## Open Questions

- None blocking.

## Last Updated

2026-06-25
