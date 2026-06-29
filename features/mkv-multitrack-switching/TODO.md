# TODO

## Phase 0 — Research (done)

- [x] Audit mediabunny API for multi-track audio + subtitle
- [x] Check HTMLMediaElement.textTracks applicability
- [x] Document findings in PLAN.md
- [x] Owner decision: defer subtitle, implement dubbing

## Phase 1 — Audio track enumeration (done)

- [x] Add `AudioTrackInfo` type to `mediabunny.ts`
- [x] Extend `getVideoInfo` to return `audioTracks[]`
- [x] Store `audioTracks` on `MediaAssetData` (only when >1 track)
- [x] Thread `audioTracks` through `processing.ts`

## Phase 2 — Timeline model (done)

- [x] Add `selectedAudioTrackIndex` to `VideoElement` (optional, default 0)
- [x] No storage migration needed (optional field, backward compatible)

## Phase 3 — Call site updates (done)

- [x] Add `resolveAudioTrackByIndex` helper
- [x] Update `extractClipAudio` to use selected track
- [x] Update `decodeMediaFileAudioBuffer` to use selected track
- [x] Update `resolveAudioBufferForVideoElement` to pass track index
- [x] Add `audioTrackIndex` to `AudioClipSource`
- [x] Update `collectMediaAudioClip` to populate + include in sourceKey
- [x] Update `audio-manager.ts` `decodeClipBuffer`
- [x] Update `audio-manager.ts` `getAudioSink`

## Phase 5 — UI (done)

- [x] Add "Dubbing Track" selector to `audio-tab.tsx`
- [x] Show only when media asset has >1 audio track
- [x] Display language code + track name

## Phase 7 — Tests + docs (done)

- [x] Unit test `resolveAudioTrackByIndex` (7 cases)
- [x] What's New entry (tag: feature)
- [x] Update feed guard test
- [x] Lint — pass (1055 files)
- [x] Typecheck — pass
- [x] Tests — pass (240/240)
- [ ] Build — FAIL (pre-existing env var issue, not caused by change)
- [ ] Manual QA (7 scenarios) — pending owner browser run
- [x] Update QA.md + STATE.md
- [ ] Open PR
