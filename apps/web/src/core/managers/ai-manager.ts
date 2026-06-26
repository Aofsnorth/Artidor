/**
 * AI Manager — bridges the AI Edit panel and the rest of the editor.
 *
 * The manager owns:
 *  - The "send" entry point that talks to `/api/ai/chat` and dispatches
 *    the model's tool calls back into the EditorCore.
 *  - A live snapshot of the project that gets sent with every request
 *    so the LLM always has current state.
 *  - A subscription interface the React panel can use to track the
 *    current request (idle/streaming/awaiting-tools).
 *
 * It does NOT own:
 *  - The conversation history (that's `useAIStore`, the UI mirror).
 *  - The tool definitions or provider plumbing (those are server-side
 *    on the API route).
 *
 * The manager is constructed once by the EditorCore singleton and
 * shares the same `EditorCore` reference everyone else has.
 */

import type { EditorCore } from "@/core";
import type { ChatContext, ChatMessage } from "@/lib/ai/provider";
import { executeTool } from "@/lib/ai/tools/executor";
import { useTelemetryStore } from "@/lib/ai/telemetry/store";
import {
	useAIStore,
	type ChatMessage as UiChatMessage,
} from "@/stores/ai-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
	useAIProvidersStore,
	type ProviderKind,
	type AIProvider,
} from "@/stores/ai-providers-store";
import {
	streamPuterChat,
	puterTxt2Vid,
	puterTxt2Img,
	puterTxt2Speech,
} from "@/lib/ai/puter-client";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getFilteredToolDefinitions } from "@/lib/ai/tools/registry";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { getMcpConnectionManager, useMcpStore } from "@/stores/mcp-store";
import type { FrameRate } from "artidor-wasm";

/**
 * Auto-compaction thresholds. When the conversation exceeds either limit,
 * older messages are summarized and replaced by a compact system message
 * so the LLM's context window stays manageable on long sessions.
 */
const COMPACTION_TOKEN_THRESHOLD = 6000;

/**
 * A tool call as received from the LLM stream, with a stable id for
 * pairing with the subsequent `tool`-role result message.
 */
interface ToolCallRound {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

/**
 * Rough token estimate: ~4 characters per token. This is intentionally
 * conservative (overestimates slightly) so compaction triggers before
 * the context window is actually full.
 */
function estimateTokens(messages: { content: string }[]): number {
	return Math.ceil(
		messages.reduce((sum, m) => sum + m.content.length, 0) / 4,
	);
}

export interface SendOptions {
	/** Plain text the user typed. */
	text: string;
	/** Optional override of the assistant id (mostly for tests). */
	assistantMessageId?: string;
}

/**
 * Read the user's currently-active AI provider from the
 * `useAIProvidersStore` (a plain Zustand store, not React-bound) so
 * the chat request can include its baseUrl/apiKey/model. Returns
 * `null` when the user has no providers configured — in which case
 * the server falls back to its env-var provider.
 */
function getDefaultProvider(projectProviderId?: string | null): {
	baseUrl: string;
	apiKey: string;
	model: string;
	kind: ProviderKind;
	videoModel?: string;
	imageModel?: string;
	audioModel?: string;
	mediaModel?: string;
} | null {
	const state = useAIProvidersStore.getState();
	// If the project has a per-project provider override, try it first.
	// Fall back to the global default if the override provider no longer
	// exists (e.g. was deleted).
	let provider: AIProvider | undefined;
	if (projectProviderId) {
		provider = state.providers.find(
			(p) => p.id === projectProviderId && p.enabled,
		);
	}
	if (!provider) {
		provider = state.getDefault();
	}
	if (!provider) return null;
	return {
		baseUrl: provider.baseUrl,
		apiKey: provider.apiKey,
		model: provider.model,
		kind: provider.kind,
		videoModel: provider.videoModel,
		imageModel: provider.imageModel,
		audioModel: provider.audioModel,
		mediaModel: provider.mediaModel,
	};
}

export class AIManager {
	private listeners = new Set<() => void>();
	/** Active retry countdown timer (setInterval id). */
	private retryTimer: ReturnType<typeof setInterval> | null = null;
	/** The text being retried (saved so we can resend after cooldown). */
	private retryText: string | null = null;
	/**
	 * AbortController for the in-flight fetch + tool-call loop. When the
	 * user clicks Stop, we abort this to cancel the streaming response
	 * and prevent further tool-call rounds.
	 */
	private abortController: AbortController | null = null;
	/**
	 * Whether processMessage is currently running. Used by stopCurrent()
	 * and steer() to wait for the current loop to exit before draining
	 * the queue, preventing two concurrent processMessage calls.
	 */
	private isProcessing = false;
	/**
	 * Maps a user message id → the command-history length at the moment
	 * before the AI started processing that message. Used by `revert()`
	 * to undo all editor changes the AI made in response to that message.
	 */
	private revertSnapshots = new Map<string, number>();

	constructor(private editor: EditorCore) {}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	/** Snapshot the live project into a ChatContext for the LLM. */
	private snapshotContext(): ChatContext {
		const project = this.editor.project.getActive();
		if (!project) {
			return { projectName: "(no project)" };
		}

		const tracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
		const trackSummary = tracks
			? [
					...tracks.overlay.map((t) => ({
						type: t.type,
						elementCount: t.elements.length,
					})),
					{ type: "main_video", elementCount: tracks.main.elements.length },
					...tracks.audio.map((t) => ({
						type: "audio",
						elementCount: t.elements.length,
					})),
				]
			: [];

		const totalDuration = this.editor.timeline.getTotalDuration();

		return {
			projectName: project.metadata.name,
			duration: totalDuration,
			fps: (project.settings.fps ?? undefined) as
				| number
				| FrameRate
				| undefined,
			canvasSize: project.settings.canvasSize,
			trackSummary,
		};
	}

	/**
	 * Send a user message to the AI. If the AI is already busy
	 * (streaming/awaiting-tools/retrying), the message is queued and
	 * will be sent automatically when the current request finishes.
	 */
	async send({ text }: SendOptions): Promise<void> {
		const ai = useAIStore.getState();
		const isBusy =
			ai.status === "streaming" ||
			ai.status === "awaiting-tools" ||
			ai.status === "retrying";

		if (isBusy) {
			ai.enqueue(text);
			this.notify();
			return;
		}

		// Cancel any pending retry — the user sent a new message.
		this.clearRetryTimer();
		useAIStore.getState().clearRetry();
		await this.processMessage(text);
	}

	/**
	 * Core message processing: appends the user message, builds the
	 * request, streams the response, and dispatches tool calls.
	 * On error, schedules an auto-retry with progressive cooldown.
	 *
	 * Tool-call loop: after executing tools, the results are fed back
	 * to the LLM as `tool`-role messages so the model can continue
	 * reasoning and either call more tools or produce a final answer.
	 * The loop runs up to MAX_TOOL_ROUNDS to prevent infinite cycles.
	 */
	private async processMessage(text: string): Promise<void> {
		this.isProcessing = true;
		try {
		const ai = useAIStore.getState();

		// Create a fresh AbortController for this message cycle. The
		// user can cancel via `cancel()` which aborts the fetch and
		// breaks the tool-call loop.
		this.abortController = new AbortController();
		const { signal } = this.abortController;

		// Append the user message locally (only on first attempt —
		// retries reuse the existing message).
		const retryCount = useAIStore.getState().retryCount;
		let userMessageId: string | null = null;
		if (retryCount === 0) {
			userMessageId = ai.appendMessage({ role: "user", content: text });
			// Snapshot the undo-history length so we can revert all AI
			// edits for this message later if the user asks.
			if (userMessageId) {
				this.revertSnapshots.set(
					userMessageId,
					this.editor.command.getHistoryLength(),
				);
			}
		}
		ai.setError(null);
		ai.setStatus("streaming");
		this.notify();

		// Auto-compaction: if the conversation has grown too long, summarize
		// the older messages into a compact system note so the LLM's context
		// window stays manageable. This runs before building the wire-format
		// messages so the request itself stays small.
		await this.maybeAutoCompact();

		// Tool-call loop: keep sending requests until the LLM stops
		// requesting tool calls (or we hit the round limit, or the user
		// aborts). The round limit is user-tunable via advanced settings.
		const maxRounds = useAIStore.getState().advancedSettings.maxToolRounds;
		// Keep the telemetry store's currentProjectId in sync so that
		// user edits are tagged with the right project for scoped learning.
		const projectId = this.editor.project.getActive()?.metadata.id ?? null;
		useTelemetryStore.getState().setCurrentProjectId(projectId);
		// Fetch recent edit events according to the user's learning scope
		// preference: "project" → only this project's events, "global" →
		// all events, "off" → empty (no style learning).
		const learningScope = useAIStore.getState().advancedSettings.learningScope;
		const recentEvents =
			learningScope === "off"
				? []
				: learningScope === "project" && projectId
					? useTelemetryStore.getState().recentForProject(20, projectId)
					: useTelemetryStore.getState().recent(20);
		// Maximum in-round retry attempts for transient network errors.
		// Higher than before (3 → 4) so mid-task connection drops have
		// more chances to recover without losing tool-call progress.
		const MAX_IN_ROUND_RETRIES = 4;
		// Delay between in-round retries (exponential: 1s, 2s, 4s).
		const RETRY_DELAY_BASE_MS = 1000;

		for (let round = 0; round < maxRounds; round++) {
			if (signal.aborted) return;
			// Retry transient network errors within a round. This handles
			// mid-task connection drops without losing the tool-call
			// progress from previous rounds.
			let result:
				| { kind: "ok"; assistantId: string; toolCalls: ToolCallRound[] }
				| { kind: "error"; message: string }
				| null = null;
			let lastError = "Connection error";
			for (let attempt = 0; attempt < MAX_IN_ROUND_RETRIES; attempt++) {
				if (signal.aborted) return;
				result = await this.streamLLMResponse(
					text,
					recentEvents,
					signal,
					learningScope,
				);
				if (result.kind === "ok") break;
				lastError = result.message;
				// If aborted, don't retry.
				if (signal.aborted) return;
				// On the first attempt's error, streamLLMResponse may
				// have scheduled a retry timer. Cancel it — we handle
				// the retry here instead.
				this.clearRetryTimer();
				useAIStore.getState().clearRetry();
				// Show a transient retry status to the user.
				if (attempt < MAX_IN_ROUND_RETRIES - 1) {
					const delay = RETRY_DELAY_BASE_MS * 2 ** attempt;
					useAIStore.getState().setStatus("retrying");
					useAIStore.getState().setError(
						`${lastError} — retrying (${attempt + 1}/${MAX_IN_ROUND_RETRIES})…`,
					);
					this.notify();
					// Wait before retrying (exponential backoff).
					await new Promise((resolve) => setTimeout(resolve, delay));
					if (signal.aborted) return;
				}
			}
			if (!result || result.kind === "error") {
				// If we already executed tool calls in a previous round,
				// don't retry the whole message — that would re-execute
				// the tools and likely cause duplicate edits. Instead,
				// show the error and let the user decide.
				if (round > 0) {
					this.clearRetryTimer();
					useAIStore.getState().clearRetry();
					useAIStore.getState().setStatus("error");
					useAIStore.getState().setError(
						`AI stopped after completing ${round} round${round > 1 ? "s" : ""} of actions. ${lastError} — the connection could not be recovered after ${MAX_IN_ROUND_RETRIES} attempts. Send a new message to continue.`,
					);
					this.notify();
					return;
				}
				// Round 0 error: schedule a full retry cycle.
				this.scheduleRetry(text, lastError);
				return;
			}
			if (signal.aborted) return;
			if (result.toolCalls.length === 0) {
				// No tool calls — the LLM produced a final text answer.
				break;
			}

			// Execute the tool calls and append tool-role messages with
			// the results so the next LLM round can see them.
			await this.executeAndRecordToolCalls(
				result.assistantId,
				result.toolCalls,
				signal,
			);

			if (signal.aborted) return;

			// If this was the last round, append a note so the LLM knows
			// it hit the limit.
			if (round === maxRounds - 1) {
				useAIStore.getState().appendMessage({
					role: "assistant",
					content:
						"(Reached the maximum number of tool-call rounds. Please continue with a new message if you need more steps.)",
				});
			}
		}

		// Success — reset retry state and drain the queue.
		this.clearRetryTimer();
		useAIStore.getState().clearRetry();
		useAIStore.getState().setStatus("idle");
		this.notify();

		// If there are queued messages, send the next one.
		this.drainQueue();
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Build wire-format messages from the store, send them to the API,
	 * and stream the response into a new assistant bubble.
	 *
	 * Returns the assistant message id, the assembled text, and any tool
	 * calls the model requested. On error, schedules a retry and returns
	 * `{ kind: "error" }`.
	 */
	private async streamLLMResponse(
		text: string,
		recent: ReturnType<ReturnType<typeof useTelemetryStore.getState>["recent"]>,
		signal: AbortSignal,
		learningScope: "project" | "global" | "off" = "project",
	): Promise<
		| { kind: "ok"; assistantId: string; toolCalls: ToolCallRound[] }
		| { kind: "error"; message: string }
	> {
		const storeState = useAIStore.getState();
		const messages: ChatMessage[] = [];

		if (storeState.compactedSummary) {
			messages.push({
				role: "system",
				content: `Summary of earlier conversation (${storeState.compactedSummary.compactedCount} messages compacted):\n${storeState.compactedSummary.text}`,
			});
		}

		messages.push(
			...storeState.messages.map((m: UiChatMessage): ChatMessage => {
				if (m.role === "assistant" && m.toolCalls?.length) {
					return {
						role: "assistant",
						content: m.content,
						// Preserve the original tool call IDs so they match the
						// tool-role messages that follow. OpenAI rejects
						// assistant messages whose tool_calls don't have matching
						// tool messages with the same tool_call_id.
						toolCalls: m.toolCalls.map((tc) => ({
							id: tc.id ?? crypto.randomUUID(),
							name: tc.name,
							arguments: tc.args,
						})),
					};
				}
				if (m.role === "tool") {
					return {
						role: "tool",
						content: m.content,
						toolCallId: m.toolCallId,
						name: m.toolName,
					};
				}
				return { role: m.role, content: m.content };
			}),
		);

		// Attach pending captured frames as vision inputs to the last
		// user message. This lets the LLM "see" what capture_frame
		// captured when it processes the next turn.
		const pendingImages = storeState.pendingImages;
		if (pendingImages.length > 0) {
			const lastUserIdx = [...messages]
				.reverse()
				.findIndex((m) => m.role === "user");
			if (lastUserIdx >= 0) {
				const realIdx = messages.length - 1 - lastUserIdx;
				const userMsg = messages[realIdx];
				const userText =
					typeof userMsg.content === "string"
						? userMsg.content
						: Array.isArray(userMsg.content)
							? userMsg.content
									.filter((p) => p.type === "text")
									.map((p) => (p as { type: "text"; text: string }).text)
									.join("")
							: "";
				messages[realIdx] = {
					role: "user",
					content: [
						{ type: "text", text: userText },
						...pendingImages.map((url) => ({
							type: "image_url" as const,
							image_url: { url },
						})),
					],
				};
			}
			useAIStore.getState().clearPendingImages();
		}

		// Make the request. Include the user's selected provider config so
		// the server uses the client-managed endpoint rather than env vars.
		// Pass the project's per-project provider override if set.
		const projectProviderId =
			this.editor.project.getActive()?.metadata.aiProviderId ?? null;
		const providerConfig = getDefaultProvider(projectProviderId);
		// Collect MCP external tools so the LLM can call them alongside
		// the built-in editor tools. Each MCP tool is namespaced as
		// `mcp__<serverId>__<toolName>` to avoid collisions.
		const mcpTools = useMcpStore.getState().getAllTools();
		const externalTools = mcpTools.map((t) => ({
			type: "function" as const,
			function: {
				name: `mcp__${t.serverId}__${t.name}`,
				description: `[${t.serverName}] ${t.description}`,
				parameters: t.inputSchema,
			},
		}));

		// ── Puter.js client-side path ──────────────────────────────
		// Puter.js runs entirely in the browser via the Puter.js SDK.
		// It never hits our server API. We stream directly from
		// puter.ai.chat() and feed the chunks into the same assistant
		// bubble + tool-call pipeline as the server SSE path.
		if (providerConfig?.kind === "puter") {
			// Build the system prompt client-side (the server route
			// normally does this, but Puter bypasses the server).
			const builtInTools = getFilteredToolDefinitions({
				videoModel: providerConfig.videoModel,
				imageModel: providerConfig.imageModel,
				audioModel: providerConfig.audioModel,
				mediaModel: providerConfig.mediaModel,
			}).map((t) => ({
				name: t.function.name,
				category: t.function.name.split("_")[0] ?? "misc",
				description: t.function.description,
			}));
			const mcpTools = externalTools.map((t) => ({
				name: t.function.name,
				category: t.function.name.split("_")[0] ?? "mcp",
				description: t.function.description,
			}));
			const systemPrompt = buildSystemPrompt({
				tools: [...builtInTools, ...mcpTools],
				context: this.snapshotContext(),
				recentEvents: recent,
				learningScope,
				aiName: useSettingsStore.getState().aiName,
				aiPersonality: useSettingsStore.getState().aiPersonality,
			});
			// Prepend the system prompt to the messages array.
			const messagesWithSystem: ChatMessage[] = [
				{ role: "system", content: systemPrompt },
				...messages,
			];
			return await this.streamPuterResponse(
				messagesWithSystem,
				providerConfig.model,
				externalTools,
				signal,
			);
		}

		let res: Response;
		try {
			res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				signal,
				body: JSON.stringify({
					messages,
					context: this.snapshotContext(),
					recentEvents: recent,
					styleProfile: storeState.styleProfile,
					externalTools,
					learningScope,
					aiName: useSettingsStore.getState().aiName,
					aiPersonality: useSettingsStore.getState().aiPersonality,
					provider: providerConfig
						? {
								baseUrl: providerConfig.baseUrl,
								apiKey: providerConfig.apiKey,
								model: providerConfig.model,
								kind: providerConfig.kind,
								videoModel: providerConfig.videoModel,
								imageModel: providerConfig.imageModel,
								audioModel: providerConfig.audioModel,
								mediaModel: providerConfig.mediaModel,
							}
						: undefined,
				}),
			});
		} catch (err) {
			// User aborted — don't schedule a retry, just return error
			// so the loop can check signal.aborted and exit cleanly.
			if (signal.aborted || err instanceof DOMException) {
				return { kind: "error", message: "Aborted" };
			}
			const message = err instanceof Error ? err.message : "Network error";
			this.scheduleRetry(text, message);
			return { kind: "error", message };
		}

		if (!res.ok) {
			let message = `HTTP ${res.status}`;
			try {
				const data = (await res.json()) as { message?: string };
				if (data?.message) message = data.message;
			} catch {
				/* noop */
			}
			if (res.status === 501) {
				message = `${message} — open the AI providers manager to add one.`;
			}
			this.scheduleRetry(text, message);
			return { kind: "error", message };
		}

		// Reserve an assistant bubble; we'll stream into it.
		const assistantId = useAIStore.getState().appendMessage({
			role: "assistant",
			content: "",
		});
		this.notify();

		const reader = res.body?.getReader();
		if (!reader) {
			this.scheduleRetry(text, "No response body");
			return { kind: "error", message: "No response body" };
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let assembledText = "";
		let toolCalls: ToolCallRound[] = [];
		let finished = false;

		try {
			while (!finished) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const events = buffer.split("\n\n");
				buffer = events.pop() ?? "";

				for (const evt of events) {
					if (!evt.startsWith("data:")) continue;
					const payload = evt.slice(5).trim();
					if (!payload) continue;
					let parsed: {
						delta?: string;
						toolCalls?: ToolCallRound[];
						done?: boolean;
						error?: string;
					};
					try {
						parsed = JSON.parse(payload);
					} catch {
						continue;
					}
					if (parsed.error) {
						useAIStore.getState().removeMessage(assistantId);
						this.scheduleRetry(text, parsed.error);
						return { kind: "error", message: parsed.error };
					}
					if (parsed.delta) {
						assembledText += parsed.delta;
						const sanitized = sanitizeAssistantText(assembledText);
						useAIStore.getState().updateMessage(assistantId, {
							content: sanitized,
						});
						this.notify();
					}
					if (parsed.toolCalls?.length) {
						toolCalls = parsed.toolCalls;
					}
					if (parsed.done) {
						finished = true;
					}
				}
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Stream error";
			this.scheduleRetry(text, message);
			return { kind: "error", message };
		}

		return { kind: "ok", assistantId, toolCalls };
	}

	/**
	 * Stream a chat completion from Puter.js (client-side).
	 *
	 * This mirrors the SSE path in `streamLLMResponse` but uses the
	 * Puter.js SDK directly instead of fetching from `/api/ai/chat`.
	 * The chunk format is normalized by `streamPuterChat()` so the
	 * consumer logic (assistant bubble, tool calls, error handling)
	 * stays identical.
	 */
	/**
	 * Execute an AI media generation tool via Puter.js SDK.
	 *
	 * Maps tool names to Puter.js APIs:
	 *  - generate_video  → puter.ai.txt2vid()
	 *  - generate_image  → puter.ai.txt2img()
	 *  - generate_audio  → puter.ai.txt2speech()
	 *  - generate_media  → puter.ai.txt2speech() (reuses TTS for SFX/music)
	 *
	 * The corresponding media model must be configured on the provider
	 * (videoModel, imageModel, audioModel, mediaModel). If not set, the
	 * tool is filtered out before reaching this point, but we double-check
	 * here for safety.
	 *
	 * @returns The URL of the generated media.
	 * @throws Error if the model is not configured or generation fails.
	 */
	private async executeGenerationTool(
		toolName: string,
		args: Record<string, unknown>,
		provider: {
			videoModel?: string;
			imageModel?: string;
			audioModel?: string;
			mediaModel?: string;
		},
	): Promise<string> {
		const prompt = String(args.prompt ?? args.text ?? "");
		if (!prompt) throw new Error("prompt or text is required");

		switch (toolName) {
			case "generate_video": {
				if (!provider.videoModel?.trim())
					throw new Error(
						"No video model configured. Set a video model in the provider settings.",
					);
				const seconds = args.seconds
					? Number(args.seconds)
					: undefined;
				return puterTxt2Vid(prompt, provider.videoModel, seconds);
			}
			case "generate_image": {
				if (!provider.imageModel?.trim())
					throw new Error(
						"No image model configured. Set an image model in the provider settings.",
					);
				return puterTxt2Img(prompt, provider.imageModel);
			}
			case "generate_audio": {
				if (!provider.audioModel?.trim())
					throw new Error(
						"No audio model configured. Set an audio model in the provider settings.",
					);
				const voice = args.voice ? String(args.voice) : undefined;
				return puterTxt2Speech(
					prompt,
					provider.audioModel,
					voice,
				);
			}
			case "generate_media": {
				if (!provider.mediaModel?.trim())
					throw new Error(
						"No media model configured. Set a media model in the provider settings.",
					);
				// Reuse TTS for media generation until a dedicated
				// Puter.js media API is available.
				const voice = args.voice ? String(args.voice) : undefined;
				return puterTxt2Speech(
					prompt,
					provider.mediaModel,
					voice,
				);
			}
			default:
				throw new Error(`Unknown generation tool: ${toolName}`);
		}
	}

	private async streamPuterResponse(
		messages: ChatMessage[],
		model: string,
		externalTools: Array<{
			type: "function";
			function: {
				name: string;
				description: string;
				parameters: unknown;
			};
		}>,
		signal: AbortSignal,
	): Promise<
		| { kind: "ok"; assistantId: string; toolCalls: ToolCallRound[] }
		| { kind: "error"; message: string }
	> {
		// Reserve an assistant bubble; we'll stream into it.
		const assistantId = useAIStore.getState().appendMessage({
			role: "assistant",
			content: "",
		});
		this.notify();

		let assembledText = "";
		let toolCalls: ToolCallRound[] = [];

		try {
			for await (const chunk of streamPuterChat(
				messages,
				model,
				externalTools,
				signal,
			)) {
				if (signal.aborted) return { kind: "error", message: "Aborted" };

				if (chunk.error) {
					useAIStore.getState().removeMessage(assistantId);
					this.scheduleRetry("", chunk.error);
					return { kind: "error", message: chunk.error };
				}
				if (chunk.delta) {
					assembledText += chunk.delta;
					const sanitized = sanitizeAssistantText(assembledText);
					useAIStore.getState().updateMessage(assistantId, {
						content: sanitized,
					});
					this.notify();
				}
				if (chunk.toolCalls?.length) {
					toolCalls = chunk.toolCalls.map((tc) => ({
						id: tc.id,
						name: tc.name,
						arguments: tc.arguments,
					}));
				}
				if (chunk.done) break;
			}
		} catch (err) {
			// User aborted — don't schedule retry.
			if (signal.aborted || err instanceof DOMException) {
				return { kind: "error", message: "Aborted" };
			}
			useAIStore.getState().removeMessage(assistantId);
			const message =
				err instanceof Error ? err.message : "Puter.js stream error";
			this.scheduleRetry("", message);
			return { kind: "error", message };
		}

		return { kind: "ok", assistantId, toolCalls };
	}

	/**
	 * Execute a batch of tool calls, record the results on the assistant
	 * message, and append `tool`-role messages with the results so the
	 * next LLM round can see what each tool returned.
	 */
	private async executeAndRecordToolCalls(
		assistantId: string,
		toolCalls: ToolCallRound[],
		signal: AbortSignal,
	): Promise<void> {
		useAIStore.getState().setStatus("awaiting-tools");
		this.notify();

		const mcpManager = getMcpConnectionManager();
		const results: Array<{
			name: string;
			ok: boolean;
			message?: string;
			data?: unknown;
		}> = [];

		for (const tc of toolCalls) {
			if (signal.aborted) return;
			// Planning tools — these modify the AI store directly, not
			// the editor. Handle them here before falling through to the
			// executor / MCP paths.
			if (tc.name === "create_plan") {
				const title = String(tc.arguments.title ?? "Plan");
				const steps = Array.isArray(tc.arguments.steps)
					? (tc.arguments.steps as Array<{ title?: unknown; description?: unknown }>)
							.filter((s) => s && typeof s === "object")
							.map((s) => ({
								title: String(s.title ?? "Step"),
								description: String(s.description ?? ""),
							}))
					: [];
				if (steps.length === 0) {
					results.push({
						name: tc.name,
						ok: false,
						message: "Plan must have at least one step",
					});
				} else {
					useAIStore.getState().createPlan(title, steps);
					results.push({
						name: tc.name,
						ok: true,
						message: `Plan created: "${title}" with ${steps.length} step${steps.length > 1 ? "s" : ""}`,
					});
				}
				continue;
			}
			if (tc.name === "update_todo") {
				const stepIndex = Number(tc.arguments.stepIndex);
				const status = String(tc.arguments.status) as
					| "pending"
					| "in_progress"
					| "done"
					| "skipped";
				if (
					!Number.isInteger(stepIndex) ||
					stepIndex < 0 ||
					!["pending", "in_progress", "done", "skipped"].includes(status)
				) {
					results.push({
						name: tc.name,
						ok: false,
						message: "Invalid stepIndex or status",
					});
				} else {
					useAIStore.getState().updatePlanStep(stepIndex, status);
					results.push({
						name: tc.name,
						ok: true,
						message: `Step ${stepIndex} → ${status}`,
					});
				}
				continue;
			}
			if (tc.name.startsWith("mcp__")) {
				const rest = tc.name.slice(5);
				const sep = rest.indexOf("__");
				if (sep < 0) {
					results.push({
						name: tc.name,
						ok: false,
						message: "Invalid MCP tool name",
					});
					continue;
				}
				const serverId = rest.slice(0, sep);
				const toolName = rest.slice(sep + 2);
				try {
					const mcpResult = await mcpManager.callTool(
						serverId,
						toolName,
						tc.arguments,
					);
					results.push({
						name: tc.name,
						ok: true,
						message: "MCP tool executed",
						data: mcpResult,
					});
				} catch (err) {
					results.push({
						name: tc.name,
						ok: false,
						message:
							err instanceof Error ? err.message : "MCP tool failed",
					});
				}
			} else if (
				tc.name === "generate_video" ||
				tc.name === "generate_image" ||
				tc.name === "generate_audio" ||
				tc.name === "generate_media"
			) {
				// AI media generation tools — these call Puter.js SDK
				// APIs (txt2vid/txt2img/txt2speech) and import the
				// result into the media library. They only run when
				// the active provider is Puter.js and the
				// corresponding media model is configured.
				const provider = getDefaultProvider(
					this.editor.project.getActive()?.metadata.aiProviderId ?? null,
				);
				if (provider?.kind !== "puter") {
					results.push({
						name: tc.name,
						ok: false,
						message:
							"Media generation requires a Puter.js provider. Switch to a Puter provider or use import_asset_from_url with a direct URL.",
					});
					continue;
				}
				try {
					const genUrl = await this.executeGenerationTool(
						tc.name,
						tc.arguments,
						provider,
					);
					// Import the generated media into the library.
					const importRes = await fetch("/api/drive/import", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ url: genUrl }),
					});
					const importData = await importRes.json();
					if (!importData.ok) {
						results.push({
							name: tc.name,
							ok: false,
							message: `Generation succeeded but import failed: ${importData.message ?? "unknown error"}`,
						});
						continue;
					}
					results.push({
						name: tc.name,
						ok: true,
						message: `Generated and imported ${importData.fileName ?? "asset"}`,
						data: { url: genUrl, ...importData },
					});
				} catch (err) {
					results.push({
						name: tc.name,
						ok: false,
						message:
							err instanceof Error
								? err.message
								: "Generation failed",
					});
				}
			} else {
				const r = await executeTool({
					editor: this.editor,
					toolName: tc.name,
					arguments: tc.arguments,
					source: "ai",
				});
				results.push({
					name: tc.name,
					ok: r.ok,
					message: r.message,
					data: r.data,
				});
				if (tc.name === "capture_frame" && r.ok) {
					const data = r.data as { dataUrl?: string } | undefined;
					if (data?.dataUrl) {
						useAIStore.getState().addPendingImage(data.dataUrl);
					}
				}
			}
		}

		// Finalise the assistant message with the tool-call record.
		const finalToolCalls = toolCalls.map((tc) => {
			const result = results.find((r) => r.name === tc.name);
			return { id: tc.id, name: tc.name, args: tc.arguments, result };
		});

		useAIStore.getState().updateMessage(assistantId, {
			toolCalls: finalToolCalls,
		});

		// Append a `tool`-role message for each tool call result so the
		// next LLM round can see what each tool returned. The content is
		// a JSON string (per the OpenAI tool message schema). When a tool
		// failed, we add a retry hint so the model knows it should try
		// again with corrected arguments or a different approach.
		for (let i = 0; i < toolCalls.length; i++) {
			const tc = toolCalls[i];
			const result = results[i];
			const toolContent = result.ok
				? JSON.stringify({
						ok: true,
						message: result.message,
						data: result.data,
					})
				: JSON.stringify({
						ok: false,
						error: result.message ?? "Tool execution failed",
						message: result.message,
						retry_hint:
							"This tool call failed. Please analyze the error, fix your arguments or approach, and try again. If the error is persistent, inform the user and suggest an alternative.",
					});
			useAIStore.getState().appendMessage({
				role: "tool",
				content: toolContent,
				toolCallId: tc.id,
				toolName: tc.name,
			});
		}

		this.notify();
	}

	/**
	 * Send the next queued message if any. Called after a successful
	 * response or when the queue is manually flushed.
	 */
	private async drainQueue(): Promise<void> {
		const next = useAIStore.getState().dequeue();
		if (next) {
			await this.processMessage(next);
		}
	}

	/**
	 * Schedule an auto-retry with progressive cooldown.
	 * Attempt 1 → 5s, 2 → 10s, 3 → 15s, etc.
	 * After MAX_RETRY_ATTEMPTS, gives up and shows the error.
	 */
	private scheduleRetry(text: string, errorMessage: string): void {
		const store = useAIStore.getState();
		const { maxRetryAttempts, retryCooldownBase } = store.advancedSettings;
		const attempt = store.retryCount + 1;

		if (attempt > maxRetryAttempts) {
			// Give up — show the error to the user.
			this.clearRetryTimer();
			store.clearRetry();
			store.setStatus("error");
			store.setError(
				`${errorMessage} (gave up after ${maxRetryAttempts} retries)`,
			);
			this.notify();
			// Still drain the queue so queued messages aren't stuck.
			void this.drainQueue();
			return;
		}

		const cooldown = retryCooldownBase * attempt;
		this.retryText = text;
		store.setRetry(attempt, cooldown);
		store.setStatus("retrying");
		store.setError(
			`${errorMessage} — retry ${attempt}/${maxRetryAttempts} in ${cooldown}s…`,
		);
		this.notify();

		// Start a per-second countdown timer.
		this.clearRetryTimer();
		this.retryTimer = setInterval(() => {
			const current = useAIStore.getState();
			current.tickRetry();
			this.notify();

			// Update the error message with the live countdown.
			if (current.retryIn > 0) {
				current.setError(
					`${errorMessage} — retry ${attempt}/${maxRetryAttempts} in ${current.retryIn}s…`,
				);
			}
			this.notify();

			if (current.retryIn <= 0) {
				this.clearRetryTimer();
				// Preserve the retry count (it's already set to `attempt`)
				// and re-process the message.
				void this.processMessage(this.retryText ?? text);
			}
		}, 1000);
	}

	/** Clear the retry countdown interval if active. */
	private clearRetryTimer(): void {
		if (this.retryTimer) {
			clearInterval(this.retryTimer);
			this.retryTimer = null;
		}
	}

	/**
	 * If the conversation exceeds the compaction thresholds, summarize
	 * the older messages and replace them with a compact system note.
	 * The most recent `COMPACTION_KEEP_LAST` messages are always kept
	 * verbatim so the LLM has the immediate context it needs.
	 *
	 * The summary is generated by sending a lightweight summarization
	 * request to the same `/api/ai/chat` endpoint. If that call fails
	 * (network error, no provider, etc.), a mechanical fallback summary
	 * is produced locally so compaction still happens.
	 */
	private async maybeAutoCompact(): Promise<void> {
		const store = useAIStore.getState();
		const messages = store.messages;
		const { compactionMessageThreshold, compactionKeepLast } =
			store.advancedSettings;

		const tokenEstimate = estimateTokens(messages);
		const shouldCompact =
			messages.length > compactionMessageThreshold ||
			tokenEstimate > COMPACTION_TOKEN_THRESHOLD;

		if (!shouldCompact) return;
		// Don't compact if there aren't enough messages to meaningfully trim.
		if (messages.length <= compactionKeepLast) return;

		const toCompact = messages.slice(0, -compactionKeepLast);
		const summary = await this.summarizeMessages(toCompact);
		store.compactConversation(summary, compactionKeepLast);
		this.notify();
	}

	/**
	 * Ask the LLM to summarize a set of older messages. Falls back to a
	 * mechanical local summary if the LLM call fails — compaction should
	 * never be blocked by a network issue.
	 */
	private async summarizeMessages(
		messages: UiChatMessage[],
	): Promise<string> {
		const conversationText = messages
			.map((m) => {
				const role = m.role.toUpperCase();
				const content = m.content.slice(0, 500);
				const tools = m.toolCalls?.length
					? ` [tools: ${m.toolCalls.map((t) => t.name).join(", ")}]`
					: "";
				return `${role}: ${content}${tools}`;
			})
			.join("\n");

		const providerConfig = getDefaultProvider(
			this.editor.project.getActive()?.metadata.aiProviderId ?? null,
		);
		const summarizeMessages: ChatMessage[] = [
			{
				role: "system",
				content:
					"You are a conversation summarizer. Summarize the following AI assistant conversation in 5-10 concise bullet points. Focus on what the user asked for, what edits were made, and any important decisions. Do not include pleasantries.",
			},
			{
				role: "user",
				content: conversationText,
			},
		];

		try {
			const res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					messages: summarizeMessages,
					// No context/telemetry/style — this is a pure summarization call.
					provider: providerConfig
						? {
								baseUrl: providerConfig.baseUrl,
								apiKey: providerConfig.apiKey,
								model: providerConfig.model,
								kind: providerConfig.kind,
							}
						: undefined,
				}),
			});

			if (!res.ok || !res.body) {
				return this.mechanicalSummary(messages);
			}

			// Read the full SSE stream and assemble the text.
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let assembled = "";
			let done = false;
			while (!done) {
				const { value, done: readerDone } = await reader.read();
				if (readerDone) break;
				buffer += decoder.decode(value, { stream: true });
				const events = buffer.split("\n\n");
				buffer = events.pop() ?? "";
				for (const evt of events) {
					if (!evt.startsWith("data:")) continue;
					const payload = evt.slice(5).trim();
					if (!payload) continue;
					try {
						const parsed = JSON.parse(payload) as {
							delta?: string;
							done?: boolean;
						};
						if (parsed.delta) assembled += parsed.delta;
						if (parsed.done) done = true;
					} catch {
						/* skip malformed SSE lines */
					}
				}
			}

			return assembled.trim() || this.mechanicalSummary(messages);
		} catch {
			// Network or provider error — fall back to a local summary so
			// compaction still happens and the context window is protected.
			return this.mechanicalSummary(messages);
		}
	}

	/**
	 * Mechanical fallback summary: build a compact bullet list from the
	 * message contents without an LLM call. Used when the summarization
	 * request fails.
	 */
	private mechanicalSummary(messages: UiChatMessage[]): string {
		const bullets = messages
			.filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
			.slice(0, 12)
			.map((m) => {
				const prefix = m.role === "user" ? "User asked" : "Assistant did";
				const text = m.content.slice(0, 120).replace(/\n/g, " ");
				return `- ${prefix}: ${text}`;
			});
		return `Earlier conversation (${messages.length} messages):\n${bullets.join("\n")}`;
	}

	/**
	 * Stop the current in-flight request WITHOUT clearing the queue.
	 * The AI finishes the current tool-call round (if any) and then
	 * the queue continues with the next message. Use this when the
	 * user wants to stop the current generation but keep queued
	 * messages.
	 */
	stopCurrent(): void {
		// Abort any in-flight fetch + break the tool-call loop.
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.clearRetryTimer();
		const ai = useAIStore.getState();
		ai.clearRetry();
		ai.setStatus("idle");
		ai.setError(null);
		this.notify();
		// Wait for the current processMessage to exit, then drain.
		void this.waitForIdleAndDrain();
	}

	/**
	 * Cancel an in-flight request, clear the retry timer, and flush
	 * the queue. The user explicitly wants to stop everything.
	 */
	cancel(): void {
		// Abort any in-flight fetch + break the tool-call loop.
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.clearRetryTimer();
		const ai = useAIStore.getState();
		ai.clearRetry();
		ai.clearQueue();
		ai.setStatus("idle");
		ai.setError(null);
		this.notify();
	}

	/**
	 * Clear only the queued messages without stopping the current
	 * in-flight request. Use this when the user wants to remove
	 * pending messages but let the current generation finish.
	 */
	clearQueueOnly(): void {
		useAIStore.getState().clearQueue();
		this.notify();
	}

	/**
	 * Steer the AI by sending a message immediately, interrupting
	 * the current generation. The current in-flight request is
	 * aborted, the message is prepended to the queue (so it goes
	 * next), and the queue is drained immediately.
	 */
	steer(text: string): void {
		const trimmed = text.trim();
		if (!trimmed) return;
		// Abort the current in-flight request.
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.clearRetryTimer();
		const ai = useAIStore.getState();
		ai.clearRetry();
		// Prepend the steer message to the front of the queue.
		ai.enqueueSteer(trimmed);
		ai.setStatus("idle");
		ai.setError(null);
		this.notify();
		// Wait for the current processMessage to exit, then drain.
		void this.waitForIdleAndDrain();
	}

	/**
	 * Wait for isProcessing to become false, then drain the queue.
	 * Polls every 50ms up to 5 seconds. This prevents two concurrent
	 * processMessage calls when stopCurrent() or steer() is called
	 * while the tool-call loop is still exiting.
	 */
	private async waitForIdleAndDrain(): Promise<void> {
		const maxWait = 5000;
		const interval = 50;
		let waited = 0;
		while (this.isProcessing && waited < maxWait) {
			await new Promise((r) => setTimeout(r, interval));
			waited += interval;
		}
		await this.drainQueue();
	}

	/**
	 * Revert all editor changes the AI made in response to a specific
	 * user message. This undoes commands back to the snapshot taken
	 * just before that message was processed. Also removes the
	 * assistant reply and all subsequent messages from the chat, so
	 * the conversation reflects the reverted state.
	 *
	 * Returns true if the revert was performed, false if no snapshot
	 * was found for the given message id.
	 */
	revertToMessage(messageId: string): boolean {
		const snapshot = this.revertSnapshots.get(messageId);
		if (snapshot === undefined) return false;

		const commands = this.editor.command;
		const targetLength = snapshot;
		let undone = 0;
		while (commands.getHistoryLength() > targetLength && commands.canUndo()) {
			commands.undo();
			undone++;
		}

		// Remove the reverted snapshot and any snapshots for later
		// messages (they're no longer valid since the conversation is
		// being trimmed).
		for (const [id] of this.revertSnapshots) {
			if (id === messageId) {
				this.revertSnapshots.delete(id);
			}
		}

		// Trim the conversation: remove the user message and everything
		// after it, since the AI's response is being reverted.
		const ai = useAIStore.getState();
		const messages = ai.messages;
		const idx = messages.findIndex((m) => m.id === messageId);
		if (idx !== -1) {
			// Remove all messages from idx onward.
			for (let i = messages.length - 1; i >= idx; i--) {
				ai.removeMessage(messages[i].id);
			}
		}

		this.notify();
		return undone > 0 || idx !== -1;
	}

	/**
	 * Apply a StyleProfile from a reference video file. Goes through
	 * the client-side extractor and persists the result on the AI
	 * store so the next chat call can use it as context.
	 */
	async applyReferenceVideo(file: File): Promise<boolean> {
		const ai = useAIStore.getState();
		// Lazy import keeps the heavy canvas code out of the initial bundle.
		const { extractStyle } = await import("@/lib/ai/style/extractor-runtime");
		const profile = await extractStyle({
			file,
			onProgress: () => {
				/* progress UI lives in the panel itself */
			},
		});
		ai.setStyleProfile(profile, file.name);
		this.notify();
		return profile.duration > 0;
	}

	clearReference(): void {
		useAIStore.getState().setStyleProfile(null, null);
		this.notify();
	}

	getTps(): number {
		return TICKS_PER_SECOND;
	}
}

/**
 * Strip reasoning tags and leading/trailing whitespace from the model's
 * visible output. Some providers (e.g. MiniMax) emit <think> blocks in
 * the same stream as the assistant text. We keep the assistant text clean
 * so the user never sees internal monologue.
 */
function sanitizeAssistantText(text: string): string {
	return text
		// Closed <think> ... </think> blocks (DeepSeek-R1 / QwQ style, no angle brackets).
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		// Closed <thinking> ... </thinking> blocks (MiniMax / generic).
		.replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
		// Unclosed opening tags during streaming — hide from the opening
		// tag to the end of the buffer; the content reappears once the
		// closing tag arrives and the closed-tag regex removes the block.
		.replace(/<(?:think|thinking)>[\s\S]*$/g, "")
		.replace(/<think>[\s\S]*$/g, "")
		.trim();
}
