# Feature: AI Editing — Implementation Plan

## Status: PLANNED — awaiting user approval before coding

## Current State

Artidor already has a **substantial AI infrastructure** that is
**intentionally disabled** (`AI_FEATURE_ENABLED = false`):

- 50+ tools across 14 categories (project, scene, track, element,
  effect, mask, keyframe, transition, playback, asset, style, export,
  history, selection, clipboard)
- 3 provider backends (OpenAI-compatible, Anthropic, Ollama)
- Polished chat UI with quick actions, streaming, tool results
- Style profile extractor (client-side video analysis)
- Telemetry (privacy-first, local only)
- System prompt with 5-layer cache-efficient structure

**The feature is disabled because it lacks security hardening (P1).**

## What's Missing

### Critical (P1 — must have before enabling)

1. **Authentication check** on `/api/ai/chat` + `/api/ai/test`
   - Reject anonymous callers
   - Require authenticated session
   - File: `apps/web/src/app/api/ai/chat/route.ts`

2. **IP-based rate limiting** (per-user, not global)
   - Current `checkRateLimit` skeleton exists but needs real IP keying
   - Add per-user quota tracking

3. **Cost controls**
   - Track token usage per request
   - Per-user daily/monthly limits
   - Alert on abnormal usage

4. **Audit logging**
   - Log all AI requests (user, provider, model, tokens, tool calls)
   - Store in IndexedDB (privacy-first) or server-side

### Important (P1/P2 — should have)

5. **Tool result feedback loop**
   - Send tool execution results back to LLM
   - Allow multi-turn tool execution (LLM can refine after seeing results)
   - File: `apps/web/src/core/managers/ai-manager.ts`

6. **Cancellation support**
   - AbortController on fetch request
   - Stop tool execution on cancel
   - File: `apps/web/src/core/managers/ai-manager.ts`

7. **Anthropic in UI**
   - Add Anthropic to provider manager (currently only server-side env)
   - File: `apps/web/src/stores/ai-providers-store.ts`

### Nice to Have (P2)

8. **More quick actions / presets**
   - Industry-specific (YouTube, TikTok, Instagram)
   - Template-based actions
   - File: `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`

9. **Tool call visualization in UI**
   - Show tool calls (not just results) in chat bubbles
   - File: `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`

10. **Suggested follow-ups**
    - After AI completes, suggest next actions
    - File: `apps/web/src/components/editor/panels/assets/views/ai-edit.tsx`

## Implementation Plan

### Phase 1: Security Hardening (enables the feature)
**Risk: Sensitive path (`apps/web/src/app/api/ai/`) — needs approval**

1. Add auth check to `/api/ai/chat` + `/api/ai/test`
2. Implement per-IP rate limiting
3. Add cost tracking (token usage per request)
4. Add audit logging
5. Flip `AI_FEATURE_ENABLED = true`

**Files touched**: `apps/web/src/app/api/ai/chat/route.ts`,
`apps/web/src/app/api/ai/test/route.ts`, `apps/web/src/lib/ai/config.ts`

**Estimated changes**: ~100 lines

### Phase 2: Tool Result Feedback Loop
1. After tool execution, append results to conversation
2. Send updated conversation back to LLM for refinement
3. Allow up to 3 rounds of tool execution per user message

**Files touched**: `apps/web/src/core/managers/ai-manager.ts`

**Estimated changes**: ~50 lines

### Phase 3: Cancellation + UX Polish
1. AbortController on fetch
2. Tool call visualization in chat
3. Suggested follow-ups
4. Anthropic in provider UI

**Files touched**: `ai-manager.ts`, `ai-edit.tsx`, `ai-providers-store.ts`

**Estimated changes**: ~150 lines

### Phase 4: More Presets (P2)
1. Industry-specific quick actions
2. Template-based actions
3. `apply_preset` tool completion

**Files touched**: `ai-edit.tsx`, `executor.ts`

**Estimated changes**: ~100 lines

## Risks

- **Sensitive path**: `apps/web/src/app/api/ai/` is in AGENTS.md's
  sensitive paths list. Phase 1 touches this — needs explicit approval.
- **Security**: Enabling AI without auth = anyone can drain API credits.
  Must complete Phase 1 before flipping the flag.
- **Cost**: No cost controls = unlimited API usage. Must add quotas.
- **Privacy**: Telemetry is local-only (good). AI requests go to
  external LLM providers (user-configured). No change needed.

## Rollback

Set `AI_FEATURE_ENABLED = false` in `config.ts`. The API routes return
404, the AI Edit tab is hidden, the AI showcase is hidden. Instant
rollback, no data migration.

## Decision Needed

Per AGENTS.md, `apps/web/src/app/api/ai/` is a sensitive path. I need
explicit approval before touching these files.

Also need approval for:
- Enabling the feature flag (`AI_FEATURE_ENABLED = true`)
- Adding auth/rate-limiting logic to API routes

Which phases would you like me to implement?
