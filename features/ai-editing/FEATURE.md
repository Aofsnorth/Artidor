# Feature: AI Editing

## Status: ENABLED — security hardening complete

## What

AI Editing is now live. The AI Edit panel lets users chat with an LLM
to edit their video project via 50+ tools (add text, split clips, add
effects, transitions, keyframes, etc.).

## Security Hardening (Phase 1 — complete)

1. **Authenticated-session check** — `/api/ai/chat` and `/api/ai/test`
   now reject anonymous callers via `auth.api.getSession()`. Returns
   401 if not signed in.
2. **IP-based rate limiting** — `checkRateLimit({ request })` keyed on
   real client IP (cf-connecting-ip → x-real-ip → x-forwarded-for[0]).
   100 requests/minute via Upstash sliding window.
3. **SSRF protection** — `assertSafeProviderBaseUrl()` blocks private
   IPs and localhost from provider URLs.
4. **Feature flag flipped** — `AI_FEATURE_ENABLED = true`.

## Capabilities

- **50+ tools** across 14 categories
- **3 providers**: OpenAI-compatible, Anthropic, Ollama
- **Streaming chat** with SSE
- **Style profile extraction** (client-side video analysis)
- **Privacy-first telemetry** (local only, 500 events max)
- **Quick actions**: Motion graphic, 60s reel, Cinematic grade, Match style
- **Reference video** attachment for style matching

## Files Changed

- `apps/web/src/lib/ai/config.ts` — `AI_FEATURE_ENABLED = true`
- `apps/web/src/app/api/ai/chat/route.ts` — auth check added
- `apps/web/src/app/api/ai/test/route.ts` — auth check added
- `apps/web/src/lib/whats-new/feed.ts` — What's New entry

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
