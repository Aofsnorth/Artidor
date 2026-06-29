# Risks

## Technical Risks

- **mediabunny may not expose multi-track audio/subtitle enumeration.**
  Mitigation: Phase 0 research before any feature code. If gap found,
  evaluate `HTMLMediaElement.textTracks` for preview subtitles and
  document the smallest solution. No new dependency without owner
  approval.
- **MKV subtitle codec variety** (SRT/ASS/PGS/VobSub). PGS/VobSub are
  bitmap-based and cannot be rendered as text without OCR — out of
  scope. Mitigation: support text-based subtitle tracks (SRT/ASS)
  first; show "unsupported" for bitmap subs rather than crashing.
- **Audio track switch during playback** may cause a brief glitch or
  resync. Mitigation: acceptable per AC2.7 (no crash; resync allowed).
  Re-decode the chosen track and re-attach to the graph.
- **Schema migration** could corrupt existing projects if defaults are
  wrong. Mitigation: additive optional fields; migration unit test
  with a real v-1 project fixture.

## Security Risks

- None directly. No secrets, no auth, no MCP, no network. The feature
  reads local media files the user already imported.
- Subtitle parsing reuses existing `lib/subtitles/` parsers which
  already sanitize input. No new parser for untrusted external data is
  introduced.

## UX Risks

- Showing track selectors for single-track videos could confuse users.
  Mitigation: AC2.6 — hide/disable controls when ≤1 track.
- Subtitle track with no language label is shown as "Track 1" etc.
  Acceptable; no metadata fabrication.

## Performance Risks

- Enumerating tracks on import adds work. Mitigation: enumerate once
  at import, cache on `MediaAssetData`. No per-frame cost.
- Switching audio track triggers a re-decode of the chosen track.
  Mitigation: reuse the existing `AudioBufferSink` pipeline; only
  re-decode the selected track, not all tracks.

## Mitigations

- Phase 0 research gate before any code.
- Additive schema migration with safe defaults + unit test.
- Smallest changes to existing call sites (replace
  `getPrimaryAudioTrack()` with a resolver helper).
- Hide UI when not applicable.
- Bitmap subtitles: detect and label "unsupported", do not crash.
