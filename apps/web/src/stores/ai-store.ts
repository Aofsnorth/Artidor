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

/**
 * When the conversation grows too long for the LLM's context window,
 * older messages are replaced by a single compact summary stored here.
 * The summary is prepended as a system message when building the
 * wire-format request, so the LLM retains context without the full
 * token cost of every old message.
 */
export interface CompactedSummary {
	/** The LLM-generated summary of the compacted-away messages. */
	text: string;
	/** Number of messages that were compacted (for UI display). */
	compactedCount: number;
	/** ISO timestamp of when compaction happened. */
	createdAt: number;
}

interface AIState {
	messages: ChatMessage[];
	status: ChatStatus;
	error: string | null;
	styleProfile: StyleProfile | null;
	referenceVideoName: string | null;
	/** Summary of older messages that were compacted away, or null. */
	compactedSummary: CompactedSummary | null;

	/* mutations */
	appendMessage: (m: Omit<ChatMessage, "id" | "timestamp">) => string;
	updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
	clearConversation: () => void;
	/**
	 * Replace older messages with a compact summary, keeping the most
	 * recent `keepLast` messages verbatim. Called by the AI manager
	 * when auto-compaction triggers.
	 */
	compactConversation: (summary: string, keepLast: number) => void;
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
			compactedSummary: null,

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

			clearConversation: () =>
				set({ messages: [], error: null, compactedSummary: null }),

			compactConversation: (summary, keepLast) => {
				const all = get().messages;
				const compactedCount = Math.max(0, all.length - keepLast);
				if (compactedCount === 0) return;
				set({
					messages: all.slice(-keepLast),
					compactedSummary: {
						text: summary,
						compactedCount,
						createdAt: Date.now(),
					},
				});
			},

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
				compactedSummary: state.compactedSummary,
			}),
		},
	),
);
