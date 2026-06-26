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
	/** For tool-role messages: the id of the tool call this replies to. */
	toolCallId?: string;
	/** For tool-role messages: the name of the tool that produced this. */
	toolName?: string;
	/** ISO timestamp, used for ordering and the timeline scrubber. */
	timestamp: number;
}

/**
 * A trimmed-down shape of `ToolExecutionResult` we use in the
 * conversation mirror. The full result type lives in
 * `lib/ai/tools/executor`; the LLM doesn't need the heavy
 * discriminated unions, just a yes/no + a friendly message + optional
 * structured data (e.g. the asset list from list_assets).
 */
export interface ToolExecutionResultLite {
	ok: boolean;
	message?: string;
	/** Structured result data (e.g. asset list) — sent back to the LLM. */
	data?: unknown;
}

export type ChatStatus =
	| "idle"
	| "streaming"
	| "awaiting-tools"
	| "error"
	| "queued"
	| "retrying";

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

/**
 * A saved conversation the user can switch back to. The currently active
 * conversation is still stored as `messages` + `compactedSummary` for
 * backward compatibility; the history array keeps archived conversations.
 */
export interface Conversation {
	id: string;
	/** User-editable name, falls back to a generated title. */
	name: string;
	/** ISO timestamps for sorting. */
	createdAt: number;
	updatedAt: number;
	messages: ChatMessage[];
	compactedSummary: CompactedSummary | null;
}

/**
 * The status of a single step in an AI plan.
 * - pending: not started
 * - in_progress: the AI is currently working on this step
 * - done: the step is complete
 * - skipped: the step was abandoned (no longer needed)
 */
export type PlanStepStatus = "pending" | "in_progress" | "done" | "skipped";

export interface PlanStep {
	/** Short title shown in the checklist card. */
	title: string;
	/** What this step involves — shown as a subtitle. */
	description: string;
	/** Current status — drives the checkbox / color. */
	status: PlanStepStatus;
}

export interface Plan {
	/** Short title for the overall plan. */
	title: string;
	/** Ordered list of steps. */
	steps: PlanStep[];
	/** ISO timestamp of when the plan was created. */
	createdAt: number;
}

/**
 * User-tunable advanced AI parameters. These control the tool-call loop
 * depth, retry behavior, and auto-compaction thresholds. Persisted to
 * localStorage so the user's preferences survive page reloads.
 */
export interface AdvancedAISettings {
	/** Maximum number of tool-call rounds per message (default: 500). */
	maxToolRounds: number;
	/** Maximum retry attempts on error (default: 10). */
	maxRetryAttempts: number;
	/** Base cooldown in seconds per retry attempt (default: 5). */
	retryCooldownBase: number;
	/** Message count threshold before auto-compaction (default: 20). */
	compactionMessageThreshold: number;
	/** Number of recent messages to keep during compaction (default: 6). */
	compactionKeepLast: number;
	/**
	 * Controls how the AI learns from the user's editing style:
	 *  - "project" — only learn from edits in the current project.
	 *  - "global"  — learn from edits across all projects (cross-project).
	 *  - "off"     — disable style learning entirely.
	 * Default: "off" (opt-in — the user must explicitly enable
	 * learning so their edit data is never collected without consent).
	 */
	learningScope: "project" | "global" | "off";
}

const DEFAULT_ADVANCED_SETTINGS: AdvancedAISettings = {
	maxToolRounds: 500,
	maxRetryAttempts: 10,
	retryCooldownBase: 5,
	compactionMessageThreshold: 20,
	compactionKeepLast: 6,
	learningScope: "off",
};

interface AIState {
	messages: ChatMessage[];
	status: ChatStatus;
	error: string | null;
	styleProfile: StyleProfile | null;
	referenceVideoName: string | null;
	/** Summary of older messages that were compacted away, or null. */
	compactedSummary: CompactedSummary | null;
	/**
	 * Images captured by the AI (via capture_frame) that should be
	 * attached as vision inputs to the next LLM request. Cleared
	 * after each request.
	 */
	pendingImages: string[];
	/**
	 * Messages queued while the AI is busy (streaming/awaiting-tools).
	 * Each entry is the raw user text. When the current request
	 * finishes, the queue is drained FIFO — the first queued message
	 * is sent next.
	 */
	queue: string[];
	/**
	 * Current retry attempt count for the active message. Resets to 0
	 * on a successful response. Used to compute the progressive
	 * cooldown: 5s × attemptCount.
	 */
	retryCount: number;
	/**
	 * Seconds remaining until the next auto-retry. 0 when no retry
	 * is scheduled. The UI shows a countdown when this is > 0.
	 */
	retryIn: number;
	/**
	 * Archived conversations. The active conversation is NOT in this list
	 * until the user starts a new chat or switches to another one.
	 */
	conversations: Conversation[];
	/**
	 * The AI's current plan, shown as a visual checklist in the chat.
	 * Null when no plan is active. A new plan replaces the previous one.
	 */
	plan: Plan | null;
	/**
	 * Advanced AI settings — user-tunable parameters that control the
	 * tool-call loop, retry behavior, and auto-compaction thresholds.
	 * Persisted to localStorage so they survive page reloads.
	 */
	advancedSettings: AdvancedAISettings;
	/** Update one or more advanced settings fields. */
	setAdvancedSettings: (patch: Partial<AdvancedAISettings>) => void;

	/* mutations */
	appendMessage: (m: Omit<ChatMessage, "id" | "timestamp">) => string;
	updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
	/** Remove a single message by id (used during retry cleanup). */
	removeMessage: (id: string) => void;
	/** Start a fresh chat, archiving the current conversation if it has messages. */
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
	/** Add a captured frame (data URL) to be sent with the next request. */
	addPendingImage: (dataUrl: string) => void;
	/** Clear pending images (called after they've been sent to the LLM). */
	clearPendingImages: () => void;
	/** Enqueue a user message to be sent when the current request finishes. */
	enqueue: (text: string) => void;
	/** Dequeue and return the first queued message (FIFO). */
	dequeue: () => string | undefined;
	/** Clear the entire queue (e.g. when user cancels or starts new chat). */
	clearQueue: () => void;
	/** Set the retry attempt count and countdown. */
	setRetry: (count: number, seconds: number) => void;
	/** Decrement the retry countdown by 1 second. */
	tickRetry: () => void;
	/** Reset retry state to 0 (called on success or manual cancel). */
	clearRetry: () => void;
	/** Switch to a saved conversation. */
	loadConversation: (id: string) => void;
	/** Rename a saved conversation. */
	renameConversation: (id: string, name: string) => void;
	/** Delete a saved conversation. */
	deleteConversation: (id: string) => void;
	/** Create a new plan, replacing any existing one. */
	createPlan: (title: string, steps: Array<{ title: string; description: string }>) => void;
	/** Update the status of a plan step by its 0-based index. */
	updatePlanStep: (stepIndex: number, status: PlanStepStatus) => void;
	/** Clear the current plan (e.g. when starting a new chat). */
	clearPlan: () => void;
}

const MAX_PERSISTED_MESSAGES = 50;
const MAX_ARCHIVED_CONVERSATIONS = 30;

function generateConversationName(messages: ChatMessage[]): string {
	const firstUser = messages.find((m) => m.role === "user");
	if (firstUser?.content) {
		const text = firstUser.content.trim();
		if (text.length > 0) {
			// Use the first line, capped at ~40 chars.
			const line = text.split(/\n/)[0] ?? text;
			return line.length > 40 ? `${line.slice(0, 40).trim()}…` : line;
		}
	}
	const date = new Date().toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
	return `Chat ${date}`;
}

export const useAIStore = create<AIState>()(
	persist(
		(set, get) => ({
			messages: [],
			status: "idle",
			error: null,
			styleProfile: null,
			referenceVideoName: null,
			compactedSummary: null,
			pendingImages: [],
			queue: [],
			retryCount: 0,
			retryIn: 0,
			conversations: [],
			plan: null,
			advancedSettings: DEFAULT_ADVANCED_SETTINGS,

			setAdvancedSettings: (patch) => {
				set({
					advancedSettings: { ...get().advancedSettings, ...patch },
				});
			},

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

			removeMessage: (id) => {
				set({ messages: get().messages.filter((m) => m.id !== id) });
			},

			clearConversation: () => {
				const state = get();
				const hasMessages = state.messages.length > 0;
				let conversations = state.conversations;
				if (hasMessages) {
					const now = Date.now();
					conversations = [
						{
							id: crypto.randomUUID(),
							name: generateConversationName(state.messages),
							createdAt: now,
							updatedAt: now,
							messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
							compactedSummary: state.compactedSummary,
						},
						...conversations,
					].slice(0, MAX_ARCHIVED_CONVERSATIONS);
				}
				set({
					messages: [],
					error: null,
					compactedSummary: null,
					queue: [],
					retryCount: 0,
					retryIn: 0,
					conversations,
					plan: null,
				});
			},

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

			addPendingImage: (dataUrl) =>
				set({ pendingImages: [...get().pendingImages, dataUrl] }),
			clearPendingImages: () => set({ pendingImages: [] }),

			enqueue: (text) => set({ queue: [...get().queue, text] }),
			dequeue: () => {
				const queue = get().queue;
				if (queue.length === 0) return undefined;
				const [first, ...rest] = queue;
				set({ queue: rest });
				return first;
			},
			clearQueue: () => set({ queue: [] }),
			setRetry: (count, seconds) =>
				set({ retryCount: count, retryIn: seconds }),
			tickRetry: () => {
				const current = get().retryIn;
				if (current <= 0) return;
				set({ retryIn: current - 1 });
			},
			clearRetry: () => set({ retryCount: 0, retryIn: 0 }),

			loadConversation: (id) => {
				const state = get();
				const target = state.conversations.find((c) => c.id === id);
				if (!target) return;
				// Archive the current active conversation first, then load.
				let conversations = state.conversations.filter((c) => c.id !== id);
				if (state.messages.length > 0) {
					const now = Date.now();
					conversations = [
						{
							id: crypto.randomUUID(),
							name: generateConversationName(state.messages),
							createdAt: now,
							updatedAt: now,
							messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
							compactedSummary: state.compactedSummary,
						},
						...conversations,
					].slice(0, MAX_ARCHIVED_CONVERSATIONS);
				}
				set({
					messages: target.messages.slice(-MAX_PERSISTED_MESSAGES),
					compactedSummary: target.compactedSummary,
					error: null,
					conversations,
					status: "idle",
				});
			},

			renameConversation: (id, name) => {
				set({
					conversations: get().conversations.map((c) =>
						c.id === id
							? {
									...c,
									name: name.trim() || generateConversationName(c.messages),
									updatedAt: Date.now(),
								}
							: c,
					),
				});
			},

			deleteConversation: (id) => {
				set({
					conversations: get().conversations.filter((c) => c.id !== id),
				});
			},

			createPlan: (title, steps) => {
				set({
					plan: {
						title,
						steps: steps.map((s) => ({
							title: s.title,
							description: s.description,
							status: "pending" as const,
						})),
						createdAt: Date.now(),
					},
				});
			},

			updatePlanStep: (stepIndex, status) => {
				const plan = get().plan;
				if (!plan) return;
				if (stepIndex < 0 || stepIndex >= plan.steps.length) return;
				set({
					plan: {
						...plan,
						steps: plan.steps.map((s, i) =>
							i === stepIndex ? { ...s, status } : s,
						),
					},
				});
			},

			clearPlan: () => set({ plan: null }),
		}),
		{
			name: "artidor-ai-chat",
			partialize: (state) => ({
				messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
				styleProfile: state.styleProfile,
				referenceVideoName: state.referenceVideoName,
				compactedSummary: state.compactedSummary,
				conversations: state.conversations.map((c) => ({
					...c,
					messages: c.messages.slice(-MAX_PERSISTED_MESSAGES),
				})),
				advancedSettings: state.advancedSettings,
			}),
		},
	),
);
