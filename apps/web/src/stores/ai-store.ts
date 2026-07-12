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
import { browserStorage } from "@/stores/browser-storage";
import type { StyleProfile } from "@/lib/ai/style/extractor";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
	id: string;
	role: ChatRole;
	content: string;
	/** For assistant messages: tool calls the model asked for. */
	toolCalls?: Array<{
		id?: string;
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
	/** Maximum tokens the model is allowed to return (default: 4096). */
	maxOutputTokens: number;
	/** Maximum messages from the conversation to send per request (default: 100). */
	maxContextMessages: number;
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
	maxOutputTokens: 4096,
	maxContextMessages: 100,
	learningScope: "off",
};

interface AIState {
	/** The project ID this chat belongs to, or null when no project is active. */
	projectId: string | null;
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
	 * Video data URLs captured by `view_asset` that should be attached as
	 * `video_url` vision inputs to the next LLM request, when the active
	 * model supports native video input. Cleared after each request.
	 */
	pendingVideos: string[];
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
	 * Per-project chat data. When the user switches projects, the
	 * current chat state is saved here keyed by project ID, and the
	 * target project's state (if any) is restored.
	 */
	projectChats: Record<
		string,
		{
			messages: ChatMessage[];
			conversations: Conversation[];
			compactedSummary: CompactedSummary | null;
			plan: Plan | null;
			styleProfile: StyleProfile | null;
			referenceVideoName: string | null;
			/**
			 * Maps user message id → command history length at the moment just
			 * before the AI started processing that message. Used to revert
			 * AI edits for a message even after reload. Stored as a plain
			 * object because zustand persist serializes Maps to `{}`.
			 */
			revertSnapshots: Record<string, number>;
		}
	>;
	/**
	 * Maps user message id → command history length at the moment just
	 * before the AI started processing that message. Used to revert AI
	 * edits for a message even after reload. Stored as a plain Record
	 * because zustand persist serializes Maps to `{}`.
	 *
	 * Storage safety: only message ids (already in `messages`) and integer
	 * history lengths are stored. Orphaned snapshots are cleaned on load
	 * and capped to MAX_PERSISTED_MESSAGES to prevent unbounded growth.
	 */
	revertSnapshots: Record<string, number>;
	/**
	 * Advanced AI settings — user-tunable parameters that control the
	 * tool-call loop, retry behavior, and auto-compaction thresholds.
	 * Persisted to localStorage so they survive page reloads.
	 */
	advancedSettings: AdvancedAISettings;
	/** Update one or more advanced settings fields. */
	setAdvancedSettings: (patch: Partial<AdvancedAISettings>) => void;
	/** Switch the chat context to a different project. Saves the current
	 *  chat state under the old project ID and loads the new one's state. */
	switchProject: (projectId: string | null) => void;

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
	/**
	 * Add a video data URL to be sent as a `video_url` vision input with
	 * the next request. Only attached when the active chat model supports
	 * native video input (e.g. Gemini); otherwise the AI manager falls
	 * back to the sample-frame images already in `pendingImages`.
	 */
	addPendingVideo: (dataUrl: string) => void;
	/** Clear pending videos (called after they've been sent or skipped). */
	clearPendingVideos: () => void;
	/** Clear both pending images and pending videos at once. */
	clearPendingMedia: () => void;
	/** Enqueue a user message to be sent when the current request finishes. */
	enqueue: (text: string) => void;
	/** Prepend a message to the front of the queue (used by steer). */
	enqueueSteer: (text: string) => void;
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
	/**
	 * Record (or overwrite) the command-history snapshot for a user message.
	 * Used to revert AI edits for that message later.
	 */
	setRevertSnapshot: (messageId: string, historyLength: number) => void;
	/**
	 * Delete a revert snapshot for a message, plus all snapshots for messages
	 * that appear after it in the conversation.
	 */
	deleteRevertSnapshotsFrom: (messageId: string) => void;
	/**
	 * Remove any revert snapshots whose message id is no longer present in the
	 * active message list. Called automatically after loading persisted state.
	 */
	cleanOrphanedRevertSnapshots: () => void;
	/** Create a new plan, replacing any existing one. */
	createPlan: (
		title: string,
		steps: Array<{ title: string; description: string }>,
	) => void;
	/** Update the status of a plan step by its 0-based index. */
	updatePlanStep: (stepIndex: number, status: PlanStepStatus) => void;
	/** Clear the current plan (e.g. when starting a new chat). */
	clearPlan: () => void;
}

const MAX_PERSISTED_MESSAGES = 50;
const MAX_ARCHIVED_CONVERSATIONS = 30;

/**
 * Keep only revert snapshots whose message id still exists in the
 * message list. This prevents unbounded localStorage growth from
 * orphaned snapshots and keeps the persisted snapshot set aligned
 * with the messages that are actually stored. The snapshot map is
 * tiny (message id → integer), so capping it to `maxCount` provides
 * a hard upper bound on storage per project.
 */
function pruneRevertSnapshots({
	snapshots,
	messages,
	maxCount,
}: {
	snapshots: Record<string, number> | null | undefined;
	messages: ChatMessage[];
	maxCount: number;
}): Record<string, number> {
	const messageIds = new Set(messages.map((m) => m.id));
	const pruned: Record<string, number> = {};
	let count = 0;
	for (const [id, snapshot] of Object.entries(snapshots ?? {})) {
		if (messageIds.has(id)) {
			pruned[id] = snapshot;
			count++;
			if (count >= maxCount) break;
		}
	}
	return pruned;
}

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
			projectId: null,
			messages: [],
			status: "idle",
			error: null,
			styleProfile: null,
			referenceVideoName: null,
			compactedSummary: null,
			pendingImages: [],
			pendingVideos: [],
			queue: [],
			retryCount: 0,
			retryIn: 0,
			conversations: [],
			plan: null,
			projectChats: {},
			revertSnapshots: {},
			advancedSettings: DEFAULT_ADVANCED_SETTINGS,

			setAdvancedSettings: (patch) => {
				set({
					advancedSettings: { ...get().advancedSettings, ...patch },
				});
			},

			switchProject: (projectId) => {
				const state = get();
				if (state.projectId === projectId) return;

				// Save the current project's chat state.
				const oldProjectId = state.projectId;
				const projectChats = { ...state.projectChats };
				if (oldProjectId) {
					projectChats[oldProjectId] = {
						messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
						conversations: state.conversations.map((c) => ({
							...c,
							messages: c.messages.slice(-MAX_PERSISTED_MESSAGES),
						})),
						compactedSummary: state.compactedSummary,
						plan: state.plan,
						styleProfile: state.styleProfile,
						referenceVideoName: state.referenceVideoName,
						revertSnapshots: pruneRevertSnapshots({
							snapshots: state.revertSnapshots,
							messages: state.messages,
							maxCount: MAX_PERSISTED_MESSAGES,
						}),
					};
				}

				// Load the new project's chat state (or start fresh).
				const saved = projectId ? projectChats[projectId] : undefined;
				set({
					projectId,
					messages: saved?.messages ?? [],
					conversations: saved?.conversations ?? [],
					compactedSummary: saved?.compactedSummary ?? null,
					plan: saved?.plan ?? null,
					styleProfile: saved?.styleProfile ?? null,
					referenceVideoName: saved?.referenceVideoName ?? null,
					revertSnapshots: pruneRevertSnapshots({
						snapshots: saved?.revertSnapshots ?? {},
						messages: saved?.messages ?? [],
						maxCount: MAX_PERSISTED_MESSAGES,
					}),
					error: null,
					queue: [],
					retryCount: 0,
					retryIn: 0,
					status: "idle",
					pendingImages: [],
					pendingVideos: [],
					projectChats,
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

			addPendingVideo: (dataUrl) =>
				set({ pendingVideos: [...get().pendingVideos, dataUrl] }),
			clearPendingVideos: () => set({ pendingVideos: [] }),
			clearPendingMedia: () => set({ pendingImages: [], pendingVideos: [] }),

			enqueue: (text) => set({ queue: [...get().queue, text] }),
			enqueueSteer: (text) => set({ queue: [text, ...get().queue] }),
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

			setRevertSnapshot: (messageId, historyLength) => {
				set({
					revertSnapshots: {
						...get().revertSnapshots,
						[messageId]: historyLength,
					},
				});
			},

			deleteRevertSnapshotsFrom: (messageId) => {
				const messages = get().messages;
				const idx = messages.findIndex((m) => m.id === messageId);
				if (idx === -1) return;

				const idsToKeep = new Set(messages.slice(0, idx).map((m) => m.id));
				const pruned: Record<string, number> = {};
				for (const [id, snapshot] of Object.entries(get().revertSnapshots)) {
					if (idsToKeep.has(id)) pruned[id] = snapshot;
				}
				set({ revertSnapshots: pruned });
			},

			cleanOrphanedRevertSnapshots: () => {
				const messageIds = new Set(get().messages.map((m) => m.id));
				const pruned: Record<string, number> = {};
				let count = 0;
				for (const [id, snapshot] of Object.entries(get().revertSnapshots)) {
					if (messageIds.has(id)) {
						pruned[id] = snapshot;
						count++;
						if (count >= MAX_PERSISTED_MESSAGES) break;
					}
				}
				set({ revertSnapshots: pruned });
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
			storage: browserStorage,
			partialize: (state) => ({
				projectId: state.projectId,
				messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
				styleProfile: state.styleProfile,
				referenceVideoName: state.referenceVideoName,
				compactedSummary: state.compactedSummary,
				conversations: state.conversations.map((c) => ({
					...c,
					messages: c.messages.slice(-MAX_PERSISTED_MESSAGES),
				})),
				projectChats: Object.fromEntries(
					Object.entries(state.projectChats).map(([id, chat]) => [
						id,
						{
							...chat,
							messages: chat.messages.slice(-MAX_PERSISTED_MESSAGES),
							conversations: chat.conversations.map((c) => ({
								...c,
								messages: c.messages.slice(-MAX_PERSISTED_MESSAGES),
							})),
							revertSnapshots: pruneRevertSnapshots({
								snapshots: chat.revertSnapshots,
								messages: chat.messages,
								maxCount: MAX_PERSISTED_MESSAGES,
							}),
						},
					]),
				),
				revertSnapshots: pruneRevertSnapshots({
					snapshots: state.revertSnapshots,
					messages: state.messages,
					maxCount: MAX_PERSISTED_MESSAGES,
				}),
				advancedSettings: state.advancedSettings,
			}),
			merge: (persisted, current) => {
				const p = persisted as Partial<AIState> | undefined;
				return {
					...current,
					...p,
					advancedSettings: {
						...current.advancedSettings,
						...(p?.advancedSettings ?? {}),
					},
				} as AIState;
			},
			onRehydrateStorage: (state) => {
				// After zustand rehydrates from localStorage, remove any
				// revert snapshots that no longer have a matching message.
				// This defends against stale data from older app versions or
				// truncated persisted message lists. We do the cleanup inline
				// using the rehydrated state instead of calling an action,
				// because the store's `get()` may not be ready during the
				// rehydrate callback.
				if (!state) return;
				const messageIds = new Set(state.messages.map((m) => m.id));
				const pruned: Record<string, number> = {};
				let count = 0;
				for (const [id, snapshot] of Object.entries(state.revertSnapshots)) {
					if (messageIds.has(id)) {
						pruned[id] = snapshot;
						count++;
						if (count >= MAX_PERSISTED_MESSAGES) break;
					}
				}
				state.revertSnapshots = pruned;
			},
		},
	),
);
