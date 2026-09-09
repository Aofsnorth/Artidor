# Clipboard, keyframe and effect command fixes (editor-100-pass)

Scope: `lib/commands/timeline/clipboard/*`, `core/managers/clipboard-manager.ts`,
`lib/clipboard/handlers/*`, `lib/commands/timeline/element/{effects,keyframes}/*`,
`lib/ai/tools/executor.ts` (keyframe/effect tool paths only), plus
`lib/animation/keyframes.ts` retime dedupe.

Collab files are EXCLUDED — owned by the collab track. Rounds 1-7 of this
session started collab-scoped; they are marked "out of scope - owned by
collab track" and that work was left untouched by this workstream.

## Review log (rounds 8-20, directed scenarios)

### Round 8 — Static effect params were NOT validated; clamped via ParamDefinition

Scenario: `UpdateClipEffectParamsCommand` wrote `nextParams[key] = value`
verbatim. The AI executor (`update_clip_effect_params`) and any paste path
could store blur intensity 9999 (max 100), which the renderer treats as valid.

Evidence: read `update-effect-params.ts` — no registry lookup, no clamp, no
type check. (The prior note in this doc claiming static params were already
coerced was wrong; this round disproved it by reading the command.)

Command:
`bun test src/lib/commands/timeline/element/effects/__tests__/effects-regressions.test.ts`

Result: PASS (9/9, 3 new). Fix: `clampEffectParams` mirrors the keyframe
path's `coerceAnimationValueForParam` — numbers snap to `step` and clamp to
`[min, max]`, wrong-type values are dropped, unknown keys and unknown effect
types pass through (plugin/custom params must not be silently discarded).

### Round 9 — Paste-style planted dead animation bindings on incompatible targets

Scenario: `PasteStyleCommand` cloned `style.animations` wholesale. A style
copied from a text/visual element pasted onto an audio clip left bindings
that no panel can resolve — `opacity` requires `isVisualElement`, so audio
targets carried dead data. Keys from a longer source also landed past the
target's duration.

Evidence: `property-registry.ts` — `opacity`/`transform.*` gates on
`isVisualElement`; old `paste-style.ts` used `cloneAnimations` directly with
no target filtering and no duration clamp.

Command:
`bun test src/lib/commands/timeline/clipboard/__tests__/paste-style.test.ts`

Result: PASS (4/4, all new). Fix: `adaptAnimationsForTarget` rebuilds the
copied bindings through `resolveAnimationTarget` (dropping paths the target
type cannot resolve), re-clones with fresh keyframe ids, and the result is
clamped to the target's duration via `clampAnimationsToDuration`.

### Round 10 — Interpolation vocabulary mismatch in the adaptation (type error)

Scenario: scalar keys store `segmentToNext` (step/linear/bezier) while the
upsert accepts `interpolation` (linear/hold/bezier; undefined for discrete).
A blind copy of the field was a type error and a dead-value risk.

Evidence: `bunx tsc` flagged `segmentToNext` not assignable onto
`ScalarAnimationKey | DiscreteAnimationKey`; verified the two vocabularies in
`animation/types.ts`.

Command: re-ran the paste-style suite.

Result: PASS after mapping step to "hold", linear to "linear", bezier to
undefined (upsert default), discrete to undefined.

Honest limitation (static-only marker): curve handles (`leftHandle`/
`rightHandle`) are NOT preserved by style paste — they are rebuilt from the
key value and interpolation defaults. Documented in the test; preserving
bezier handles across a type-adapting rebuild is follow-up work.

### Round 11 — Paste-keyframes multi-target decision (implemented: all selected)

Scenario: the command took a single `trackId`/`elementId`; AE applies copied
keys to every selected layer. Decision: implement all-selected paste in ONE
command (one undo entry), anchored on the first target's start for the
playhead-to-local conversion.

Rationale (recorded): per-target anchors would shift identical clips
differently from the same playhead; a single anchor is deterministic and
matches the previous behavior for the first clip.

Evidence: handler JSDoc previously documented first-only as a "kept
contract"; no in-repo test, AI tool, or UI required first-only.

Command:
`bun test src/lib/commands/timeline/clipboard/__tests__/paste-keyframes.test.ts`

Result: PASS (9/9 — six existing tests migrated to `targets: []` plus three
new: multi-target one-undo, per-target duration clamping, deleted-target
skip). The AI `paste_keyframes` executor path was migrated to the new
signature with a single-element targets array (caught in round 18).

### Round 12 — AI executor retime/upsert collision path was untested

Scenario: command-level retime dedupe was covered, but the executor handlers
(`retime_keyframe` with `keyframeId` + colliding time; `upsert_keyframe` at an
existing time) had no coverage.

Evidence: `executor.ts` constructs the commands directly inside handler
closures; nothing exercised them.

Command:
`bun test src/lib/ai/tools/__tests__/executor-keyframes.test.ts`

Result: PASS (3/3, new file): retime onto an occupied time merges keys and
keeps the retimed key's id; executor upsert at an existing time replaces the
value; retime against a missing element does not crash and does not mutate.

### Round 13 — No-crash assertion was itself wrong (test fix, logged honestly)

Scenario: my first no-crash assertion compared the tracks object by
reference. `updateElementInSceneTracks` returns a fresh top-level object even
when nothing matched, so identity comparison failed while content was
identical.

Evidence: failure diff showed "serializes to the same string".

Command: same executor-keyframes suite.

Result: PASS after switching to structural assertion on the element. This
was a test-authoring mistake, not a product bug — recorded here rather than
hidden.

### Round 14 — Multi-element keyframe copy falls through to element copy

Scenario: keyframe copy spanning multiple elements must fall through to the
Elements handler instead of returning null (single-source resolution fails by
design there).

Evidence: `handlers/index.ts` continues on a null entry (the earlier fix held);
the handler's `resolveSingleSourceElement` returns null for cross-element
selections.

Command:
`bun test src/lib/clipboard/handlers/__tests__/clipboard-handlers.test.ts`

Result: PASS — entry type is "elements" with both selected items copied.

### Round 15 — Failed copy must clear the clipboard, not serve stale content

Scenario: `ClipboardManager.copy()` returned false on failure but KEPT the
previous entry — a later paste silently served content the user believed
they had just replaced.

Evidence: read `clipboard-manager.ts` — early `return false` left
`this.entry` intact.

Command:
`bun test src/core/managers/__tests__/clipboard-manager.test.ts`

Result: PASS (5/5, 1 new). Fix: a failed copy clears the entry and notifies
only when something was actually cleared (no spurious notify storm).

### Round 16 — Deep-copy integrity after source deletion

Scenario: delete source elements after copy; paste must still yield the full
data (structuredClone taken at copy time) — transform, effects, masks.

Evidence: `elements.ts` copy uses `structuredClone` (earlier fix); this round
proves it end-to-end including a paste after deletion.

Command: same clipboard-handlers suite.

Result: PASS (8/8, 1 new). The test seeds a blur effect and a rectangle mask,
deletes the source, asserts the clipboard payload is intact, then pastes and
asserts the pasted clone carries the effect and mask.

### Round 17 — Cross-lane group remap pastes as ONE fresh group

Scenario: a 2-element group spread across 2 tracks must paste as one fresh
group on the pasted stack — not the original's tag (would graft into the live
group) and not two per-lane tags (would split the group).

Evidence: per-paste precomputed remap tables in `paste.ts` (the earlier
per-paste fix; per-lane maps were the original defect).

Command:
`bun test src/lib/commands/timeline/clipboard/__tests__/paste.test.ts`

Result: PASS (13/13, 1 new). The test asserts the set of pasted group tags
has exactly one member and that it differs from the source tag. This is the
user-requested round-7 regression (2-element group across 2 tracks).

### Round 18 — Scope-wide validation: tests, biome, tsc

Scenario: full validation of everything this workstream touched.

Commands and results:
- `bun test src/lib/commands/timeline/clipboard src/lib/clipboard
  src/core/managers/__tests__/clipboard-manager.test.ts
  src/lib/ai/tools/__tests__/executor-keyframes.test.ts
  src/lib/commands/timeline/element`
  → 56 pass, 0 fail, 158 expect() calls across 8 files.
- `bunx biome check --write <touched files>` → clean; re-check reports no
  remaining issues.
- `bunx tsc --noEmit -p tsconfig.test.json` → 0 errors in scope files.
  Remaining repo errors are outside this scope and untouched.

Real defect caught in this round: the `paste_keyframes` AI executor handler
still constructed `PasteKeyframesCommand` with the removed single-target
signature — migrated to `targets: [...]` with a comment explaining the AI
path is single-target.

### Round 19 — Pre-existing vs introduced type errors (honesty check)

Scenario: `clipboard-manager.test.ts` showed mask/effect type errors.
Verified these were NOT regressions of this session: the file is untracked
(main's partial work, folded into this scope), and the errors were in
pre-existing fixtures using a nonexistent mask type `"rect"` (real union is
`"rectangle" | "ellipse" | ...`) and loose effect param casts.

Evidence: `git status --short` shows the file as untracked (`??`).

Result: fixtures corrected to valid `RectangleMask` params and proper casts;
tsc re-run reports 0 errors in the file. No test was weakened — assertions
unchanged, only fixture typing fixed.

### Round 20 — Static validation sweep and scope closure

Scenario: final static pass over the paste build path.

Evidence: `buildPastedElements` callers verified — `execute()` early-returns
on an empty clipboard; per-lane `trackType` guard survives the lane refactor
(`items[0]?.trackType` → skip lane); pasted start times are clamped with
`Math.max(0, time + offset)` so no negative landing; overlap on existing
tracks is decided by `resolveTrackPlacement`/`canPlaceTimeSpansOnTrack`
before insertion, so no pasted copy can silently overlap existing content.

Result: scope complete. All rounds 8-20 are test-verified except where
explicitly marked static-only:
- Round 10 curve-handle preservation (documented limitation).
- Browser-level clipboard behavior (permissions, focus, OS clipboard) is not
  covered — bun tests exercise command/handler logic only.

## Earlier foundation (rounds 1-7, retained)

The numbered bug fixes below predate the directed rounds above and remain
covered by their tests. Summarized; see git history for the full narrative.

1. Absolute playhead fed into clip-local keyframe paste — handler now
   subtracts the target's `startTime`.
2. Pasted clones stayed linked to originals (groupId/parentId) — copy keeps
   `id` as remap metadata; paste assigns fresh ids then remaps links within
   the copied set and drops links outside it. Per-paste tables make this
   lane-order independent (rounds 1-7 evolution).
3. Shallow clipboard copies leaked live element state — `structuredClone` at
   copy for elements, effect params, style effects/masks; paste deep-clones
   per lane; `AddClipEffectCommand` deep-clones defaults.
4. Failed keyframe copy starved the element fallback — `copyClipboardEntry`
   continues on null entries.
5. Multi-lane paste inverted the stack — `alwaysNew highest`, bottom-up.
6. Keyframe paste clamped out-of-range keys onto boundaries — now omitted
   (bounds policy table below).
7. (Superseded by round 11: multi-target is now implemented.)
8. Retime/upsert duplicate keys at one timestamp — retime dedupes.
9. Effect reorder invalid indices spliced `undefined` — strict no-op guard.
10. Redo regenerated ids breaking dependent undo chains — snapshot replay.
11. Static effect param validation — REVERSED by round 8: the earlier "already
    correct" claim was wrong; the command wrote raw values. Fixed and tested
    in round 8.

## Bounds policy summary (keyframe paste)

| Situation | Behavior |
|---|---|
| Pasted key lands in `[0, duration]` | Inserted at `time + offset` exactly |
| Pasted key would land past `duration` | Omitted (never clamped) |
| Pasted key would land before `0` | Omitted (never clamped) |
| Multiple keys in range | Original relative spacing preserved, no rescaling |
| Multi-target paste, key out of range for one target | Omitted for that target only |

## Cross-agent handoff

`DuplicateElementsCommand` (`element/duplicate-elements.ts`, owned by another
agent) spreads the source `groupId`/`parentId` verbatim into duplicates —
the same clone-links-to-original defect as foundation bug 2 — and only
duplicates `overlay`/`main`/`audio` (missing `overlayAfter`). Main thread:
apply the same remap + stable-redo treatment there.

## Commands

```bash
bun test src/lib/commands/timeline/clipboard src/lib/clipboard \
  src/core/managers/__tests__/clipboard-manager.test.ts \
  src/lib/ai/tools/__tests__/executor-keyframes.test.ts \
  src/lib/commands/timeline/element
bunx biome check --write <touched scope files>
bunx tsc --noEmit -p tsconfig.test.json
```
