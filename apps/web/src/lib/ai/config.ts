/**
 * Master switch for the in-app AI assistant (the "AI Edit" panel + the
 * /api/ai/chat route + the landing-page AI showcase).
 *
 * Security hardening is now in place:
 *   1. Authenticated-session check required for all AI routes (including
 *      BYOK) to prevent anonymous abuse and provide an audit trail. ✅
 *   2. checkRateLimit({ request }) keyed on the real client IP ✅
 *   3. SSRF protection via assertSafeProviderBaseUrl ✅
 *
 * When this is `true`:
 *   - the API route accepts authenticated requests,
 *   - the "AI Edit" tab is visible in the editor sidebar,
 *   - the AI showcase is visible on the marketing page.
 *
 * Controlled by the AI_FEATURE_ENABLED env var. Defaults to true for
 * backwards compatibility. Set AI_FEATURE_ENABLED=false to disable.
 */
export const AI_FEATURE_ENABLED =
	process.env.AI_FEATURE_ENABLED !== "false";
