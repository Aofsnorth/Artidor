/**
 * Test an AI provider's connection from the client.
 *
 * The client posts `{ baseUrl, apiKey, model, kind }`; we send a
 * minimal `/v1/chat/completions` request with one tiny prompt and
 * return `{ ok: true }` on success or `{ ok: false, error: "..." }`
 * with a human-readable reason on failure.
 *
 * This endpoint is gated behind `AI_FEATURE_ENABLED` (same as
 * /api/ai/chat) to prevent unauthenticated use as an arbitrary-URL
 * fetch proxy. It doesn't bill anything (single-token response we
 * never read) and doesn't return LLM output — it only checks
 * authentication, model availability, and reachability.
 */

import { z } from "zod";
import { AI_FEATURE_ENABLED } from "@/lib/ai/config";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeProviderBaseUrl, assertSafeProviderUrlDns } from "@/lib/ai/provider-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	baseUrl: z.string().default(""),
	apiKey: z.string().optional().default(""),
	model: z.string().min(1),
	kind: z
		.enum(["openai-compatible", "anthropic-compatible", "ollama", "puter"])
		.default("openai-compatible"),
});

const TEST_PROMPT = [
	{
		role: "system",
		content: "You are a connectivity probe. Reply with the single word OK.",
	},
	{
		role: "user",
		content: "ping",
	},
];

/**
 * Normalize the base URL using the shared helper, then append `/v1`
 * since the test endpoint builds the full URL itself (unlike the chat
 * route where the OpenAI provider class appends `/v1/chat/completions`).
 */
function normalizeBaseUrl({ baseUrl }: { baseUrl: string }): string {
	return `${normalizeProviderBaseUrl(baseUrl)}/v1`;
}

function buildAuthHeader({
	apiKey,
	kind,
}: {
	apiKey: string | undefined;
	kind: "openai-compatible" | "anthropic-compatible" | "ollama" | "puter";
}): string | null {
	if (kind === "ollama" || kind === "puter") return null;
	if (!apiKey || apiKey.length === 0) return null;
	return `Bearer ${apiKey}`;
}

interface TestResult {
	ok: boolean;
	error?: string;
	/** Provider-reported latency, if we got a response. */
	latencyMs?: number;
	/** Raw echo of what we used, so the client can show what was tested. */
	echo?: {
		url: string;
		model: string;
		kind: string;
	};
}

export async function POST(request: Request): Promise<Response> {
	// Gate behind the same master switch as /api/ai/chat. Without this,
	// an unauthenticated caller could use this endpoint as an arbitrary
	// public-URL fetch proxy (SSRF to external hosts, latency probing).
	// See @/lib/ai/config for the hardening checklist before enabling.
	if (!AI_FEATURE_ENABLED) {
		return Response.json(
			{ ok: false, error: "Not Found" } satisfies TestResult,
			{ status: 404 },
		);
	}

	try {
		// Auth check: this endpoint always uses the client-supplied provider
		// config (BYOK) — it never touches the server's env-var LLM key, so
		// there is no cost-abuse risk and anonymous access is allowed. Rate
		// limiting + SSRF protection still apply.
		const { limited } = await checkRateLimit({ request });
		if (limited) {
			return Response.json(
				{ ok: false, error: "Too many requests" } satisfies TestResult,
				{ status: 429 },
			);
		}

		let body: z.infer<typeof bodySchema>;
		try {
			const json = (await request.json()) as unknown;
			body = bodySchema.parse(json);
		} catch (err) {
			return Response.json(
				{
					ok: false,
					error: `Invalid request: ${err instanceof Error ? err.message : String(err)}`,
				} satisfies TestResult,
				{ status: 400 },
			);
		}

		// Puter.js providers run entirely client-side — there's no
		// server-side endpoint to test. Return a friendly message so
		// the test button doesn't 400.
		if (body.kind === "puter") {
			return Response.json({
				ok: true,
				error:
					"Puter.js providers are tested client-side. Make sure you're logged in to Puter when using this provider.",
			} satisfies TestResult);
		}

		let url: string;
		try {
			url = `${normalizeBaseUrl({ baseUrl: body.baseUrl })}/chat/completions`;
			// DNS rebinding defense — resolve the hostname and verify the
			// IP is not private/link-local before fetching.
			await assertSafeProviderUrlDns(new URL(url));
		} catch (err) {
			return Response.json(
				{
					ok: false,
					error: err instanceof Error ? err.message : "Invalid provider URL.",
				} satisfies TestResult,
				{ status: 400 },
			);
		}
		const auth = buildAuthHeader({ apiKey: body.apiKey, kind: body.kind });
		const startedAt = Date.now();

		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(auth ? { Authorization: auth } : {}),
				},
				body: JSON.stringify({
					model: body.model,
					messages: TEST_PROMPT,
					max_tokens: 1,
					temperature: 0,
					stream: false,
				}),
				// Hard ceiling so a hung endpoint doesn't block the UI forever.
				signal: AbortSignal.timeout(15_000),
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			// Translate the most common network failures into actionable text.
			const friendly =
				msg.includes("ECONNREFUSED") || msg.includes("fetch failed")
					? "Could not reach the server. Check the base URL."
					: msg.includes("aborted") || msg.includes("timeout")
						? "Connection timed out after 15s. The server is unreachable or too slow."
						: `Network error: ${msg}`;
			return Response.json({
				ok: false,
				error: friendly,
				echo: { url, model: body.model, kind: body.kind },
			} satisfies TestResult);
		}

		const latencyMs = Date.now() - startedAt;

		if (!response.ok) {
			// Try to extract a useful error message from the provider's body
			// without dumping the whole thing into the UI.
			let bodyText = "";
			try {
				bodyText = (await response.text()).slice(0, 500);
			} catch {
				// body read failed — fall through to a generic message
			}
			let parsed: { error?: { message?: unknown } } | null = null;
			try {
				parsed = JSON.parse(bodyText);
			} catch {
				// not JSON — that's fine, the raw bodyText is below
			}
			const providerMessage =
				(parsed && typeof parsed.error?.message === "string"
					? parsed.error.message
					: null) ?? bodyText;

			let friendly: string;
			if (response.status === 401 || response.status === 403) {
				friendly = `Authentication failed (HTTP ${response.status}). Check the API key.`;
			} else if (response.status === 404) {
				friendly = `Model or endpoint not found (HTTP 404). Check the base URL and model name.`;
			} else if (response.status === 429) {
				friendly = `Rate-limited (HTTP 429). The provider rejected the request — try again shortly.`;
			} else {
				friendly = `Provider returned HTTP ${response.status}: ${providerMessage}`;
			}

			return Response.json({
				ok: false,
				error: friendly,
				latencyMs,
				echo: { url, model: body.model, kind: body.kind },
			} satisfies TestResult);
		}

		return Response.json({
			ok: true,
			latencyMs,
			echo: { url, model: body.model, kind: body.kind },
		} satisfies TestResult);
	} catch (err) {
		// Catch any unexpected exception (e.g. rate-limit store failure,
		// malformed upstream response, internal edge case) so the client
		// receives a JSON error instead of a generic Next.js 500 HTML page.
		console.error("[AI test] unexpected error:", err);
		return Response.json(
			{
				ok: false,
				error:
					err instanceof Error
						? `Unexpected error: ${err.message}`
						: "Unexpected error testing provider.",
			} satisfies TestResult,
			{ status: 500 },
		);
	}
}
