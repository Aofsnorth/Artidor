# Command/timeline domain fixes (editor-100-pass)

Scope: `lib/commands/media/*`, `lib/commands/timeline/element/{move-elements,insert-element,toggle-source-audio-separation}`,
`lib/commands/timeline/grouping.ts`, `lib/retime/split.ts`, `lib/timeline/types.ts`
(`RetimeConfig.duration`, `CombinedElement`). Plus test-only additions in the
matching `__tests__` dirs.

Out of scope (untouched): save-manager / project-manager / audio, collab,
clipboard + audio executors. No new deps.

Baseline: `bunx tsc --noEmit` failed with 7 errors across 5 files (the 6
reported; the separation union error spans two lines). After this session:
zero errors. The 3 remaining `bun test src/lib/commands src/lib/retime
src/core/managers` failures are pre-existing playback-manager loop tests
(`manager.setLoop is not a function` — audio/playback scope, not this track).

## Fixes

- `remove-media-asset.ts:83` — `restoredAsset.url` is optional (`MediaAsset.url?`);
  guard before pushing into `restoredObjectUrls: string[]`.
- `move-elements.ts:100` — typo `extitleElementId` → `excludeElementId`. The
  fallback now actually excludes the moving element from the earliest-element
  computation; round 02/02b below pin both outcomes.
- `toggle-source-audio-separation.ts:155-156` — replaced the cross-union
  `flatMap(...).find(...) as VideoElement` with two per-track-type lookups:
  `findElementOnTrack` (track discriminant narrows `track.elements`, no cast)
  at the execute site, and `findVideoElement` (video lanes only) in
  `removeDetachedAudioLayer`. Audio-lane narrowing uses `sourceType` instead
  of a cast intersection.
- `toggle-source-audio-separation.ts` pruning — the old
  `.filter(len > 0)` dropped pre-existing empty lanes as a side effect.
  Now only lanes this removal emptied are dropped (tracked in
  `emptiedLaneIds`); pre-existing empty lanes survive. Pinned by round 13.
- `grouping.ts:234` — no legitimate `"combined"` discriminant exists anywhere
  (grep: only this line + its test). `CombinedElement` is now an intersection
  (`TimelineElement & { combinedElements }`): the combined clip keeps its
  source's concrete type so renderer/placement switches stay total, and the
  combine marker is the payload, not a new kind.
- `split.ts:115-116` — `RetimeConfig.duration` added properly with JSDoc
  (owning clip's visible duration; curve renormalization basis; constant-rate
  ignores it). `splitRetimeAtClipTime` signature now takes plain
  `RetimeConfig`; internal `as` casts for `mode`/`keyframes`/`duration`
  removed (typed field access). Explicit `duration` param still wins over the
  stored field.
- `add-media-asset.ts` — failed-save orphan scan omitted `overlayAfter`;
  added (matches `remove-media-asset.ts`, which already covered all groups).
- `adjustRetimeForTrimChange` — verified zero call sites outside its module:
  the no-op removes nothing anyone depends on. Doc rewritten to say so and to
  specify the correct future implementation; marked `ponytail:`.
- `insert-element.ts` base-class `redo()` — verified safe: `elementId` is
  minted once in the constructor and `buildElement` reuses it, so base
  `redo() → execute()` re-inserts the SAME id (unlike the old duplicate path
  that minted fresh ids per execute, now snapshot-based). No change needed.

## Review log (20 sequential rounds)

### Round 1 — tsc error inventory reproduced before any edit

Scenario: confirm the exact failure set on a clean tree.

Evidence: `bunx tsc --noEmit` → 7 errors, 5 files (remove-media-asset 83,31;
move-elements 100,4; toggle-source-audio-separation 155,23 + 156,22;
grouping 234,4; split 115,42 + 116,44).

Command: `bunx tsc --noEmit`

Result: FAIL (as expected, matches the brief). Fix: none yet — baseline.

### Round 2 — move fallback pushes past a single blocker when legal

Scenario: main holds a[0,50k] + b[50k,50k]; move b to 10k (overlaps a).
`excludeElementId` must engage so the push target (end of a = 50k) is legal.

Evidence: `core/managers/commands-100-pass-owned.test.ts` round 02.

Command: `bun test src/core/managers/commands-100-pass-owned.test.ts`

Result: PASS (3/3 with 02b). Fix: typo `extitleElementId` → `excludeElementId`.

### Round 3 — blocked move with failed push leaves the timeline UNCHANGED

Scenario: main holds a[0,50k] + b[50k,50k] fully packed; move b to 10k.
Push past a lands back on b itself — illegal. Must return without writing.

Evidence: same file, round 02b asserts start stays 50k and no commit.

Command: `bun test src/core/managers/commands-100-pass-owned.test.ts`

Result: PASS. Fix: same typo fix; the pre-existing guard
(`return undefined` on failed `canPlaceTimeSpansOnTrack`) now reachable.

### Round 4 — remove-media-asset url guard compiles and keeps undo semantics

Scenario: `MediaAsset.url?` optional; `URL.createObjectURL` result assigned
into `restoredAsset.url` then pushed to `string[]`.

Evidence: tsc error at 83,31.

Command: `bunx tsc --noEmit` (scoped check after edit)

Result: PASS (error gone). Fix: `restoredAsset.url ? [url] : []`.

### Round 5 — separation lookup compiles without casts

Scenario: `getOrderedTracks().flatMap(track => track.elements)` unions every
lane's element array; the `as VideoElement` hid it until line 155 broke.

Evidence: tsc errors 155,23 + 156,22.

Command: `bunx tsc --noEmit`

Result: PASS. Fix: `findElementOnTrack` / `findVideoElement` per-track-type
lookups; audio narrowing via `sourceType`.

### Round 6 — separation behavior unchanged after the lookup rewrite

Scenario: separate→recover removes the detached layer; edited (moved) layer
survives; undo→redo yields exactly one layer; back-reference carried.

Evidence: `lib/commands/timeline/__tests__/separation.test.ts` (4 tests).

Command: `bun test src/lib/commands/timeline/__tests__/separation.test.ts`

Result: PASS (4/4). Note: this run also exposed a stale mock (no `selection`
boundary) — fixed in the test mock, plus a stale
`toMatchObject({ isSourceAudioEnabled: true })` (factory leaves the flag
absent) relaxed to `not.toBe(false)`.

### Round 7 — combined clip keeps a renderable concrete type

Scenario: grep for `buildCombinedElement` / element factory / `"combined"`
shows NO legitimate constructor — the kind was invented at grouping.ts:234.

Evidence: `grep -rn "combined"` → only grouping.ts + its test.

Command: `bunx tsc --noEmit`

Result: PASS. Fix: `CombinedElement` intersection type; command spreads the
first source and keeps its `type`, marker is `combinedElements`.

### Round 8 — combine still lands the reported id and round-trips undo/redo

Scenario: combine a+b on main; reported id exists once; undo restores both
sources; redo reuses the SAME id; second cycle stable.

Evidence: grouping.test.ts combine tests.

Command: `bun test src/lib/commands/timeline/__tests__/grouping.test.ts`

Result: PASS (13/13 incl. new round-trip test). Fix: test now asserts via
`CombinedElement` instead of an inline cast.

### Round 9 — retime duration is a real typed field, not a smuggled cast

Scenario: `split-elements.ts:156` spreads `{ ...retimeRef, duration }` and
`resolve.ts`/`speed-ramp.ts` already READ `.duration` through casts.

Evidence: tsc errors split.ts 115,42 + 116,44.

Command: `bunx tsc --noEmit`

Result: PASS. Fix: `RetimeConfig.duration?: number` + JSDoc; signature takes
plain `RetimeConfig`; internal casts removed.

### Round 10 — curve split halves renormalize with a seamless cut rate

Scenario: 1→3 ramp over duration 100, cut at 50: left ends at speed 2, right
starts at 2 (not replaying from 1); each half owns duration 50.

Evidence: NEW `lib/retime/__tests__/split.test.ts` curve block (round 10-12).

Command: `bun test src/lib/retime/__tests__/split.test.ts`

Result: PASS (7/7, 3 new). Fix: none — direct coverage that was absent
(split was only covered indirectly via element-commands).

### Round 11 — explicit duration param wins over stored retime.duration

Scenario: stored `duration: 10` but caller passes `duration: 100`, cut at 50
→ t = 0.5 → cut rate 2 (not the clamped 50/10 = 1 edge).

Evidence: new test.

Command: `bun test src/lib/retime/__tests__/split.test.ts`

Result: PASS. Fix: precedence `duration ?? retime.duration` preserved and now
typed.

### Round 12 — unknown duration keeps both halves on the original config

Scenario: curve retime with no duration anywhere → cannot renormalize →
return `{ left: retime, right: retime }` rather than garbage curves.

Evidence: new test.

Command: `bun test src/lib/retime/__tests__/split.test.ts`

Result: PASS. Fix: none — locks the garbage-curve guard.

### Round 13 — recover drops only lanes it emptied, keeps pre-existing empties

Scenario: timeline has a pre-existing EMPTY audio lane; separate appends its
own lane; recover must drop its own emptied lane and keep the pre-existing one.

Evidence: NEW separation test (deliberate-behavior pin for the
`.filter(len > 0)` fix).

Command: `bun test src/lib/commands/timeline/__tests__/separation.test.ts`

Result: PASS (5/5, 1 new). Fix: `emptiedLaneIds` tracking in
`removeDetachedAudioLayer`.

### Round 14 — failed-save orphan scan covers overlayAfter

Scenario: `add-media-asset.ts` catch path scanned overlay + main + audio only;
an element on overlayAfter referencing the failed asset survived as an orphan.

Evidence: read of the catch block vs `remove-media-asset.ts` (which scans all
four groups). Static-only: no test (the catch path needs a rejected storage
mock + live timeline deleteElements wiring).

Command: `bunx tsc --noEmit` [static-only]

Result: PASS (compiles). Fix: added `...currentTracks.overlayAfter`.

### Round 15 — trim-adjust no-op verified against all call sites

Scenario: `adjustRetimeForTrimChange` documented limitation — is the no-op
hiding removed behavior callers depend on?

Evidence: `grep -rn adjustRetimeForTrimChange` → zero call sites outside
`lib/retime/split.ts`. Nothing can depend on removed behavior.

Command: grep (no test target exists) [static-only]

Result: PASS. Fix: doc rewritten as verified-no-op + future spec; no behavior
change.

### Round 16 — insert-element redo id-stability confirmed, no change

Scenario: base `redo()` re-runs `execute()` which "re-snapshots" — does it
regenerate ids like the old duplicate path?

Evidence: read `insert-element.ts`: `elementId` minted once in the
constructor; `buildElement` reuses `this.elementId`; `execute` re-saves state
but re-inserts the same id. Contrast `duplicate-elements.ts` /
`paste.ts`, which needed post-execute snapshots precisely because they mint
fresh ids per execute.

Command: `bun test src/lib/commands/timeline/__tests__/element-commands.test.ts` [static-only for this round — existing insert/duplicate/split tests guard the behavior]

Result: PASS (8/8). Fix: none needed — verified safe.

### Round 17 — multi-undo group/ungroup/combine unwinds layer by layer

Scenario: group a+b → ungroup → combine → undo ×3 must restore grouped,
then pristine, each exactly; redo ×3 re-lands the SAME combined id.

Evidence: NEW grouping test (the missing multi-undo corruption round-trip).

Command: `bun test src/lib/commands/timeline/__tests__/grouping.test.ts`

Result: PASS (13/13, 1 new). Fix: none — snapshot-per-command design holds;
test locks it.

### Round 18 — media command regressions still pass

Scenario: fps ratchet undo invariants (lowers when unjustified, keeps when
justified, untouched on no-ratchet).

Evidence: `lib/commands/__tests__/media-commands.test.ts`.

Command: `bun test src/lib/commands/__tests__/media-commands.test.ts`

Result: PASS (3/3). Fix: none — no behavior change in this file beyond the
orphan-scan line.

### Round 19 — full owned scope green (commands + retime + owned manager test)

Scenario: everything this track owns, in one run.

Evidence: combined run.

Command: `bun test src/lib/commands src/lib/retime src/core/managers/commands-100-pass-owned.test.ts`

Result: PASS (93/93). Fix: n/a — verification.

### Round 20 — biome + tsc clean on all touched files

Scenario: lint/format must not regress the wider tree.

Evidence: `bunx biome check --write` on the 11 touched files (9 fixed,
1 unsafe warning left alone); `bunx tsc --noEmit` zero errors.

Command: `bunx biome check --write <11 files>` + `bunx tsc --noEmit`

Result: PASS. Fix: formatting only.
