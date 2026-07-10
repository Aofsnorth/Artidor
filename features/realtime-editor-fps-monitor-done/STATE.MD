# State — Realtime Editor FPS Monitor

Status: implemented / awaiting user hand-test

Last updated: 2026-06-22

## Summary

Added a low-overhead realtime FPS badge (bottom-left of the preview area) plus a
persistent Settings toggle.

## Changes

- `stores/settings-store.ts` — new `showFpsMonitor` flag (default **on**) +
  setter; persisted to existing `app-settings` localStorage key.
- `dialogs/settings-dialog.tsx` — "Show FPS monitor" Switch row in General.
- `components/editor/fps-monitor.tsx` (new) — rAF loop, EMA-smoothed delta,
  display throttled to ~4×/sec, plain mono badge, `pointer-events-none`,
  `z-30`. Off → renders null, no rAF loop (zero overhead). Background-tab
  frame jumps (>1s delta) ignored.
- `app/editor/[project_id]/page.tsx` — mounted inside the preview panel slot
  (bottom-left), does not overlap timeline controls.

## Verification

- `bunx tsc --noEmit`: no new errors in touched files.
- Manual (toggle persists, live updates, off stops loop, no overlap): pending.
