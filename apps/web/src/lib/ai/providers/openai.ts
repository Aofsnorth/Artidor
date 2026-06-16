/**
 * OpenAI Chat Completions provider.
 *
 * Implements the small subset of the OpenAI spec that the AI Edit panel
 * needs: a single chat call with optional `tools` and `tool_choice`. The
 * same code path covers the OpenAI public API and any OpenAI-compatible
 * endpoint (Together, Groq, OpenRouter, LM Studio, llama.cpp's server,
 * vLLM, etc.) by overriding `baseUrl`.
 */

import type {
	ChatRequest,
	ChatResponse,
	LLMProvider,
	ProviderConfig,
	ProviderName,
	ToolCall,
} from "../provider";

interface OpenAIToolCall {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
}

interface OpenAIMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_call_id?: string;
	tool_calls?: OpenAIToolCall[];
	name?: string;
}

interface OpenAIResponse {
	choices: Array<{
		index: number;
		message: OpenAIMessage;
		finish_reason: string;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export class OpenAIProvider implements LLMProvider {
	constructor(private config: ProviderConfig) {}

	// Typed against the union so the Ollama subclass can narrow it.
	get name(): ProviderName {
		return "openai";
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		if (!this.config.apiKey) {
			throw new Error(
				"OpenAI provider requires OPENAI_API_KEY. Set it in your env.",
			);
		}
		const baseUrl = (this.config.baseUrl ?? "https://api.openai.com").replace(
			/\/$/,
			"",
		);

		const body = {
			model: request.model ?? this.config.model,
			messages: request.messages.map((m) => this.toOpenAIMessage(m)),
			tools: request.tools?.map((t) => t),
			tool_choice: request.toolChoice ?? "auto",
			temperature: request.temperature ?? 0.4,
			max_tokens: request.maxTokens ?? 2048,
		};

		const res = await fetch(`${baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`OpenAI request failed: ${res.status} ${res.statusText} — ${text.slice(0, 500)}`,
			);
		}

		const data = (await res.json()) as OpenAIResponse;
		const choice = data.choices?.[0];
		if (!choice) {
			throw new Error("OpenAI returned no choices");
		}

		const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map(
			(tc) => ({
				id: tc.id,
				name: tc.function.name,
				arguments: safeJson(tc.function.arguments),
			}),
		);

		return {
			message: {
				role: "assistant",
				content: choice.message.content ?? "",
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			},
			usage: data.usage
				? {
						promptTokens: data.usage.prompt_tokens,
						completionTokens: data.usage.completion_tokens,
						totalTokens: data.usage.total_tokens,
					}
				: undefined,
			toolCalls,
			finishReason: choice.finish_reason ?? "stop",
		};
	}

	private toOpenAIMessage(m: ChatRequest["messages"][number]): OpenAIMessage {
		if (m.role === "tool") {
			return {
				role: "tool",
				content: m.content,
				tool_call_id: m.toolCallId,
				name: m.name,
			};
		}
		if (m.role === "assistant" && m.toolCalls?.length) {
			return {
				role: "assistant",
				content: m.content || null,
				tool_calls: m.toolCalls.map((tc) => ({
					id: tc.id,
					type: "function",
					function: {
						name: tc.name,
						arguments: JSON.stringify(tc.arguments ?? {}),
					},
				})),
			};
		}
		return { role: m.role, content: m.content };
	}
}

function safeJson(raw: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return {};
	} catch {
		return {};
	}
}
