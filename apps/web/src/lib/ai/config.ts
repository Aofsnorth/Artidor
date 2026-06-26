/**
 * Master switch for the in-app AI assistant (the "AI Edit" panel + the
 * /api/ai/chat route + the landing-page AI showcase).
 *
 * Security hardening is now in place:
 *   1. Authenticated-session check required when the server falls back to
 *      its own env-var LLM key (reject anonymous callers for server-key
 *      usage). Anonymous access is allowed ONLY when the client supplies
 *      its own provider config (BYOK — bring your own key), since that
 *      path never touches the server's key. ✅
 *   2. checkRateLimit({ request }) keyed on the real client IP ✅
 *   3. SSRF protection via assertSafeProviderBaseUrl ✅
 *
 * When this is `true`:
 *   - the API route accepts authenticated requests (server key) and
 *     anonymous BYOK requests (client-supplied provider),
 *   - the "AI Edit" tab is visible in the editor sidebar,
 *   - the AI showcase is visible on the marketing page.
 *
 * This is a plain constant (not an env var) on purpose: a code-level default
 * makes the security posture explicit and auditable.
 */
export const AI_FEATURE_ENABLED = true;
