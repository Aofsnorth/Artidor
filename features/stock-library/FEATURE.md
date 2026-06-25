# Feature: Stock Library (Pexels)

## Status: COMPLETE

## What

Search Pexels stock videos from the assets panel. Free, licensed
footage with preview thumbnails, duration, and one-click download.

## Files Changed

- `apps/web/src/app/api/stock/videos/route.ts` — new API route
  (auth-gated, rate-limited, Pexels API proxy)
- `apps/web/src/components/editor/panels/assets/views/assets.tsx` —
  StockVideoSearch component with debounced search + grid results
- `apps/web/src/lib/env/web.ts` — added PEXELS_API_KEY env var

## SOP Checks

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 6 warnings (pre-existing), 0 errors |
| `bun run test` | all pass |
