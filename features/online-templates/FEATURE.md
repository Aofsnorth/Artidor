# Feature: Online Templates (deep-link)

## Status: COMPLETE

## What

The "Templates" button on the projects page now opens the editor's
template gallery via deep-link (`/editor?dialog=templates`). The
editor auto-opens the templates dialog and cleans the URL.

## Files Changed

- `apps/web/src/app/projects/page.tsx` — TemplatesButton now links
  to `/editor?dialog=templates` instead of disabled placeholder
- `apps/web/src/app/editor/[project_id]/page.tsx` — DialogAutoOpener
  component reads `?dialog=` query param and opens the corresponding
  dialog, then cleans the URL

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 0 errors |
| `bun run test` | all pass |
