# QA

## Environment

- OS: Windows
- Browser: Chrome (latest) — manual browser QA pending by owner
- Commit: (working tree, uncommitted)
- Date: 2026-06-29

## Automated Checks

- [x] Lint: `bun run lint:web` — pass (1054 files, no errors)
- [x] Typecheck: `cd apps/web && bunx tsc --noEmit` — pass (exit 0)
- [x] Unit tests: `bun run test` — pass (233/233, including 9 new
      `timelineHasAudio` cases)
- [ ] Integration tests: n/a (UI-only)
- [ ] E2E: n/a
- [ ] Build: `bun run build:web` — **FAIL — pre-existing, NOT caused
      by this change.** Build fails on missing production env vars
      (`FREESOUND_CLIENT_ID`, `FREESOUND_API_KEY`, `PEXELS_API_KEY`)
      validated for `/api/health` page data collection. This change
      touches only meter UI components + a unit test + docs; it cannot
      affect env validation. Per RULES.md the agent must not edit
      `.env*`; owner needs to provide the env vars (or run a
      dev/non-production build) to verify the build end-to-end.
- [ ] Security scan: n/a (UI-only, no sensitive paths touched)

## Manual Test Steps

1. Import a video with no audio track; press Play; observe both meter
   components stay flat.
2. Import a video with audio; mute the element; press Play; observe
   meter stays flat.
3. Import a video with audio; press Play; observe meter rises/falls
   normally (no regression).
4. Empty timeline; press Play; observe meter idle before and during
   playback.

## Result

Pass/Fail: Automated checks pass except build (env-related, pre-existing).
Manual browser QA: pending owner run (agent has no browser access).

## Notes

- Root cause: the meter read the analyser every frame regardless of
  whether any audible candidate existed. The analyser can report a
  non-silent baseline even for silent content, and the meter card had
  a visible floor of 5%. Fix: gate analyser reads on
  `timelineHasAudio(...)`, and lower the floor to 0.
- Files changed: `audio-meters-card.tsx`, `vertical-audio-meter.tsx`,
  `apps/web/src/lib/media/__tests__/audio-silence.test.ts` (new),
  `apps/web/src/lib/whats-new/feed.ts`, `apps/web/src/lib/whats-new/__tests__/feed.test.ts`.
- Rollback: revert the implementing commit. Helper is additive;
  component changes are guarded by the helper.
