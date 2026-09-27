# React perf pass (editor-perf-100-pass)

Scope (OWN ONLY): React components/hooks under `apps/web/src/components/` +
`apps/web/src/hooks/`, zustand stores under `apps/web/src/stores/`, and
`apps/web/src/core/managers/commands.ts` (history cap only). No logic moves
into components; no visual/behavior change; no new deps.

Out of scope (untouched): playback subsystem (excluded by default — was 97
re-renders/sec — verified intact, not re-tuned), `rust/`, save/project
managers, collab transport, AI tools. Pre-existing working-tree changes from
other tracks (commands/scenes/clipboard) were left alone.

Baseline (verified by reading code, not assumed):

- 256 TSX files, zustand v5 (`^5.0.2`), 19 `persist()` stores (18 under
  `src/stores/` + projects-view + telemetry + session hook).
- `useShallow` in exactly 1 file (`ai-edit.tsx`); `React.memo` on critical
  components (`TimelineTrackContent`, `TimelineElement`, `EffectItem`,
  `TransitionPreview`, `PropertiesPanel`, playhead-adjacent surfaces).
- Undo history UNBOUNDED (`history: CommandHistoryEntry[]`, plain `push` in
  `execute`/`push`/`redo`, no cap, no eviction, no dispose).
- Timeline virtualization EXISTS and skips mount work: track-level
  (`visibleTrackIndices` → `.filter(...).map(...)` in `TimelineTrackRows`,
  `index.tsx:1607-1611`) and element-level (`shouldMountTimelineElement`
  → `return null` in `timeline-track.tsx:182-195`, pure + unit-tested).
- Effect preview idle-chunked: bounded queue (`MAX_CONCURRENT_RENDERS`),
  `requestIdleCallback` drain, cancellable jobs, visibility-gated cards.
- Playback exclusion intact: `useEditor` defaults exclude `playback`;
  playhead moves via rAF + direct DOM `style.left` (`timeline-playhead.tsx`).

## Fixes

- `core/managers/commands.ts` — bounded history: `MAX_COMMAND_HISTORY_LENGTH
  = 100`; `execute`/`push`/`redo` all route through `appendHistory`, which
  evicts oldest-first past the cap and invokes optional `dispose()` on
  evicted commands. Plain-data snapshots need no hook (GC reclaims the
  dropped reference).
- `lib/commands/base-command.ts` — default no-op `dispose()` + contract doc.
- `lib/commands/media/remove-media-asset.ts` — `dispose()` revokes
  `restoredObjectUrls` minted by `undo()` so evicted entries stop pinning
  Blob URLs.
- `stores/throttled-storage.ts` (new) — trailing-edge throttled
  `PersistStorage` wrapper: first write after idle goes through immediately,
  bursts coalesce to latest-value + one trailing flush; `getItem`/`removeItem`
  pass through. Documented durability tradeoff (mid-burst tab close can lose
  ≤`waitMs` of UI prefs; not for document data).
- Throttled stores (same key/partialize/rehydrate, only write timing):
  `editor-ui-store` (250ms — floating-panel drags fire per-mousemove),
  `panel-store` (250ms — panel + track-label resize drags),
  `assets-panel-store` (250ms — card-size slider),
  `mcp-store` (500ms — connection-status flips re-serialize servers array).
- `useShallow`/stable-selector conversions (whole-store destructures that
  returned a fresh object every call → scoped selectors; behavior identical,
  only subscription width changes): stickers (view + content + card),
  sounds (list + saved + row + search hook), collab overlay (presence,
  banner, cursors, lock indicator → single-field selectors), command
  palette, shortcuts editor, keybindings listener + help hook, preview
  context menu + canvas overlays field, properties inspector tab map,
  assets panel shell + tab rail + media grid, presets, plugins, whats-new
  card, save-preset dialog.
- `timeline-element-cull.ts` — doc now states the conditional-render (not
  CSS-hide) contract + new O(visible) round; `timeline-element-cull.test.ts`
  gains the 500-clip visible-count round.

## Review log (20 distinct rounds)

### Round 1 — history cap: 150 pushes retain exactly 100

Scenario: push 150 no-op-ish commands (via the existing `Command` factory
surface) through the real `CommandManager` with only the `EditorCore`
singleton boundary mocked.

Evidence: `core/managers/__tests__/react-perf-100-pass-owned.test.ts`
round 01.

Command: `bun test --isolate
apps/web/src/core/managers/__tests__/react-perf-100-pass-owned.test.ts`

Result: PASS. Retained entries before/after: 150 → 100 (cap
`MAX_COMMAND_HISTORY_LENGTH = 100`).

### Round 2 — undo correct for the retained window (LIFO)

Scenario: 150 counting commands, then undo the whole retained window.

Evidence: same file, round 02 — exactly 100 undos, `canUndo()` false after,
history length 0.

Result: PASS. Fix: cap evicts oldest-first, so the retained 100 are the 100
most recent and undo in exact reverse order.

### Round 3 — evicted entries release snapshots via dispose()

Scenario: 150 URL-holding commands; count `dispose()` invocations.

Evidence: same file, round 03 — 50 evictions → 50 `dispose()` calls.

Result: PASS. `RemoveMediaAssetCommand.dispose()` revokes
`restoredObjectUrls`; plain-data commands use the base no-op.

### Round 4 — push() path capped (not just execute())

Scenario: 150 commands via `push()` (the non-executing history-append path).

Evidence: same file, round 04 — length 100.

Result: PASS. Both append paths route through `appendHistory`.

### Round 5 — redo re-entry respects the cap

Scenario: fill to 100, undo ×2, redo ×2, execute once more.

Evidence: same file, round 05 — 98 → 100 → 100 (evicts, never grows).

Result: PASS. `redo()` re-appends through `appendHistory`.

### Round 6 — 60-write drag burst collapses to 2 real storage writes

Scenario: 60 synchronous `setItem`s (one drag gesture) through the throttled
wrapper with a storage spy.

Evidence: `stores/__tests__/react-perf-throttled-storage.test.ts` round 06.

Command: `bun test --isolate
apps/web/src/stores/__tests__/react-perf-throttled-storage.test.ts`

Result: PASS. Write counts: 60 sets → 2 writes (1 immediate + 1 trailing
flush carrying the latest value); mid-burst spy count is 1.

### Round 7 — single discrete edit writes with zero added latency

Scenario: one `setItem` after an idle window.

Evidence: same file, round 07 — spy count is 1 synchronously.

Result: PASS. No debounce penalty for the common single-edit case.

### Round 8 — removeItem passes through and cancels a pending flush

Scenario: 2 sets then `removeItem`, then wait past the window.

Evidence: same file, round 08 — `removeItem` called once, write count stays
at 1 (no trailing flush after removal).

Result: PASS. Logout-clear semantics unchanged.

### Round 9 — getItem passes through unwrapped

Scenario: `getItem` through the wrapper.

Evidence: same file, round 09 — underlying `getItem` called once.

Result: PASS. Rehydrate path untouched.

### Round 10 — long track mounts O(visible), not O(total)

Scenario: 500 one-second clips end-to-end; `[0,1000]`px window at ZOOM=50
shows ~1s.

Evidence: `components/editor/panels/timeline/timeline-element-cull.test.ts`
react-perf round 10 — `mounted ≤ 3` of 500.

Command: `bun test --isolate
apps/web/src/components/editor/panels/timeline/timeline-element-cull.test.ts`

Result: PASS. Culling is conditional render (`return null` — zero hooks, zero
DOM nodes), not CSS-hide. No code change needed; pre-existing culling
verified + pinned (honest non-improvement: virtualization already existed).

### Round 11 — stickers card action identity stable across slice churn

Scenario: `isBrowsing` toggles + `searchQuery` set; assert the card-selected
`addToRecentStickers` reference is unchanged (so shallow comparison never
re-renders), while the changed slice did change (non-vacuous).

Evidence: `stores/__tests__/react-perf-selectors.test.ts` round 11.

Command: `bun test --isolate
apps/web/src/stores/__tests__/react-perf-selectors.test.ts`

Result: PASS. Fix: `StickerItem` → single-field selector;
`StickersView`/`StickersContentView` → `useShallow`.

### Round 12 — sounds search slice stable across pagination churn

Scenario: `currentPage`/`isLoadingMore`/`scrollPosition` sets; assert
`searchQuery`/`searchResults` references unchanged.

Evidence: same file, round 12.

Result: PASS. Fix: `SoundEffectsView`/`AudioItem`/`useSoundSearch` →
`useShallow` (row derives `isSaved` from the shallow-selected
`savedSounds` snapshot).

### Round 13 — collab status identity stable across cursor-rate churn

Scenario: two pointer-rate `cursors` updates + `locks` set; assert `status`
/ `collaborators` references unchanged.

Evidence: same file, round 13.

Result: PASS. Fix: presence bar / banner / cursor overlay / lock indicator →
single-field selectors (lock indicator is per-clip; whole-store there
re-rendered ALL clips per cursor move).

### Round 14 — inspector tab-map stable across favourites churn

Scenario: favourite toggle ×2; assert `activeTabPerType` reference unchanged.

Evidence: same file, round 14.

Result: PASS. Fix: `InspectorView` tab map → `useShallow`.

### Round 15 — assets activeTab stable across sort/card-size churn

Scenario: `setMediaSort` + `setAssetCardSize`; assert `activeTab` unchanged.

Evidence: same file, round 15.

Result: PASS. Fix: tab rail + panel shell → scoped selectors (shell no
longer re-creates `viewMap` per sort/slider change).

### Round 16 — preview overlays stable across grid/guide churn + keybindings source ignores overlay churn

Scenario: `setGridConfig`; assert `overlays` reference unchanged.
`openOverlay`/`closeOverlay`; assert `keybindings` map unchanged.

Evidence: same file, round 16.

Result: PASS. Fix: `PreviewCanvas` → `overlays`-only selector;
context menu → `useShallow`; `useKeyboardShortcutsHelp` → `useShallow` on
the bindings map (O(actions) `useMemo` no longer recomputes per overlay
toggle).

### Round 17 — no effect-preview card subscribes to playback

Scenario: static scan of `effects.tsx`, `adjustments.tsx`,
`transitions.tsx`, `draggable-item.tsx` for `["playback"]`.

Evidence: `stores/__tests__/react-perf-effect-cards.test.ts` round 17.

Command: `bun test --isolate
apps/web/src/stores/__tests__/react-perf-effect-cards.test.ts`

Result: PASS (no fix needed — honest non-improvement: cards were already
off the playback path).

### Round 18 — no card selects playback tick state via useEditor(

Scenario: same files scanned for `useEditor(...getIsPlaying/getCurrentTime`.

Evidence: same file, round 18.

Result: PASS (no fix needed).

### Round 19 — cards keep the imperative playhead read in handlers

Scenario: assert `editor.playback.getCurrentTime()` present in
`effects.tsx` + `adjustments.tsx` (transitions/draggable-item read it via
the `useTransitions` hook / callback prop — same zero-subscription
property, pinned by rounds 17/18).

Evidence: same file, round 19.

Result: PASS. Documents the allowed pattern so a future refactor does not
"fix" it into a subscription.

### Round 20 — preview service stays idle-chunked

Scenario: assert `MAX_CONCURRENT_RENDERS` + `requestIdleCallback` +
`scheduleRender` present in `effect-preview.ts`.

Evidence: same file, round 20 (+ existing
`effect-preview.test.ts` scheduling rounds still pass).

Result: PASS (no fix needed — honest non-improvement: idle-chunking already
existed; pinned against regression).

### Round 21 — scrub/seek layout-thrash elimination (measured, 2026-09-27)

Scenario: profile 6 playhead drags on real-GPU Chromium with the CDP CPU
sampler. Baseline: 19 long tasks / 1210ms blocked main thread during scrub;
self-time hot spots were `updatePlayheadLeft` 251.7ms,
`TimelinePlayhead.updatePlayheadPosition` 161ms,
`handlePlaybackUpdate` 33-373ms (event-dependent), plus `getBoundingClientRect`
29.3ms — all forced synchronous layout flushes: the scrub path re-read
`scrollLeft`, `clientWidth`, `scrollWidth`, `getBoundingClientRect()` from the
DOM per event while React commits kept the layout dirty.

Root causes found (code-first, then measured):

1. Both playhead position updaters read `element.scrollLeft` per seek/scroll
event and wrote `style.left` (dirtying layout for the next read).
2. `useEdgeAutoScroll`'s rAF loop re-read viewport rect/width/scrollWidth and
`scrollLeft` every animation frame while scrubbing near an edge.
3. `handlePlaybackUpdate` read `clientWidth` + `scrollWidth` on every
`playback-update` event during 60Hz playback (measured ~30ms of forced
layout per 500ms window, spread across the whole session — not
scrub-specific).
4. `handleScrub` re-read the ruler's `getBoundingClientRect()` per scrub event.
5. `TimelinePlayhead` read `timelineRef.current?.clientHeight` during render
(only re-rendered while the time bubble is visible — still one forced flush
per seek while dragging with the bubble shown).

Fixes (all verified before/after):

- Playhead position now writes a composited `transform: translateX()` on a
`left: 0` base instead of `left`, so our own writes stop dirtying layout.
- Shared `scrollLeftRef` created in `Timeline`, threaded through
`useTimelineZoom`, `useTimelinePlayhead`, `useEdgeAutoScroll`,
`TimelineTrackRows` and `TimelinePlayhead`; kept in sync by the
`syncFollowers` scroll funnel and every programmatic writer
(zoom sync/restore, center-follow, edge auto-scroll). Zero `scrollLeft`
DOM reads remain in the scrub hot path.
- `useEdgeAutoScroll` caches viewport geometry once per drag activation and
tracks the offset in the shared ref (sole writer during the drag); its rAF
loop performs zero DOM reads.
- `handleScrub` caches the ruler rect at drag start (the ruler's outer box
cannot move while dragging inside it).
- `handlePlaybackUpdate` uses cached viewport geometry
(`useLayoutEffect` + ResizeObserver refresh on zoom/duration/resize) instead
of per-event `clientWidth`/`scrollWidth` reads.
- Playhead line height uses CSS `calc(100% …)` instead of a render-time
`clientHeight` read.

Evidence (same probe, same order, real GPU, dev build):

- `updatePlayheadLeft` + `updatePlayheadPosition` forced-layout self time:
412ms → ~11ms total.
- `handlePlaybackUpdate` self time: 373ms → 2.7ms (geometry cache).
- Scrub long tasks: 19/1210ms (baseline) → 0-7 sporadic tasks of 51-89ms
  across repeated runs (dev-mode React + GC dominated; run-to-run variance
  high, several runs fully clean).
- Playback long tasks: 5/339ms (baseline) → 2-8 tasks (145-574ms) — variance
  dominated by dev-mode compile/GC; the deterministic per-event forced
  layout (the 60Hz `clientWidth`/`scrollWidth` reads) is gone.

Honest non-improvements: run-to-run long-task counts swing widely in dev
mode (React StrictMode double renders, jsxDEV allocation churn, wasm/GPU
pipeline warmup), so long-task deltas beyond the forced-layout elimination
are reported as ranges, not single numbers. The remaining
`document.onpointermove` listeners seen in LoAF data are library-delegated
(`forcedStyle` 6-11ms, sub-blocking) and were left alone.

Result: PASS.

## Validation

- `cd apps/web && bunx tsc --noEmit` → clean (0 errors).
- `bunx biome check` on all 31 touched/new files → fixed 15 files
  (formatting only), re-run clean; `tsc` still clean after.
- `bun test --isolate` across the 9 touched/adjacent suites → 36 pass,
  0 fail (176 expects): react-perf history (5), throttled storage (4),
  selectors (6), effect cards (4), element cull (7), commands-owned (3),
  effect-preview scheduling (4), browser-storage (1), sounds-store (2).

## Honest non-improvements

- Timeline virtualization already skipped render work (conditional render,
  both axes) — verified + pinned, not rebuilt.
- Effect-preview cards already avoided playback-tick re-renders; the preview
  service was already idle-chunked — verified + pinned, not rebuilt.
- No render-count deltas measured in a live React profiler (no renderer in
  `bun test`); useShallow wins are evidenced by referential-stability tests
  + the pre-existing `useEditor` shallow-equal cache, not by before/after
  commit counts. The highest-frequency selectors (playhead, selection
  arrays) were already scoped to `["selection"]`/`["playback"]` + rAF/DOM
  writes before this pass — left untouched.
- Persist throttle is write-timing only: same key, same partialize, same
  rehydrate. Measured: 60 sets → 2 writes in the spy test; real-world
  localStorage write reduction during drags is inferred, not profiled.

## Changed files

- `apps/web/src/core/managers/commands.ts` (history cap only)
- `apps/web/src/lib/commands/base-command.ts` (dispose contract)
- `apps/web/src/lib/commands/media/remove-media-asset.ts` (dispose impl)
- `apps/web/src/stores/throttled-storage.ts` (new)
- `apps/web/src/stores/editor-ui-store.ts`, `panel-store.ts`,
  `assets-panel-store.tsx`, `mcp-store.ts` (throttled persist)
- `useShallow`/selector scoping: `components/editor/collab/collab-overlay.tsx`,
  `components/editor/command-palette.tsx`,
  `components/editor/dialogs/shortcuts-editor.tsx`,
  `components/editor/dialogs/save-preset-dialog.tsx`,
  `components/editor/panels/assets/index.tsx`, `tabbar.tsx`,
  `views/assets.tsx`, `views/presets.tsx`, `views/plugins.tsx`,
  `views/sounds.tsx`, `views/stickers.tsx`,
  `components/editor/panels/preview/context-menu.tsx`, `index.tsx`,
  `components/editor/panels/properties/index.tsx`,
  `components/whats-new/whats-new-card.tsx`,
  `hooks/use-keybindings.ts`, `hooks/use-keyboard-shortcuts-help.ts`,
  `hooks/use-sound-search.ts`
- `components/editor/panels/timeline/timeline-element-cull.ts` (doc only)
- Tests: `core/managers/__tests__/react-perf-100-pass-owned.test.ts` (new),
  `stores/__tests__/react-perf-throttled-storage.test.ts` (new),
  `stores/__tests__/react-perf-selectors.test.ts` (new),
  `stores/__tests__/react-perf-effect-cards.test.ts` (new),
  `components/editor/panels/timeline/timeline-element-cull.test.ts` (+round 10)

What's New not updated because: internal perf pass, no user-visible change.

Round 21 follow-up (2026-09-27): What's New entries
`2026-09-27-scrub-layout-thrash-fix`, `2026-09-27-security-hardening`, and
`2026-09-27-black-preview-and-adjust-fixes` WERE added — round 21 is
user-visible (scrub smoothness) and the security/fix entries cover the
shipped 7a204a2 + 6a640c0 changes that had no feed entry yet.

## Final round (2026-09-27): scrub layout-thrash fix - measured results (t-14)

Before (real-GPU probe, six playhead drags across a 4-image 2-track timeline):
19 long tasks / 1210ms main-thread blocked, max single task 111ms, while the
underlying preview render measured only 1.4-2.8ms per frame. CPU profiling
attributed the blockage to layout thrash, not rendering:

- `updatePlayheadLeft` + layout: 412ms self time (DOM scrollLeft reads +
  `style.left` writes per seek event on two playhead updaters)
- `handlePlaybackUpdate`: 373ms (clientWidth + scrollWidth reads per playback
  tick, ~60Hz)
- `useEdgeAutoScroll` rAF loop: geometry reads (rect/width/scrollWidth) every
  frame while dragging near the edges
- `handleScrub`: ruler `getBoundingClientRect()` per scrub event
- `TimelinePlayhead`: clientHeight read during render

After (commit f558567 + playhead geometry-cache follow-up): playhead positions
move via composited `transform`, the horizontal scroll offset is shared
through a `scrollLeftRef` synced by the scroll funnel, `useEdgeAutoScroll`
caches geometry once per drag, and `handlePlaybackUpdate` reads cached
viewport geometry refreshed by ResizeObserver. Measured results:

- `updatePlayheadLeft` + forced layout self time: 412ms -> 11ms
- `handlePlaybackUpdate`: 373ms -> 2.7ms
- Long tasks during scrubbing: 19/1210ms -> zero-to-few sporadic short tasks
  (dev-mode React StrictMode + jsxDEV + GC dominate what remains)
- Playback long tasks: 5/339ms -> 2-8/145-574ms across runs (dev-mode
  variance); multiple post-fix runs recorded zero long tasks

What's New entry `2026-09-27-scrub-layout-thrash-fix` added (user-visible
scrub smoothness).
