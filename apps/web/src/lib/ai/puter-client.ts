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
	"whisper", "audio", "music", "suno", "udio",
];

function matchAny(id: string, patterns: string[]): boolean {
	return patterns.some((p) => id.toLowerCase().includes(p));
}

/**
 * Filter a list of Puter models into video/image/audio categories.
 * This is a pure function — no network calls.
 */
function filterMediaModels(all: PuterModel[]): {
	video: PuterModel[];
	image: PuterModel[];
	audio: PuterModel[];
} {
	return {
		video: all.filter((m) => matchAny(m.id, VIDEO_PATTERNS)),
		image: all.filter((m) => matchAny(m.id, IMAGE_PATTERNS)),
		audio: all.filter((m) => matchAny(m.id, AUDIO_PATTERNS)),
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
 * Convert the internal ChatMessage[] to the format Puter.js expects.
 * Puter uses the same OpenAI-style message format, but tool calls and
 * tool results use slightly different field names.
 */
function toPuterMessages(messages: unknown[]): unknown[] {
	return messages.map((msg) => {
		const m = msg as Record<string, unknown>;
		// Tool result messages: map toolCallId → tool_call_id
		if (m.role === "tool") {
			return {
				role: "tool",
				tool_call_id: m.toolCallId,
				content: m.content,
			};
		}
		// Assistant messages with tool calls: map toolCalls → tool_calls
		if (m.role === "assistant" && Array.isArray(m.toolCalls)) {
			return {
				role: "assistant",
				content: m.content,
				tool_calls: (m.toolCalls as Array<{ id: string; name: string; arguments: unknown }>).map(
					(tc) => ({
						id: tc.id,
						type: "function",
						function: {
							name: tc.name,
							arguments:
								typeof tc.arguments === "string"
									? tc.arguments
									: JSON.stringify(tc.arguments),
						},
					}),
				),
			};
		}
		return m;
	});
}

/**
 * Stream a chat completion from Puter.js, yielding normalized chunks.
 *
 * @param messages - The conversation messages in internal ChatMessage format.
 * @param model - The Puter model id (e.g. "gpt-4o-mini").
 * @param tools - Optional array of tool definitions (OpenAI function format).
 * @param signal - Optional AbortSignal to cancel the stream.
 */
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

	const options: Record<string, unknown> = {
		model,
		stream: true,
	};
	if (tools && tools.length > 0) {
		options.tools = tools;
	}

	const response = await puter.ai.chat(toPuterMessages(messages), options);

	for await (const part of response) {
		if (signal?.aborted) {
			yield { done: true };
			return;
		}

		if (part.type === "text" && part.text) {
			yield { delta: part.text };
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
