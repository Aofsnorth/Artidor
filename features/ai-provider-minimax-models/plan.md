# AI provider MiniMax-M3 / fetch model support

## Goal
Fix the 404 users see when clicking "Fetch models" for a MiniMax
OpenAI-compatible provider, and make `MiniMax-M3` easy to select.

## Root cause
MiniMax's OpenAI-compatible endpoint (`https://api.minimax.io/v1`) does not
expose a `/v1/models` listing endpoint, so our `/api/ai/models` route gets a
404 and the UI shows an error instead of the model list.

## Plan
1. Add a curated list of known MiniMax models to
   `apps/web/src/app/api/ai/models/route.ts`.
2. Detect MiniMax hosts (`api.minimax.io`, `api.minimaxi.com`, etc.) and
   return the curated list directly, bypassing the unsupported `/v1/models`
   call.
3. For non-MiniMax providers that still return 404, keep a clear error so
   users can enter the model ID manually.
4. Run sensors.

## Files to touch
- `apps/web/src/app/api/ai/models/route.ts`

## Risks
- Hard-coding model IDs means new MiniMax models won't appear automatically
  until the list is updated. Acceptable for a provider without a model list.
- The curated list may be slightly out of date if MiniMax renames models.

## Sensors
- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
- `bun test apps/web/src`
