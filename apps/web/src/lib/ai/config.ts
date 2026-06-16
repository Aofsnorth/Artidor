/**
 * Master switch for the in-app AI assistant (the "AI Edit" panel + the
 * /api/ai/chat route + the landing-page AI showcase).
 *
 * Kept OFF until the AI surface is hardened. The /api/ai/chat route proxies a
 * server-side LLM key (ANTHROPIC_API_KEY / OPENAI_API_KEY) with no auth, no
 * rate limit, and no bot protection — exposing it publicly is a direct
 * cost-abuse risk (anyone could drain the API credits). While this is `false`:
 *   - the API route returns 404 (the endpoint effectively does not exist),
 *   - the "AI Edit" tab is hidden from the editor sidebar,
 *   - the AI showcase is hidden from the marketing page.
 *
 * Before flipping this to `true` for a public deploy, FIRST add to
 * apps/web/src/app/api/ai/chat/route.ts:
 *   1. an authenticated-session check (reject anonymous callers),
 *   2. checkRateLimit({ request }) keyed on the real client IP, and
 *   3. a real BotID protect entry for "/api/ai/chat".
 *
 * This is a plain constant (not an env var) on purpose: a code-level default of
 * `false` cannot be accidentally left enabled by a missing/instated env var.
 */
export const AI_FEATURE_ENABLED = false;
