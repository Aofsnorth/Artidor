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
import { useAIControlStore, type ActiveToolCall } from "@/stores/ai-control-store";
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
	 * Monotonically increasing cycle counter. Each processMessage call
	 * captures its own cycle number at the start. In the finally block,
	 * cleanup only runs if this is still the latest cycle — this prevents
	 * a cancelled cycle's finally from clobbering a new cycle's takeover
	 * state (race condition when the user revokes + immediately resends).
	 */
	private processCycle = 0;
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

	/**
	 * Throttled notify for streaming. Batches re-renders to at most one
	 * per animation frame (~16ms) instead of firing on every delta chunk.
	 *
	 * Without this, switching away from the tab causes the browser to
	 * buffer incoming SSE chunks; when the tab regains focus, hundreds
	 * of chunks are processed in a tight synchronous loop, each calling
	 * notify() → React re-render, freezing the main thread. The store
	 * is still updated on every chunk (so the latest text is always
	 * available), but the UI only re-renders once per frame.
	 *
	 * rAF naturally pauses in background tabs and resumes on focus,
	 * so the coalesced update fires exactly once when the user returns.
	 */
	private notifyPending = false;
	private notifyRafId: number | null = null;
	private scheduleNotify(): void {
		// If a frame is already scheduled, the trailing call will carry
		// the latest store state — no need to schedule another.
		if (this.notifyPending) return;
		this.notifyPending = true;
		this.notifyRafId = requestAnimationFrame(() => {
			this.notifyPending = false;
			this.notifyRafId = null;
			this.notify();
		});
	}

	/** Flush any pending throttled notify immediately. */
	private flushNotify(): void {
		if (this.notifyRafId !== null) {
			cancelAnimationFrame(this.notifyRafId);
			this.notifyRafId = null;
		}
		this.notifyPending = false;
		this.notify();
	}

	/**
	 * Tools that modify the editor document (timeline, scene, project
	 * settings, media library). These require the user's takeover
	 * approval before the AI can execute them. Read-only tools
	 * (list_assets, view_asset, list_elements, capture_frame, web_fetch,
	 * plan tools, generate_* — generation doesn't touch the document
	 * directly) are exempt.
	 */
	private static readonly EDITOR_MODIFYING_TOOLS = new Set<string>([
		"set_project_fps",
		"set_project_canvas",
		"set_project_background",
		"save_project",
		"create_scene",
		"rename_scene",
		"delete_scene",
		"switch_scene",
		"add_bookmark",
		"remove_bookmark",
		"add_track",
		"remove_track",
		"set_track_muted",
		"set_track_visible",
		"insert_text_element",
		"insert_camera_layer",
		"insert_null_layer",
		"move_element",
		"split_element",
		"delete_elements",
		"update_element",
		"duplicate_elements",
		"group_elements",
		"ungroup_elements",
		"combine_elements",
		"set_parent",
		"unlink_parent",
		"add_clip_effect",
		"remove_clip_effect",
		"update_clip_effect_params",
		"remove_mask",
		"toggle_effect_enabled",
		"reorder_effects",
		"toggle_mask_inverted",
		"upsert_keyframe",
		"remove_keyframe",
		"retime_keyframe",
		"upsert_effect_param_keyframe",
		"remove_effect_param_keyframe",
		"paste_keyframes",
		"add_transition",
		"remove_transition",
		"update_transition",
		"play",
		"pause",
		"seek",
		"set_volume",
		"toggle_source_audio_separation",
		"add_media_to_timeline",
		"import_and_add_to_timeline",
		"import_asset_from_url",
		"delete_asset",
		"create_folder",
		"rename_folder",
		"delete_folder",
		"move_asset_to_folder",
		"apply_preset",
		"export_project",
		"undo",
		"redo",
		"select_elements",
		"clear_selection",
		"copy",
		"paste",
		"copy-style",
		"paste-style",
		"copy-effect",
		"paste-effect",
	]);

	/**
	 * Heuristic: does this chat model accept native video input (as a
	 * `video_url` content part)? Currently only Gemini-family models are
	 * known to support inline video through the OpenAI-compatible / Puter.js
	 * content shape. When false, `view_asset` falls back to attaching
	 * sample frames as `image_url` parts, which every vision model accepts.
	 *
	 * The match is intentionally broad (substring on the lowercased model
	 * id) so new Gemini variants don't need a code change here.
	 */
	private static modelSupportsVideo(model: string | undefined): boolean {
		if (!model) return false;
		const id = model.toLowerCase();
		return id.includes("gemini");
	}

	/**
	 * Heuristic: does this chat model accept image/vision input at all?
	 * Used to decide whether attaching `image_url` parts is worthwhile.
	 * Most modern chat models are vision-capable; we only exclude known
	 * text-only model families to avoid sending unsupported parts that
	 * could cause provider errors.
	 */
	private static modelSupportsVision(model: string | undefined): boolean {
		if (!model) return true; // assume capable unless known otherwise
		const id = model.toLowerCase();
		// Known text-only families that reject image_url parts.
		const textOnly = [
			"gpt-3.5", "deepseek-r1", "deepseek-v3", "o1-mini", "o1-preview",
			"llama-3", "llama3", "mistral-7b", "qwen-2", "qwen2",
		];
		return !textOnly.some((p) => id.includes(p));
	}

	/**
	 * Map a tool name + args to an {@link ActiveToolCall} descriptor for
	 * the takeover UI (label, action verb, affected element/track IDs).
	 * This is what drives the timeline highlight + animation.
	 */
	private describeToolCall(
		name: string,
		args: Record<string, unknown>,
	): Omit<ActiveToolCall, "startedAt"> {
		const ids = (v: unknown): string[] =>
			Array.isArray(v)
				? v
						.map((x) =>
							typeof x === "string"
								? x
								: x && typeof x === "object" && "elementId" in x
									? String((x as { elementId: unknown }).elementId)
									: "",
						)
						.filter(Boolean)
				: typeof v === "string"
					? [v]
					: [];
		const elementIds = ids(args.elementId ?? args.elementIds);
		const trackIds = ids(args.trackId ?? args.targetTrackId ?? args.sourceTrackId);
		const labelMap: Record<string, string> = {
			move_element: "Moving clip",
			split_element: "Splitting clip",
			delete_elements: "Deleting clip",
			update_element: "Updating clip",
			duplicate_elements: "Duplicating clip",
			insert_text_element: "Adding text",
			insert_camera_layer: "Adding camera",
			insert_null_layer: "Adding null layer",
			add_media_to_timeline: "Adding media",
			import_and_add_to_timeline: "Importing media",
			add_clip_effect: "Adding effect",
			remove_clip_effect: "Removing effect",
			update_clip_effect_params: "Tuning effect",
			add_transition: "Adding transition",
			remove_transition: "Removing transition",
			upsert_keyframe: "Adding keyframe",
			remove_keyframe: "Removing keyframe",
			add_track: "Adding track",
			remove_track: "Removing track",
			seek: "Seeking",
			play: "Playing",
			pause: "Pausing",
			export_project: "Exporting",
		};
		const actionMap: Record<string, ActiveToolCall["action"]> = {
			move_element: "move",
			split_element: "split",
			delete_elements: "delete",
			insert_text_element: "insert",
			insert_camera_layer: "insert",
			insert_null_layer: "insert",
			add_media_to_timeline: "insert",
			import_and_add_to_timeline: "insert",
			duplicate_elements: "insert",
			update_element: "update",
			update_clip_effect_params: "effect",
			add_clip_effect: "effect",
			remove_clip_effect: "effect",
			toggle_effect_enabled: "effect",
			reorder_effects: "effect",
			add_transition: "effect",
			remove_transition: "effect",
			update_transition: "effect",
			upsert_keyframe: "update",
			remove_keyframe: "update",
			retime_keyframe: "update",
		};
		return {
			name,
			label: labelMap[name] ?? "Editing",
			elementIds,
			trackIds,
			action: actionMap[name] ?? "other",
		};
	}

	/**
	 * Request takeover approval. If the user already approved this
	 * session, resolves immediately. Otherwise triggers the permission
	 * dialog and waits for the user's decision.
	 *
	 * When the user has enabled "bypass" permission mode (Settings → AI),
	 * the dialog is skipped entirely and takeover is auto-approved for
	 * the session. The aurora overlay still renders so the user can see
	 * the AI is active and revoke at any time.
	 *
	 * @returns true if approved, false if denied.
	 */
	private async requestTakeoverApproval(signal: AbortSignal): Promise<boolean> {
		const control = useAIControlStore.getState();
		if (control.sessionApproved) {
			// Already approved — ensure state is active and proceed.
			if (control.takeoverState !== "active") {
				useAIControlStore.getState().requestTakeover();
			}
			return true;
		}
		// Bypass mode: skip the permission dialog entirely. Mark the
		// session as approved so subsequent batches in the same session
		// also skip, and flip straight to "active" so the aurora overlay
		// shows the AI is in control.
		if (useSettingsStore.getState().aiPermissionMode === "bypass") {
			useAIControlStore.getState().approveTakeover();
			this.notify();
			return true;
		}
		// Request — this flips state to "requesting" which shows the dialog.
		useAIControlStore.getState().requestTakeover();
		this.notify();
		// Wait for the user to approve or deny. We poll the store because
		// zustand doesn't expose a promise-based wait. The poll is cheap
		// (every 120ms) and stops as soon as the state leaves "requesting".
		while (!signal.aborted) {
			await new Promise((r) => setTimeout(r, 120));
			const s = useAIControlStore.getState();
			if (s.takeoverState === "active") return true;
			if (s.takeoverState === "idle") return false;
			// still "requesting" → keep waiting
		}
		return false;
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
		// Assign a unique cycle number so the finally block can detect
		// if a newer processMessage has started (via cancel+resend or
		// steer). If a newer cycle exists, this cycle's finally must NOT
		// reset isProcessing or end the takeover — the newer cycle owns
		// those. Without this guard, the old cycle's finally clobbers
		// the new cycle's takeover state (race condition that makes the
		// aurora overlay + revoke button vanish after revoke+resend).
		const myCycle = ++this.processCycle;
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
			// edits for this message later if the user asks. Persisted in
			// the AI store so reverts still work after reload.
			if (userMessageId) {
				ai.setRevertSnapshot(
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
					// Populate the countdown so the retry UI shows the real
					// remaining seconds instead of "0s". The retry block in
					// the chat panel renders `{retryIn}s` whenever the status
					// is "retrying"; without setting retryIn the in-round
					// backoff wait displayed a misleading "0s" countdown.
					const delaySeconds = Math.max(1, Math.round(delay / 1000));
					useAIStore.getState().setStatus("retrying");
					useAIStore.getState().setRetry(attempt + 1, delaySeconds);
					useAIStore.getState().setError(
						`${lastError} — retrying (${attempt + 1}/${MAX_IN_ROUND_RETRIES}) in ${delaySeconds}s…`,
					);
					this.notify();
					// Tick the per-second countdown during the backoff wait so
					// the UI counts down live (mirrors scheduleRetry's timer).
					this.clearRetryTimer();
					this.retryTimer = setInterval(() => {
						const current = useAIStore.getState();
						current.tickRetry();
						if (current.retryIn > 0) {
							current.setError(
								`${lastError} — retrying (${attempt + 1}/${MAX_IN_ROUND_RETRIES}) in ${current.retryIn}s…`,
							);
						}
						this.notify();
					}, 1000);
					// Wait before retrying (exponential backoff).
					await new Promise((resolve) => setTimeout(resolve, delay));
					this.clearRetryTimer();
					if (signal.aborted) return;
					// Transition back to streaming so the "Thinking…" indicator
					// shows while the next attempt's request is in flight,
					// rather than leaving the stale retry countdown visible.
					useAIStore.getState().setStatus("streaming");
					this.notify();
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
					useAIControlStore.getState().endTakeover();
					// Build a clear, actionable error message. Distinguish a real
					// network problem from a model/provider error so the user isn't
					// told "connection failed" when the underlying issue is the LLM
					// itself (e.g. Puter.js model error).
					const isConnectionError =
						/connection|network|fetch|abort|timeout|unreachable/i.test(
							lastError,
						);
					const projectProviderId =
						this.editor.project.getActive()?.metadata.aiProviderId ?? null;
					const provider = getDefaultProvider(projectProviderId);
					const providerName = provider?.kind === "puter" ? "Puter.js" : "AI provider";
					const summary = isConnectionError
						? `The connection to ${providerName} could not be recovered after ${MAX_IN_ROUND_RETRIES} attempts. Check your network and try again.`
						: `The active provider (${providerName}) returned an error after ${MAX_IN_ROUND_RETRIES} attempts: ${lastError}`;
					useAIStore.getState().setError(
						`AI stopped after completing ${round} round${round > 1 ? "s" : ""} of actions. ${summary} Send a new message to continue.`,
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
				// If the model returned an empty/whitespace-only message
				// (e.g. only thinking tags that got stripped, or a bare
				// end-of-turn token), drop it so the chat doesn't show a
				// blank "card box" bubble and the empty assistant turn
				// doesn't confuse the next LLM request.
				const store = useAIStore.getState();
				const last = store.messages.at(-1);
				if (
					last &&
					last.id === result.assistantId &&
					last.role === "assistant" &&
					!last.content?.trim() &&
					!last.toolCalls?.length
				) {
					store.removeMessage(result.assistantId);
					this.notify();
				}
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
		// End the AI takeover — the editor is interactive again.
		useAIControlStore.getState().endTakeover();
		this.notify();

		// If there are queued messages, send the next one.
		this.drainQueue();
		} finally {
			// Only clean up if we're still the latest cycle. If a newer
			// processMessage has started (cancel+resend, steer), it has
			// its own cycle number and its own finally block — cleaning
			// up here would clobber the new cycle's isProcessing flag
			// and takeover state, causing the aurora overlay + revoke
			// button to vanish and the AI to appear stuck.
			if (this.processCycle === myCycle) {
				this.isProcessing = false;
				// Safety net: ensure takeover ends even on early returns
				// (e.g. uncaught throw, max-rounds exit). On normal
				// completion, endTakeover() was already called above.
				if (useAIControlStore.getState().takeoverState !== "idle") {
					useAIControlStore.getState().endTakeover();
				}
			}
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

		// Make the request. Include the user's selected provider config so
		// the server uses the client-managed endpoint rather than env vars.
		// Pass the project's per-project provider override if set.
		const projectProviderId =
			this.editor.project.getActive()?.metadata.aiProviderId ?? null;
		const providerConfig = getDefaultProvider(projectProviderId);

		// Attach pending captured frames / video as vision inputs to the
		// last user message. This lets the LLM "see" what capture_frame or
		// view_asset captured when it processes the next turn. Video data
		// URLs are only attached as `video_url` parts when the active chat
		// model supports native video input (e.g. Gemini); otherwise the
		// sample frames (already in pendingImages) are used instead.
		const pendingImages = storeState.pendingImages;
		const pendingVideos = storeState.pendingVideos;
		const activeModel = providerConfig?.model;
		const attachVideo =
			pendingVideos.length > 0 &&
			AIManager.modelSupportsVideo(activeModel);
		// Skip attaching image parts when the active model is known to be
		// text-only — sending image_url parts to such models causes provider
		// errors. The pending media is still cleared so we don't retry
		// forever. Video parts are already gated by modelSupportsVideo.
		const visionCapable = AIManager.modelSupportsVision(activeModel);
		const attachImages = pendingImages.length > 0 && visionCapable;
		const hasPendingMedia =
			pendingImages.length > 0 || pendingVideos.length > 0;
		if (hasPendingMedia) {
			if (attachImages || attachVideo) {
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
					// When the model supports native video, skip the sample
					// frames and send the video directly — the frames were
					// only a fallback for non-video-capable models.
					// `attachImages` already accounts for vision capability,
					// so we never send image parts to a text-only model.
					const imageParts = (attachImages && !attachVideo
						? pendingImages
						: []
					).map((url) => ({
						type: "image_url" as const,
						image_url: { url },
					}));
					const videoParts = attachVideo
						? pendingVideos.map((url) => ({
								type: "video_url" as const,
								video_url: { url },
							}))
						: [];
					messages[realIdx] = {
						role: "user",
						content: [
							{ type: "text", text: userText },
							...imageParts,
							...videoParts,
						],
					};
				}
			}
			// Always clear pending media after attempting to attach — even
			// when the active model can't accept vision/video parts, we
			// don't want stale media accumulating across requests.
			useAIStore.getState().clearPendingMedia();
		}
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
			const builtInToolDefs = getFilteredToolDefinitions({
				videoModel: providerConfig.videoModel,
				imageModel: providerConfig.imageModel,
				audioModel: providerConfig.audioModel,
				mediaModel: providerConfig.mediaModel,
			});
			const builtInTools = builtInToolDefs.map((t) => ({
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
			// IMPORTANT: pass BOTH built-in tool definitions and MCP tools
			// to the Puter.js chat API. Without the built-in tool defs,
			// Claude can see tool names in the system prompt text but
			// cannot actually call them via the native function-calling API.
			const allTools = [...builtInToolDefs, ...externalTools];
			return await this.streamPuterResponse(
				messagesWithSystem,
				providerConfig.model,
				allTools,
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
						this.scheduleNotify();
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

		// Flush any pending throttled notify so the final state is
		// rendered before the caller proceeds.
		this.flushNotify();
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
					this.scheduleNotify();
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
			const baseMessage = err instanceof Error ? err.message : "Puter.js stream error";
			const message = `Puter.js (${model}): ${baseMessage}`;
			this.scheduleRetry("", message);
			return { kind: "error", message };
		}

		// Flush any pending throttled notify so the final state is
		// rendered before the caller proceeds.
		this.flushNotify();
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

		// AI takeover gate: if any tool in this batch modifies the editor,
		// request the user's approval before executing. Once approved for
		// the session, subsequent batches skip the dialog. If denied, we
		// record a refusal for every modifying tool and skip execution.
		const hasModifying = toolCalls.some(
			(tc) =>
				AIManager.EDITOR_MODIFYING_TOOLS.has(tc.name) ||
				tc.name.startsWith("mcp__"),
		);
		if (hasModifying && !signal.aborted) {
			const approved = await this.requestTakeoverApproval(signal);
			if (!approved) {
				for (const tc of toolCalls) {
					results.push({
						name: tc.name,
						ok: false,
						message:
							"User denied AI takeover. The editor is locked until you approve. Ask the user to allow takeover, then retry.",
					});
				}
				this.finalizeToolCallRecords(assistantId, toolCalls, results);
				return;
			}
		}

		for (const tc of toolCalls) {
			if (signal.aborted) return;
			// Yield to the event loop (macrotask) before each tool so
			// pending UI events — especially the Revoke click on the
			// aurora overlay — can be processed. Without this, the
			// `await executeTool` only yields microtasks (the handler
			// resolves synchronously), so click events stay queued and
			// the screen appears frozen until the entire batch finishes.
			await new Promise((r) => setTimeout(r, 0));
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
				const plan = useAIStore.getState().plan;
				const validStatuses = ["pending", "in_progress", "done", "skipped"];
				if (!Number.isInteger(stepIndex)) {
					results.push({
						name: tc.name,
						ok: false,
						message: `stepIndex must be an integer (0-based), got ${JSON.stringify(tc.arguments.stepIndex)}`,
					});
				} else if (stepIndex < 0) {
					results.push({
						name: tc.name,
						ok: false,
						message: `stepIndex must be >= 0, got ${stepIndex}`,
					});
				} else if (!validStatuses.includes(status)) {
					results.push({
						name: tc.name,
						ok: false,
						message: `status must be one of ${validStatuses.join("|")}, got ${JSON.stringify(tc.arguments.status)}`,
					});
				} else if (!plan) {
					results.push({
						name: tc.name,
						ok: false,
						message: "No active plan — call create_plan before update_todo",
					});
				} else if (stepIndex >= plan.steps.length) {
					results.push({
						name: tc.name,
						ok: false,
						message: `stepIndex ${stepIndex} is out of range; the current plan has ${plan.steps.length} step${plan.steps.length === 1 ? "" : "s"} (0-based). Use index 0..${plan.steps.length - 1}.`,
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
				// Track the active tool call so the takeover UI can
				// highlight/animate the affected elements. Only editor-
				// modifying tools surface a descriptor; read-only tools
				// (list_*, capture_frame, web_fetch) skip it.
				const isModifying = AIManager.EDITOR_MODIFYING_TOOLS.has(tc.name);
				if (isModifying) {
					useAIControlStore.getState().setActiveToolCall(
						this.describeToolCall(tc.name, tc.arguments),
					);
					this.notify();
				}
				const r = await executeTool({
					editor: this.editor,
					toolName: tc.name,
					arguments: tc.arguments,
					source: "ai",
				});
				if (isModifying) {
					useAIControlStore.getState().clearActiveToolCall();
				}
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
				// view_asset returns visual content to attach as vision
				// inputs for the next LLM turn. Images go straight to
				// pendingImages. Videos provide both sample frames AND a
				// native video data URL — the manager picks which to send
				// based on the active model's video capability (see
				// streamLLMResponse). Audio has no visual content.
				if (tc.name === "view_asset" && r.ok) {
					const data = r.data as
						| {
								kind: "image" | "video-frames" | "audio";
								dataUrl?: string;
								frames?: Array<{ dataUrl: string; timeSeconds: number }>;
								videoDataUrl?: string;
						  }
						| undefined;
					if (!data) continue;
					if (data.kind === "image" && data.dataUrl) {
						useAIStore.getState().addPendingImage(data.dataUrl);
					} else if (data.kind === "video-frames") {
						// Queue the native video URL — it's only attached if
						// the active model supports video; otherwise the
						// frames below are used as the fallback.
						if (data.videoDataUrl) {
							useAIStore.getState().addPendingVideo(data.videoDataUrl);
						}
						for (const f of data.frames ?? []) {
							useAIStore.getState().addPendingImage(f.dataUrl);
						}
					}
					// kind === "audio": nothing to attach visually.
				}
				// Notify after each tool so the editor UI re-renders
				// immediately (e.g. timeline shows the new element).
				this.notify();
			}
		}

		this.finalizeToolCallRecords(assistantId, toolCalls, results);
	}

	/**
	 * Finalise the assistant message with the tool-call record and append
	 * `tool`-role messages with the results so the next LLM round can see
	 * what each tool returned. Extracted from `executeAndRecordToolCalls`
	 * so the takeover-denial path can reuse it without duplicating logic.
	 */
	private finalizeToolCallRecords(
		assistantId: string,
		toolCalls: ToolCallRound[],
		results: Array<{
			name: string;
			ok: boolean;
			message?: string;
			data?: unknown;
		}>,
	): void {
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
	 * Dispose of the manager's resources. Clears the retry timer and
	 * aborts any in-flight request. Safe to call multiple times —
	 * subsequent calls are no-ops once everything has been cleaned up.
	 */
	dispose(): void {
		this.clearRetryTimer();
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		console.debug("[AIManager] dispose() — retry timer and abort controller cleaned up");
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
		useAIControlStore.getState().endTakeover();
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
		useAIControlStore.getState().endTakeover();
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
	 * The snapshot is read from the persisted AI store, so reverts work
	 * even after the user reloads the page. Snapshots for the reverted
	 * message and all later messages are deleted because the conversation
	 * is being trimmed.
	 *
	 * Returns true if the revert was performed, false if no snapshot
	 * was found for the given message id.
	 */
	revertToMessage(messageId: string): boolean {
		const ai = useAIStore.getState();
		const snapshot = ai.revertSnapshots[messageId];
		if (snapshot === undefined) return false;

		const commands = this.editor.command;
		const targetLength = snapshot;
		let undone = 0;
		while (commands.getHistoryLength() > targetLength && commands.canUndo()) {
			commands.undo();
			undone++;
		}

		// Delete the snapshot for the reverted message AND all later
		// messages. The conversation is trimmed at `messageId`, so any
		// snapshots after it are no longer valid.
		ai.deleteRevertSnapshotsFrom(messageId);

		// Trim the conversation: remove the user message and everything
		// after it, since the AI's response is being reverted.
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
