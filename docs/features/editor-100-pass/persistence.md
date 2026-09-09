# Persistence: ProjectManager & SaveManager (editor-100-pass)

Scope: `core/managers/save-manager.ts`, `core/managers/project-manager.ts`
(loadProject/saveCurrentProject/prepareExit/closeProject persistence
lifecycle), their regression suites, and the persistence-suite module mocks.
Remote collab routes, clipboard, and AI tools are owned by other agents.

All fixes below are verified by the tests named in each round. Test command:

```bash
cd apps/web
bun test --isolate src/core/managers/project-manager.persistence-20.test.ts \
  src/core/managers/save-manager.persistence-20.test.ts
```

## Verified bugs and their fixes

### R01/R01: pause() cancels the armed timer without dropping dirty work

**Bug hypothesis.** Pausing autosave during a project switch could discard
pending edits instead of deferring them.

**Evidence.** `save-manager.persistence-20.test.ts` — "R01 pause cancels an
armed timer without discarding dirty work": `markDirty()` arms a 5 ms timer,
`pause()` fires immediately; after the debounce window elapses no write
happened and `getIsDirty()` stayed `true`. Behavior was already correct.

**Result.** Not a bug; invariant locked in by test.

### R02: rejected flush keeps work dirty for retry

**Bug hypothesis.** A failed write might clear the dirty flag and silently
drop edits.

**Evidence.** "R02 rejected flush retains dirty work for retry": `flush()`
rejects with the storage error, `getIsDirty()` stays `true`, a second
`flush()` writes successfully. Already correct.

**Result.** Not a bug; test added.

### R03: flush waits for an in-flight write plus an intervening edit

**Bug hypothesis.** `flush()` could resolve while edits made during a write
were still unwritten.

**Evidence.** "R03 flush waits for in-flight write and an intervening edit":
first write hangs on a deferred, `markDirty()` lands mid-flight, second
`flush()` does not resolve until a second write ran and finished. Already
correct.

**Result.** Not a bug; test added.

### R04: flush drains a synchronous write

**Evidence.** "R04 flush drains a synchronously resolving write". Not a bug.

### R05: flush while a load is gated waits and keeps work dirty

**Bug hypothesis.** `flush()` during project load could either write into a
half-loaded workspace or lose the dirty flag.

**Evidence.** "R05 flush while loading keeps work dirty and waits for the
gate": with `project.getIsLoading() === true`, no write starts and the work
stays dirty; lifting the gate lets `flush()` complete. Already correct.

**Result.** Not a bug; test added.

### R06: no active project keeps edits dirty

**Evidence.** "R06 no active project keeps edits dirty for the next
workspace". `tryStartSave()` returns `null` without clearing the flag. Not a
bug.

### R07: loadProject flushes the outgoing project before clearing scenes

**Bug.** A dirty project being switched away from could be persisted with
empty scenes: `clearScenes()` empties the live list while `active` still
points at the outgoing project, and a debounced save firing in that window
wrote the gutted project to storage.

**Fix (main had started this).** `loadProject()` calls `save.pause()` then
`save.flush()` before any teardown. Test: after marking a scene edit dirty,
switching projects persists the dirty scene **before** the storage read of
the new project begins.

**Result.** Fixed; test passes.

### R08: finishSave requeues edits that arrive during a write (NEW FIX)

**Bug.** `SaveManager.finishSave()` only cleared `isSaving`/`saveInFlight`.
An edit marked dirty **while a save was in flight** set `hasPendingSave` but
nothing re-armed the debounce — the follow-up pass only happened if the user
edited again later. The pending edit was stranded until an unrelated
interaction (or forever when the persist queue was torn down in that window),
so persisted content silently lagged one edit behind.

**Fix.** `finishSave({ requeueIfDirty: true })` on the success path calls
`queueSave()` when `hasPendingSave` was set during the write. The failure path
keeps the pre-existing requeue. `queueSave()` is used rather than an inline
`tryStartSave()` so bursts collapse into one debounced write.

**Test.** "R08 edits arriving during a write get requeued by finishSave":
deferred first write, `markDirty()` mid-flight, resolve, flush → exactly 2
writes, clean state.

**Result.** Fixed.

### R09: finishSave does not arm a timer when clean

**Evidence.** "R09 finishSave does not requeue a timer when clean": after a
clean flush no additional write fires over the next 20 ms. Guards against the
R08 fix introducing an always-on timer.

**Result.** Verified.

### R10: loadProject aborts the switch when the outgoing flush fails (NEW FIX)

**Bug.** `loadProject()` caught the outgoing flush failure with an empty
`catch {}` and continued the switch anyway: `clearScenes()` ran, scenes that
existed only in memory were destroyed, and the in-flight retry could then
persist the outgoing project with **empty scenes** — permanent data loss —
before the new project mounted.

**Fix.** The flush failure now aborts the load: `resume()` is called
immediately (so the retry debounce is re-armed), the loading state is rolled
back, and the error is rethrown. Old project stays mounted with all scenes
intact and still dirty.

**Test.** "R10 loadProject aborts switch when outgoing flush fails": storage
fails for the outgoing id; the load rejects, the active project is still the
old one, its dirty scene is still present, and `getIsDirty()` is true.

**Result.** Fixed.

### R11: overlapping loadProject calls serialize (NEW FIX)

**Bug.** Two concurrent `loadProject()` calls (React StrictMode double
mounts, rapid navigation) interleaved `clearScenes()`/`initializeScenes()`
and could leave the editor on the wrong project while `isLoading` gates and
`save.resume()` calls flapped.

**Fix.** A monotonic `loadProjectSeq` stamps each request; every await
boundary re-checks `isStaleLoad()` and stale loads return silently. Only the
newest request mutates state or surfaces errors.

**Test.** "R11 superseded loadProject leaves editor on the newest project".

**Result.** Fixed.

### R12: superseded load failure does not surface

**Bug.** A stale load whose storage read rejected would throw into UI that
no longer expects it (the newer request owns the screen).

**Fix.** The `catch` in the load body returns early when the request is
stale.

**Test.** "R12 superseded load failure does not surface": a load for a
missing id started, superseded by a valid one; the stale promise resolves
`undefined` instead of rejecting.

**Result.** Fixed.

### R13: pause mid-write cannot cancel the in-flight pass

**Evidence.** "R13 pause mid-write cannot cancel the in-flight pass":
`pause()` cancels only the armed debounce timer; a write already in flight
completes (this is exactly why `loadProject` pauses **before** teardown —
the outgoing flush must finish). Pending work marked during the pause is
picked up after `resume()` and drains to clean state. Semantics confirmed,
not changed.

**Result.** Not a bug; test documents the contract.

### R14: failed write stays dirty and later writes recover

**Evidence.** "R14 failed save stays dirty and requeues, clean write
clears". Rejection path retains dirty + requeue; a subsequent flush
completes. Already correct.

**Result.** Not a bug.

### R15: saves gated while a load is in progress

**Evidence.** "R15 direct save during load waits for load to finish":
while `getIsLoading()` is true no write starts, the work stays dirty, and
once the gate lifts the queued write runs once. Already correct at the
SaveManager level; the ProjectManager side is R16.

**Result.** Not a bug.

### R16: overlapping direct saves serialize (NEW FIX)

**Bug.** `saveCurrentProject()` is called directly (export button, AI
`save_project` tool, template apply, thumbnail follow-up). Two concurrent
direct calls could interleave snapshot reads and IndexedDB writes, and a
save issued during a load could snapshot cleared scenes.

**Fix.**
- `loadProject()` now records `loadInFlight`; `saveCurrentProject()` waits on
  it (swallowing its already-reported rejection) before snapshotting.
- Direct saves chain behind `directSaveChain` (snapshot deferred into the
  chain) so writes serialize; each caller's own rejection stays observable
  via the returned promise, and the chain survives failures via
  `.catch(() => undefined)`.

**Test.** "R16 overlapping direct saves serialize their writes".

**Result.** Fixed.

### R17: direct save failure surfaces and does not poison later saves

**Bug hypothesis.** A rejected direct save might be silently dropped or
break the chain for subsequent saves.

**Evidence.** "R17 direct save failure surfaces to its caller": the failing
call rejects; the next direct save completes. Already handled correctly by
the chain design; locked in by test.

**Result.** Not a bug after R16's chain; test added.

### R18: prepareExit failure keeps dirty work and reports

**Bug hypothesis.** `prepareExit()` might swallow the flush failure and let
the app navigate away with unsaved edits and no warning.

**Evidence.** "R18 prepareExit failure keeps dirty work and reports": the
storage error propagates (the caller in `editor-header.tsx` shows the toast
and still navigates), and the work stays dirty for retry. Already correct.

**Result.** Not a bug; test added.

### R19: prepareExit with no GPU still flushes

**Evidence.** "R19 prepareExit with no GPU still flushes edits": thumbnail
generation is best-effort (GPU boundary faked as unavailable); the flush
still runs and clears the dirty flag. Already correct.

**Result.** Not a bug; test added.

### R20: closeProject clears the workspace

**Evidence.** "R20 closeProject stops saving and clears the workspace":
`closeProject()` clears the active project and scenes. Already correct.

**Result.** Not a bug; test added.

## Test-mock hygiene (owned scope)

- **Removed the artpr module mock** (was: replacing `decodeArtprProject`/
  `encodeArtprProject` with a plain-JSON stub). That mock poisoned the module
  registry for the whole test process and broke the sibling
  `lib/project-file/__tests__/artpr.test.ts` crypto tests. The persistence
  suite never exercises the artpr code path. Verified: artpr crypto tests now
  pass in the same `bun test --isolate` run as the persistence suites.
- **GPU boundary fake minimized**: `initializeGpuRenderer` no-op,
  `isGpuAvailable: false` — enough for the thumbnail path to take its
  no-GPU branch without permanently marking a shared GPU initialized for
  sibling suites. Real module exports are preserved via spread.

## Non-reproduced / out of scope

- `ratchetFpsForImportedMedia` and `updateSettings` (media/commands scope)
  were only read for context, not changed.
- `lib/collab/room-store.ts:110` has a pre-existing typecheck error
  (`redis.eval<[string | number]>` called with a 3-element args array) —
  collab scope, owned by another agent. Reported, not touched.
- `editor-provider.tsx` mounts still call `loadProject` without catching the
  new abort rejection beyond its existing error path; the provider already
  surfaces load failures generically, but main-thread UI polish for the
  "flush failed, staying on this project" case may warrant a dedicated
  message — UI scope, not persistence.
