# QA

## Automated Checks

- [x] Focused timeout tests — 3 pass
- [x] Focused audio concurrency tests — 2 pass
- [x] `bun run lint:web` — 1135 files, no diagnostics
- [x] `cd apps/web && bunx tsc --noEmit` — exit 0
- [x] `bun run test` — 316 pass, 0 fail
- [x] `bun run build:web` — production build succeeded
- [x] `bun scripts/whats-new-check.mjs` — passed
- [x] `git diff --check` — passed

## Manual Checks Pending

- [ ] Playback autoscroll stays centred and seek remains correct in a real project.
- [ ] Long export with many audio clips preserves trim/track selection.
- [ ] Export cancellation/timeout releases the worker.
- [ ] Home text/cards remain legible over bright artwork regions.

## Notes

Build emitted pre-existing Better Auth development-secret warnings. No auth or environment files were touched. No browser fixture was available for a real long-video throughput benchmark, so no speedup percentage is claimed.
