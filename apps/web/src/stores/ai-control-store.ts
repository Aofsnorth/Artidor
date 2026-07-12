/**
 * AI Control Takeover store — tracks the AI's "take control" state when it
 * drives the editor on behalf of the user.
 *
 * Lifecycle:
 *  1. The AI requests takeover before executing editor-modifying tools.
 *     If the user hasn't approved this session, state → "requesting" and a
 *     permission dialog is shown.
 *  2. The user approves → state → "active", `sessionApproved = true`.
 *     Subsequent tool calls in the same session skip the dialog.
 *  3. The user denies → state → "idle", `sessionApproved = false`, and the
 *     pending tool batch is rejected.
 *  4. While active, `activeToolCall` describes the tool the AI is currently
 *     executing so the UI can highlight/animate the affected elements.
 *  5. When the AI's message cycle ends (success, cancel, or error), state
 *     returns to "idle" but `sessionApproved` persists for the session.
 *
 * This is intentionally separate from `ai-store` so the editor chrome
 * (which doesn't render the chat) can subscribe to takeover state without
 * pulling in the full chat history.
 */

import { create } from "zustand";

export type AITakeoverState = "idle" | "requesting" | "active";

/**
 * Describes the editor-modifying tool the AI is currently executing, so the
 * timeline / preview can animate the affected elements.
 */
export interface ActiveToolCall {
	/** The tool name (e.g. "move_element", "split_element"). */
	name: string;
	/** A short human-readable label for the action (e.g. "Moving clip"). */
	label: string;
	/** Element IDs the tool touches, used for highlight/animation. */
	elementIds: string[];
	/** Track IDs the tool touches, used for highlight/animation. */
	trackIds: string[];
	/** High-level action verb for animation styling. */
	action:
		| "move"
		| "split"
		| "delete"
		| "insert"
		| "update"
		| "effect"
		| "other";
	/** ISO timestamp when the tool call started. */
	startedAt: number;
}

interface AIControlState {
	/** Current takeover phase. Drives the aurora overlay + editor lock. */
	takeoverState: AITakeoverState;
	/**
	 * Whether the user has approved AI takeover for this browser session.
	 * Once true, subsequent tool batches skip the permission dialog until
	 * the user explicitly revokes (or the tab is closed).
	 */
	sessionApproved: boolean;
	/**
	 * The tool call currently being executed by the AI, or null when idle.
	 * The timeline/preview subscribe to this to animate affected elements.
	 */
	activeToolCall: ActiveToolCall | null;
	/**
	 * A monotonically increasing counter that bumps every time a tool call
	 * starts. Components can subscribe to this to trigger transition
	 * animations even when the activeToolCall identity stays similar.
	 */
	toolCallTick: number;

	/** Request takeover — shows the permission dialog if not yet approved. */
	requestTakeover: () => void;
	/** Approve the takeover request (called from the permission dialog). */
	approveTakeover: () => void;
	/** Deny the takeover request (called from the permission dialog). */
	denyTakeover: () => void;
	/** Revoke session approval (user-initiated "stop letting AI control"). */
	revokeApproval: () => void;
	/**
	 * Mark a tool call as active. Called by the AI manager right before
	 * executing an editor-modifying tool.
	 */
	setActiveToolCall: (call: Omit<ActiveToolCall, "startedAt">) => void;
	/** Clear the active tool call (called after a tool finishes). */
	clearActiveToolCall: () => void;
	/** Transition takeover state to idle (called when the AI cycle ends). */
	endTakeover: () => void;
}

export const useAIControlStore = create<AIControlState>((set) => ({
	takeoverState: "idle",
	sessionApproved: false,
	activeToolCall: null,
	toolCallTick: 0,

	requestTakeover: () =>
		set((state) => {
			// If already approved, skip straight to active — no dialog.
			if (state.sessionApproved) {
				return { takeoverState: "active" };
			}
			return { takeoverState: "requesting" };
		}),

	approveTakeover: () =>
		set({
			takeoverState: "active",
			sessionApproved: true,
		}),

	denyTakeover: () =>
		set({
			takeoverState: "idle",
			sessionApproved: false,
			activeToolCall: null,
		}),

	revokeApproval: () =>
		set({
			takeoverState: "idle",
			sessionApproved: false,
			activeToolCall: null,
		}),

	setActiveToolCall: (call) =>
		set((state) => ({
			activeToolCall: { ...call, startedAt: Date.now() },
			toolCallTick: state.toolCallTick + 1,
			// Ensure takeover is active while a tool is running.
			takeoverState: state.sessionApproved ? "active" : state.takeoverState,
		})),

	clearActiveToolCall: () => set({ activeToolCall: null }),

	endTakeover: () => set({ takeoverState: "idle", activeToolCall: null }),
}));
