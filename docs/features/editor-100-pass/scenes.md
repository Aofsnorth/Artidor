# Scene/track/transition/preview domain fixes (editor-100-pass)

Scope: `lib/preview/element-bounds.ts`, `lib/commands/timeline/track/{remove-track,toggle-track-mute,toggle-track-visibility}`,
`lib/commands/timeline/element/delete-elements.ts`, `core/managers/scenes-manager.ts` (`switchToScene`),
`lib/commands/scene/transition.ts`, `components/editor/panels/assets/views/transitions.tsx`,
`components/editor/panels/timeline/index.tsx` (context-menu gating). Plus test-only additions:
`lib/commands/scene/scenes-100-pass-owned.test.ts` (new), `lib/commands/timeline/track/remove-track.test.ts` (+2 asserts).

Out of scope (untouched): save/audio/collab/clipboard/command-element files; `lib/ai/tools/executor.ts` READ ONLY
(see Round 16 — report to main, no edit); prune-race + grouping reentrancy (commands agent — verified, not touched).

Baseline: `bunx tsc --noEmit` zero errors before and after (this track introduces none).
Pre-existing failures elsewhere (not this track): 3 playback-manager loop tests
(`loop restarts from zero…`, `loop survives a >1-frame rAF gap…`, `seek while looping…`) fail on a
clean tree too (verified via `git stash` + rerun) — audio/playback scope.

## Fixes

- `element-bounds.ts` — `getVisibleElementsWithBounds` omitted `overlayAfter` while
  `scene-builder.buildScene` paints `[overlay, main, overlayAfter]` (verified lines 309-315).
  Hit-test/transform/mask callers (`use-preview-interaction`, `use-transform-handles`,
  `use-mask-handles`, `masks-tab`) all read this one function, so one 3-line addition fixes
  click + handles together. Order matches the render stack (`.reverse()` → topmost first).
- `remove-track.ts` — returns `{ select: [] }` now (was `undefined`; `delete-elements` already
  returned `{ select: [] }`, and `CommandManager` only restores prior selection on undo when a
  command declared an override). Strips `scene.transitions` referencing the removed track/elements.
  No-op (unknown id, main track): returns `undefined` with NO `updateTracks` write (was: pushed a
  dead history step + wrote identical tracks). Undo restores tracks via `timeline.updateTracks`
  and transitions via `setScenes` when available.
- `delete-elements.ts` — same transition-strip on element delete (single `updateTracks` write for
  tracks + guarded `setScenes` patch only when a transition actually references the deleted ids;
  saved whole scene so undo restores both).
- `scenes-manager.ts` (`switchToScene`) — verified: no `clearSelection` anywhere in the file, and
  `PlaybackManager` holds a single shared `currentTime` (no per-scene store in any `stores/*`;
  `timeline-store`/`preview-store` hold only UI prefs). Fix: `selection.clearSelection()` +
  `playback.seek({ time: 0 })` before activating (same pattern as project switch in
  `project-manager.ts:149,241,296`). Per-scene restore preferred by the brief is impossible with
  nowhere to live — reset-to-0 it is, documented inline.
- `transition.ts` — new exported `getTransitionOverlapWindow` (`min(endA,endB)-max(startA,startB)`,
  null when clips missing/disjoint) + `clampTransitionToOverlap` (duration clamped to
  `min(overlap, def.maxDuration, both durations)` floored at `minDuration`; startTime clamped into
  the overlap). `AddTransitionCommand` throws on missing/disjoint clips, unknown definition
  (registry throws), and stores the CLAMPED geometry. `UpdateTransitionCommand` throws on unknown
  id and re-validates/re-clamps merged endpoints. Same-scene check: single-scene store — both
  clips must resolve in the ACTIVE scene's tracks, else throw.
- `transitions.tsx` (UI) — was `startTime = firstEl.startTime + firstEl.duration` (OUTSIDE the
  from-clip) with `duration = min(default, max(min, 1s))` (no overlap/both-duration clamp, no
  `maxDuration` cap). Now computes the overlap window, rejects disjoint pairs with a toast, and
  clamps duration to `min(default, overlap, maxDuration, both durations)` floored at minDuration,
  startTime into the overlap. The command re-clamps anyway (defense in depth for AI/direct calls).
- `timeline/index.tsx` — mute/visibility context-menu items now gated (`canTrackHaveAudio` /
  `canTrackBeHidden` wrap the whole item instead of only the label), matching the command no-ops.
- `toggle-track-mute/visibility.ts` — capability failure returns early (`savedState = null`,
  `undefined`, no `updateTracks`): dead history steps eliminated. Note the pre-existing early
  return on unknown id already existed; the gap was only the incompatible-TYPE path (update fn
  returned the track unchanged but still wrote + pushed history).
- Prune/grouping (commands agent): verified `remove-track`/`delete-elements` write tracks through
  `timeline.updateTracks` / `scenes.setScenes` directly (never via other commands), so each action
  stays a single history entry — consistent with the grouping snapshot pattern. Prune reactor in
  `core/index.ts:79-112` fires on `scenes`/`timeline` subscribe; transition strips reuse the same
  `setScenes` path, no extra entries.

## Review log (20 sequential rounds)

### Round 1 — render-stack vs hit-test order verified in code

Scenario: confirm hypothesis 1 — `scene-builder` paints `overlayAfter`, hit-test omits it.

Evidence: `scene-builder.ts:309-315` → `visibleTracks = [overlay, main, overlayAfter]`;
`element-bounds.ts:257-260` (pre-fix) → `[overlay, main].reverse()`. Callers confirmed:
`use-preview-interaction.ts:185,234`, `use-transform-handles.ts:147`, `use-mask-handles.ts:61`,
`masks-tab.tsx` — all funnel through `getVisibleElementsWithBounds`.

Command: code read (no run).

Result: CONFIRMED. Fix: 3-line `overlayAfter` addition in render-stack order.

### Round 2 — remove-track selection gap verified in code

Scenario: `delete-elements` returns `{select: []}`; `remove-track` returns `undefined`.

Evidence: `delete-elements.ts:60-62` vs `remove-track.ts:29` (pre-fix). `commands.ts:81-85`:
undo restores `previousSelection` ONLY when `selectionOverride !== undefined` — so after
remove-track, undo of a LATER command could resurrect refs into the deleted lane.

Command: code read.

Result: CONFIRMED. Fix: `return { select: [] }` on success; `undefined` + no write on no-op.

### Round 3 — scene-switch selection + playhead verified in code

Scenario: `switchToScene` never clears selection; playhead is shared with no per-scene restore.

Evidence: `scenes-manager.ts:83-107` (pre-fix) — no selection/playhead calls; `playback-manager.ts:7`
single `currentTime`; grep `perScene|sceneTimes|playheadByScene` → zero hits; `timeline-store.ts`
holds only UI prefs (snapping, heights). `project-manager.ts:149,241,296` already clears selection
on project switch — the precedent.

Command: code read + grep.

Result: CONFIRMED both. Fix: `clearSelection()` + `seek({time: 0})` (reset-to-0; per-scene state
has nowhere to live — checked stores).

### Round 4 — transition creation geometry verified in code

Scenario: UI computes `startTime` OUTSIDE the from-clip with no overlap clamp; commands validate nothing.

Evidence: `transitions.tsx:177-181` (pre-fix) `startTime = firstEl.startTime + firstEl.duration`;
`transition.ts:13-28,84-103` (pre-fix) — append/merge with zero checks. `Transition` type confirms
ticks + overlap semantics (`types.ts:32-35`).

Command: code read.

Result: CONFIRMED. Fix: overlap-window helpers + UI clamp + command validate/clamp.

### Round 5 — renderer/hook transition usage verified (do-NOT-wire check)

Scenario: confirm nothing renders `scene.transitions` today.

Evidence: grep `useActiveTransitionsAtTime` → only definition (`use-transitions.ts:55`); zero callers.
grep `\.transitions` in `services/`, `renderer-manager`, `project-manager`, `thumbnail.ts` → zero hits.
`scene-builder.ts` contains zero `transition` references (only `resolve.ts` comments about video cuts).
`buildScene` callers: preview, project-thumbnail, renderer-export, preset-thumbnail — none pass transitions.

Command: `grep -rn` (multiple).

Result: CONFIRMED — store-only feature. Renderer NOT wired (honest remaining gap, see Gaps).

### Round 6 — AI executor verified READ ONLY (report, no edit)

Scenario: check `add_transition` raw-default passthrough per brief.

Evidence: `executor.ts:964-983` — builds `AddTransitionCommand` with `asString/asNumber` fallbacks
(`startTime 0`, `duration TICKS_PER_SECOND`), no overlap computation, no existence check.

Command: code read.

Result: CONFIRMED — **report to main**: executor needs the same overlap treatment (or a shared
`buildClampedTransition` helper). NOT edited per brief. Mitigation in place: the command now throws
on bad geometry, so raw AI calls fail loudly instead of storing outside-both-clips transitions.
`set_track_muted/visible` read-then-conditional-toggle is race-safe enough with the command no-ops.

### Round 7 — mute/visibility dead-step verified in code

Scenario: incompatible-type toggles write unchanged tracks + push history.

Evidence: pre-fix `toggle-track-mute.ts:32-33` / `toggle-track-visibility.ts:32-37` — update fn
returned the SAME track on capability failure but `updateTracks` still ran and `execute()` still
pushed history. Context menu rendered the items unconditionally (label-only gating).

Command: code read.

Result: CONFIRMED. Fix: early `undefined` return + menu gating.

### Round 8 — remove-track ordered-groups regression

Scenario: removing an `overlayAfter` lane touches only that lane (all four groups present).

Evidence: `scenes-100-pass-owned.test.ts` → remove-track group, test 1.

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS (failed before the lane-filter existed; passes now). Fix: pre-existing `overlayAfter`
filter retained + extended with selection/transitions.

### Round 9 — remove-track stale-selection regression

Scenario: selection pointing into the removed lane clears.

Evidence: same file → remove-track group, test 2 (`select: []` asserted on result AND store).

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: Round 2.

### Round 10 — remove-track transition-strip regression

Scenario: transitions referencing the removed track vanish; unrelated ones survive.

Evidence: same file → remove-track group, test 3.

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: `removedTrackIds`/`removedElementIds` filter in `remove-track.ts`.

### Round 11 — no-op redo stability regression

Scenario: unknown id → `undefined`, no track write, selection untouched, redo same.

Evidence: same file → remove-track group, test 4. `remove-track.test.ts` "leaves the main track…"
also extended: asserts `result` undefined + `updateTracksMock` NOT called.

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts src/lib/commands/timeline/track/remove-track.test.ts`

Result: PASS (20/20 combined). Fix: Round 2 no-op guard. Note: `CommandManager.execute` still
pushes the no-op (returns the command unconditionally) — dead-step elimination here means no STATE
write and no SELECTION disturbance; full history-entry suppression would need a manager change owned
by the commands agent.

### Round 12 — delete-elements transition-strip regression

Scenario: deleting clip `a` strips `t-ab`, removes the element, clears selection.

Evidence: same file → delete-elements group.

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: Round 2 (delete-elements half).

### Round 13 — mute/visibility dead-step elimination regressions

Scenario: mute on text track / visibility on audio track → `undefined` + byte-identical tracks;
compatible toggles still flip + undo.

Evidence: same file → toggle group (3 tests).

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: Round 7.

### Round 14 — overlap-window + clamp regressions

Scenario: window = `min(end)-max(start)`; outside startTime clamped inside; duration capped at
`maxDuration` (3000) and overlap; missing/disjoint clips throw; update re-validates.

Evidence: same file → transitions group (5 tests incl. `clampTransitionToOverlap` direct).

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: Round 4. Definition source in tests is a stubbed registry (`fade: 100..3000`);
production registry path (`registerDefaultTransitions` in `core/index.ts:50`) unchanged.

### Round 15 — scene-switch selection + playhead regression

Scenario: `switchToScene(s2)` with stale selection + `currentTime 90k` → selection `[]`, time `0`,
`seekCalls [0]`.

Evidence: same file → scene-switch group (drives the REAL `ScenesManager` with
`Object.defineProperty(manager, "list", …)` for the private list).

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS. Fix: Round 3.

### Round 16 — preview bounds REAL regression (not static-only)

Scenario: `getVisibleElementsWithBounds` with graphic tracks on overlay + overlayAfter (graphics need
no `document`/canvas, unlike text) → both listed, `overlayAfter` before overlay (bottom-to-top),
center-canvas `hitTest` returns the topmost.

Evidence: same file → preview group. Honest marker: pure unit level (bun, no browser); pointer-flow
(`use-preview-interaction`) and pixels are NOT asserted here.

Command: `bun test src/lib/commands/scene/scenes-100-pass-owned.test.ts`

Result: PASS (15/15 file). Fix: Round 1.

### Round 17 — neighboring suites still green (no collateral)

Scenario: element/grouping/separation/media/command-manager suites unaffected by the
`savedState → savedScene` + `setScenes` changes.

Evidence: `--isolate` run over 9 files (owned + neighbors + retime).

Command: `bun test --isolate <9 files>`

Result: PASS (68/68, 230 expects). Fix: n/a — verification.

### Round 18 — wider touched-dir run; pre-existing loop failures isolated

Scenario: `src/lib/preview src/lib/commands/timeline src/lib/commands/scene src/core/managers/__tests__`.

Evidence: 93 pass / 3 fail — all 3 in `playback-manager` loop tests. `git stash` of this track's
files + rerun → same 3 fail. Untouched by this track (no playback files changed).

Command: `bun test <4 dirs>` + stash-control rerun.

Result: PASS except 3 PRE-EXISTING failures (audio/playback scope, for main). Fix: none.

### Round 19 — biome clean on all touched files

Scenario: lint/format must not regress.

Evidence: `bunx biome check` on the 11 touched files.

Command: `bunx biome check <11 files>`

Result: PASS ("Checked 11 files… No fixes applied" after `--write` normalization; one unused import
`TICKS_PER_SECOND` in `transitions.tsx` removed by hand).

### Round 20 — tsc zero errors

Scenario: type safety across the web app.

Evidence: `bunx tsc --noEmit -p tsconfig.json` → exit 0, no output. (One interim error:
narrowed `canTrackBeHidden/HaveAudio` guards left `track.muted/hidden` un-narrowed in the update
closures — fixed with targeted `as { muted: boolean }` casts at the write site only.)

Command: `bunx tsc --noEmit -p tsconfig.json`

Result: PASS. Fix: formatting/casts only.

## Changed paths

- `apps/web/src/lib/preview/element-bounds.ts` (+6/−1)
- `apps/web/src/lib/commands/timeline/track/remove-track.ts` (selection + transitions + no-op)
- `apps/web/src/lib/commands/timeline/element/delete-elements.ts` (transition strip, savedScene)
- `apps/web/src/lib/commands/timeline/track/toggle-track-mute.ts` (early no-op)
- `apps/web/src/lib/commands/timeline/track/toggle-track-visibility.ts` (early no-op)
- `apps/web/src/core/managers/scenes-manager.ts` (switch clears selection + seek 0)
- `apps/web/src/lib/commands/scene/transition.ts` (overlap helpers + validation/clamp)
- `apps/web/src/components/editor/panels/assets/views/transitions.tsx` (UI overlap clamp)
- `apps/web/src/components/editor/panels/timeline/index.tsx` (menu gating)
- `apps/web/src/lib/commands/scene/scenes-100-pass-owned.test.ts` (NEW, 15 tests)
- `apps/web/src/lib/commands/timeline/track/remove-track.test.ts` (+2 asserts)

## Test counts

- New owned suite: 15/15 PASS (`scenes-100-pass-owned.test.ts`, 43 expects).
- Extended: `remove-track.test.ts` 5/5 (14 expects).
- Combined with neighbors `--isolate` (element/grouping/separation/media/commands-owned/retime): 68/68.
- Touched-dir sweep: 93 pass, 3 pre-existing playback-loop FAILs (verified on clean tree via stash).
- `bunx biome check` 11 files: clean. `bunx tsc --noEmit`: exit 0.

## Honest gaps (not fixed)

1. **Renderer never reads `scene.transitions`** (Round 5): transitions are store-only.
   `buildScene` (4 callers: preview, thumbnail, export, preset-thumbnail) and
   `useActiveTransitionsAtTime` (zero callers) confirm. Wiring the renderer is the remaining gap —
   deliberately NOT done per brief.
2. **AI executor still passes raw defaults** (`executor.ts:964-983`, READ ONLY): command now throws
   on bad geometry instead of storing it, but the executor should compute the overlap window itself
   for good errors/UX. Flagged for main.
3. **No-op history entries**: incompatible toggles / unknown-id removes no longer WRITE state, but
   `CommandManager.execute` still pushes the command object (manager-owned behavior; commands agent
   owns reentrancy). No dead STATE, but `canUndo` still steps over them.
4. **Per-scene playhead restore**: impossible — single `PlaybackManager.currentTime`, no store slot.
   Reset-to-0 chosen; `reconcileTimelineScope` clamps to the new duration.
5. **Preview evidence is unit-level** (bun + graphic tracks): real pointer flow and pixels need the
   browser smoke (`features/editor-bugfix-10-iterations/browser-smoke.mjs` + live dev server) — not
   run here; no dev server attached to a user profile per skill rules.
6. **Transition undo restores via `setScenes` only when the scenes mock provides it**; production
   `ScenesManager` always does. Old minimal mocks (timeline-only) still get track restore.
