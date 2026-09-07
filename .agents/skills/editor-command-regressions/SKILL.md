---
name: editor-command-regressions
description: Tests Artidor timeline command identity, all-track coverage, clip-local keyframes and save concurrency. Use for duplicate, paste, split, undo/redo, autosave and project-lifecycle regressions.
---

# Editor command regression workflow

## When to use

- Timeline commands create elements, tracks, effects or keyframes.
- Save/playback managers change asynchronous lifecycle behavior.

## When NOT to use

- Pure visual CSS/component changes: use artidor-ui-verification.
- New rendering algorithms: use dedicated renderer/Rust tests.

## Procedure

1. Read command execute/undo/redo and its manager caller. Preserve the existing dirty diff; never reset user work.
2. Use deterministic in-memory factories in `apps/web/src/tests/factories/`. Avoid browser storage and real media in unit tests.
3. Exercise every ordered track group, especially `overlayAfter`. A main/overlay/audio-only loop is incomplete. Test stale selection refs and no-op commands too.
4. Execute creation, then a dependent edit using the created ID. Undo both, redo both, repeat. Assert full state and selected refs; counts alone miss identity bugs.
5. Use immutable snapshots for redo of creation commands when regenerating IDs would invalidate later history. Keep undo project-settings changes within the same command lifecycle.
6. Keyframe clipboard times may be absolute; animation channels store clip-local times. Test a nonzero clip start, playhead offset, and pasted values/interpolation.
7. Split speed curves at source time and renormalize both sides. Verify endpoints, not only the array lengths.
8. For autosave, use deferred promises: edit during a running save, request flush, fail a write, pause with a timer queued, switch project. Assert dirty status and which project gets updated.
9. Run focused regressions and then `bun test --isolate apps/web/src`. Module mocks can contaminate other suites without isolation.
10. Run web and test typechecks separately and report baseline errors without weakening tests. Use bounded CPU-affinity commands on Windows.

## Pitfalls

- Readonly EditorCore fixture properties: attach explicit test doubles with `Object.defineProperty`, not assignment.
- Mixed track arrays may need `flatMap<TimelineElement>` for correct inference.
- RAF handle zero is valid; null is the stopped sentinel.
- A successful awaited save must not overwrite settings changed while it was in flight.
- Do not claim all bugs fixed; enumerate verified invariants.

## Verification

Read the colocated manager regression tests and `lib/ripple/diff.test.ts`. Browser smoke in `features/editor-bugfix-10-iterations/browser-smoke.mjs` uses disposable state and tests insert/duplicate/undo/redo/save. It needs an existing reachable dev server and must never attach to a user's browser profile.
