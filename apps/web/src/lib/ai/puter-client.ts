/**
 * Puter.js client-side AI provider.
 *
 * Puter.js runs entirely in the browser — no server API key needed.
 * The SDK is loaded dynamically from https://js.puter.com/v2/ and
 * cached on `window.puter`. This module provides helpers to:
 *
 *  1. Load the SDK (idempotent — safe to call multiple times).
 *  2. Fetch available models via `puter.ai.listModels()`.
 *  3. Stream chat completions via `puter.ai.chat()` with tool support.
 *
 * The streaming interface mirrors the server's SSE format so the
 * AIManager can consume Puter responses with the same code path
 * it uses for the `/api/ai/chat` endpoint.
 */

/** Minimal Puter.js type surface — the SDK is untyped. */
interface PuterChatChunk {
	type?: string;
	text?: string;
	name?: string;
	input?: unknown;
	id?: string;
	message?: string;
}

interface PuterModel {
	id: string;
	provider: string;
	name?: string;
}

interface PuterAI {
	chat: (
		messages: unknown,
		options?: Record<string, unknown>,
	) => Promise<AsyncIterable<PuterChatChunk>>;
	listModels: () => Promise<PuterModel[]>;
	txt2vid: (
		prompt: string,
		options?: Record<string, unknown>,
	) => Promise<PuterGenResult>;
	txt2img: (
		prompt: string,
		options?: Record<string, unknown>,
	) => Promise<PuterGenResult>;
	txt2speech: (
		text: string,
		options?: Record<string, unknown>,
	) => Promise<PuterGenResult>;
}

/**
 * Result shape from Puter.js generation APIs (txt2vid, txt2img, txt2speech).
 * The SDK returns an object with at least a `src` field (a URL or data URI
 * to the generated media) and sometimes a `name` / `mimeType`.
 */
interface PuterGenResult {
	src?: string;
	url?: string;
	name?: string;
	mimeType?: string;
	toString(): string;
}

interface PuterSDK {
	ai: PuterAI;
}

declare global {
	interface Window {
		puter?: PuterSDK;
	}
}

const PUTER_SDK_URL = "https://js.puter.com/v2/";

/** Tracks the in-flight SDK load so concurrent callers share one promise. */
let sdkLoadPromise: Promise<PuterSDK> | null = null;

/**
 * Load the Puter.js SDK if not already loaded. Idempotent — concurrent
 * callers share the same loading promise. Once loaded, `window.puter`
 * is cached and subsequent calls return immediately.
 *
 * @throws Error if the SDK fails to load (network error, CSP block, etc.)
 */
export function loadPuterSDK(): Promise<PuterSDK> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("Puter.js requires a browser environment"));
	}
	if (window.puter) return Promise.resolve(window.puter);
	if (sdkLoadPromise) return sdkLoadPromise;

	sdkLoadPromise = new Promise<PuterSDK>((resolve, reject) => {
		// Check if a script tag already exists (e.g. injected by another
		// component). If so, attach listeners rather than creating a duplicate.
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${PUTER_SDK_URL}"]`,
		);
		if (existing) {
			// If the script already fired its load event, window.puter
			// should be set. If not, wait for it.
			if (window.puter) {
				resolve(window.puter);
				return;
			}
			existing.addEventListener("load", () => {
				if (window.puter) resolve(window.puter);
				else reject(new Error("Puter.js script loaded but window.puter is undefined"));
			});
			existing.addEventListener("error", () =>
				reject(new Error("Failed to load Puter.js SDK from existing script tag")),
			);
			return;
		}

		const script = document.createElement("script");
		script.src = PUTER_SDK_URL;
		script.async = true;
		script.onload = () => {
			if (window.puter) {
				resolve(window.puter);
			} else {
				reject(
					new Error(
						"Puter.js script loaded but window.puter is undefined — the SDK may be blocked by CSP or a network issue",
					),
				);
			}
		};
		script.onerror = () => {
			reject(
				new Error(
					"Failed to load Puter.js SDK — check your network connection or Content Security Policy settings",
				),
			);
		};
		document.head.appendChild(script);
	});

	// Clear the promise on failure so retries can attempt to load again.
	sdkLoadPromise.catch(() => {
		sdkLoadPromise = null;
	});

	return sdkLoadPromise;
}

/**
 * In-memory cache for the Puter model list. The model list rarely
 * changes within a session, so we cache it to avoid re-fetching
 * every time the provider dialog reopens. The cache expires after
 * 5 minutes to pick up newly added models.
 */
let cachedModels: PuterModel[] | null = null;
let cachedModelsAt = 0;
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the list of available models from Puter.js.
 * Results are cached for 5 minutes to avoid repeated network calls.
 * @throws Error if the SDK is not loaded or listModels fails.
 */
export async function fetchPuterModels(): Promise<PuterModel[]> {
	const now = Date.now();
	if (cachedModels && now - cachedModelsAt < MODEL_CACHE_TTL) {
		return cachedModels;
	}
	const puter = await loadPuterSDK();
	if (!puter.ai?.listModels) {
		throw new Error("Puter.js SDK loaded but listModels() is not available");
	}
	const models = await puter.ai.listModels();
	cachedModels = models;
	cachedModelsAt = now;
	return models;
}

/**
 * Media model filter patterns. Used by both fetchPuterMediaModels()
 * and fetchPuterModelsAndMedia() to classify models by generation type.
 */
const VIDEO_PATTERNS = [
	"sora", "seedance", "kling", "minimax", "luma",
	"runway", "pika", "hunyuan", "vidu", "wan",
];
const IMAGE_PATTERNS = [
	"dall-e", "flux", "gpt-image", "stable-diffusion",
	"ideogram", "recraft", "imagen", "sdxl", "playground",
];
const AUDIO_PATTERNS = [
	"tts", "speech", "polly", "bark", "elevenlabs",
	"whisper", "audio", "suno", "udio",
];
const MEDIA_PATTERNS = [
	"music", "suno", "udio", "stable-audio",
	"media", "generate", "gen",
];

function matchAny(id: string, patterns: string[]): boolean {
	return patterns.some((p) => id.toLowerCase().includes(p));
}

/**
 * Filter a list of Puter models into video/image/audio/media categories.
 * This is a pure function — no network calls.
 */
function filterMediaModels(all: PuterModel[]): {
	video: PuterModel[];
	image: PuterModel[];
	audio: PuterModel[];
	media: PuterModel[];
} {
	return {
		video: all.filter((m) => matchAny(m.id, VIDEO_PATTERNS)),
		image: all.filter((m) => matchAny(m.id, IMAGE_PATTERNS)),
		audio: all.filter((m) => matchAny(m.id, AUDIO_PATTERNS)),
		media: all.filter((m) => matchAny(m.id, MEDIA_PATTERNS)),
	};
}

/**
 * Fetch media generation models from Puter.js. Puter.js doesn't have a
 * separate API for listing media models, so we fetch all models and
 * filter by known media-generation provider prefixes and model name
 * patterns. This covers txt2vid, txt2img, and txt2speech models.
 *
 * @returns Filtered list of media-capable models.
 */
export async function fetchPuterMediaModels(): Promise<{
	video: PuterModel[];
	image: PuterModel[];
	audio: PuterModel[];
	media: PuterModel[];
}> {
	const all = await fetchPuterModels();
	return filterMediaModels(all);
}

/**
 * Fetch both chat models and media models in a single listModels() call.
 * This avoids the double-fetch that happens when calling
 * fetchPuterModels() and fetchPuterMediaModels() in parallel (each
 * makes its own listModels() request).
 *
 * @returns Chat models + filtered media models from a single API call.
 */
export async function fetchPuterModelsAndMedia(): Promise<{
	models: PuterModel[];
	mediaModels: {
		video: PuterModel[];
		image: PuterModel[];
		audio: PuterModel[];
		media: PuterModel[];
	};
}> {
	// Use the cached fetch — avoids a redundant listModels() call
	// when the dialog reopens within 5 minutes.
	const all = await fetchPuterModels();
	return {
		models: all,
		mediaModels: filterMediaModels(all),
	};
}

/**
 * Stream a chat completion from Puter.js. Returns an async iterable of
 * normalized chunks that the AIManager can consume with the same logic
 * it uses for the server SSE stream.
 *
 * Each yielded chunk has the shape:
 *   { delta?: string, toolCalls?: ToolCallRound[], done?: boolean, error?: string }
 *
 * This mirrors the server's SSE event format so the consumer code
 * stays unified.
 */
export interface PuterStreamChunk {
	delta?: string;
	toolCalls?: Array<{
		id: string;
		name: string;
		arguments: Record<string, unknown>;
	}>;
	done?: boolean;
	error?: string;
}

/**
 * Models that stream tool calls as XML text instead of native `tool_use`
 * events. For these models we drop the native `tools` option and convert the
 * conversation history to plain user/assistant text so the Puter API doesn't
 * reject the follow-up request after a tool call.
 */
const TEXT_BASED_TOOL_MODELS = ["minimax"];

function isTextBasedToolModel(model: string): boolean {
	const lower = model.toLowerCase();
	return TEXT_BASED_TOOL_MODELS.some((pattern) => lower.includes(pattern));
}

/**
 * Convert the internal ChatMessage[] to the format Puter.js expects.
 * Puter uses the same OpenAI-style message format, but tool calls and
 * tool results use slightly different field names.
 *
 * For text-based models (e.g. MiniMax), we also convert the tool-calling
 * history into plain user/assistant messages. The Puter API for these
 * models doesn't accept native `tool`/`tool_calls` roles, so we describe
 * the tool calls and their results in text.
 */
function toPuterMessages(messages: unknown[], model: string): unknown[] {
	const textBased = isTextBasedToolModel(model);
	const out: unknown[] = [];

	for (const msg of messages) {
		const m = msg as Record<string, unknown>;

		if (m.role === "tool") {
			if (textBased) {
				// Convert tool result to a user message so text-based models
				// can see the outcome without native tool roles.
				const name = String(m.toolName ?? "tool");
				const content = String(m.content ?? "");
				out.push({
					role: "user",
					content: `Tool result for ${name}: ${content}`,
				});
				continue;
			}
			// Tool result messages: map toolCallId → tool_call_id
			out.push({
				role: "tool",
				tool_call_id: m.toolCallId,
				content: m.content,
			});
			continue;
		}

		if (m.role === "assistant" && Array.isArray(m.toolCalls)) {
			const toolCalls = m.toolCalls as Array<{
				id: string;
				name: string;
				arguments: unknown;
			}>;
			if (textBased) {
				// Text-based models don't accept native tool_calls. Keep the
				// assistant's visible text as-is; the tool results are sent
				// as user messages so the model can see the outcomes.
				out.push({ role: "assistant", content: m.content });
				continue;
			}
			// Assistant messages with tool calls: map toolCalls → tool_calls
			out.push({
				role: "assistant",
				content: m.content,
				tool_calls: toolCalls.map((tc) => ({
					id: tc.id,
					type: "function",
					function: {
						name: tc.name,
						arguments:
							typeof tc.arguments === "string"
								? tc.arguments
								: JSON.stringify(tc.arguments),
					},
				})),
			});
			continue;
		}

		// For text-based models, rewrite the system prompt so the model knows
		// it must emit XML tool calls instead of native function calls.
		if (textBased && m.role === "system" && typeof m.content === "string") {
			out.push({
				role: "system",
				content: rewriteSystemPromptForTextTools(m.content),
			});
			continue;
		}

		out.push(m);
	}

	return out;
}

/**
 * Patch the system prompt for text-based models. We append a clear
 * XML-based instruction at the end so it overrides the earlier
 * native function-calling instructions. Regex replacement is kept as
 * a best-effort cleanup but the appended block is the source of truth.
 */
function rewriteSystemPromptForTextTools(content: string): string {
	const cleaned = content
		.replace(
			/Call tools using the standard function-calling API\.[^\n]*\n/,
			"This model does not support native function calling. Emit tool calls as XML tags exactly like this:\n",
		)
		.replace(
			/- Do NOT wrap tool calls in markdown code blocks or <tool> tags\. Use the native function-calling mechanism\.\n/,
			"- Wrap every tool call in XML tags.\n- Example: <tool_call><invoke name=\"tool_name\"><parameter name=\"arg_name\">value</parameter></invoke></tool_call>\n",
		);

	const xmlInstruction = `

# IMPORTANT: tool calling format for this model
This model does not support the native function-calling API. You MUST emit tool calls as XML tags in your response text, exactly like this:

<tool_call>
<invoke name="EXACT_TOOL_NAME_FROM_TABLE">
<parameter name="param_name">value</parameter>
</invoke>
</tool_call>

Rules:
- Use the EXACT tool name from the tool table above.
- Wrap each tool call in its own <tool_call> block.
- Parameter values must match the expected type (string, number, boolean).
- Do not wrap the XML in markdown code blocks.
- After the XML, you may briefly tell the user what you did in plain text.
`;

	return cleaned + xmlInstruction;
}

/**
 * Stream a chat completion from Puter.js, yielding normalized chunks.
 *
 * @param messages - The conversation messages in internal ChatMessage format.
 * @param model - The Puter model id (e.g. "gpt-4o-mini").
 * @param tools - Optional array of tool definitions (OpenAI function format).
 * @param signal - Optional AbortSignal to cancel the stream.
 */
/**
 * Parse text-based tool calls from models that don't support native
 * function calling (e.g. MiniMax via Puter.js). These models emit
 * XML-like tags in their text output instead of using the tool_use
 * stream event.
 *
 * Supported formats:
 *   <tool_call>
 *   <invoke name="tool_name">
 *   <parameter name="param_name">value</parameter>
 *   </invoke>
 *   </tool_call>
 *
 * Also handles provider-specific wrappers (e.g. <minimax>) and the
 * simpler form:
 *   <tool_call name="tool_name">{"arg": "value"}</tool_call>
 *
 * @returns An array of parsed tool calls. The caller is responsible
 *          for stripping the matched XML from the displayed text.
 */
function parseTextToolCalls(text: string): Array<{
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}> {
	const calls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];

	// Match any <tool_call> block, including nested provider wrappers
	// like <minimax>. Use a lazy match for the inner content.
	const toolCallRegex = /<tool_call[^>]*>([\s\S]*?)<\/tool_call>/g;
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = toolCallRegex.exec(text)) !== null) {
		const block = match[1];

		// Find the inner <invoke name="..."> block.
		const invokeMatch = /<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>/g.exec(block);
		if (invokeMatch) {
			const name = invokeMatch[1];
			const body = invokeMatch[2];
			const args: Record<string, unknown> = {};
			const paramRegex = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g;
			let paramMatch: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
			while ((paramMatch = paramRegex.exec(body)) !== null) {
				const paramName = paramMatch[1];
				let paramValue: unknown = paramMatch[2].trim();
				try {
					paramValue = JSON.parse(paramValue as string);
				} catch {
					// Keep as string if it's not valid JSON
				}
				args[paramName] = paramValue;
			}
			calls.push({
				id: crypto.randomUUID(),
				name,
				arguments: args,
			});
			continue;
		}

		// Fallback: look for any inner tag with name="..." (handles
		// provider wrappers like <minimax name="list_assets">).
		const namedTagMatch = /<([a-zA-Z0-9_]+)\s+name="([^"]+)">([\s\S]*?)<\/\1>/g.exec(block);
		if (namedTagMatch) {
			const name = namedTagMatch[2];
			const body = namedTagMatch[3];
			const args: Record<string, unknown> = {};
			const paramRegex = /<parameter\s+name="([^"]+)">([\s\S]*?)<\/parameter>/g;
			let paramMatch: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
			while ((paramMatch = paramRegex.exec(body)) !== null) {
				const paramName = paramMatch[1];
				let paramValue: unknown = paramMatch[2].trim();
				try {
					paramValue = JSON.parse(paramValue as string);
				} catch {
					// Keep as string if it's not valid JSON
				}
				args[paramName] = paramValue;
			}
			calls.push({
				id: crypto.randomUUID(),
				name,
				arguments: args,
			});
			continue;
		}

		// Fallback: simpler <tool_call name="...">{json}</tool_call>
		const simpleNameMatch = /<tool_call\s+name="([^"]+)">([\s\S]*?)<\/tool_call>/.exec(match[0]);
		if (simpleNameMatch) {
			let args: Record<string, unknown> = {};
			try {
				args = JSON.parse(simpleNameMatch[2].trim());
			} catch {
				// Keep empty args if JSON parse fails
			}
			calls.push({
				id: crypto.randomUUID(),
				name: simpleNameMatch[1],
				arguments: args,
			});
		}
	}

	return calls;
}

/**
 * Strip text-based tool call XML tags from the displayed text.
 * Removes the entire <tool_call> block including any nested tags.
 * Also strips any remaining angle-bracket tags that look like XML
 * so the chat bubble stays clean.
 */
function stripToolCallXml(text: string): string {
	// Apply replacements repeatedly until stable to prevent
	// incomplete multi-character sanitization (e.g. "<scri<script>pt>"
	// collapsing to "<script>" after a single pass).
	let previous: string;
	let current = text;
	do {
		previous = current;
		current = current
			.replace(/<tool_call[^>]*>[\s\S]*?<\/tool_call>/g, "")
			.replace(/<invoke\s+name="[^"]+">[\s\S]*?<\/invoke>/g, "")
			.replace(/<parameter\s+name="[^"]+">[\s\S]*?<\/parameter>/g, "")
			.replace(/<\/?[a-zA-Z0-9_]+(?:\s+[^>]*)?>/g, "");
	} while (current !== previous);
	return current.trim();
}

/**
 * Buffered text stream parser. Accumulates text chunks and detects
 * tool call XML tags that may span multiple chunks. Yields clean
 * text deltas (with XML stripped) and tool calls when complete.
 */
class TextToolCallParser {
	private buffer = "";
	private yieldedLength = 0;

	/** Feed a new text chunk. Returns text to yield and/or tool calls. */
	feed(text: string): { delta?: string; toolCalls?: PuterStreamChunk["toolCalls"] } {
		this.buffer += text;

		// Check if we have complete tool_call blocks. We look for the
		// closing </tool_call> tag because the entire block is stripped
		// from the display anyway.
		const hasOpenTag = this.buffer.includes("<tool_call");
		const hasCloseTag = this.buffer.includes("</tool_call>");

		if (hasOpenTag && !hasCloseTag) {
			// Tool call is still being streamed — don't yield the partial XML.
			// Yield any text before the opening tag.
			const openIdx = this.buffer.indexOf("<tool_call");
			if (openIdx > this.yieldedLength) {
				const safeText = this.buffer.slice(this.yieldedLength, openIdx);
				this.yieldedLength = openIdx;
				if (safeText) return { delta: safeText };
			}
			return {};
		}

		if (hasOpenTag && hasCloseTag) {
			// Complete tool_call block(s) found — parse them and strip XML.
			const toolCalls = parseTextToolCalls(this.buffer);
			const openIdx = this.buffer.indexOf("<tool_call");
			let beforeText = "";
			if (openIdx > this.yieldedLength) {
				beforeText = this.buffer.slice(this.yieldedLength, openIdx);
			}
			const cleanText = stripToolCallXml(this.buffer);
			const newText = cleanText.slice(
				Math.min(this.yieldedLength, cleanText.length),
			);
			this.buffer = cleanText;
			this.yieldedLength = cleanText.length;

			const delta = (beforeText + newText).trim();
			return {
				delta: delta || undefined,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			};
		}

		// No tool call tags — yield the new text normally
		const newText = this.buffer.slice(this.yieldedLength);
		this.yieldedLength = this.buffer.length;
		return { delta: newText };
	}

	/** Flush any remaining buffered text at stream end. */
	flush(): { delta?: string; toolCalls?: PuterStreamChunk["toolCalls"] } {
		if (this.yieldedLength < this.buffer.length) {
			const toolCalls = parseTextToolCalls(this.buffer);
			if (toolCalls.length > 0) {
				const cleanText = stripToolCallXml(this.buffer);
				const remaining = cleanText.slice(this.yieldedLength).trim();
				return {
					delta: remaining || undefined,
					toolCalls,
				};
			}
			const remaining = this.buffer.slice(this.yieldedLength);
			this.yieldedLength = this.buffer.length;
			return { delta: remaining || undefined };
		}
		return {};
	}
}

export async function* streamPuterChat(
	messages: unknown[],
	model: string,
	tools?: Array<{ type: "function"; function: { name: string; description: string; parameters: unknown } }>,
	signal?: AbortSignal,
): AsyncGenerator<PuterStreamChunk> {
	const puter = await loadPuterSDK();
	if (!puter.ai?.chat) {
		throw new Error("Puter.js SDK loaded but chat() is not available");
	}

	const textBased = isTextBasedToolModel(model);
	console.log("[puter] chat start", { model, textBased, messageCount: messages.length, hasTools: Boolean(tools && tools.length > 0) });

	const options: Record<string, unknown> = {
		model,
		stream: true,
	};
	// Text-based models don't accept the native `tools` option; they parse
	// tool calls from XML text guided by the rewritten system prompt.
	if (tools && tools.length > 0 && !textBased) {
		options.tools = tools;
	}

	const puterMessages = toPuterMessages(messages, model);
	console.log("[puter] messages sent", JSON.stringify(puterMessages, null, 2));

	let response: AsyncIterable<PuterChatChunk>;
	try {
		response = await puter.ai.chat(puterMessages, options);
	} catch (err) {
		console.error("[puter] chat() threw", err);
		yield {
			error:
				err instanceof Error
					? `Puter.js chat error: ${err.message}`
					: "Puter.js chat failed",
		};
		return;
	}

	// Text tool call parser — handles models that emit XML-based tool
	// calls in text instead of using the native tool_use stream event.
	const textParser = new TextToolCallParser();

	for await (const part of response) {
		if (signal?.aborted) {
			yield { done: true };
			return;
		}

		if (part.type === "text" && part.text) {
			// Feed through the parser to detect and extract text-based
			// tool calls (e.g. minimax emits <tool_call> XML tags).
			const result = textParser.feed(part.text);
			if (result.delta) yield { delta: result.delta };
			if (result.toolCalls) yield { toolCalls: result.toolCalls };
		} else if (part.type === "tool_use" || (part.name && part.input)) {
			let args: Record<string, unknown>;
			if (typeof part.input === "string") {
				try {
					args = JSON.parse(part.input) as Record<string, unknown>;
				} catch {
					console.warn("[puter] failed to parse tool arguments:", part.input.slice(0, 200));
					args = {};
				}
			} else {
				args = part.input as Record<string, unknown>;
			}
			yield {
				toolCalls: [
					{
						id: part.id ?? crypto.randomUUID(),
						name: part.name ?? "",
						arguments: args,
					},
				],
			};
		} else if (part.type === "error" || part.message) {
			yield { error: part.message ?? "Unknown Puter.js stream error" };
			return;
		}
	}

	// Flush any remaining buffered text or incomplete tool calls
	const flushed = textParser.flush();
	if (flushed.delta) yield { delta: flushed.delta };
	if (flushed.toolCalls) yield { toolCalls: flushed.toolCalls };

	yield { done: true };
}

/* -------------------------------------------------------------------------- */
/*                          Media Generation Helpers                          */
/* -------------------------------------------------------------------------- */

/**
 * Extract a usable URL/string from a Puter.js generation result.
 * The SDK may return an object with `src`/`url`, or a plain string.
 */
function extractGenUrl(result: PuterGenResult): string {
	if (result.src) return result.src;
	if (result.url) return result.url;
	// Some Puter APIs return the URL directly as a string via toString().
	const str = String(result);
	if (str.startsWith("http") || str.startsWith("data:")) return str;
	throw new Error("Puter.js generation returned no usable URL");
}

/**
 * Generate a video clip from a text prompt using `puter.ai.txt2vid()`.
 *
 * @param prompt - Text description of the video to generate.
 * @param model - Video model id (e.g. "sora-2", "seedance-1.0-pro").
 * @param seconds - Optional clip length in seconds.
 * @returns The URL of the generated video.
 * @throws Error if the SDK is not loaded or generation fails.
 */
export async function puterTxt2Vid(
	prompt: string,
	model: string,
	seconds?: number,
): Promise<string> {
	const puter = await loadPuterSDK();
	if (!puter.ai?.txt2vid) {
		throw new Error("Puter.js SDK loaded but txt2vid() is not available");
	}
	const options: Record<string, unknown> = { model };
	if (seconds) options.seconds = seconds;
	const result = await puter.ai.txt2vid(prompt, options);
	return extractGenUrl(result);
}

/**
 * Generate an image from a text prompt using `puter.ai.txt2img()`.
 *
 * @param prompt - Text description of the image to generate.
 * @param model - Image model id (e.g. "dall-e-3", "gpt-image-1").
 * @returns The URL of the generated image.
 * @throws Error if the SDK is not loaded or generation fails.
 */
export async function puterTxt2Img(
	prompt: string,
	model: string,
): Promise<string> {
	const puter = await loadPuterSDK();
	if (!puter.ai?.txt2img) {
		throw new Error("Puter.js SDK loaded but txt2img() is not available");
	}
	const result = await puter.ai.txt2img(prompt, { model });
	return extractGenUrl(result);
}

/**
 * Convert text to speech using `puter.ai.txt2speech()`.
 *
 * @param text - The text to convert to speech (max 3000 characters).
 * @param model - Audio/TTS model id (e.g. "tts-1", "aws-polly").
 * @param voice - Optional voice id (provider-specific).
 * @returns The URL of the generated audio.
 * @throws Error if the SDK is not loaded or generation fails.
 */
export async function puterTxt2Speech(
	text: string,
	model: string,
	voice?: string,
): Promise<string> {
	const puter = await loadPuterSDK();
	if (!puter.ai?.txt2speech) {
		throw new Error("Puter.js SDK loaded but txt2speech() is not available");
	}
	const options: Record<string, unknown> = { model };
	if (voice) options.voice = voice;
	const result = await puter.ai.txt2speech(text, options);
	return extractGenUrl(result);
}
