# Editor reliability — ten debugging iterations

Requested: inspect and fix reproducible web-editor bugs in ten distinct iterations, without a long sub-agent review.

## Scope and impact

- Existing web command/managers: duplicate, split/paste/history, clipboard, playback, save/project lifecycle.
- Existing timeline/ripple helpers and renderer/export boundaries as evidence warrants.
- Colocated regression tests with deterministic in-memory editor fixtures.
- What's New and this QA record; no dependency, auth/API/MCP, Rust, or generated-file edits.
- Preserve all pre-existing local edits, especially project-manager and rendering work.

## Iterations

1. [x] Establish baseline and compare documented editor behavior. 400 tests pass; normal typecheck fails before changes in generated `.next/dev/types/validator.ts:359` (TS1128).
2. [x] Duplicate covers lower tracks and stale selection refs; undo restores the original state (`timeline-regressions.test.ts`).
3. [x] Ripple diff includes all track groups and detects cross-track moves (`lib/ripple/diff.test.ts`).
4. [x] Snapshot redo preserves clip/track/effect/keyframe identities and dependent edits across repeated cycles.
5. [x] Effect paste supports fresh clips, preserves parameters/enabled state and groups updates into one undo step (`clipboard-regressions.test.ts`).
6. [x] Pasted keyframes use clip-local time; split speed ramps are sliced and renormalized (`animation-regressions.test.ts`).
7. [x] Playback rejects nonfinite seek/volume, repeated play preserves clock, pause cancels RAF handle zero (`playback-manager.test.ts`).
8. [x] Save flush drains active/pending saves; failures remain dirty; pause cancels queued timers (`save-manager.test.ts`).
9. [x] Save failures propagate, later project settings survive async writes, exit saves without a thumbnail, project switch clears history, export cache checks current snapshot (`project-manager.test.ts` and export/renderer tests).
10. [x] Integrated validation executed with explicit limits: prior browser insert/duplicate/undo/redo/save smoke passed; full isolated suite now 438/0, lint clean, source typecheck passes after dev cache regeneration. Build timed out at 240 s; CodeGraph sync timed out at 120 s; neither is claimed successful. Test-only typecheck has pre-existing failures noted in the session.

Each iteration records inspection, a regression/reproduction where relevant, the fix (only when proven), and actual validation. A passing suite is not a claim that all possible bugs have been eliminated.

## Risks and rollback

The primary risks are timeline identity changes breaking subsequent redo commands, saving an incomplete project, and interference with local work. Keep immutable snapshots, check dependent edits after redo, and use in-memory save gates rather than user media. Roll back only this task's hunks/tests/docs; never reset the workspace. No project schema migration is planned.

## External references checked

- https://docs.kdenlive.org/en/cutting_and_assembling/editing.html — frame-level seeking, cut/trim, slip/ripple, multi-track alignment.
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime — media seeking and playback-time precision.
- Adobe trimming reference fetch failed; not used as evidence.

## Validation strategy

Run each new regression before and after its fix, then the full isolated Bun suite. Bound commands in time and cap Windows process CPU affinity. Run lint, source/test typecheck, and build; document baseline or environment blockers rather than suppressing them. Check browser harness availability before claiming E2E coverage.
