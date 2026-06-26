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
import { useAIProvidersStore } from "@/stores/ai-providers-store";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { getMcpConnectionManager, useMcpStore } from "@/stores/mcp-store";
import type { FrameRate } from "artidor-wasm";

/**
 * Auto-compaction thresholds. When the conversation exceeds either limit,
 * older messages are summarized and replaced by a compact system message
 * so the LLM's context window stays manageable on long sessions.
 */
const COMPACTION_MESSAGE_THRESHOLD = 20;
const COMPACTION_TOKEN_THRESHOLD = 6000;
const COMPACTION_KEEP_LAST = 6;

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
	kind: "openai-compatible" | "ollama";
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
	 * Send a user message to the AI. Streams the response, dispatches
	 * tool calls back into the editor, and updates the UI store.
	 */
	async send({ text }: SendOptions): Promise<void> {
		const ai = useAIStore.getState();
		const telemetry = useTelemetryStore.getState();

		// Append the user message locally.
		ai.appendMessage({ role: "user", content: text });
		ai.setError(null);
		ai.setStatus("streaming");
		this.notify();

		// Auto-compaction: if the conversation has grown too long, summarize
		// the older messages into a compact system note so the LLM's context
		// window stays manageable. This runs before building the wire-format
		// messages so the request itself stays small.
		await this.maybeAutoCompact();

		// Build the wire-format messages from the local store. If there's a
		// compacted summary, prepend it as a system message so the LLM
		// retains context from the compacted-away portion of the conversation.
		const recent = telemetry.recent(20);
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
				return { role: m.role, content: m.content };
			}),
		);

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
		let res: Response;
		try {
			res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					messages,
					context: this.snapshotContext(),
					recentEvents: recent,
					styleProfile: ai.styleProfile,
					externalTools,
					// Pass the provider config only when there is one — when
					// absent the server falls back to env-var resolution.
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
			ai.setStatus("error");
			ai.setError(err instanceof Error ? err.message : "Network error");
			this.notify();
			return;
		}

		if (!res.ok) {
			let message = `HTTP ${res.status}`;
			try {
				const data = (await res.json()) as { message?: string };
				if (data?.message) message = data.message;
			} catch {
				/* noop */
			}
			// Distinguish "no provider" (status 501) with a clearer hint —
			// the user might just need to add one via the providers manager.
			if (res.status === 501) {
				message = `${message} — open the AI providers manager to add one.`;
			}
			ai.setStatus("error");
			ai.setError(message);
			this.notify();
			return;
		}

		// Reserve an assistant bubble; we'll stream into it.
		const assistantId = ai.appendMessage({
			role: "assistant",
			content: "",
		});
		this.notify();

		const reader = res.body?.getReader();
		if (!reader) {
			ai.setStatus("error");
			ai.setError("No response body");
			this.notify();
			return;
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let assembledText = "";
		let toolCalls: Array<{
			id: string;
			name: string;
			arguments: Record<string, unknown>;
		}> = [];
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
						toolCalls?: typeof toolCalls;
						done?: boolean;
						error?: string;
					};
					try {
						parsed = JSON.parse(payload);
					} catch {
						continue;
					}
					if (parsed.error) {
						ai.setStatus("error");
						ai.setError(parsed.error);
						this.notify();
					}
					if (parsed.delta) {
						assembledText += parsed.delta;
						// Defensive strip: some models emit reasoning tags like
						//  thinking or <thinking> in the visible stream. Hide them.
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
			ai.setStatus("error");
			ai.setError(err instanceof Error ? err.message : "Stream error");
			this.notify();
			return;
		}

		// Execute the tool calls in order. Each call's result is
		// appended to the assistant message so the user can see what
		// happened. MCP tools (prefixed `mcp__<serverId>__<toolName>`)
		// are routed to the MCP connection manager instead of the
		// built-in executor.
		const results: Array<{ name: string; ok: boolean; message?: string }> = [];
		if (toolCalls.length > 0) {
			ai.setStatus("awaiting-tools");
			this.notify();
			const mcpManager = getMcpConnectionManager();
			for (const tc of toolCalls) {
				if (tc.name.startsWith("mcp__")) {
					// Parse: mcp__<serverId>__<toolName>
					const rest = tc.name.slice(5);
					const sep = rest.indexOf("__");
					if (sep < 0) {
						results.push({ name: tc.name, ok: false, message: "Invalid MCP tool name" });
						continue;
					}
					const serverId = rest.slice(0, sep);
					const toolName = rest.slice(sep + 2);
					try {
						const mcpResult = await mcpManager.callTool(serverId, toolName, tc.arguments);
						results.push({ name: tc.name, ok: true, message: "MCP tool executed", data: mcpResult } as never);
					} catch (err) {
						results.push({
							name: tc.name,
							ok: false,
							message: err instanceof Error ? err.message : "MCP tool failed",
						});
					}
				} else {
					const r = await executeTool({
						editor: this.editor,
						toolName: tc.name,
						arguments: tc.arguments,
						source: "ai",
					});
					results.push({ name: tc.name, ok: r.ok, message: r.message });
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
		ai.setStatus("idle");
		this.notify();
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

		const tokenEstimate = estimateTokens(messages);
		const shouldCompact =
			messages.length > COMPACTION_MESSAGE_THRESHOLD ||
			tokenEstimate > COMPACTION_TOKEN_THRESHOLD;

		if (!shouldCompact) return;
		// Don't compact if there aren't enough messages to meaningfully trim.
		if (messages.length <= COMPACTION_KEEP_LAST) return;

		const toCompact = messages.slice(0, -COMPACTION_KEEP_LAST);
		const summary = await this.summarizeMessages(toCompact);
		store.compactConversation(summary, COMPACTION_KEEP_LAST);
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
						continue;
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
	 * Cancel an in-flight request. (The browser fetch is aborted, the
	 * streamed state is reset.) We don't store the controller at the
	 * manager level — a single in-flight request per editor is fine
	 * because the UI disables the input while streaming.
	 */
	cancel(): void {
		const ai = useAIStore.getState();
		ai.setStatus("idle");
		ai.setError(null);
		this.notify();
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
		.replace(/\\thinking[\s\S]*?<\/think>/g, "")
		.replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
		.trim();
}
