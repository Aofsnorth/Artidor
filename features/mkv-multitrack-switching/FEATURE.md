# Feature: mkv-multitrack-switching

## Problem

Users have MKV videos containing multiple embedded subtitle tracks and
multiple embedded dubbing (audio) tracks. Today Artidor only reads the
*primary* audio track (`getPrimaryAudioTrack()`) everywhere and does
not extract embedded subtitle tracks at all. Users cannot choose which
dubbing plays, cannot turn subtitles on/off, and cannot pick which
subtitle track shows.

Reported user story:
> "Sebagai user, saya memiliki video berformat .mkv yang memiliki
> beberapa subtitle dan beberapa dubbing custom, saya ingin video yang
> bertipe seperti itu bisa di custom di video editor seperti mengubah
> subtitle, mengubah dubbing, dan menonaktifkan subtitle atau
> dubbingnya."

Owner clarification (2026-06-29):

- MKV playback already works in the web preview.
- "Mengubah subtitle/dubbing" means **switching the active track** and
  **toggling tracks on/off** — NOT editing the text content or
  re-dubbing audio.
- Target platform: **web app only** (`apps/web`).

## Goal

For MKV (and other multi-track containers that already play in the web
preview), the user can:

1. See the list of embedded audio (dubbing) tracks and subtitle tracks.
2. Choose which audio track plays in preview and is used in export.
3. Choose which subtitle track renders in preview and export, or turn
   subtitles off.
4. Have the choice persist with the project.

## Non-Goals

- Editing subtitle text content (out of scope — owner confirmed).
- Recording/replacing dubbing audio (out of scope).
- MKV playback itself (already works in web preview per owner).
- Desktop (Tauri / desktop-native) support (web only for now).
- Adding new container/codec support beyond what already plays.
- Soft-subtitle export (muxing subtitles into output without burn-in)
  — follow export's existing subtitle behavior.

## Roadmap Alignment

- [ ] P0 Critical
- [ ] P1 Important
- [ ] P2 Nice to Have
- [x] Not on roadmap, approval required — **owner-approved override
      2026-06-29** (see ROADMAP.md "Approved overrides").

This is a new feature outside Q3 2026 focus (stabilization/desktop/
perf/security). Owner explicitly approved it as an override, same
mechanism as the Win32 native desktop path.

## What's New

- [x] Yes — new user-visible feature.
- [ ] No

Reason: users gain track selection UI for multi-track MKV.

## Acceptance Criteria

- [ ] AC2.1 — On import of an MKV (or other supported multi-track
      container), the system enumerates embedded audio tracks and
      subtitle tracks (index, language/label if present, codec type
      if available).
- [ ] AC2.2 — UI lets the user pick one active audio track (dubbing)
      per video element; switching changes preview audio and export
      audio.
- [ ] AC2.3 — UI lets the user pick one active subtitle track or turn
      subtitles off; the selected subtitle renders in preview and
      export.
- [ ] AC2.4 — Track choices persist with the project and survive
      reload.
- [ ] AC2.5 — Default is safe: with no user choice, primary audio
      track is used and subtitles default to off (or primary) — no
      breaking change for existing projects.
- [ ] AC2.6 — When a video has only one audio track / no subtitle
      tracks, the controls are hidden or disabled (do not mislead).
- [ ] AC2.7 — Switching tracks while preview is playing does not
      crash; audio resyncs without fatal glitch.
- [ ] AC2.8 — Export reflects the selected audio and subtitle track.
- [ ] AC2.9 — No regression for single-track / non-MKV videos.

## Affected Areas

- [x] `apps/web` (media import, timeline model, properties UI, audio
      manager, export pipeline, subtitle rendering)
- [ ] `rust` (not touched — web only)
- [ ] `packages/mcp-server`
- [x] `docs` (What's New entry, ROADMAP override note)
- [x] tests (track enumeration, default selection, schema migration)
- [x] storage migrations (new fields on video element / media asset)
