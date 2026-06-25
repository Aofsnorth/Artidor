# State

Status: implemented (uncommitted on `feat/snap-external-drop-and-audio-db-fix`)

## Current

- Snap-to-adjacent implemented in `use-timeline-drag-drop.ts` for both
  `handleDragOver` (visual feedback during drag) and `executeFileDrop`
  (OS file drop).
- Track slider semantics switched to dB; UI updated; gain combined
  additively in dB in both playback and waveform visual scaling.
- `clip.volume` no longer poisoned by fade-in on replay
  (`ignoreFades: true` in `collectAudioClips`).
- Timeline toolbar wrapper forced to `overflow-x-auto overflow-y-hidden`.
- 14 new unit tests added across `audio-state.test.ts` (8) and
  `snap-utils.test.ts` (6).
- Branch contains 2 prior commits (`2b2898a`, `893ba9f`) covering the
  mid-session fixes; the new dB + snap changes are uncommitted on the
  working tree (awaiting final review + commit).

## Decisions

- **Track slider: dB domain, not remapped percentage.** A mapping
  (e.g. `% * 0.6 - 60` to express 0% as -60 dB, 100% as 0 dB) was
  considered and rejected. It satisfies neither the user's "slider 60
  + inspector -30 → +30 dB net" expectation nor the natural mental
  model of "slider value = dB value". The simplest correct fix is to
  change the slider's domain and surface the change in What's New.
- **Snap threshold kept at default (10 px).** No new constant
  introduced; matches the existing internal-drag snap threshold.
- **`clip.volume` stays linear.** Storage is unchanged; conversion to
  dB happens at the read site via `linearToDb` in
  `audio-manager.ts`. This avoids a wider migration of stored data.
- **`ignoreFades` param added to `resolveEffectiveAudioGain`.** Cleanest
  way to express "give me the base gain without modulation"; both
  `collectAudioElements` and `collectAudioClips` opt in.
- **Toolbar fix uses class override, not new component.** The shared
  `ScrollArea` keeps its generic `overflow-auto`; the toolbar call site
  overrides to `overflow-x-auto overflow-y-hidden`. No refactor of the
  primitive, no regression risk for other callers.

## Open Questions

- None blocking. Cosmetic follow-up candidates (not in scope):
  - Migrate stored `trackSliders` percentages to dB so existing
    projects sound the same post-change.
  - Consider a "play from cursor" preference that skips fade-in at the
    start of playback (currently the user reports a perceived "1 s
    silence" on reload — this is the fade-in itself, not a bug; user
    may want a UI affordance to disable fade-in on play-from-start).

## Last Updated

2026-06-25
