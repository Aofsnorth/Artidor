/**
 * Anthropic Messages API provider.
 *
 * Translates the unified ChatRequest into the shape Anthropic expects and
 * back. The big differences to keep in mind:
 *  - Anthropic's `system` field is a top-level string, not a message.
 *  - Tool results are sent as `tool_result` blocks inside a `user` message,
 *    one per `tool_use_id` we want to feed back.
 *  - The model returns a list of content blocks; the text block goes to
 *    `content` and `tool_use` blocks become our `toolCalls` array.
 */

import type {
	ChatRequest,
	ChatResponse,
	LLMProvider,
	ProviderConfig,
	ProviderName,
	ToolCall,
	ToolDefinition,
} from "../provider";

interface AnthropicResponse {
	content: Array<
		| { type: "text"; text: string }
		| { type: "tool_use"; id: string; name: string; input: unknown }
	>;
	stop_reason: string;
	usage?: {
		input_tokens: number;
		output_tokens: number;
	};
}

export class AnthropicProvider implements LLMProvider {
	constructor(private config: ProviderConfig) {}

	get name(): ProviderName {
		return "anthropic";
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		if (!this.config.apiKey) {
			throw new Error(
				"Anthropic provider requires ANTHROPIC_API_KEY. Set it in your env.",
			);
		}
		const baseUrl = (
			this.config.baseUrl ?? "https://api.anthropic.com"
		).replace(/\/$/, "");

		const systemMsg = request.messages.find((m) => m.role === "system");
		const system =
			typeof systemMsg?.content === "string"
				? systemMsg.content
				: Array.isArray(systemMsg?.content)
					? systemMsg.content
							.filter((p) => p.type === "text")
							.map((p) => (p as { type: "text"; text: string }).text)
							.join("\n")
					: undefined;
		const messages = request.messages
			.filter((m) => m.role !== "system")
			.map((m) => this.toAnthropicMessage(m));

		const body = {
			model: request.model ?? this.config.model,
			max_tokens: request.maxTokens ?? 4096,
			temperature: request.temperature ?? 0.4,
			system: system ?? undefined,
			tools: request.tools?.map((t) => this.toAnthropicTool(t)),
			messages,
		};

		const res = await fetch(`${baseUrl}/v1/messages`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-api-key": this.config.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`Anthropic request failed: ${res.status} ${res.statusText} — ${text.slice(0, 500)}`,
			);
		}

		const data = (await res.json()) as AnthropicResponse;

		const text = data.content
			.filter((b) => b.type === "text")
			.map((b) => (b as { type: "text"; text: string }).text)
			.join("");

		const toolCalls: ToolCall[] = data.content
			.filter((b) => b.type === "tool_use")
			.map((b) => {
				const use = b as {
					type: "tool_use";
					id: string;
					name: string;
					input: unknown;
				};
				return {
					id: use.id,
					name: use.name,
					arguments:
						use.input && typeof use.input === "object"
							? (use.input as Record<string, unknown>)
							: {},
				};
			});

		return {
			message: {
				role: "assistant",
				content: text,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			},
			usage: data.usage
				? {
						promptTokens: data.usage.input_tokens,
						completionTokens: data.usage.output_tokens,
						totalTokens: data.usage.input_tokens + data.usage.output_tokens,
					}
				: undefined,
			toolCalls,
			finishReason: data.stop_reason ?? "end_turn",
		};
	}

	private toAnthropicMessage(
		m: ChatRequest["messages"][number],
	):
		| { role: "user"; content: Array<Record<string, unknown>> }
		| { role: "assistant"; content: Array<Record<string, unknown>> } {
		if (m.role === "tool") {
			return {
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: m.toolCallId,
						content:
							typeof m.content === "string"
								? m.content
								: JSON.stringify(m.content),
					},
				],
			};
		}
		if (m.role === "assistant" && m.toolCalls?.length) {
			return {
				role: "assistant",
				content: m.toolCalls.map((tc) => ({
					type: "tool_use",
					id: tc.id,
					name: tc.name,
					input: tc.arguments ?? {},
				})),
			};
		}
		// Convert content parts to Anthropic's format. Image_url parts
		// (data URLs) are converted to Anthropic's base64 image blocks.
		const parts = Array.isArray(m.content) ? m.content : [{ type: "text" as const, text: m.content }];
		const content = parts.map((p) => {
			if (p.type === "text") {
				return { type: "text", text: p.text };
			}
			// image_url → Anthropic base64 image block.
			const url = p.image_url.url;
			const match = url.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
			if (match) {
				return {
					type: "image",
					source: {
						type: "base64",
						media_type: match[1],
						data: match[2],
					},
				};
			}
			// Non-data URLs: pass as text reference (Anthropic doesn't
			// support URL-based images directly).
			return { type: "text", text: `[image: ${url}]` };
		});
		return {
			role: m.role === "assistant" ? "assistant" : "user",
			content,
		};
	}

	private toAnthropicTool(t: ToolDefinition) {
		return {
			name: t.function.name,
			description: t.function.description,
			input_schema: t.function.parameters,
		};
	}
}
