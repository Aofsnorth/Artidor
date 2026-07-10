# Feature: Playhead Drag Mode (Auto / Smart)

## Status: COMPLETE

## What

The playhead drag button in the timeline toolbar is now a dropdown
with two modes:

- **Auto**: existing behavior — always play or always pause when
  dragging the playhead. The sub-menu toggles between "Play on drag"
  and "Pause on drag" (the old `autoPlayWhileScrubbing` toggle).
- **Smart**: preserves the current play state during drag. If playing,
  stays playing; if paused, stays paused.

## Files Changed

- `apps/web/src/stores/timeline-store.ts` — added `scrubDragMode`
  ("auto" | "smart") + `setScrubDragMode`, persisted in partialize
- `apps/web/src/hooks/timeline/use-timeline-playhead.ts` —
  `handlePlayheadMouseDown` and `handleRulerMouseDown` now check
  `scrubDragModeRef` — in smart mode, no play/pause action is taken
- `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx`
  — replaced the toggle ToolbarButton with a DropdownMenu showing
  Auto / Smart options + the old play/pause toggle in Auto mode

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 6 warnings (pre-existing), 0 errors |
