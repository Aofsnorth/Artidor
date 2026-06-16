/**
 * AI chat UI store — keeps the message history, streaming status and
 * the currently-attached style profile for the AI Edit panel.
 *
 * Why not in the AI Manager: this is the *UI* mirror. The manager owns
 * the canonical conversation (and could be replayed server-side); the
 * store owns the React-friendly view of it.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StyleProfile } from "@/lib/ai/style/extractor";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	/** For assistant messages: tool calls the model asked for. */
	toolCalls?: Array<{
		name: string;
		args: Record<string, unknown>;
		result?: ToolExecutionResultLite;
	}>;
	/** ISO timestamp, used for ordering and the timeline scrubber. */
	timestamp: number;
}

/**
 * A trimmed-down shape of `ToolExecutionResult` we use in the
 * conversation mirror. The full result type lives in
 * `lib/ai/tools/executor`; the LLM doesn't need the heavy
 * discriminated unions, just a yes/no + a friendly message.
 */
export interface ToolExecutionResultLite {
	ok: boolean;
	message?: string;
}

export type ChatStatus = "idle" | "streaming" | "awaiting-tools" | "error";

interface AIState {
	messages: ChatMessage[];
	status: ChatStatus;
	error: string | null;
	styleProfile: StyleProfile | null;
	referenceVideoName: string | null;

	/* mutations */
	appendMessage: (m: Omit<ChatMessage, "id" | "timestamp">) => string;
	updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
	clearConversation: () => void;
	setStatus: (status: ChatStatus) => void;
	setError: (error: string | null) => void;
	setStyleProfile: (profile: StyleProfile | null, name?: string | null) => void;
}

const MAX_PERSISTED_MESSAGES = 50;

export const useAIStore = create<AIState>()(
	persist(
		(set, get) => ({
			messages: [],
			status: "idle",
			error: null,
			styleProfile: null,
			referenceVideoName: null,

			appendMessage: (m) => {
				const id = crypto.randomUUID();
				set({
					messages: [
						...get().messages,
						{ id, timestamp: Date.now(), ...m },
					].slice(-200),
				});
				return id;
			},

			updateMessage: (id, patch) => {
				set({
					messages: get().messages.map((m) =>
						m.id === id ? { ...m, ...patch } : m,
					),
				});
			},

			clearConversation: () => set({ messages: [], error: null }),
			setStatus: (status) => set({ status }),
			setError: (error) => set({ error }),

			setStyleProfile: (profile, name) =>
				set({ styleProfile: profile, referenceVideoName: name ?? null }),
		}),
		{
			name: "artidor-ai-chat",
			partialize: (state) => ({
				messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
				styleProfile: state.styleProfile,
				referenceVideoName: state.referenceVideoName,
			}),
		},
	),
);
