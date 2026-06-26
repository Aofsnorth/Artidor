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
import { useAIProvidersStore, type ProviderKind } from "@/stores/ai-providers-store";
import { streamPuterChat } from "@/lib/ai/puter-client";
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
function getDefaultProvider(): {
	baseUrl: string;
	apiKey: string;
	model: string;
	kind: ProviderKind;
} | null {
	const state = useAIProvidersStore.getState();
	const provider = state.getDefault();
	if (!provider) return null;
	return {
		baseUrl: provider.baseUrl,
		apiKey: provider.apiKey,
		model: provider.model,
		kind: provider.kind,
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
		const ai = useAIStore.getState();
		const telemetry = useTelemetryStore.getState();

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
		for (let round = 0; round < maxRounds; round++) {
			if (signal.aborted) return;
			const result = await this.streamLLMResponse(
				text,
				telemetry.recent(20),
				signal,
			);
			if (result.kind === "error") {
				// streamLLMResponse already scheduled the retry.
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
	): Promise<
		| { kind: "ok"; assistantId: string; toolCalls: ToolCallRound[] }
		| { kind: "error" }
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
						toolCalls: m.toolCalls.map((tc) => ({
							id: crypto.randomUUID(),
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
		const providerConfig = getDefaultProvider();
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
			return await this.streamPuterResponse(
				messages,
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
		} catch (err) {
			// User aborted — don't schedule a retry, just return error
			// so the loop can check signal.aborted and exit cleanly.
			if (signal.aborted || err instanceof DOMException) {
				return { kind: "error" };
			}
			this.scheduleRetry(
				text,
				err instanceof Error ? err.message : "Network error",
			);
			return { kind: "error" };
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
			return { kind: "error" };
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
			return { kind: "error" };
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
						return { kind: "error" };
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
			this.scheduleRetry(
				text,
				err instanceof Error ? err.message : "Stream error",
			);
			return { kind: "error" };
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
		| { kind: "error" }
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
				if (signal.aborted) return { kind: "error" };

				if (chunk.error) {
					useAIStore.getState().removeMessage(assistantId);
					this.scheduleRetry("", chunk.error);
					return { kind: "error" };
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
				return { kind: "error" };
			}
			useAIStore.getState().removeMessage(assistantId);
			this.scheduleRetry(
				"",
				err instanceof Error ? err.message : "Puter.js stream error",
			);
			return { kind: "error" };
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
			return { name: tc.name, args: tc.arguments, result };
		});

		useAIStore.getState().updateMessage(assistantId, {
			toolCalls: finalToolCalls,
		});

		// Append a `tool`-role message for each tool call result so the
		// next LLM round can see what each tool returned. The content is
		// a JSON string (per the OpenAI tool message schema).
		for (let i = 0; i < toolCalls.length; i++) {
			const tc = toolCalls[i];
			const result = results[i];
			const toolContent = JSON.stringify({
				ok: result.ok,
				message: result.message,
				data: result.data,
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

		const providerConfig = getDefaultProvider();
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
