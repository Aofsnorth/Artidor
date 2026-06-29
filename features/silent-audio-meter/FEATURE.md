# Feature: silent-audio-meter

## Problem

Users see the audio meter light up (green bars rising to ~-6 dB) when
playing a video that has no audio track, or whose audio is silent/0 at
the start. This is misleading: it suggests audio is playing when none
exists, which can cause users to ship a mix they believe has sound.

Reported user story:
> "Sebagai user, saya ingin setiap video yang tidak memiliki audio atau
> audio memang 0 di awal, tidak memiliki audio meter yang menyala, saya
> melihat meski video tidak memiliki suara dan saya play, di meter
> preview terlihat hijau preview naik ke -6 db."

## Goal

The audio meter (both the preview `AudioMetersCard` and the properties
panel `VerticalAudioMeter`) must stay flat/idle when the currently
playable content has no audible signal — whether because the media has
no audio track, the element/track is muted, or the timeline has no
audible candidates. The meter must continue to work normally for media
that genuinely has audio.

## Non-Goals

- Changing how `AnalyserNode`s are wired in the audio graph (out of
  scope unless the UI-only fix proves insufficient).
- Adding new meter visualizations.
- Touching export audio behavior.
- Multi-track audio selection (that is `mkv-multitrack-switching`).

## Roadmap Alignment

- [x] P0 Critical (editor UX reliability / stabilization — prevents
      misleading output that could cause bad exports)
- [ ] P1 Important
- [ ] P2 Nice to Have
- [ ] Not on roadmap, approval required

Aligns with ROADMAP "Stabilization — Bug fixing, timeline/editor
reliability" (Q3 2026 current focus).

## What's New

- [x] Yes — user-visible fix to editor behavior.
- [ ] No

Reason: meter behavior change is visible to every user who plays a
silent video.

## Acceptance Criteria

- [ ] AC1.1 — Video with no audio track: meter L/R stay flat/idle
      during playback (no green bar rising).
- [ ] AC1.2 — Video with audio but element/track muted: meter stays
      flat.
- [ ] AC1.3 — Timeline with no audible candidates
      (`timelineHasAudio === false`): meter idle from the start, even
      before play.
- [ ] AC1.4 — Video with real audio: meter rises/falls normally — no
      regression.
- [ ] AC1.5 — Both meter components behave consistently
      (`audio-meters-card.tsx` and `vertical-audio-meter.tsx`).
- [ ] AC1.6 — No console errors when loading a no-audio video and
      play/pause/seek.

## Affected Areas

- [x] `apps/web` (UI components + audio manager + lib/media)
- [ ] `rust`
- [ ] `packages/mcp-server`
- [ ] `docs` (What's New entry)
- [x] tests (unit test for the silent-detection helper)
