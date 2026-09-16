# QA — timeline-seek-clip-disappear

## Scope of this phase

Bug: adding a second clip and then clicking the timeline/gutter to
seek forward quickly made the second clip visually disappear
(playhead ~00:00:05:08, only clip 1 visible).

Files this phase owns (rollback = revert these hunks only):

- `apps/web/src/hooks/timeline/use-timeline-viewport.ts` — resolve the
  scroll element defensively (rAF retry) instead of returning early
  when `tracksScrollRef.current` is still null on a simultaneous
  mount; subscribe effect keyed on the resolved `element` state.
- `apps/web/src/hooks/timeline/use-timeline-playhead.ts` — paused
  `playback-seek` events now run the keep-playhead-visible scroll
  logic; centre-follow stays exclusive to active playback.
- `apps/web/src/hooks/timeline/use-timeline-viewport.bughunt.test.ts`
  — new regression pins for both fixes.
- `apps/web/src/lib/whats-new/feed.ts` — one "fix" entry (this phase).

Everything else dirty in the working tree (snap/magnet fixes, cull
boundary tests, `use-timeline-drag-drop-snap.bughunt.test.ts`, etc.)
belongs to the previous session's snap phase, not this rollback.

## Root causes found

1. **Primary — `useTimelineViewport` race.** When track rows mount in
   the same commit as the ScrollArea owning `tracksScrollRef`, the
   child's layout effect runs before the parent's host ref is
   assigned → `tracksScrollRef.current === null` → early return → no
   scroll listener, no ResizeObserver, ever. `viewport.width` stays 0
   so the culling window is permanently `[-600, +600]`
   (`HORIZONTAL_OVERSCAN_PX`). The second clip (left edge ~1398px) was
   only mounted thanks to the selected-clip bypass; the first seek
   click clears the selection and the clip unmounts with no scroll
   event ever remounting it. Proven by `probe-fiber.mjs` (viewport
   width 0) and `debug-cull.mjs` (real scrolls never changed
   `domClips: 1`).
2. **Secondary — paused seek never scrolled the viewport.**
   `handlePlaybackUpdate` only followed the playhead while playing,
   so a paused forward seek moved the playhead off-screen with zero
   scroll context, making the culled clip read as "vanished".

## Automated checks

- [x] Regression test:
      `bun test --isolate apps/web/src/hooks/timeline/use-timeline-viewport.bughunt.test.ts`
      → 5 pass, 0 fail.
- [x] Timeline suites:
      `bun test --isolate apps/web/src/hooks/timeline/ apps/web/src/components/editor/panels/timeline/`
      → 44 pass, 0 fail across 12 files.
- [x] Typecheck: `bunx tsc --noEmit` (apps/web) → clean, exit 0.
- [x] Biome on phase files: `bunx biome check <3 phase files>` →
      "No fixes applied".
- [ ] Full `bun run lint` — exits 1 on **pre-existing** CRLF format
      drift in unrelated files (route.ts, page.tsx, globals.css, …).
      No phase file appears in that output.

## Browser verification (Playwright, disposable contexts)

`node features/timeline-seek-clip-disappear/verify-fix.mjs` against
dev server 127.0.0.1:3005, route `/editor/<disposable-id>` (falls
back to a fresh project; "Project not found" console error is
benign):

- Setup: 2 clips in state + DOM, clip 2 snapped to exactly 5s.
- V1 in-viewport click: viewport pixel-stable, both clips mounted.
- V2 seek to 5.08s: viewport scrolls to the playhead
  (scrollLeft 0→945), both clips mounted, second clip visible.
- V3 rapid synthetic seeks: state + DOM intact.
- V4 jump-forward button: state + DOM intact, playhead visible.

Two expected failures, both explained (not regressions):

- V2 "playhead inside viewport" false — script artifact: synthetic
  `CustomEvent("playback-seek")` doesn't update
  `playback.currentTime`, so playhead DOM uses stale time. Real
  `playback.seek()` updates time before dispatch.
- V4 `aria-valuenow` stays 0 — **separate pre-existing bug, out of
  scope**: "Jump forward (or next bookmark)" in
  `apps/web/src/components/editor/panels/preview/toolbar.tsx`
  (`handleJumpForward`) falls back to
  `invokeAction("jump-forward")` which never seeks (confirmed via
  `debug-jump.mjs`). Same no-op path applies to the keyboard
  `L`-key variant. Follow-up fix recommended.

## Unresolved coverage

- Jump-forward transport button + action-dispatch seeks (`L` key)
  still no-op — separate bug, needs its own fix + verification.
- Visual review of the final UI was via screenshots + DOM metrics
  only; no manual-eye pass claimed beyond that.
- Dev server was stopped and `.tmp-dev-*.log` files deleted after
  verification.

## Result

Pass/Fail: **PASS** for the reported bug (both root causes fixed,
regression-pinned, suites green).
