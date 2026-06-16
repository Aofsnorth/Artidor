/**
 * AI chat API route.
 *
 * Flow:
 *   1. Client posts { messages, context, recentEvents, styleProfile }.
 *   2. We resolve a provider from env. If none, return 501 with a
 *      helpful message.
 *   3. Build the system prompt (with the live project snapshot +
 *      telemetry summary + optional style profile).
 *   4. Send to the LLM. The response is streamed back as SSE so the
 *      client can render the assistant's reply as it arrives.
 *
 * Streaming:
 *   - text deltas land as `data: {"delta": "..."}\n\n` events.
 *   - tool calls land as a single `data: {"toolCalls": [...]}\n\n`
 *     event, after the text stream is done.
 *   - `data: {"done": true}\n\n` marks the end of the stream.
 *
 * The client side is responsible for *executing* tool calls — that
 * needs access to the browser's EditorCore singleton and DOM
 * (image / video sampling), which the server cannot do.
 */
import { z } from "zod";
import { AI_FEATURE_ENABLED } from "@/lib/ai/config";
import {
	resolveProvider,
	type ChatMessage,
	type ChatRequest,
} from "@/lib/ai/provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OllamaProvider } from "@/lib/ai/providers/ollama";
import type { LLMProvider } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getToolDefinitions } from "@/lib/ai/tools/registry";
import type { StyleProfile } from "@/lib/ai/style/extractor";
import type { TelemetryEvent } from "@/lib/ai/telemetry/store";

const bodySchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(["system", "user", "assistant", "tool"]),
				content: z.string(),
				toolCallId: z.string().optional(),
				name: z.string().optional(),
				toolCalls: z
					.array(
						z.object({
							id: z.string(),
							name: z.string(),
							arguments: z.record(z.string(), z.unknown()),
						}),
					)
					.optional(),
			}),
		)
		.min(1),
	context: z
		.object({
			projectName: z.string().optional(),
			duration: z.number().optional(),
			fps: z.unknown().optional(),
			canvasSize: z
				.object({ width: z.number(), height: z.number() })
				.optional(),
			trackSummary: z
				.array(
					z.object({
						type: z.string(),
						elementCount: z.number(),
					}),
				)
				.optional(),
			recentCommands: z.array(z.record(z.string(), z.unknown())).optional(),
			styleProfile: z.unknown().optional(),
		})
		.optional(),
	recentEvents: z
		.array(
			z.object({
				command: z.string(),
				timestamp: z.number(),
				args: z.record(z.string(), z.unknown()).optional(),
				summary: z.string().optional(),
				source: z.enum(["user", "ai"]),
			}),
		)
		.optional(),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Anthropic SDK + non-streaming OpenAI both work in nodejs

export async function POST(request: Request) {
	// AI is disabled until the endpoint is hardened (auth + rate limit + bot
	// protection). Respond as if the route does not exist so it cannot be used
	// to drain the server-side LLM key. See @/lib/ai/config.
	if (!AI_FEATURE_ENABLED) {
		return new Response("Not Found", { status: 404 });
	}

	const config = resolveProvider();
	if (!config) {
		return new Response(
			JSON.stringify({
				error: "no_provider",
				message:
					"AI provider is not configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL.",
			}),
			{ status: 501, headers: { "content-type": "application/json" } },
		);
	}

	let body: z.infer<typeof bodySchema>;
	try {
		const json = (await request.json()) as unknown;
		body = bodySchema.parse(json);
	} catch (err) {
		return new Response(
			JSON.stringify({
				error: "invalid_body",
				message: err instanceof Error ? err.message : "Invalid JSON",
			}),
			{ status: 400, headers: { "content-type": "application/json" } },
		);
	}

	// Build the live project context the LLM should see. The zod
	// schema for the request body uses `unknown` for `fps` and
	// `styleProfile` because they come from arbitrary sources
	// (the client snapshot and a JSON blob, respectively) — we
	// narrow them here before they hit the strict ChatContext type.
	const context = body.context
		? {
				...body.context,
				fps:
					typeof body.context.fps === "number" ? body.context.fps : undefined,
				styleProfile: (body.context.styleProfile ??
					null) as StyleProfile | null,
				// zod gives us `Record<string, unknown>[]` for recentCommands;
				// the client snapshot uses the same shape but we cast to the
				// strict shape the prompt builder wants. The fields are
				// optional so any drift is harmless.
				recentCommands: body.context.recentCommands?.map((e) => ({
					command: String(e.command ?? ""),
					timestamp: Number(e.timestamp ?? 0),
					args: e as Record<string, unknown>,
				})),
			}
		: undefined;

	const recentEvents = body.recentEvents?.map((e) => ({
		...e,
		id: crypto.randomUUID(),
	})) as TelemetryEvent[] | undefined;

	const tools = getToolDefinitions();
	const system = buildSystemPrompt({
		tools: tools.map((t) => ({
			name: t.function.name,
			category: t.function.name.split("_")[0] ?? "misc",
			description: t.function.description,
		})),
		context,
		recentEvents,
	});

	const provider: LLMProvider = (() => {
		switch (config.provider) {
			case "anthropic":
				return new AnthropicProvider(config);
			case "ollama":
				return new OllamaProvider(config);
			default:
				return new OpenAIProvider(config);
		}
	})();

	const chatMessages: ChatMessage[] = [
		{ role: "system", content: system },
		...body.messages,
	];

	const chatRequest: ChatRequest = {
		messages: chatMessages,
		tools,
		temperature: 0.4,
		maxTokens: 4096,
	};

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				const response = await provider.chat(chatRequest);
				// Stream the text in small chunks so the UI gets typing feedback.
				const text = response.message.content;
				const chunkSize = 16;
				for (let i = 0; i < text.length; i += chunkSize) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ delta: text.slice(i, i + chunkSize) })}\n\n`,
						),
					);
				}
				if (response.toolCalls.length > 0) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ toolCalls: response.toolCalls })}\n\n`,
						),
					);
				}
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							done: true,
							usage: response.usage,
							finishReason: response.finishReason,
						})}\n\n`,
					),
				);
				controller.close();
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "AI request failed";
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({ error: message, done: true })}\n\n`,
					),
				);
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"content-type": "text/event-stream",
			"cache-control": "no-cache, no-transform",
			connection: "keep-alive",
		},
	});
}
