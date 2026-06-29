# TODO

- [x] Read relevant files (audio manager, meter components, audio lib)
- [x] Reproduce the bug (root cause identified via code analysis:
      analyser read every frame regardless of audible candidates;
      meter card floor of 5)
- [x] Implement silence gate (reuse `timelineHasAudio`)
- [x] Add unit test for `timelineHasAudio` (9 cases)
- [x] Gate analyser reads in `audio-meters-card.tsx`
- [x] Gate analyser reads in `vertical-audio-meter.tsx`
- [x] Update What's New (tag: fix)
- [x] Run `bun run lint:web` — pass
- [x] Run `cd apps/web && bunx tsc --noEmit` — pass
- [x] Run `bun run test` — pass (233/233)
- [ ] Run `bun run build:web` — FAIL (pre-existing env var issue,
      not caused by this change; owner action needed)
- [ ] Manual QA (4 scenarios) — pending owner browser run
- [x] Update QA.md
- [ ] Open PR
