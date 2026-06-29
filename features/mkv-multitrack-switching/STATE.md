# State

Status: implemented (dubbing switching; subtitle deferred)

## Current

- Phase 0 research complete.
- Owner decision (2026-06-29): defer embedded MKV subtitle switching;
  implement multi-track audio (dubbing) switching now.
- Subtitle: user keeps using external SRT/ASS import (existing flow).
- **Dubbing switching implemented end-to-end:**
  - `getVideoInfo` now enumerates all audio tracks via
    `Input.getAudioTracks()` and stores them as `AudioTrackInfo[]` on
    `MediaAssetData.audioTracks`.
  - `VideoElement.selectedAudioTrackIndex` (optional, default 0)
    stores the user's choice.
  - `resolveAudioTrackByIndex` helper resolves the correct track by
    index with fallback + clamping.
  - All `getPrimaryAudioTrack()` call sites updated to use the
    selected index: `extractClipAudio`, `decodeMediaFileAudioBuffer`,
    `decodeClipBuffer`, `getAudioSink`.
  - `AudioClipSource.audioTrackIndex` threads the selection through
    the audio manager. `sourceKey` includes the track index so
    switching creates a fresh sink.
  - UI: "Dubbing Track" selector in the Audio tab of the properties
    panel, shown only when the media asset has >1 audio track.

## Decisions

- Reuse `Input.getAudioTracks()` — no new dependency needed.
- `selectedAudioTrackIndex` is optional with default 0 → backward
  compatible, no storage migration needed.
- `sourceKey` includes track index to force fresh sink creation on
  track switch (avoids stale audio from cached sink).
- Subtitle embedded extraction deferred — mediabunny drops subtitle
  tracks during demuxing; proper solution needs custom EBML parser or
  new dependency (ffmpeg.wasm). Owner chose to defer.

## Open Questions

- ~~Owner decision needed: how to handle embedded MKV subtitles?~~
  DECIDED (2026-06-29): defer subtitle switching.
- Build fails due to missing production env vars — pre-existing,
  environment-related, not caused by this change. Owner needs to
  provide env vars or run a non-production build to verify
  end-to-end.

## Last Updated

2026-06-29
