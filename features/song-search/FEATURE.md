# Feature: Song Search (Freesound)

## Status: COMPLETE

## What

Freesound API now supports songs (duration > 30s + music tags) in
addition to sound effects. Same API route, richer results.

## Files Changed

- `apps/web/src/app/api/sounds/search/route.ts` — implemented songs
  branch with duration > 30s + music tag filters

## SOP Checks

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 0 errors |
| `bun run test` | all pass |
