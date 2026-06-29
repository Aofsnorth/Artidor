# QA

## Environment

- OS: Windows
- Browser: Chrome (latest) — manual browser QA pending by owner
- Commit: (working tree, uncommitted)
- Date: 2026-06-29

## Automated Checks

- [x] Lint: `bun run lint:web` — pass (1055 files, no errors)
- [x] Typecheck: `cd apps/web && bunx tsc --noEmit` — pass (exit 0)
- [x] Unit tests: `bun run test` — pass (240/240, including 7 new
      `resolveAudioTrackByIndex` cases)
- [ ] Integration tests: n/a (UI + media pipeline)
- [ ] E2E: n/a
- [ ] Build: `bun run build:web` — **FAIL — pre-existing, NOT caused
      by this change.** Build fails on missing production env vars
      (`FREESOUND_CLIENT_ID`, `FREESOUND_API_KEY`, `PEXELS_API_KEY`)
      validated for `/api/health` page data collection. This change
      touches only media pipeline + UI + test + docs; it cannot
      affect env validation. Per RULES.md the agent must not edit
      `.env*`; owner needs to provide the env vars (or run a
      dev/non-production build) to verify the build end-to-end.
- [ ] Security scan: n/a (no sensitive paths touched)

## Manual Test Steps

1. Import an MKV video with a single audio track. Open the Audio tab
   in the properties panel. Verify the "Dubbing Track" selector is
   NOT shown (single track = no selector).
2. Import an MKV video with multiple audio tracks (e.g. ENG + JPN
   dubs). Select the video on the timeline. Open the Audio tab.
   Verify the "Dubbing Track" selector IS shown and lists all tracks
   with language codes and names.
3. Switch to a different track. Play the timeline. Verify the audio
   switches to the selected track.
4. Switch tracks during playback. Verify the audio updates without
   requiring a timeline restart.
5. Export the project. Verify the exported audio uses the selected
   track.
6. Reload the project. Verify the selected track persists (stored on
   `VideoElement.selectedAudioTrackIndex`).
7. Import a non-MKV video (e.g. MP4 with single audio track). Verify
   no selector appears (no regression).

## Result

Pass/Fail: Automated checks pass except build (env-related,
pre-existing). Manual browser QA: pending owner run (agent has no
browser access).

## Notes

- The `sourceKey` for audio clips includes the track index
  (`${mediaAssetId}#audio${index}`) so the audio manager creates a
  fresh sink/input when the user switches tracks. This prevents
  stale audio from a cached sink.
- `resolveAudioTrackByIndex` clamps out-of-range indices to the last
  valid track, so a project saved with index 2 on a 3-track video
  still works if the video is later replaced with a 2-track version.
- Files changed: `mediabunny.ts`, `audio.ts`, `audio-manager.ts`,
  `processing.ts`, `timeline/types.ts`, `storage/types.ts`,
  `audio-tab.tsx`, `whats-new/feed.ts`,
  `whats-new/__tests__/feed.test.ts`,
  `lib/media/__tests__/audio-track-selection.test.ts` (new).
- Rollback: revert the implementing commit. The field is optional
  with default 0; all changes are additive and guarded.
