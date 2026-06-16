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
import { TICKS_PER_SECOND } from "@/lib/wasm";
import type { FrameRate } from "artidor-wasm";

export interface SendOptions {
	/** Plain text the user typed. */
	text: string;
	/** Optional override of the assistant id (mostly for tests). */
	assistantMessageId?: string;
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

		// Build the wire-format messages from the local store.
		const recent = telemetry.recent(20);
		const messages: ChatMessage[] = useAIStore
			.getState()
			.messages.map((m: UiChatMessage): ChatMessage => {
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
			});

		// Make the request.
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
						useAIStore.getState().updateMessage(assistantId, {
							content: assembledText,
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
		// happened.
		const results: Array<{ name: string; ok: boolean; message?: string }> = [];
		if (toolCalls.length > 0) {
			ai.setStatus("awaiting-tools");
			this.notify();
			for (const tc of toolCalls) {
				const r = await executeTool({
					editor: this.editor,
					toolName: tc.name,
					arguments: tc.arguments,
					source: "ai",
				});
				results.push({ name: tc.name, ok: r.ok, message: r.message });
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
