/**
 * Fetch available models from an AI provider.
 *
 * The client posts `{ baseUrl, apiKey, kind }`; we call the provider's
 * models listing endpoint and return `{ models: [{ id, provider }] }`.
 * This runs server-side to avoid CORS restrictions — the browser can't
 * call OpenAI's `/v1/models` or Anthropic's `/v1/models` directly.
 *
 * Supported endpoints:
 *  - openai-compatible: `GET {baseUrl}/v1/models` with `Authorization: Bearer {apiKey}`
 *    → returns `{ data: [{ id: "gpt-4o", ... }] }`
 *  - ollama: `GET {baseUrl}/api/tags` (no auth)
 *    → returns `{ models: [{ name: "llama3:latest", ... }] }`
 *  - anthropic-compatible: `GET https://api.anthropic.com/v1/models`
 *    with `x-api-key` header and `anthropic-version: 2023-06-01`
 *    → returns `{ data: [{ id: "claude-sonnet-4-...", ... }] }`
 *
 * Gated behind `AI_FEATURE_ENABLED` (same as /api/ai/chat and /api/ai/test)
 * to prevent unauthenticated use as an arbitrary-URL fetch proxy.
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
	kind: z
		.enum(["openai-compatible", "anthropic-compatible", "ollama", "puter"])
		.default("openai-compatible"),
});

interface ModelEntry {
	id: string;
	/** Provider label shown in the dropdown (e.g. "openai", "ollama"). */
	provider: string;
	/** Optional human-readable name. */
	name?: string;
}

interface ModelsResult {
	models: ModelEntry[];
	error?: string;
}

export async function POST(request: Request): Promise<Response> {
	if (!AI_FEATURE_ENABLED) {
		return Response.json(
			{ models: [], error: "Not Found" } satisfies ModelsResult,
			{ status: 404 },
		);
	}

	try {
		const { limited } = await checkRateLimit({ request });
		if (limited) {
			return Response.json(
				{ models: [], error: "Too many requests" } satisfies ModelsResult,
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
					models: [],
					error: `Invalid request: ${err instanceof Error ? err.message : String(err)}`,
				} satisfies ModelsResult,
				{ status: 400 },
			);
		}

		// Puter.js runs client-side — no server endpoint to list models.
		if (body.kind === "puter") {
			return Response.json({
				models: [],
				error: "Puter.js models are fetched client-side.",
			} satisfies ModelsResult);
		}

		let normalized: string;
		try {
			normalized = normalizeProviderBaseUrl(body.baseUrl);
		} catch (err) {
			return Response.json(
				{
					models: [],
					error: err instanceof Error ? err.message : "Invalid provider URL.",
				} satisfies ModelsResult,
				{ status: 400 },
			);
		}

		const providerLabel = body.kind === "ollama" ? "ollama" : body.kind === "anthropic-compatible" ? "anthropic" : "openai";

		try {
			const models = await fetchModelsFromProvider({
				normalizedBaseUrl: normalized,
				apiKey: body.apiKey,
				kind: body.kind,
				providerLabel,
			});
			return Response.json({ models } satisfies ModelsResult);
		} catch (err) {
			return Response.json(
				{
					models: [],
					error: err instanceof Error ? err.message : "Failed to fetch models.",
				} satisfies ModelsResult,
			);
		}
	} catch (err) {
		return Response.json(
			{
				models: [],
				error: err instanceof Error ? err.message : "Internal error.",
			} satisfies ModelsResult,
			{ status: 500 },
		);
	}
}

/**
 * Call the provider's models listing endpoint and normalize the
 * response into a flat array of `{ id, provider, name? }`.
 */
async function fetchModelsFromProvider({
	normalizedBaseUrl,
	apiKey,
	kind,
	providerLabel,
}: {
	normalizedBaseUrl: string;
	apiKey: string;
	kind: "openai-compatible" | "anthropic-compatible" | "ollama";
	providerLabel: string;
}): Promise<ModelEntry[]> {
	// Build the request URL + headers based on provider kind.
	let url: string;
	let headers: Record<string, string> = {};

	if (kind === "ollama") {
		// Ollama uses /api/tags (not /v1/models) and needs no auth.
		// The normalized URL strips /v1, so we use the raw host root.
		url = `${normalizedBaseUrl}/api/tags`;
	} else if (kind === "anthropic-compatible") {
		// Anthropic uses x-api-key header + anthropic-version.
		url = `${normalizedBaseUrl}/v1/models`;
		headers = {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		};
	} else {
		// OpenAI-compatible: /v1/models with Bearer auth.
		url = `${normalizedBaseUrl}/v1/models`;
		if (apiKey) {
			headers.Authorization = `Bearer ${apiKey}`;
		}
	}

	// DNS rebinding defense — resolve the hostname and verify the IP is
	// not private/link-local before fetching.
	await assertSafeProviderUrlDns(new URL(url));

	const response = await fetch(url, {
		method: "GET",
		headers,
		signal: AbortSignal.timeout(15_000),
	});

	if (!response.ok) {
		let detail = `HTTP ${response.status}`;
		try {
			const text = await response.text();
			if (text) detail = `${detail}: ${text.slice(0, 200)}`;
		} catch {
			/* noop */
		}
		throw new Error(`Provider returned ${detail}`);
	}

	const data = (await response.json()) as unknown;

	// Normalize the response — different providers return different shapes.
	// OpenAI / Anthropic: { data: [{ id: "..." }] }
	// Ollama: { models: [{ name: "..." }] }
	const models: ModelEntry[] = [];

	if (kind === "ollama") {
		const ollamaData = data as { models?: Array<{ name?: string }> };
		for (const m of ollamaData.models ?? []) {
			if (m.name) {
				models.push({ id: m.name, provider: providerLabel, name: m.name });
			}
		}
	} else {
		const openaiData = data as { data?: Array<{ id?: string; owned_by?: string }> };
		for (const m of openaiData.data ?? []) {
			if (m.id) {
				models.push({
					id: m.id,
					provider: m.owned_by ?? providerLabel,
					name: m.id,
				});
			}
		}
	}

	if (models.length === 0) {
		throw new Error("Provider returned no models.");
	}

	// Sort alphabetically by id for a stable dropdown.
	models.sort((a, b) => a.id.localeCompare(b.id));

	return models;
}
