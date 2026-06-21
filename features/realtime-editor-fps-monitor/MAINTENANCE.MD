# Maintenance — Realtime Editor FPS Monitor

## 2026-06-20
- Created feature workflow folder.
- Created required workflow files.
- Filled feature scope, plan, QA, risks, TODO, and state.
- No implementation yet.

## 2026-06-22
- Added `showFpsMonitor` setting (default on) + setter in `settings-store.ts`
  (persisted via `app-settings`).
- Added "Show FPS monitor" toggle to General settings.
- New `components/editor/fps-monitor.tsx`: rAF EMA-smoothed badge, ~4Hz display,
  no loop when disabled, bottom-left, pointer-events-none.
- Mounted in the preview panel slot in `app/editor/[project_id]/page.tsx`.
- Typecheck clean for touched files; lint/build + manual QA pending.
