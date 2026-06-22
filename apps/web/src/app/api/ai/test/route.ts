/**
 * Test an AI provider's connection from the client.
 *
 * The client posts `{ baseUrl, apiKey, model, kind }`; we send a
 * minimal `/v1/chat/completions` request with one tiny prompt and
 * return `{ ok: true }` on success or `{ ok: false, error: "..." }`
 * with a human-readable reason on failure.
 *
 * This endpoint is intentionally exempt from `AI_FEATURE_ENABLED`
 * because it doesn't bill anything (single-token response we never
 * read) and it doesn't return any LLM output — it only checks
 * authentication, model availability, and reachability.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSafeProviderBaseUrl } from "@/lib/ai/provider-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	baseUrl: z.string().min(1),
	apiKey: z.string().optional().default(""),
	model: z.string().min(1),
	kind: z.enum(["openai-compatible", "ollama"]).default("openai-compatible"),
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
 * Strip a trailing slash, ensure the URL ends with `/v1` (OpenAI
 * standard) if it doesn't already. Returns the URL we'll POST to.
 */
function normalizeBaseUrl({ baseUrl }: { baseUrl: string }): string {
	const safeUrl = assertSafeProviderBaseUrl({ baseUrl });
	const trimmed = safeUrl.toString().replace(/\/+$/, "");
	if (trimmed.endsWith("/v1")) return trimmed;
	// If user typed just the host (e.g. `https://api.openai.com`) we
	// add the /v1 ourselves. If they typed `/chat/completions` we
	// strip back to /v1.
	if (trimmed.endsWith("/chat/completions")) {
		return trimmed.slice(0, -"/chat/completions".length);
	}
	return `${trimmed}/v1`;
}

function buildAuthHeader({
	apiKey,
	kind,
}: {
	apiKey: string | undefined;
	kind: "openai-compatible" | "ollama";
}): string | null {
	if (kind === "ollama") return null;
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

	let url: string;
	try {
		url = `${normalizeBaseUrl({ baseUrl: body.baseUrl })}/chat/completions`;
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
}
