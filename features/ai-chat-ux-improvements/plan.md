# AI chat UX improvements

## Goal
Address the AI-chat pain points from the backlog: editable-message re-prompt,
long-chat performance, image-card lag, and explicit token/context controls.

## Implemented
1. **Editable message auto re-prompt**
   - `MessageBubble.handleSaveEdit` now removes every message after the edited
     user message and calls `editor.ai.send({ text })` to regenerate the
     conversation from that point.
   - File: `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`

2. **Image/video card lag fix**
   - Added `ToolResultData` component that renders `view_asset` tool results as
     actual `<img>` / `<video>` thumbnails instead of dumping raw base64 JSON.
   - Long JSON strings are truncated by the shared
     `truncateLongStrings` helper so the DOM never renders megabyte data URLs.
   - Files: `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`,
     `apps/web/src/lib/ai/chat-display-helpers.ts`

3. **Max output tokens + context window controls**
   - Added `maxOutputTokens` and `maxContextMessages` to
     `AdvancedAISettings` in `ai-store.ts` (defaults 4096 / 100).
   - Added UI sliders in the Advanced AI settings popover.
   - `ai-manager.ts` slices outgoing message lists to `maxContextMessages`
     and sends `maxOutputTokens` to the server.
   - `/api/ai/chat/route.ts` validates and forwards `maxOutputTokens` into the
     provider `ChatRequest`.
   - Added zustand `merge` so persisted settings that lack the new fields fall
     back to defaults.
   - Files: `apps/web/src/stores/ai-store.ts`,
     `apps/web/src/core/managers/ai-manager.ts`,
     `apps/web/src/app/api/ai/chat/route.ts`,
     `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`,
     `apps/web/src/lib/i18n/dictionaries.ts`

4. **Auto-compaction**
   - Already implemented in `ai-manager.ts`; thresholds are exposed in Advanced
     settings.

## Deferred / out of scope
- **Expandable thinking/history default off**: thinking content is currently
  stripped server-side before it reaches the client. Preserving it and adding a
  UI toggle requires changes across the streaming parser and message schema,
  which is larger than this iteration.

## Tests
- Added `apps/web/src/lib/ai/chat-display-helpers.test.ts` covering
  `truncateLongStrings`.
- Existing web test suite passes.

## Sensors
- `cd apps/web && bunx tsc --noEmit`
- `bun run lint:web`
- `bun test apps/web/src`

## What's New
- Added entry `2026-07-16-ai-chat-controls-and-previews` to
  `apps/web/src/lib/whats-new/feed.ts`.
