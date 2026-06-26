/**
 * LLM provider abstraction for Artidor AI.
 *
 * Supports three backends out of the box:
 * - "openai"      — OpenAI Chat Completions (also works with any OpenAI-compatible
 *                   endpoint such as Together, Groq, OpenRouter, LM Studio,
 *                   llama.cpp's server, etc. via the `baseUrl` env override).
 * - "anthropic"   — Anthropic Messages API.
 * - "ollama"      — Local Ollama instance (no API key required).
 *
 * Selection is driven entirely by env vars. None of the keys are required;
 * an unconfigured server just returns 501 from the chat route so the UI can
 * show a "configure your AI provider" hint. This keeps the rest of the
 * app functional when no key is set.
 */

export type ProviderName = "openai" | "anthropic" | "ollama";

export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

/**
 * Content part for multimodal messages. Text-only messages use a plain
 * string; vision-capable providers accept an array of text + image parts.
 */
export type ChatMessageContent =
	| string
	| Array<
			| { type: "text"; text: string }
			| { type: "image_url"; image_url: { url: string } }
	>;

export interface ChatMessage {
	role: ChatMessageRole;
	/**
	 * Message content. Plain string for text-only messages, or an
	 * array of text/image parts for multimodal (vision) messages.
	 */
	content: ChatMessageContent;
	/** When role === "tool" the id of the tool call we are replying to. */
	toolCallId?: string;
	/** When role === "assistant" the tool calls the model asked for. */
	toolCalls?: ToolCall[];
	/** For OpenAI / Ollama providers we can also echo the tool name. */
	name?: string;
}

export interface ToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		/** JSON Schema for the parameters object. */
		parameters: {
			type: "object";
			properties: Record<string, unknown>;
			required?: string[];
			additionalProperties?: boolean;
		};
	};
}

export interface ToolCall {
	id: string;
	name: string;
	/** Parsed JSON arguments — the LLM is expected to emit valid JSON. */
	arguments: Record<string, unknown>;
}

export interface ChatRequest {
	model?: string;
	messages: ChatMessage[];
	tools?: ToolDefinition[];
	/** Optional sampling overrides. */
	temperature?: number;
	maxTokens?: number;
	/** Force a particular tool call (provider-specific). */
	toolChoice?:
		| "auto"
		| "none"
		| "any"
		| { type: "function"; function: { name: string } };
}

export interface ChatResponse {
	message: ChatMessage;
	/** Token usage when the provider reports it. */
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	/** Convenience: a flattened list of tool calls. */
	toolCalls: ToolCall[];
	finishReason: string;
}

/** A snapshot of the editor + telemetry the LLM should see at request time. */
export interface ChatContext {
	projectName?: string;
	duration?: number;
	fps?: number | import("./style/types").FrameRate;
	canvasSize?: { width: number; height: number };
	trackSummary?: Array<{
		type: string;
		elementCount: number;
	}>;
	recentCommands?: Array<{
		command: string;
		timestamp: number;
		args?: Record<string, unknown>;
	}>;
	styleProfile?: unknown;
}

/** Provider-specific configuration resolved at request time. */
export interface ProviderConfig {
	provider: ProviderName;
	model: string;
	apiKey?: string;
	baseUrl?: string;
}

export interface LLMProvider {
	name: ProviderName;
	chat(request: ChatRequest): Promise<ChatResponse>;
}

/* -------------------------------------------------------------------------- */
/*                                  Resolver                                  */
/* -------------------------------------------------------------------------- */

/**
 * Resolve which provider + model to use for this request. The resolution
 * order is:
 *  1. `AI_PROVIDER` env (overrides everything).
 *  2. The first provider that has its required credentials set.
 *  3. `null` — caller should respond with 501 "not configured".
 */
export function resolveProvider(): ProviderConfig | null {
	const forced = process.env.AI_PROVIDER?.toLowerCase() as
		| ProviderName
		| undefined;

	if (forced === "openai") {
		return {
			provider: "openai",
			model: process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
			apiKey: process.env.OPENAI_API_KEY,
			baseUrl: process.env.OPENAI_BASE_URL,
		};
	}
	if (forced === "anthropic") {
		return {
			provider: "anthropic",
			model:
				process.env.AI_MODEL ??
				process.env.ANTHROPIC_MODEL ??
				"claude-3-5-sonnet-latest",
			apiKey: process.env.ANTHROPIC_API_KEY,
			baseUrl: process.env.ANTHROPIC_BASE_URL,
		};
	}
	if (forced === "ollama") {
		return {
			provider: "ollama",
			model: process.env.AI_MODEL ?? process.env.OLLAMA_MODEL ?? "llama3.1",
			baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
		};
	}

	if (process.env.ANTHROPIC_API_KEY) {
		return {
			provider: "anthropic",
			model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
			apiKey: process.env.ANTHROPIC_API_KEY,
		};
	}
	if (process.env.OPENAI_API_KEY) {
		return {
			provider: "openai",
			model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
			apiKey: process.env.OPENAI_API_KEY,
			baseUrl: process.env.OPENAI_BASE_URL,
		};
	}
	if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
		return {
			provider: "ollama",
			model: process.env.OLLAMA_MODEL ?? "llama3.1",
			baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
		};
	}
	return null;
}
