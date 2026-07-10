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
	ChatStreamEvent,
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

type OpenAIContent =
	| string
	| null
	| Array<
			| { type: "text"; text: string }
			| { type: "image_url"; image_url: { url: string } }
			| { type: "video_url"; video_url: { url: string } }
	  >;

interface OpenAIMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: OpenAIContent;
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

	async *chatStream(
		request: ChatRequest,
		signal?: AbortSignal,
	): AsyncGenerator<ChatStreamEvent> {
		const baseUrl = (this.config.baseUrl ?? "https://api.openai.com").replace(
			/\/$/,
			"",
		);
		const headers = buildOpenAIHeaders(baseUrl, this.config.apiKey);
		const timeoutSignal = AbortSignal.timeout(90_000);
		const requestSignal = signal
			? AbortSignal.any([signal, timeoutSignal])
			: timeoutSignal;
		const res = await fetch(`${baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model: request.model ?? this.config.model,
				messages: request.messages.map((m) => this.toOpenAIMessage(m)),
				tools: request.tools?.map((t) => t),
				tool_choice: request.toolChoice ?? "auto",
				temperature: request.temperature ?? 0.4,
				max_tokens: request.maxTokens ?? 2048,
				stream: true,
			}),
			signal: requestSignal,
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`OpenAI request failed: ${res.status} ${res.statusText} — ${text.slice(0, 500)}`,
			);
		}

		if (!res.body) throw new Error("OpenAI returned an empty response body");

		if (!res.headers.get("content-type")?.includes("text/event-stream")) {
			const data = await parseCompletion(res);
			yield* responseToStreamEvents(data);
			return;
		}

		yield* parseOpenAIStream(res.body);
	}

	async chat(request: ChatRequest): Promise<ChatResponse> {
		const baseUrl = (this.config.baseUrl ?? "https://api.openai.com").replace(
			/\/$/,
			"",
		);
		const headers = buildOpenAIHeaders(baseUrl, this.config.apiKey);

		const body = {
			model: request.model ?? this.config.model,
			messages: request.messages.map((m) => this.toOpenAIMessage(m)),
			tools: request.tools?.map((t) => t),
			tool_choice: request.toolChoice ?? "auto",
			temperature: request.temperature ?? 0.4,
			max_tokens: request.maxTokens ?? 2048,
			stream: false,
		};

		const res = await fetch(`${baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			// Hard ceiling so a hung upstream provider cannot hold a server
			// worker indefinitely (resource exhaustion / DoS). 90s is generous
			// enough for a single non-streaming chat completion with tools.
			signal: AbortSignal.timeout(90_000),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(
				`OpenAI request failed: ${res.status} ${res.statusText} — ${text.slice(0, 500)}`,
			);
		}

		const data = await parseCompletion(res);
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
				content:
					typeof m.content === "string" ? m.content : JSON.stringify(m.content),
				tool_call_id: m.toolCallId,
				name: m.name,
			};
		}
		if (m.role === "assistant" && m.toolCalls?.length) {
			return {
				role: "assistant",
				content: typeof m.content === "string" && m.content ? m.content : null,
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
		// Pass through multimodal content (text + image_url parts) as-is;
		// OpenAI's API accepts the same array shape our ChatMessage uses.
		return { role: m.role, content: m.content as OpenAIContent };
	}
}

/** A single OpenAI streaming chunk (the `data: {...}` payload). */
interface OpenAIStreamChunk {
	choices?: Array<{
		delta?: {
			content?: string | null;
			tool_calls?: Array<{
				index?: number;
				id?: string;
				function?: { name?: string; arguments?: string };
			}>;
		};
		message?: OpenAIMessage;
		finish_reason?: string | null;
	}>;
	usage?: OpenAIResponse["usage"];
}

/**
 * Parse an OpenAI-compatible chat completion response.
 *
 * The happy path is a single JSON object (the non-streaming default). But
 * some OpenAI-compatible gateways/tunnels stream the reply as SSE
 * (`data: {...}\n\n ... data: [DONE]`) or NDJSON even when `stream:false`
 * is requested. In that case `response.json()` throws "Unexpected
 * non-whitespace character after JSON" once it hits the second chunk, so we
 * read the body as text and, if it isn't a single object, reassemble the
 * streamed delta chunks into one `OpenAIResponse`.
 */
async function parseCompletion(res: Response): Promise<OpenAIResponse> {
	const raw = (await res.text()).trim();
	if (!raw) {
		throw new Error("Provider returned an empty response body");
	}

	// Fast path: a single JSON object.
	if (raw.startsWith("{")) {
		try {
			return JSON.parse(raw) as OpenAIResponse;
		} catch {
			// Fall through — the body may be a stream that happens to start
			// with a chunk, or have leading noise. Reassemble below.
		}
	}

	// Streaming path: reassemble SSE / NDJSON delta chunks.
	let content = "";
	let finishReason = "stop";
	let usage: OpenAIResponse["usage"];
	// Accumulate tool-call fragments by their streaming index — `arguments`
	// arrives as a concatenation of partial JSON strings across chunks.
	const toolAcc = new Map<number, { id: string; name: string; args: string }>();

	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const jsonStr = trimmed.startsWith("data:")
			? trimmed.slice(5).trim()
			: trimmed;
		if (!jsonStr || jsonStr === "[DONE]") continue;

		let chunk: OpenAIStreamChunk;
		try {
			chunk = JSON.parse(jsonStr) as OpenAIStreamChunk;
		} catch {
			continue; // skip keep-alive comments / malformed lines
		}

		if (chunk.usage) usage = chunk.usage;
		const choice = chunk.choices?.[0];
		if (!choice) continue;
		if (choice.finish_reason) finishReason = choice.finish_reason;

		// Streaming responses carry `delta`; a non-streamed-but-line-delimited
		// body carries the full `message`.
		if (choice.message) {
			if (typeof choice.message.content === "string") {
				content += choice.message.content;
			}
			for (const tc of choice.message.tool_calls ?? []) {
				const idx = toolAcc.size;
				toolAcc.set(idx, {
					id: tc.id,
					name: tc.function.name,
					args: tc.function.arguments,
				});
			}
			continue;
		}

		const delta = choice.delta;
		if (!delta) continue;
		if (typeof delta.content === "string") content += delta.content;
		for (const tc of delta.tool_calls ?? []) {
			const idx = tc.index ?? 0;
			const cur = toolAcc.get(idx) ?? { id: "", name: "", args: "" };
			if (tc.id) cur.id = tc.id;
			if (tc.function?.name) cur.name = tc.function.name;
			if (tc.function?.arguments) cur.args += tc.function.arguments;
			toolAcc.set(idx, cur);
		}
	}

	const tool_calls: OpenAIToolCall[] = [...toolAcc.values()]
		.filter((t) => t.name)
		.map((t) => ({
			id: t.id || crypto.randomUUID(),
			type: "function" as const,
			function: { name: t.name, arguments: t.args || "{}" },
		}));

	if (!content && tool_calls.length === 0) {
		throw new Error(
			"Could not parse a completion from the provider's streamed response",
		);
	}

	return {
		choices: [
			{
				index: 0,
				message: {
					role: "assistant",
					content: content || null,
					tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
				},
				finish_reason: finishReason,
			},
		],
		usage,
	};
}

async function* parseOpenAIStream(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let finishReason = "stop";
	let usage: OpenAIResponse["usage"];
	const toolAcc = new Map<number, { id: string; name: string; args: string }>();

	const emitChunk = function* (chunk: OpenAIStreamChunk) {
		if (chunk.usage) usage = chunk.usage;
		const choice = chunk.choices?.[0];
		if (!choice) return;
		if (choice.finish_reason) finishReason = choice.finish_reason;
		if (choice.message) {
			if (typeof choice.message.content === "string") {
				yield {
					type: "delta",
					delta: choice.message.content,
				} satisfies ChatStreamEvent;
			}
			for (const toolCall of choice.message.tool_calls ?? []) {
				const index = toolAcc.size;
				toolAcc.set(index, {
					id: toolCall.id,
					name: toolCall.function.name,
					args: toolCall.function.arguments,
				});
			}
			return;
		}

		const delta = choice.delta;
		if (typeof delta?.content === "string") {
			yield { type: "delta", delta: delta.content } satisfies ChatStreamEvent;
		}
		for (const toolCall of delta?.tool_calls ?? []) {
			const index = toolCall.index ?? 0;
			const current = toolAcc.get(index) ?? { id: "", name: "", args: "" };
			if (toolCall.id) current.id = toolCall.id;
			if (toolCall.function?.name) current.name = toolCall.function.name;
			if (toolCall.function?.arguments) {
				current.args += toolCall.function.arguments;
			}
			toolAcc.set(index, current);
		}
	};

	const emitPayload = function* (payload: string) {
		if (!payload || payload === "[DONE]") return;
		try {
			yield* emitChunk(JSON.parse(payload) as OpenAIStreamChunk);
		} catch {
			// Ignore keep-alive comments and malformed provider lines.
		}
	};

	try {
		let done = false;
		while (!done) {
			const { value, done: readerDone } = await reader.read();
			if (readerDone) break;
			buffer += decoder.decode(value, { stream: true });
			const events = buffer.split("\n\n");
			buffer = events.pop() ?? "";

			for (const event of events) {
				for (const line of event.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					yield* emitPayload(trimmed.slice(5).trim());
					if (trimmed === "data: [DONE]") done = true;
				}
			}
		}

		buffer += decoder.decode();
		for (const line of buffer.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("data:")) continue;
			yield* emitPayload(trimmed.slice(5).trim());
		}
	} finally {
		reader.releaseLock();
	}

	const toolCalls: ToolCall[] = [...toolAcc.values()]
		.filter((toolCall) => toolCall.name)
		.map((toolCall) => ({
			id: toolCall.id || crypto.randomUUID(),
			name: toolCall.name,
			arguments: safeJson(toolCall.args || "{}"),
		}));
	if (toolCalls.length > 0) {
		yield { type: "tool-calls", toolCalls };
	}
	yield {
		type: "done",
		usage: usage
			? {
					promptTokens: usage.prompt_tokens,
					completionTokens: usage.completion_tokens,
					totalTokens: usage.total_tokens,
				}
			: undefined,
		finishReason,
	};
}

function* responseToStreamEvents(
	data: OpenAIResponse,
): Generator<ChatStreamEvent> {
	const choice = data.choices?.[0];
	if (!choice) throw new Error("OpenAI returned no choices");
	if (typeof choice.message.content === "string") {
		yield { type: "delta", delta: choice.message.content };
	}
	const toolCalls = (choice.message.tool_calls ?? []).map((toolCall) => ({
		id: toolCall.id,
		name: toolCall.function.name,
		arguments: safeJson(toolCall.function.arguments),
	}));
	if (toolCalls.length > 0) yield { type: "tool-calls", toolCalls };
	yield {
		type: "done",
		usage: data.usage
			? {
					promptTokens: data.usage.prompt_tokens,
					completionTokens: data.usage.completion_tokens,
					totalTokens: data.usage.total_tokens,
				}
			: undefined,
		finishReason: choice.finish_reason ?? "stop",
	};
}

function buildOpenAIHeaders(
	baseUrl: string,
	apiKey?: string,
): Record<string, string> {
	if (!apiKey?.trim() && baseUrl === "https://api.openai.com") {
		throw new Error(
			"OpenAI provider requires OPENAI_API_KEY. Set it in your env.",
		);
	}

	const headers: Record<string, string> = {
		"content-type": "application/json",
	};
	if (apiKey?.trim()) headers.authorization = `Bearer ${apiKey.trim()}`;
	return headers;
}

function safeJson(raw: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		// Model sent valid JSON but not an object (e.g. a string or
		// number). Return empty so the tool executor can report the
		// missing required parameters.
		console.warn("[openai] tool arguments not an object:", typeof parsed);
		return {};
	} catch (err) {
		// Model sent invalid JSON. Log it so we can debug format issues,
		// and return empty so the tool executor reports missing params.
		console.warn(
			"[openai] failed to parse tool arguments:",
			err,
			raw.slice(0, 200),
		);
		return {};
	}
}
