/**
 * AI Edit panel — chat with the LLM, see what it's doing, attach a
 * reference video, and watch the editor's state update in real time.
 *
 * Layout: a vertical stack inside the assets-panel area.
 *  1. Status bar (provider + reference profile + recent edits count).
 *  2. Quick-action chips.
 *  3. Message list.
 *  4. Composer (text input + send).
 *
 * No external icon library beyond Hugeicons (already in the bundle).
 * The styling uses the existing `.panel` / `.glass` utilities so it
 * matches every other panel in the editor.
 */

"use client";

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type FormEvent,
	type KeyboardEvent,
} from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown03Icon,
	AlertCircleIcon,
	ArrowTurnBackwardIcon,
	ArrowTurnForwardIcon,
	ArrowUp02Icon,
	AttachmentIcon,
	BackgroundIcon,
	Bookmark01Icon,
	Bookmark02Icon,
	Cancel01Icon,
	Chat01Icon,
	CheckmarkCircle02Icon,
	CheckmarkSquare01Icon,
	ColorsIcon,
	CombineIcon,
	Copy01Icon,
	Copy02Icon,
	Delete01Icon,
	Delete02Icon,
	Delete03Icon,
	Edit01Icon,
	EyeIcon,
	Film01Icon,
	FileImportIcon,
	Grid02Icon,
	Image01Icon,
	Key01Icon,
	Link01Icon,
	Move01Icon,
	MagicWand05Icon,
	MusicNote03Icon,
	PaintBrushIcon,
	PuzzleIcon,
	SaveIcon,
	ScissorIcon,
	Search01Icon,
	SlidersHorizontalIcon,
	SlidersVerticalIcon,
	SparklesIcon,
	StopIcon,
	Settings01Icon,
	Settings02Icon,
	SourceCodeIcon,
	TextIcon,
	TransitionLeftIcon,
	Unlink01Icon,
	Unlink02Icon,
	Upload01Icon,
	Video01Icon,
	VolumeHighIcon,
	VolumeMute01Icon,
	Globe02Icon,
	Group01Icon,
	Camera01Icon,
	PlugIcon,
	ChatAdd01Icon,
	FilmIcon,
	LayersIcon,
	CropIcon,
	PlayIcon,
	Folder01Icon,
	PaintBoardIcon,
	FileExportIcon,
	Clock01Icon,
	Cursor02Icon,
	ClipboardCheckIcon,
	ClipboardPasteIcon,
	CheckListIcon,
	CaptionsIcon,
	AdjustPositionIcon,
	Target01Icon,
	FilterIcon,
} from "@hugeicons/core-free-icons";
import { useAIStore, type ChatMessage, type Plan } from "@/stores/ai-store";
import { useAIProvidersStore } from "@/stores/ai-providers-store";
import { useSettingsStore } from "@/stores/settings-store";
import { SUGGESTIONS } from "@/lib/ai/suggestions";
import { useTelemetryStore } from "@/lib/ai/telemetry/store";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { AIProvidersManager } from "./ai-providers-manager";
import Markdown from "react-markdown";
import {
	getMcpConnectionManager,
	useMcpStore,
} from "@/stores/mcp-store";
import type {
	McpServerConfig,
	McpConnection,
	McpTool,
} from "@/lib/mcp/client";
import {
	tabs as ASSETS_TABS,
	useAssetsPanelStore,
	type Tab as AssetsTab,
} from "@/stores/assets-panel-store";

/**
 * Hashtag → tab mapping. Built from the assets-panel tab definitions.
 * Both the tab key and the tab label (lowercased) are valid hashtags,
 * plus a few common aliases (e.g. #tools → quicktools, #arth → ai).
 * When the AI mentions a hashtag like "#transitions" in a chat message,
 * it renders as a clickable chip that switches the assets panel to
 * that tab.
 */
const HASHTAG_TO_TAB: Map<string, AssetsTab> = (() => {
	const map = new Map<string, AssetsTab>();
	for (const [key, def] of Object.entries(ASSETS_TABS)) {
		// Tab key (e.g. "transitions", "effects")
		map.set(key.toLowerCase(), key as AssetsTab);
		// Tab label (e.g. "Adjust" → "adjust")
		map.set(def.label.toLowerCase(), key as AssetsTab);
	}
	// Common aliases that don't match the key or label directly.
	map.set("arth", "ai");
	map.set("ai", "ai");
	map.set("tools", "quicktools");
	map.set("preset", "presets");
	map.set("adjust", "adjustment");
	return map;
})();

/**
 * Regex matching hashtag tokens: `#` followed by 2+ word characters.
 * Requires a non-word character (or start/end of string) before the `#`
 * so we don't match color hex codes like `#ff0000`.
 */
const HASHTAG_REGEX = /(^|[\s(])#([a-zA-Z][a-zA-Z0-9_-]{1,30})/g;

/**
 * Preprocess chat message content: wrap `#hashtag` tokens that match a
 * known tab in markdown links of the form `[#hashtag](#tab:tabKey)`.
 * The custom `a` renderer in the Markdown component intercepts these
 * and calls `setActiveTab` instead of navigating.
 *
 * Unknown hashtags (not matching any tab) are left as plain text.
 */
function linkifyHashtags(content: string): string {
	return content.replace(
		HASHTAG_REGEX,
		(match, prefix: string, tag: string) => {
			const lower = tag.toLowerCase();
			const tabKey = HASHTAG_TO_TAB.get(lower);
			if (!tabKey) return match;
			return `${prefix}[#${tag}](#tab:${tabKey})`;
		},
	);
}

const QUICK_ACTIONS: {
	label: string;
	prompt: string;
	icon: typeof SparklesIcon;
}[] = [
	{
		label: "Motion graphic",
		prompt:
			"Create a kinetic typography motion graphic: 3 text layers that fly in, hold, then fly out, with a smooth 1-second ease. Use the current project's canvas size.",
		icon: MagicWand05Icon,
	},
	{
		label: "60s reel",
		prompt:
			"Make this a 60-second reel: trim the longest clip, add captions using the available audio, drop a beat-synced zoom on each cut.",
		icon: Clock01Icon,
	},
	{
		label: "Cinematic grade",
		prompt:
			"Apply a cinematic look: add a subtle blur effect to the background track, fade in the first 0.5s and fade out the last 1s, set background to blur intensity 12.",
		icon: Edit01Icon,
	},
	{
		label: "Match style",
		prompt:
			"Match the cut pacing and transition style of the reference video I attached. Start with a 4-cut intro and add quick keyframes on each text element.",
		icon: CheckListIcon,
	},
];

export function AIEditView() {
	const editor = useEditor();
	const ai = useAIStore();
	const telemetry = useTelemetryStore();
	const defaultProvider = useAIProvidersStore((s) => s.getDefault());
	const allProviders = useAIProvidersStore((s) => s.providers);
	const aiName = useSettingsStore((s) => s.aiName);
	// Subscribe to the active project so the provider dropdown updates
	// immediately when the user switches providers.
	const activeProject = useSyncExternalStore(
		(cb) => editor.project.subscribe(cb),
		() => editor.project.getActive(),
	);
	const projectProviderId = activeProject?.metadata.aiProviderId ?? null;
	// Switch the AI chat context whenever the active project changes so
	// each project keeps its own separate conversation history.
	const switchProject = useAIStore((s) => s.switchProject);
	const activeProjectId = activeProject?.metadata.id ?? null;
	useEffect(() => {
		switchProject(activeProjectId);
	}, [activeProjectId, switchProject]);
	// The effective provider for this project: per-project override
	// if set and still exists, otherwise the global default.
	const effectiveProvider = projectProviderId
		? allProviders.find((p) => p.id === projectProviderId && p.enabled)
		: defaultProvider;
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isExtracting, setIsExtracting] = useState(false);
	const [providersOpen, setProvidersOpen] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const composerRef = useRef<HTMLTextAreaElement>(null);
	const [draft, setDraft] = useState("");
	const mediaAssets = useEditor((e) => e.media.getAssets());

	// @-mention state: when the user types "@" followed by non-whitespace,
	// we show a dropdown of media assets filtered by the query. The query
	// range is tracked so we can replace it on selection.
	const [mentionQuery, setMentionQuery] = useState<{
		start: number;
		text: string;
	} | null>(null);

	// Scroll tracking: we auto-scroll to the bottom when new messages
	// arrive, but only if the user is already near the bottom (so we
	// don't yank them away while they're reading older messages).
	// The "atBottom" flag also controls whether the scroll-down button
	// is shown.
	const [isAtBottom, setIsAtBottom] = useState(true);
	const [isAtTop, setIsAtTop] = useState(true);
	// Track whether this is the initial mount. We don't want to
	// auto-scroll to the bottom on the first render — the user should
	// see the "Welcome to Artidor" message at the top. After the user
	// has interacted (scrolled or sent a message), we enable auto-scroll.
	const hasInitializedRef = useRef(false);

	const handleMessagesScroll = useCallback(() => {
		const el = messagesContainerRef.current;
		if (!el) return;
		const threshold = 32; // px from edge to count as "at bottom/top"
		setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
		setIsAtTop(el.scrollTop < threshold);
	}, []);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const scrollToTop = useCallback(() => {
		messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

	// Auto-scroll to the latest message when the chat updates — but
	// only if the user is already at (or near) the bottom, so we don't
	// yank them away while they're reading older messages.
	const isStreaming =
		ai.status === "streaming" ||
		ai.status === "awaiting-tools" ||
		ai.status === "retrying";
	const isBusy = isStreaming || ai.status === "queued";
	const queueCount = ai.queue.length;
	const retryIn = ai.retryIn;
	const retryCount = ai.retryCount;
	// A single value that changes whenever the chat content changes
	// (new message, streaming token, status change) so the effect fires.
	const chatTick = `${ai.messages.length}:${ai.messages[ai.messages.length - 1]?.content ?? ""}:${ai.status}`;
	// biome-ignore lint/correctness/useExhaustiveDependencies: chatTick is a proxy for ai.messages changes
	useEffect(() => {
		// On initial mount, don't auto-scroll — let the user see the
		// welcome message at the top. Mark as initialized so subsequent
		// message changes do auto-scroll.
		if (!hasInitializedRef.current) {
			hasInitializedRef.current = true;
			// Scroll to top on first open so the welcome is visible.
			messagesContainerRef.current?.scrollTo({ top: 0 });
			return;
		}
		if (isAtBottom) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [chatTick, isAtBottom]);

	// Auto-focus the composer once on mount.
	useEffect(() => {
		composerRef.current?.focus();
	}, []);

	const recentCount = telemetry.events.length;
	const autoLearnEnabled = telemetry.enabled;

	const handleSend = useCallback(
		async (text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;
			// If the AI is busy, the manager will queue the message.
			// We still clear the draft so the user can type the next one.
			setDraft("");
			setMentionQuery(null);
			await editor.ai.send({ text: trimmed });
		},
		[editor.ai],
	);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		void handleSend(draft);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			void handleSend(draft);
		}
		// Escape closes the mention dropdown without inserting anything.
		if (event.key === "Escape" && mentionQuery) {
			setMentionQuery(null);
			event.preventDefault();
		}
	};

	/**
	 * Detect "@query" in the textarea. When the cursor is right after an
	 * "@" that's preceded by whitespace or the start of the input, we
	 * treat the text from "@" to the cursor as a mention query and show
	 * the asset dropdown.
	 */
	const handleDraftChange = (value: string) => {
		setDraft(value);
		const el = composerRef.current;
		if (!el) return;
		const cursor = el.selectionStart ?? value.length;
		// Find the last "@" before the cursor.
		const before = value.slice(0, cursor);
		const atIdx = before.lastIndexOf("@");
		if (atIdx === -1) {
			setMentionQuery(null);
			return;
		}
		// The "@" must be at the start of the input or preceded by whitespace.
		const charBefore = atIdx > 0 ? before[atIdx - 1] : " ";
		if (charBefore !== " " && charBefore !== "\n" && atIdx !== 0) {
			setMentionQuery(null);
			return;
		}
		// The query text (after "@") must not contain whitespace — once the
		// user types a space, the mention is "closed".
		const queryText = before.slice(atIdx + 1);
		if (/\s/.test(queryText)) {
			setMentionQuery(null);
			return;
		}
		setMentionQuery({ start: atIdx, text: queryText });
	};

	/**
	 * Replace the current "@query" with "@assetName" and close the dropdown.
	 */
	const handleSelectAsset = (assetName: string) => {
		if (!mentionQuery) return;
		const before = draft.slice(0, mentionQuery.start);
		const after = draft.slice(mentionQuery.start + 1 + mentionQuery.text.length);
		const insertion = `@${assetName} `;
		const next = `${before}${insertion}${after}`;
		setDraft(next);
		setMentionQuery(null);
		// Move cursor right after the inserted mention + space.
		const newCursorPos = before.length + insertion.length;
		requestAnimationFrame(() => {
			composerRef.current?.focus();
			composerRef.current?.setSelectionRange(newCursorPos, newCursorPos);
		});
	};

	const handleQuickAction = (prompt: string) => {
		void handleSend(prompt);
	};

	const handleFile = async (file: File) => {
		setIsExtracting(true);
		try {
			const ok = await editor.ai.applyReferenceVideo(file);
			if (!ok) {
				// extractStyle returned duration=0 — the file was read
				// but no usable video frames were found (e.g. audio-only
				// file, corrupt video, or unsupported codec).
				useAIStore.getState().setError(
					"Could not extract a style profile from this file. Make sure it's a valid video file with visible frames (not audio-only).",
				);
				useAIStore.getState().setStatus("error");
			}
		} catch (err) {
			// extractStyle threw — the file couldn't be decoded at all
			// (unsupported format, corrupt file, browser can't play it).
			useAIStore.getState().setError(
				err instanceof Error
					? `Could not read the reference file: ${err.message}`
					: "Could not read the reference file. It may be corrupted or in an unsupported format.",
			);
			useAIStore.getState().setStatus("error");
		} finally {
			setIsExtracting(false);
		}
	};

	const handleCancel = () => {
		editor.ai.cancel();
	};

	const handleStop = () => {
		// Stop the current generation but keep queued messages.
		editor.ai.stopCurrent();
	};

	const handleClearQueue = () => {
		// Clear only the queued messages, don't stop the current task.
		editor.ai.clearQueueOnly();
	};

	const handleSteer = () => {
		const trimmed = draft.trim();
		if (!trimmed) return;
		// Steer: interrupt current generation and send this message next.
		editor.ai.steer(trimmed);
		setDraft("");
		setMentionQuery(null);
	};

	return (
		<>
			<div className="flex h-full min-h-0 flex-col gap-2 px-1.5 pb-1.5 pt-1.5">
				<StatusBar
					referenceVideoName={ai.referenceVideoName}
					styleProfile={ai.styleProfile}
					recentCount={recentCount}
					isStreaming={isStreaming}
					isRetrying={ai.status === "retrying"}
					queueCount={queueCount}
					retryIn={retryIn}
					retryCount={retryCount}
					defaultProvider={effectiveProvider ?? defaultProvider}
					allProviders={allProviders}
					projectProviderId={projectProviderId}
					onSelectProvider={(id) => {
						const project = editor.project.getActive();
						if (!project) return;
						// Update the project in-memory first (instant UI update),
						// then save in the background so the dropdown doesn't
						// block on serialization.
						editor.project.setActiveProject({
							project: {
								...project,
								metadata: {
									...project.metadata,
									aiProviderId: id,
								},
							},
						});
						void editor.project.saveCurrentProject();
					}}
					aiName={aiName}
					compactedSummary={ai.compactedSummary}
					autoLearnEnabled={autoLearnEnabled}
					conversations={ai.conversations}
					onToggleAutoLearn={() => {
						const next = !autoLearnEnabled;
						telemetry.setEnabled(next);
						// Keep learningScope in sync with the toggle:
						//  - enabling → default to project-scoped learning
						//  - disabling → set scope to "off" so the settings
						//    dropdown reflects the actual state
						useAIStore.getState().setAdvancedSettings({
							learningScope: next ? "project" : "off",
						});
					}}
					onOpenProviders={() => setProvidersOpen(true)}
					onClearReference={() => editor.ai.clearReference()}
					onNewChat={() => ai.clearConversation()}
					onLoadConversation={(id) => ai.loadConversation(id)}
					onRenameConversation={(id, name) => ai.renameConversation(id, name)}
					onDeleteConversation={(id) => ai.deleteConversation(id)}
				/>

				{/* Quick actions — collapses to dropdown on narrow screens */}
				<QuickActionsBar
					actions={QUICK_ACTIONS}
					isBusy={isBusy}
					onPick={handleQuickAction}
				/>

				{/* Messages */}
				<div
					ref={messagesContainerRef}
					onScroll={handleMessagesScroll}
					className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5"
				>
					{ai.messages.length === 0 ? (
						<EmptyState onPick={(t) => setDraft(t)} recentCount={recentCount} />
					) : (
						<>
							{ai.plan && <PlanCard plan={ai.plan} />}
							{ai.messages.map((m) => (
								<MessageBubble key={m.id} message={m} />
							))}
						</>
					)}
					{isStreaming && ai.status !== "retrying" && (
						<div className="flex items-center gap-2.5">
							<div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] px-3 py-2">
								<TypingDots />
								<span className="text-[11px] text-white/55">
									{ai.status === "awaiting-tools"
										? "Executing actions…"
										: "Thinking…"}
								</span>
							</div>
						</div>
					)}
					{ai.status === "retrying" && (
						<div className="flex items-center gap-2.5">
							<div className="grid size-7 shrink-0 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/[0.05]">
								<HugeiconsIcon
									icon={SparklesIcon}
									className="size-3.5 text-amber-300/80"
								/>
							</div>
							<div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2">
								<div className="flex items-center gap-1.5">
									<span className="font-mono text-[13px] font-semibold tabular-nums text-amber-200">
										{retryIn}s
									</span>
									<span className="text-[11px] text-amber-200/60">
										Retry {retryCount}/5…
									</span>
								</div>
								<button
									type="button"
									onClick={handleCancel}
									className="rounded border border-amber-400/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-200/70 transition-colors hover:bg-amber-400/10 hover:text-amber-100"
								>
									Cancel retry
								</button>
							</div>
						</div>
					)}
					{queueCount > 0 && (
						<div className="flex items-center justify-center gap-1.5 self-center rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/45">
							<HugeiconsIcon icon={Chat01Icon} className="size-2.5" />
							{queueCount} message{queueCount > 1 ? "s" : ""} queued
							<button
								type="button"
								onClick={handleClearQueue}
								className="ml-1 text-white/30 transition-colors hover:text-red-300"
								title="Clear queued messages (keeps current task running)"
							>
								<HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
							</button>
						</div>
					)}
					{ai.error && ai.status !== "retrying" && (
						<div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-3 py-2 text-[11px] text-red-300">
							<HugeiconsIcon
								icon={AlertCircleIcon}
								className="mt-0.5 size-3 shrink-0 text-red-400/70"
							/>
							<span className="flex-1 leading-relaxed">{ai.error}</span>
							<button
								type="button"
								onClick={() => ai.setError(null)}
								className="shrink-0 text-red-400/50 transition-colors hover:text-red-300"
								aria-label="Dismiss error"
							>
								<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
							</button>
						</div>
					)}
					<div ref={messagesEndRef} />

					{/* Scroll-to-top button — only visible when not at top and
					    mention dropdown is closed (so it doesn't overlap) */}
					{!isAtTop && ai.messages.length > 0 && !mentionQuery && (
						<button
							type="button"
							onClick={scrollToTop}
							title="Scroll to top"
							className="pointer-events-auto sticky top-1 left-1/2 z-[5] flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1e]/90 text-white/60 backdrop-blur transition-all hover:text-white/90 hover:border-white/20"
						>
							<HugeiconsIcon icon={ArrowUp02Icon} className="size-3" />
						</button>
					)}

					{/* Scroll-to-bottom button — only visible when not at bottom and
					    mention dropdown is closed (so it doesn't overlap) */}
					{!isAtBottom && ai.messages.length > 0 && !mentionQuery && (
						<button
							type="button"
							onClick={scrollToBottom}
							title="Scroll to bottom"
							className="pointer-events-auto sticky bottom-1 left-1/2 z-[5] flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1e]/90 text-white/60 backdrop-blur transition-all hover:text-white/90 hover:border-white/20"
						>
							<HugeiconsIcon icon={ArrowDown03Icon} className="size-3" />
						</button>
					)}
				</div>

				{/* Reference button — sits directly above the chat bar.
				    Peeks a sliver when idle, fully reveals on hover. */}
				<div className="group/ref relative flex items-center gap-1.5">
					<div className="flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-out max-h-0 opacity-0 group-hover/ref:max-h-12 group-hover/ref:opacity-100">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={isExtracting}
							className={cn(
								"flex h-6 items-center gap-1 rounded-lg border px-2 text-[10px] font-medium transition-all",
								"border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80",
								isExtracting && "cursor-wait opacity-60",
							)}
						>
							<HugeiconsIcon icon={Upload01Icon} className="size-3" />
							{isExtracting ? "Analysing…" : "Reference"}
						</button>
						<input
							ref={fileInputRef}
							type="file"
							accept="video/*"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) void handleFile(f);
								e.target.value = "";
							}}
						/>
						{ai.referenceVideoName && (
							<span className="flex items-center gap-1 truncate text-[10px] text-white/40">
								<HugeiconsIcon icon={Video01Icon} className="size-2.5 shrink-0" />
								<span className="truncate">{ai.referenceVideoName}</span>
								<button
									type="button"
									onClick={() => editor.ai.clearReference()}
									className="ml-0.5 text-white/30 hover:text-white/60"
									aria-label="Clear reference"
								>
									<HugeiconsIcon icon={Cancel01Icon} className="size-3" />
								</button>
							</span>
						)}
					</div>
					{/* Peek sliver — always visible, shows a tiny hint */}
					{!ai.referenceVideoName && (
						<span className="pointer-events-none flex h-3 items-center gap-0.5 text-[8px] text-white/15 transition-opacity group-hover/ref:opacity-0">
							<HugeiconsIcon icon={Upload01Icon} className="size-2" />
							ref
						</span>
					)}
					{/* Reference indicator — always visible when a ref is set */}
					{ai.referenceVideoName && (
						<span className="pointer-events-none flex h-3 items-center gap-0.5 text-[8px] text-white/25 transition-opacity group-hover/ref:opacity-0">
							<HugeiconsIcon icon={Video01Icon} className="size-2" />
							ref set
						</span>
					)}
				</div>

				{/* Composer */}
				<form
					onSubmit={handleSubmit}
					className={cn(
						"relative flex flex-col gap-1.5 rounded-2xl border p-2.5 backdrop-blur transition-all",
						draft.trim()
							? "border-white/[0.15] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_0_24px_-8px_rgba(255,255,255,0.08)]"
							: "border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02]",
					)}
				>
					{mentionQuery && (
						<AssetMentionDropdown
							assets={mediaAssets}
							query={mentionQuery.text}
							onSelect={handleSelectAsset}
							onClose={() => setMentionQuery(null)}
						/>
					)}
					<textarea
						ref={composerRef}
						value={draft}
						onChange={(e) => handleDraftChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={`Ask ${aiName} to edit, plan a motion graphic, or describe what you want…  Use @ to mention an asset`}
						rows={2}
						className="w-full resize-none border-none bg-transparent text-[12.5px] text-white/95 outline-none placeholder:text-white/30"
					/>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1 text-[9.5px] text-white/30">
							<HugeiconsIcon icon={AttachmentIcon} className="size-3" />
							{isBusy
								? "Enter to queue · Shift+Enter for newline"
								: "Enter to send · Shift+Enter for newline"}
						</span>
						{isBusy ? (
							<div className="flex items-center gap-1.5">
								{draft.trim() && (
									<>
										<button
											type="button"
											onClick={handleSteer}
											className="flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1 text-[10.5px] font-medium text-amber-200/90 transition-colors hover:bg-amber-400/10 hover:border-amber-400/30"
											title="Interrupt the current generation and send this message next"
										>
											<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3" />
											Steer
										</button>
										<button
											type="submit"
											className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
										>
											<HugeiconsIcon icon={ChatAdd01Icon} className="size-3" />
											Queue
										</button>
									</>
								)}
								<button
									type="button"
									onClick={handleStop}
									className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300 hover:border-red-400/20"
									title="Stop current generation (queued messages continue)"
								>
									<HugeiconsIcon icon={StopIcon} className="size-3" />
									Stop
								</button>
							</div>
						) : (
							<button
								type="submit"
								disabled={!draft.trim()}
								className={cn(
									"flex items-center gap-1 rounded-lg px-3 py-1 text-[10.5px] font-medium transition-all",
									draft.trim()
										? "bg-white text-[#0a0a0c] hover:bg-white/90 hover:shadow-[0_0_20px_-4px_rgba(255,255,255,0.35)]"
										: "cursor-not-allowed bg-white/[0.06] text-white/20",
								)}
							>
								Send
								<HugeiconsIcon icon={ArrowUp02Icon} className="size-3" />
							</button>
						)}
					</div>
				</form>
			</div>

			<ProvidersDialog open={providersOpen} onOpenChange={setProvidersOpen} />
		</>
	);
}

/* -------------------------------------------------------------------------- */
/*                                Sub-components                              */
/* -------------------------------------------------------------------------- */

/**
 * Dropdown that appears when the user types "@" in the composer. Shows
 * media assets from the current project filtered by the query text.
 * Clicking an asset inserts "@assetName" into the draft so the user can
 * reference a specific clip/image/audio by name in their prompt.
 */
function AssetMentionDropdown({
	assets,
	query,
	onSelect,
	onClose,
}: {
	assets: { id: string; name: string; type: string }[];
	query: string;
	onSelect: (name: string) => void;
	onClose: () => void;
}) {
	const filtered = useMemo(() => {
		const q = query.toLowerCase();
		const base = q
			? assets.filter((a) => a.name.toLowerCase().includes(q))
			: assets;
		return base.slice(0, 8);
	}, [assets, query]);

	// Close on outside click.
	useEffect(() => {
		if (filtered.length === 0) {
			onClose();
			return;
		}
		const handler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest("[data-mention-dropdown]")) onClose();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [filtered.length, onClose]);

	if (filtered.length === 0) return null;

	return (
		<div
			data-mention-dropdown
			className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a1e] shadow-xl z-50"
		>
			<div className="px-2 py-1 text-[9.5px] uppercase tracking-wider text-white/35 border-b border-white/[0.06]">
				Assets · click to mention
			</div>
			{filtered.map((asset) => (
				<button
					key={asset.id}
					type="button"
					onClick={() => onSelect(asset.name)}
					className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11.5px] text-white/80 transition-colors hover:bg-white/[0.06]"
				>
					<HugeiconsIcon
						icon={
							asset.type === "video"
								? Video01Icon
								: asset.type === "audio"
									? Video01Icon
									: Image01Icon
						}
						className="size-3 shrink-0 text-white/40"
					/>
					<span className="truncate">{asset.name}</span>
					<span className="ml-auto shrink-0 text-[9px] uppercase text-white/25">
						{asset.type}
					</span>
				</button>
			))}
		</div>
	);
}

/**
 * Modal that hosts the AIProvidersManager inside a glass dialog so the
 * AI Edit tab stays focused on the chat. Opening this is the entry point
 * for adding / editing / removing / testing providers.
 */
function ProvidersDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-xl overflow-hidden">
				<DialogHeader>
					<DialogTitle>AI Providers</DialogTitle>
					<DialogDescription>
						Configure the AI endpoints used by Arth.
					</DialogDescription>
				</DialogHeader>
				<DialogBody className="max-h-[60vh] gap-3 overflow-y-auto">
					<AIProvidersManager variant="inline" />
				</DialogBody>
				<DialogFooter className="border-t border-white/[0.06] bg-black/20">
					<Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Dropdown listing saved chat conversations. Lets the user switch back to
 * an older chat, rename it, delete it, or start a new one.
 */
function ChatHistoryDropdown({
	conversations,
	onLoad,
	onRename,
	onDelete,
	onNew,
}: {
	conversations: { id: string; name: string; updatedAt: number }[];
	onLoad: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string) => void;
	onNew: () => void;
}) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [draftName, setDraftName] = useState("");
	const editInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (editingId) {
			editInputRef.current?.focus();
		}
	}, [editingId]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Chat history"
					title="Chat history"
					className="flex h-5 items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 text-[9px] font-medium text-white/50 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80"
				>
					<HugeiconsIcon icon={Chat01Icon} className="size-2.5" />
					History
					{conversations.length > 0 && (
						<span className="ml-0.5 rounded-full bg-white/15 px-1 text-[8px]">
							{conversations.length}
						</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56 border-white/[0.08] bg-[#09090b]/95 text-white/95 backdrop-blur-md"
			>
				<DropdownMenuItem
					onClick={onNew}
					className="gap-2 text-[11px] hover:bg-white/[0.08] focus:bg-white/[0.08]"
				>
					<HugeiconsIcon
						icon={ChatAdd01Icon}
						className="size-3.5 text-white/60"
					/>
					New chat
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-white/[0.08]" />
				{conversations.length === 0 ? (
					<div className="px-2 py-2 text-[10px] text-white/40">
						No saved conversations yet.
					</div>
				) : (
					conversations.map((c) => (
						<div
							key={c.id}
							className="group flex items-center justify-between px-2 py-1.5 hover:bg-white/[0.06]"
						>
							{editingId === c.id ? (
								<input
									ref={editInputRef}
									type="text"
									value={draftName}
									onChange={(e) => setDraftName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											onRename(c.id, draftName);
											setEditingId(null);
										}
										if (e.key === "Escape") {
											setEditingId(null);
										}
									}}
									onBlur={() => {
										onRename(c.id, draftName);
										setEditingId(null);
									}}
									className="h-5 flex-1 rounded border border-white/20 bg-white/[0.05] px-1 text-[10px] text-white/90"
								/>
							) : (
								<button
									type="button"
									onClick={() => onLoad(c.id)}
									className="flex-1 truncate text-left text-[10.5px] text-white/70 transition-colors hover:text-white"
									title={c.name}
								>
									{c.name}
								</button>
							)}
							<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setEditingId(c.id);
										setDraftName(c.name);
									}}
									aria-label="Rename"
									className="grid size-5 place-items-center rounded text-white/40 hover:bg-white/10 hover:text-white"
								>
									<HugeiconsIcon icon={Edit01Icon} className="size-3" />
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(c.id);
									}}
									aria-label="Delete"
									className="grid size-5 place-items-center rounded text-white/40 hover:bg-red-500/20 hover:text-red-300"
								>
									<HugeiconsIcon icon={Delete02Icon} className="size-3" />
								</button>
							</div>
						</div>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * MCP Server chip — shows the number of connected MCP servers and
 * opens a dialog to add/remove/monitor them. MCP servers expose
 * external tools that Arth can use alongside the built-in editor
 * tools.
 */
function McpServerChip() {
	const connections = useMcpStore((s) => s.connections);
	const [manageOpen, setManageOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);

	const connectedCount = connections.filter(
		(c) => c.status === "connected",
	).length;

	return (
		<>
			<button
				type="button"
				aria-label="MCP servers"
				title={
					connectedCount > 0
						? `${connectedCount} MCP server${connectedCount > 1 ? "s" : ""} connected — click to manage`
						: "MCP servers — external tools (click to manage)"
				}
				onClick={() => setManageOpen(true)}
				className={cn(
					"group relative flex size-6 items-center justify-center rounded-md border transition-all",
					connectedCount > 0
						? "border-green-400/20 bg-green-400/[0.05] hover:border-green-400/30"
						: "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
				)}
			>
				<HugeiconsIcon
					icon={PuzzleIcon}
					className={cn(
						"size-3 shrink-0",
						connectedCount > 0 ? "text-green-300" : "text-white/50",
					)}
				/>
				{connectedCount > 0 && (
					<span className="absolute -right-1 -top-1 flex size-2.5 items-center justify-center rounded-full bg-green-400 text-[7px] font-bold text-[#09090b]">
						{connectedCount}
					</span>
				)}
			</button>

			<McpManageDialog
				open={manageOpen}
				onOpenChange={setManageOpen}
				onAddClick={() => {
					setAddOpen(true);
				}}
			/>
			<McpAddDialog open={addOpen} onOpenChange={setAddOpen} />
		</>
	);
}

/**
 * MCP server management dialog — lists all configured servers as
 * detailed cards with status, tool count, expandable tool list,
 * enable/disable toggle, and delete button.
 */
function McpManageDialog({
	open,
	onOpenChange,
	onAddClick,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddClick: () => void;
}) {
	const servers = useMcpStore((s) => s.servers);
	const connections = useMcpStore((s) => s.connections);
	const removeServer = useMcpStore((s) => s.removeServer);
	const updateServer = useMcpStore((s) => s.updateServer);

	const handleToggle = (id: string, enabled: boolean) => {
		updateServer(id, { enabled });
		const manager = getMcpConnectionManager();
		if (enabled) {
			const server = useMcpStore.getState().servers.find((s) => s.id === id);
			if (server) {
				manager.connect(
					{ ...server, enabled },
					useMcpStore.getState().updateConnection,
				);
			}
		} else {
			manager.disconnect(id);
		}
	};

	const handleReconnect = (id: string) => {
		const server = useMcpStore.getState().servers.find((s) => s.id === id);
		if (!server) return;
		updateServer(id, { enabled: true });
		getMcpConnectionManager().connect(
			server,
			useMcpStore.getState().updateConnection,
		);
	};

	const handleDelete = (id: string) => {
		getMcpConnectionManager().disconnect(id);
		removeServer(id);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
				<DialogHeader>
					<DialogTitle>MCP Servers</DialogTitle>
					<DialogDescription>
						External tool servers that extend Arth's capabilities —
						filesystem, web search, databases, custom integrations.
					</DialogDescription>
				</DialogHeader>
				<DialogBody className="max-h-[60vh] gap-3 overflow-y-auto">
					{servers.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center">
							<div className="grid size-12 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
								<HugeiconsIcon
									icon={PuzzleIcon}
									className="size-5 text-white/30"
								/>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-[13px] font-medium text-white/70">
									No MCP servers configured
								</span>
								<span className="text-[11px] text-white/35">
									Add a server to let Arth use external tools.
								</span>
							</div>
							<Button size="sm" onClick={onAddClick} className="mt-1">
								<HugeiconsIcon icon={ChatAdd01Icon} className="size-3.5" />
								Add MCP Server
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-2.5">
							{servers.map((server) => {
								const conn = connections.find(
									(c) => c.config.id === server.id,
								);
								const status = conn?.status ?? "disconnected";
								const tools = conn?.tools ?? [];
								const error = conn?.error;
								return (
									<McpServerCard
										key={server.id}
										server={server}
										status={status}
										tools={tools}
										error={error}
										onToggle={(enabled) => handleToggle(server.id, enabled)}
										onReconnect={() => handleReconnect(server.id)}
										onDelete={() => handleDelete(server.id)}
									/>
								);
							})}
						</div>
					)}
				</DialogBody>
				<DialogFooter className="border-t border-white/[0.06] bg-black/20">
					{servers.length > 0 && (
						<Button
							size="sm"
							onClick={onAddClick}
							className="mr-auto"
						>
							<HugeiconsIcon icon={ChatAdd01Icon} className="size-3.5" />
							Add Server
						</Button>
					)}
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onOpenChange(false)}
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * MCP server card — detailed, expandable card showing server name,
 * status, URL, tool count, and an expandable list of available tools.
 */
function McpServerCard({
	server,
	status,
	tools,
	error,
	onToggle,
	onReconnect,
	onDelete,
}: {
	server: McpServerConfig;
	status: McpConnection["status"];
	tools: McpTool[];
	error?: string;
	onToggle: (enabled: boolean) => void;
	onReconnect: () => void;
	onDelete: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	const statusConfig = {
		connected: {
			dot: "bg-green-400",
			label: "Connected",
			text: "text-green-300",
			border: "border-green-400/15",
			bg: "bg-green-400/[0.03]",
		},
		connecting: {
			dot: "bg-yellow-400 animate-pulse",
			label: "Connecting",
			text: "text-yellow-300",
			border: "border-yellow-400/15",
			bg: "bg-yellow-400/[0.03]",
		},
		error: {
			dot: "bg-red-400",
			label: "Error",
			text: "text-red-300",
			border: "border-red-400/15",
			bg: "bg-red-400/[0.03]",
		},
		disconnected: {
			dot: "bg-white/20",
			label: "Disconnected",
			text: "text-white/40",
			border: "border-white/[0.06]",
			bg: "bg-white/[0.02]",
		},
	} as const;

	const sc = statusConfig[status];
	const hasTools = tools.length > 0;

	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border transition-colors",
				sc.border,
				sc.bg,
			)}
		>
			{/* Header row */}
			<div className="flex items-center gap-2.5 px-3 py-2.5">
				{/* Status dot */}
				<div className={cn("size-2 shrink-0 rounded-full", sc.dot)} />

				{/* Name + status */}
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate text-[12px] font-semibold text-white/90">
							{server.name}
						</span>
						<span
							className={cn(
								"shrink-0 text-[9px] font-medium uppercase tracking-wide",
								sc.text,
							)}
						>
							{sc.label}
						</span>
					</div>
					<span className="truncate font-mono text-[9.5px] text-white/30">
						{server.url}
					</span>
				</div>

				{/* Tool count badge */}
				{hasTools && (
					<span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-white/60">
						{tools.length} {tools.length === 1 ? "tool" : "tools"}
					</span>
				)}

				{/* Expand toggle */}
				{hasTools && (
					<button
						type="button"
						onClick={() => setExpanded((e) => !e)}
						className="grid size-5 shrink-0 place-items-center rounded text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
						aria-label={expanded ? "Collapse tools" : "Expand tools"}
					>
						<HugeiconsIcon
							icon={ArrowDown03Icon}
							className={cn(
								"size-3 transition-transform",
								expanded && "rotate-180",
							)}
						/>
					</button>
				)}
			</div>

			{/* Error message */}
			{status === "error" && error && (
				<div className="border-t border-red-400/10 px-3 py-2">
					<p className="text-[10px] leading-relaxed text-red-300/70">
						{error}
					</p>
					<button
						type="button"
						onClick={onReconnect}
						className="mt-1.5 text-[10px] font-medium text-red-300/80 underline hover:text-red-200"
					>
						Try reconnect
					</button>
				</div>
			)}

			{/* Expandable tool list */}
			{expanded && hasTools && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					className="border-t border-white/[0.06]"
				>
					<div className="flex flex-col gap-1 px-3 py-2">
						<span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/30">
							Available tools
						</span>
						{tools.map((tool) => (
							<div
								key={tool.name}
								className="flex flex-col gap-0.5 rounded-md bg-black/20 px-2 py-1.5"
							>
								<span className="font-mono text-[10px] font-medium text-white/70">
									{tool.name}
								</span>
								{tool.description && (
									<span className="text-[9.5px] leading-relaxed text-white/35">
										{tool.description}
									</span>
								)}
							</div>
						))}
					</div>
				</motion.div>
			)}

			{/* Action bar */}
			<div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
				{/* Enable/disable toggle */}
				<button
					type="button"
					onClick={() => onToggle(!server.enabled)}
					className={cn(
						"relative h-4 w-7 rounded-full transition-colors",
						server.enabled ? "bg-green-400/30" : "bg-white/[0.08]",
					)}
					aria-label={server.enabled ? "Disable server" : "Enable server"}
				>
					<span
						className={cn(
							"absolute top-0.5 size-3 rounded-full transition-transform",
							server.enabled
								? "translate-x-3.5 bg-green-400"
								: "translate-x-0.5 bg-white/40",
						)}
					/>
				</button>
				<span className="text-[10px] text-white/40">
					{server.enabled ? "Enabled" : "Disabled"}
				</span>

				{/* Reconnect button */}
				{status !== "connecting" && (
					<button
						type="button"
						onClick={onReconnect}
						className="ml-auto text-[10px] font-medium text-white/40 transition hover:text-white/80"
					>
						Reconnect
					</button>
				)}

				{/* Delete button */}
				<button
					type="button"
					onClick={onDelete}
					className="flex items-center gap-1 text-[10px] font-medium text-red-300/50 transition hover:text-red-300"
					aria-label="Delete server"
				>
					<HugeiconsIcon icon={Delete02Icon} className="size-3" />
					Remove
				</button>
			</div>
		</div>
	);
}

/**
 * Add MCP Server dialog — proper form with name, URL, and optional
 * token fields. Replaces the old browser `prompt()` flow.
 */
function McpAddDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const addServer = useMcpStore((s) => s.addServer);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [token, setToken] = useState("");
	const [error, setError] = useState<string | null>(null);

	const reset = () => {
		setName("");
		setUrl("");
		setToken("");
		setError(null);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!name.trim()) {
			setError("Server name is required.");
			return;
		}
		if (!url.trim()) {
			setError("SSE URL is required.");
			return;
		}
		if (!/^https?:\/\//i.test(url.trim())) {
			setError("URL must start with http:// or https://");
			return;
		}

		addServer({
			name: name.trim(),
			url: url.trim(),
			token: token.trim() || undefined,
			enabled: true,
		});

		// Connect immediately.
		const manager = getMcpConnectionManager();
		const latest = useMcpStore.getState().servers.at(-1);
		if (latest) {
			manager.connect(latest, useMcpStore.getState().updateConnection);
		}

		reset();
		onOpenChange(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(v) => {
				if (!v) reset();
				onOpenChange(v);
			}}
		>
			<DialogContent className="max-w-md overflow-hidden">
				<DialogHeader>
					<DialogTitle>Add MCP Server</DialogTitle>
					<DialogDescription>
						Connect to an MCP-compatible server to give Arth access to
						external tools.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<DialogBody className="gap-3">
						{/* Name */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="mcp-name"
								className="text-[11px] font-medium text-white/60"
							>
								Server name
							</label>
							<Input
								id="mcp-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My MCP Server"
								autoFocus
								className="h-9 text-[12px]"
							/>
						</div>

						{/* URL */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="mcp-url"
								className="text-[11px] font-medium text-white/60"
							>
								SSE URL
							</label>
							<Input
								id="mcp-url"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="http://localhost:3001/sse"
								className="h-9 font-mono text-[11px]"
							/>
							<span className="text-[10px] text-white/30">
								The SSE endpoint of the MCP server.
							</span>
						</div>

						{/* Token (optional) */}
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="mcp-token"
								className="text-[11px] font-medium text-white/60"
							>
								Bearer token{" "}
								<span className="text-white/30">(optional)</span>
							</label>
							<Input
								id="mcp-token"
								type="password"
								value={token}
								onChange={(e) => setToken(e.target.value)}
								placeholder="For authenticated MCP servers"
								className="h-9 font-mono text-[11px]"
							/>
						</div>

						{error && (
							<div className="flex items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/[0.05] px-2.5 py-2">
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="size-3.5 shrink-0 text-red-300"
								/>
								<span className="text-[11px] text-red-300/80">{error}</span>
							</div>
						)}
					</DialogBody>
					<DialogFooter className="border-t border-white/[0.06] bg-black/20">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm">
							<HugeiconsIcon icon={ChatAdd01Icon} className="size-3.5" />
							Add Server
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Model ID text with overflow detection. When the model id is too
 * long to fit in the available space, it scrolls horizontally
 * (marquee effect). When it fits, it displays statically.
 */
function ModelIdText({ model }: { model: string }) {
	const containerRef = useRef<HTMLSpanElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [overflows, setOverflows] = useState(false);

	useEffect(() => {
		const c = containerRef.current;
		const t = textRef.current;
		if (!c || !t) return;
		const check = () => setOverflows(t.scrollWidth > c.clientWidth + 1);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(c);
		return () => ro.disconnect();
	}, []);

	return (
		<span
			ref={containerRef}
			className="min-w-0 max-w-[90px] shrink overflow-hidden font-mono text-[9px] text-white/35"
		>
			<span
				ref={textRef}
				className={cn(
					"inline-block whitespace-nowrap",
					overflows && "animate-[marquee_8s_linear_infinite]",
				)}
				style={
					overflows
						? { animation: "marquee 8s linear infinite" }
						: undefined
				}
			>
				{overflows ? `${model}  ·  ${model}  ·  ` : model}
			</span>
			<style>{`
				@keyframes marquee {
					0% { transform: translateX(0); }
					100% { transform: translateX(-33.33%); }
				}
			`}</style>
		</span>
	);
}

function StatusBar({
	referenceVideoName,
	styleProfile,
	recentCount,
	isStreaming,
	isRetrying,
	queueCount,
	retryIn,
	retryCount,
	defaultProvider,
	allProviders,
	projectProviderId,
	onSelectProvider,
	aiName,
	compactedSummary,
	autoLearnEnabled,
	conversations,
	onToggleAutoLearn,
	onOpenProviders,
	onClearReference,
	onNewChat,
	onLoadConversation,
	onRenameConversation,
	onDeleteConversation,
}: {
	referenceVideoName: string | null;
	styleProfile: ChatMessage extends never
		? never
		: ReturnType<typeof useAIStore.getState>["styleProfile"];
	recentCount: number;
	isStreaming: boolean;
	isRetrying: boolean;
	queueCount: number;
	retryIn: number;
	retryCount: number;
	defaultProvider: { name: string; model: string; kind: string } | undefined;
	allProviders: Array<{ id: string; name: string; model: string; enabled: boolean }>;
	projectProviderId: string | null;
	onSelectProvider: (id: string | null) => void;
	aiName: string;
	compactedSummary: ReturnType<typeof useAIStore.getState>["compactedSummary"];
	autoLearnEnabled: boolean;
	conversations: { id: string; name: string; updatedAt: number }[];
	onToggleAutoLearn: () => void;
	onOpenProviders: () => void;
	onClearReference: () => void;
	onNewChat: () => void;
	onLoadConversation: (id: string) => void;
	onRenameConversation: (id: string, name: string) => void;
	onDeleteConversation: (id: string) => void;
}) {
	return (
		<div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0c10] to-[#08080c]">
			{/* Top accent line */}
			<div
				aria-hidden
				className="absolute top-0 left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
				}}
			/>
			{/* Ambient glow */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.05), transparent 60%)",
				}}
			/>

			<div className="relative flex flex-col gap-2 p-2.5">
				{/* Header row */}
				<div className="flex items-center justify-between gap-1.5">
					<div className="flex min-w-0 items-center gap-2">
						<div
							className={cn(
								"grid size-7 shrink-0 place-items-center rounded-lg border transition-all",
								isRetrying
									? "border-amber-400/20 bg-amber-400/[0.06]"
									: isStreaming
										? "border-white/[0.15] bg-white/[0.06]"
										: "border-white/[0.08] bg-white/[0.04]",
							)}
						>
							<HugeiconsIcon
								icon={isStreaming || isRetrying ? SparklesIcon : MagicWand05Icon}
								className={cn(
									"size-4",
									isRetrying
										? "text-amber-300/80"
										: isStreaming
											? "text-white animate-pulse"
											: "text-white/70",
								)}
							/>
						</div>
						<div className="flex min-w-0 flex-col">
							<span className="truncate font-serif text-[13px] leading-tight text-white">
								{aiName}
							</span>
							<span
								className={cn(
									"text-[8.5px] uppercase tracking-wider transition-colors",
									isRetrying
										? "text-amber-300/60"
										: isStreaming
											? "text-white/50"
											: "text-white/25",
								)}
							>
								{isRetrying
									? `retry in ${retryIn}s`
									: isStreaming
										? "working…"
										: "AI copilot"}
							</span>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1.5">
						<span
							className={cn(
								"rounded-full border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider transition-all",
								isRetrying
									? "border-amber-400/20 bg-amber-400/[0.08] text-amber-200/80"
									: isStreaming
										? "border-white/20 bg-white/[0.08] text-white/80"
										: "border-white/[0.08] bg-white/[0.03] text-white/35",
							)}
						>
							{isRetrying
								? `retry ${retryCount}`
								: isStreaming
									? "live"
									: "ready"}
						</span>
						{queueCount > 0 && (
							<span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/60">
								{queueCount} queued
							</span>
						)}
						<ChatHistoryDropdown
							conversations={conversations}
							onLoad={onLoadConversation}
							onRename={onRenameConversation}
							onDelete={onDeleteConversation}
							onNew={onNewChat}
						/>
						<button
							type="button"
							onClick={onNewChat}
							aria-label="New chat"
							title="New chat — clears conversation and summary"
							className="flex h-5 items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 text-[9px] font-medium text-white/50 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80"
						>
							<HugeiconsIcon icon={ChatAdd01Icon} className="size-2.5" />
							New
						</button>
					</div>
				</div>

				{/* Provider + MCP row — collapses secondary items into a
			    "More" dropdown on small screens / high display scaling. */}
				<OverflowRow className="w-full">
					<button
						type="button"
						onClick={onOpenProviders}
						className={cn(
							"group flex flex-1 items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
							defaultProvider
								? "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
								: "border-amber-300/25 bg-amber-400/[0.05] hover:border-amber-300/40 hover:bg-amber-400/[0.08]",
						)}
						title="Manage AI providers"
					>
						<span className="flex min-w-0 items-center gap-1.5">
							<HugeiconsIcon
								icon={PlugIcon}
								className={cn(
									"size-3 shrink-0",
									defaultProvider ? "text-white/50" : "text-amber-200",
								)}
							/>
							{defaultProvider ? (
								<>
									<span className="min-w-0 shrink text-[11px] text-white/80">
										<span className="truncate block">{defaultProvider.name}</span>
									</span>
									<ModelIdText model={defaultProvider.model} />
								</>
							) : (
								<span className="text-[11px] text-amber-100">
									Set up AI provider
								</span>
							)}
						</span>
						<HugeiconsIcon
							icon={Settings02Icon}
							className="size-3 shrink-0 text-white/30 transition-colors group-hover:text-white/60"
						/>
					</button>
					{allProviders.length > 1 && (
						<div className="relative shrink-0">
							<select
								value={projectProviderId ?? ""}
								onChange={(e) =>
									onSelectProvider(e.target.value || null)
								}
								title="Select AI provider for this project"
								className="h-7 appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 pr-6 text-[10px] text-white/70 outline-none transition-colors hover:border-white/15 hover:bg-white/[0.05] focus:border-white/25"
							>
								<option value="" className="bg-[#1a1a1e]">
									Default
								</option>
								{allProviders
									.filter((p) => p.enabled)
									.map((p) => (
										<option
											key={p.id}
											value={p.id}
											className="bg-[#1a1a1e]"
										>
											{p.name}
										</option>
									))}
							</select>
							<HugeiconsIcon
								icon={ArrowDown03Icon}
								className="pointer-events-none absolute right-1.5 top-1/2 size-2.5 -translate-y-1/2 text-white/40"
							/>
						</div>
					)}
					<McpServerChip />
					<AdvancedSettingsButton />
				</OverflowRow>

				{/* Meta row: learned edits + compaction + reference video */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-3 text-[9.5px] text-white/35">
						<button
							type="button"
							onClick={onToggleAutoLearn}
							title={
								autoLearnEnabled
									? "Auto-learning is ON — the AI learns from your edits. Click to disable."
									: "Auto-learning is OFF. Click to enable — the AI will learn from your edits."
							}
							className={cn(
								"flex items-center gap-1.5 rounded transition-colors hover:text-white/70",
								autoLearnEnabled ? "text-white/40" : "text-white/25",
							)}
						>
							<HugeiconsIcon icon={SparklesIcon} className="size-2.5" />
							{autoLearnEnabled
								? `${recentCount} edits learned`
								: "Auto-learn off"}
							<span
								className={cn(
									"ml-0.5 inline-block size-1.5 rounded-full",
									autoLearnEnabled ? "bg-emerald-400/70" : "bg-white/20",
								)}
							/>
						</button>
						{compactedSummary && (
							<span
								className="flex items-center gap-1.5"
								title={`Compacted ${compactedSummary.compactedCount} older messages to save context space`}
							>
								<HugeiconsIcon icon={ArrowDown03Icon} className="size-2.5" />
								{compactedSummary.compactedCount} compacted
							</span>
						)}
					</div>
					{referenceVideoName && styleProfile ? (
						<div className="flex items-center justify-between gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1">
							<span className="flex min-w-0 items-center gap-1.5">
								<HugeiconsIcon
									icon={Video01Icon}
									className="size-3 shrink-0 text-white/50"
								/>
								<span className="truncate text-[10.5px] text-white/70">
									{referenceVideoName}
								</span>
							</span>
							<button
								type="button"
								onClick={onClearReference}
								className="grid size-4 place-items-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Clear reference video"
							>
								<HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
							</button>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

/**
 * Quick actions bar — shows buttons inline when they fit, collapses
 * to a dropdown when the panel is too narrow. Uses a ResizeObserver
 * to detect overflow.
 */
function QuickActionsBar({
	actions,
	isBusy,
	onPick,
}: {
	actions: { label: string; prompt: string; icon: typeof SparklesIcon }[];
	isBusy: boolean;
	onPick: (prompt: string) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		const c = containerRef.current;
		const i = innerRef.current;
		if (!c || !i) return;
		const check = () => setOverflow(i.scrollWidth > c.clientWidth + 2);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(c);
		return () => ro.disconnect();
	}, []);

	const buttonClass = cn(
		"flex h-6 items-center gap-1 rounded-lg border px-2 text-[10px] font-medium transition-all",
		"border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80",
		isBusy && "border-amber-400/15 text-amber-200/60 hover:border-amber-400/25 hover:bg-amber-400/[0.06]",
	);

	if (!overflow) {
		return (
			<div ref={containerRef} className="flex flex-nowrap gap-1 overflow-hidden">
				<div ref={innerRef} className="flex flex-nowrap gap-1">
					{actions.map((qa) => (
						<button
							key={qa.label}
							type="button"
							onClick={() => onPick(qa.prompt)}
							className={buttonClass}
						>
							<HugeiconsIcon icon={qa.icon} className="size-3" />
							{qa.label}
						</button>
					))}
				</div>
			</div>
		);
	}

	// Overflow mode: show first action + a "More" dropdown
	return (
		<div ref={containerRef} className="relative flex flex-nowrap gap-1 overflow-hidden">
			<div ref={innerRef} className="flex flex-nowrap gap-1">
				{actions.slice(0, 1).map((qa) => (
					<button
						key={qa.label}
						type="button"
						onClick={() => onPick(qa.prompt)}
						className={cn(buttonClass, "shrink-0")}
					>
						<HugeiconsIcon icon={qa.icon} className="size-3" />
						{qa.label}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={() => setDropdownOpen((o) => !o)}
				className={cn(buttonClass, "shrink-0")}
			>
				<HugeiconsIcon icon={Cursor02Icon} className="size-3" />
				More
				<HugeiconsIcon
					icon={ArrowDown03Icon}
					className={cn("size-2.5 transition-transform", dropdownOpen && "rotate-180")}
				/>
			</button>
			{dropdownOpen && (
				<>
					<button
						type="button"
						aria-label="Close menu"
						className="fixed inset-0 z-40 cursor-default"
						onClick={() => setDropdownOpen(false)}
					/>
					<div className="absolute left-0 top-7 z-50 flex flex-col gap-0.5 rounded-lg border border-white/10 bg-[#1a1a1e] p-1 shadow-xl">
						{actions.slice(1).map((qa) => (
							<button
								key={qa.label}
								type="button"
								onClick={() => {
									onPick(qa.prompt);
									setDropdownOpen(false);
								}}
								className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/85"
							>
								<HugeiconsIcon icon={qa.icon} className="size-3" />
								{qa.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

/**
 * Overflow-aware row. Renders children inline when they fit, and
 * collapses the trailing children into a "More" dropdown when the
 * row overflows (small screens / high display scaling). The first
 * child is always visible; the rest move into the dropdown.
 *
 * On PCs with adequate screen space, everything shows inline —
 * identical to the current layout.
 */
function OverflowRow({
	children,
	className,
	moreLabel = "More",
}: {
	children: React.ReactNode[];
	className?: string;
	moreLabel?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		const c = containerRef.current;
		const i = innerRef.current;
		if (!c || !i) return;
		const check = () => setOverflow(i.scrollWidth > c.clientWidth + 2);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(c);
		return () => ro.disconnect();
	}, []);

	if (!overflow) {
		return (
			<div ref={containerRef} className={cn("flex flex-nowrap items-center gap-1.5 overflow-hidden", className)}>
				<div ref={innerRef} className="flex flex-nowrap items-center gap-1.5">
					{children}
				</div>
			</div>
		);
	}

	// Overflow mode: show first child + a "More" dropdown with the rest.
	return (
		<div ref={containerRef} className={cn("relative flex flex-nowrap items-center gap-1.5 overflow-hidden", className)}>
			<div ref={innerRef} className="flex flex-nowrap items-center gap-1.5">
				{children[0]}
			</div>
			<button
				type="button"
				onClick={() => setDropdownOpen((o) => !o)}
				className="flex h-6 shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] font-medium text-white/60 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80"
			>
				{moreLabel}
				<HugeiconsIcon
					icon={ArrowDown03Icon}
					className={cn("size-2.5 transition-transform", dropdownOpen && "rotate-180")}
				/>
			</button>
			{dropdownOpen && (
				<>
					<button
						type="button"
						aria-label="Close menu"
						className="fixed inset-0 z-40 cursor-default"
						onClick={() => setDropdownOpen(false)}
					/>
					<div className="absolute left-0 top-7 z-50 flex flex-col gap-1 rounded-lg border border-white/10 bg-[#1a1a1e] p-1.5 shadow-xl">
						{children.slice(1).map((child, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: children are stable by position
							<button type="button" key={i} onClick={() => setDropdownOpen(false)} className="text-left">
								{child}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

/**
 * Pick an icon for a suggestion based on its label keyword.
 * This keeps the suggestion data file icon-free (compact) while
 * still showing a relevant icon per card.
 */
function iconForSuggestion(label: string): typeof SparklesIcon {
	const l = label.toLowerCase();
	if (l.includes("text") || l.includes("caption") || l.includes("title") || l.includes("typography"))
		return SparklesIcon;
	if (l.includes("cut") || l.includes("pace") || l.includes("montage") || l.includes("trailer") || l.includes("reel"))
		return Video01Icon;
	if (l.includes("color") || l.includes("grade") || l.includes("look") || l.includes("tone") || l.includes("mood"))
		return PaintBrushIcon;
	if (l.includes("audio") || l.includes("music") || l.includes("sound") || l.includes("beat") || l.includes("voice"))
		return MusicNote03Icon;
	return MagicWand05Icon;
}

function EmptyState({
	onPick,
	recentCount,
}: {
	onPick: (text: string) => void;
	recentCount: number;
}) {
	const suggestions = useMemo(() => {
		// Pick 4 random suggestions from the 640-entry pool.
		// Shuffle by sorting on a random key, then take the first 4.
		const picked = [...SUGGESTIONS]
			.map((s) => ({ s, r: Math.random() }))
			.sort((a, b) => a.r - b.r)
			.slice(0, 4)
			.map(({ s }) => ({
				...s,
				icon: iconForSuggestion(s.label),
			}));
		return picked;
	}, []);
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-6">
			{/* Hero icon with ambient glow */}
			<div className="relative grid size-14 place-items-center">
				<div
					aria-hidden
					className="absolute inset-0 rounded-2xl"
					style={{
						background:
							"radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)",
					}}
				/>
				<div className="relative grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.02]">
					<HugeiconsIcon
						icon={SparklesIcon}
						className="size-6 text-white/80"
					/>
				</div>
			</div>

			{/* Greeting */}
			<div className="flex flex-col items-center gap-1 text-center">
				<span className="font-serif text-[15px] text-white/95">
					Welcome to Artidor
				</span>
				<p className="max-w-[240px] text-[11px] leading-relaxed text-white/45">
					Describe what you want in plain English. Arth can edit clips, add
					effects, build motion graphics, and import media
					{recentCount > 0
						? ` — it has learned from ${recentCount} of your edits.`
						: "."}
				</p>
			</div>

			{/* Suggestion cards */}
			<div className="flex w-full flex-col gap-1.5">
				{suggestions.map((s) => (
					<button
						key={s.text}
						type="button"
						onClick={() => onPick(s.text)}
						className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-all hover:border-white/15 hover:bg-white/[0.05]"
					>
						<div className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition-colors group-hover:border-white/15 group-hover:bg-white/[0.06]">
							<HugeiconsIcon
								icon={s.icon}
								className="size-3.5 text-white/50 transition-colors group-hover:text-white/80"
							/>
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
								{s.label}
							</span>
							<span className="truncate text-[11px] text-white/65 transition-colors group-hover:text-white/85">
								{s.text}
							</span>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

/**
 * Plan card — a visual checklist showing the AI's current plan.
 * Each step shows its status (pending, in_progress, done, skipped)
 * with a color-coded icon. The card animates in when the plan is
 * created and updates in real time as the AI progresses through steps.
 */
function PlanCard({ plan }: { plan: Plan }) {
	const doneCount = plan.steps.filter((s) => s.status === "done").length;
	const skippedCount = plan.steps.filter(
		(s) => s.status === "skipped",
	).length;
	const activeCount = plan.steps.length - skippedCount;
	const progress =
		activeCount > 0 ? Math.round((doneCount / activeCount) * 100) : 0;
	const allDone = doneCount === activeCount && activeCount > 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: -8, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
			className={cn(
				"overflow-hidden rounded-2xl border",
				allDone
					? "border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.06] to-emerald-400/[0.01]"
					: "border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
			)}
		>
			{/* Header */}
			<div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-2.5">
				<div
					className={cn(
						"grid size-6 shrink-0 place-items-center rounded-lg border transition-all",
						allDone
							? "border-emerald-400/20 bg-emerald-400/10"
							: "border-white/[0.08] bg-white/[0.04]",
					)}
				>
					<HugeiconsIcon
						icon={allDone ? CheckmarkCircle02Icon : MagicWand05Icon}
						className={cn(
							"size-3.5",
							allDone
								? "text-emerald-300"
								: "text-white/60",
						)}
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-[12px] font-semibold text-white/90">
						{plan.title}
					</span>
					<span className="text-[9.5px] text-white/40">
						{doneCount}/{activeCount} steps
						{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
					</span>
				</div>
				{/* Progress ring */}
				<div className="relative grid size-7 shrink-0 place-items-center">
					<svg
						className="size-7 -rotate-90"
						viewBox="0 0 28 28"
						role="img"
						aria-label={`Plan progress: ${progress}%`}
					>
						<circle
							cx="14"
							cy="14"
							r="11"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-white/[0.06]"
						/>
						<circle
							cx="14"
							cy="14"
							r="11"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeDasharray={`${(progress / 100) * 69.12} 69.12`}
							className={cn(
								"transition-all duration-500",
								allDone ? "text-emerald-400" : "text-white/50",
							)}
						/>
					</svg>
					<span
						className={cn(
							"absolute text-[8px] font-bold tabular-nums",
							allDone ? "text-emerald-300" : "text-white/50",
						)}
					>
						{progress}
					</span>
				</div>
			</div>

			{/* Steps */}
			<div className="flex flex-col gap-0.5 p-2">
				{plan.steps.map((step, idx) => (
					<motion.div
						key={step.title}
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: idx * 0.04 }}
						className={cn(
							"flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-all",
							step.status === "in_progress" &&
								"bg-white/[0.04] ring-1 ring-white/[0.06]",
							step.status === "done" && "opacity-50",
							step.status === "skipped" && "opacity-30",
						)}
					>
						{/* Status icon */}
						<div
							className={cn(
								"mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-all",
								step.status === "done" &&
									"border-emerald-400/30 bg-emerald-400/15",
								step.status === "in_progress" &&
									"border-white/20 bg-white/[0.06]",
								step.status === "pending" &&
									"border-white/[0.08] bg-transparent",
								step.status === "skipped" &&
									"border-white/[0.06] bg-transparent",
							)}
						>
							{step.status === "done" && (
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="size-2.5 text-emerald-300"
								/>
							)}
							{step.status === "in_progress" && (
								<motion.div
									animate={{ rotate: 360 }}
									transition={{
										duration: 1.5,
										repeat: Number.POSITIVE_INFINITY,
										ease: "linear",
									}}
								>
									<HugeiconsIcon
										icon={SparklesIcon}
										className="size-2 text-white/60"
									/>
								</motion.div>
							)}
							{step.status === "skipped" && (
								<HugeiconsIcon
									icon={Cancel01Icon}
									className="size-2 text-white/30"
								/>
							)}
							{step.status === "pending" && (
								<span className="size-1 rounded-full bg-white/20" />
							)}
						</div>

						{/* Step text */}
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span
								className={cn(
									"text-[11px] font-medium leading-tight",
									step.status === "done"
										? "text-white/50 line-through decoration-white/20"
										: step.status === "in_progress"
											? "text-white/90"
											: step.status === "skipped"
												? "text-white/30 line-through decoration-white/10"
												: "text-white/70",
								)}
							>
								{step.title}
							</span>
							{step.description && step.status !== "done" && (
								<span className="text-[9.5px] leading-tight text-white/35">
									{step.description}
								</span>
							)}
						</div>

						{/* Step number */}
						<span className="mt-0.5 shrink-0 text-[8px] font-mono text-white/20">
							{idx + 1}
						</span>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}


/**
 * Advanced AI settings popover — lets the user tune the tool-call loop
 * depth, retry behavior, and auto-compaction thresholds. Settings are
 * persisted via the AI store (localStorage).
 */
function AdvancedSettingsButton() {
	const settings = useAIStore((s) => s.advancedSettings);
	const setAdvancedSettings = useAIStore((s) => s.setAdvancedSettings);
	const setTelemetryEnabled = useTelemetryStore((s) => s.setEnabled);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label="Advanced AI settings"
					title="Advanced AI settings — tune tool rounds, retries, compaction"
					className="group flex size-6 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] transition-all hover:border-white/15 hover:bg-white/[0.05]"
				>
					<HugeiconsIcon
						icon={SlidersHorizontalIcon}
						className="size-3 shrink-0 text-white/50 transition-colors group-hover:text-white/80"
					/>
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={4}
				className="w-72 rounded-xl border border-white/10 bg-[#0f0f12] p-3 shadow-2xl"
			>
				<div className="mb-2.5 flex items-center gap-1.5">
					<HugeiconsIcon
						icon={SlidersHorizontalIcon}
						className="size-3.5 text-white/60"
					/>
					<span className="text-[11px] font-semibold text-white/80">
						Advanced AI Settings
					</span>
				</div>
				<div className="flex flex-col gap-2.5">
					<SettingRow
						label="Max tool rounds"
						description="Max LLM tool-call cycles per message"
						value={settings.maxToolRounds}
						min={1}
						max={1000}
						onChange={(v) => setAdvancedSettings({ maxToolRounds: v })}
					/>
					<SettingRow
						label="Max retry attempts"
						description="Auto-retries on error before giving up"
						value={settings.maxRetryAttempts}
						min={0}
						max={50}
						onChange={(v) => setAdvancedSettings({ maxRetryAttempts: v })}
					/>
					<SettingRow
						label="Retry cooldown (s)"
						description="Base seconds per retry attempt"
						value={settings.retryCooldownBase}
						min={1}
						max={60}
						onChange={(v) => setAdvancedSettings({ retryCooldownBase: v })}
					/>
					<SettingRow
						label="Compaction threshold"
						description="Message count before auto-compacting"
						value={settings.compactionMessageThreshold}
						min={5}
						max={100}
						onChange={(v) =>
							setAdvancedSettings({ compactionMessageThreshold: v })
						}
					/>
					<SettingRow
						label="Keep last (compaction)"
						description="Recent messages kept during compaction"
						value={settings.compactionKeepLast}
						min={2}
						max={20}
						onChange={(v) => setAdvancedSettings({ compactionKeepLast: v })}
					/>

					{/* Learning scope — controls how the AI learns from edits */}
					<div className="flex flex-col gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.015] p-2">
						<div className="flex items-center gap-1.5">
							<span className="text-[10.5px] font-semibold text-white/70">
								Style learning
							</span>
						</div>
						<p className="text-[9.5px] leading-snug text-white/40">
							How the AI learns your editing style.
						</p>
						<div className="mt-0.5 flex gap-1">
							{(
								[
									{ value: "project", label: "Project" },
									{ value: "global", label: "Global" },
									{ value: "off", label: "Off" },
								] as const
							).map((opt) => (
								<button
									key={opt.value}
									type="button"
									onClick={() => {
										setAdvancedSettings({ learningScope: opt.value });
										// Sync the auto-learn toggle with the scope:
										// "off" disables telemetry, "project"/"global"
										// enables it so the status bar toggle matches.
										setTelemetryEnabled(opt.value !== "off");
									}}
									className={cn(
										"flex-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-all",
										settings.learningScope === opt.value
											? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
											: "border-white/[0.06] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/70",
									)}
								>
									{opt.label}
								</button>
							))}
						</div>
						{settings.learningScope === "project" && (
							<p className="text-[9px] text-white/30">
								Learns from edits in this project only.
							</p>
						)}
						{settings.learningScope === "global" && (
							<p className="text-[9px] text-white/30">
								Learns from edits across all projects.
							</p>
						)}
						{settings.learningScope === "off" && (
							<p className="text-[9px] text-white/30">
								No style learning — AI won't reference edit history.
							</p>
						)}
					</div>
				</div>
				<button
					type="button"
					onClick={() => {
						setAdvancedSettings({
							maxToolRounds: 500,
							maxRetryAttempts: 10,
							retryCooldownBase: 5,
							compactionMessageThreshold: 20,
							compactionKeepLast: 6,
							learningScope: "project",
						});
						// Reset also re-enables telemetry to match the
						// default "project" learning scope.
						setTelemetryEnabled(true);
					}}
					className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
				>
					Reset to defaults
				</button>
			</PopoverContent>
		</Popover>
	);
}

function SettingRow({
	label,
	description,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	description: string;
	value: number;
	min: number;
	max: number;
	onChange: (v: number) => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<span className="text-[10.5px] font-medium text-white/70">
					{label}
				</span>
				<span className="font-mono text-[10px] text-white/50">{value}</span>
			</div>
			<p className="text-[9px] text-white/35">{description}</p>
			<input
				type="range"
				min={min}
				max={max}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white/60"
			/>
		</div>
	);
}

function isAssistantQuestion(message: ChatMessage): boolean {
	if (message.role !== "assistant" || message.toolCalls?.length) return false;
	const text = message.content?.trim() ?? "";
	if (!text.endsWith("?")) return false;
	// Sentences before the final question mark should be short enough
	// that the whole message reads as a question/confirmation prompt.
	return text.length < 500;
}

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";
	const isTool = message.role === "tool";
	const editor = useEditor();
	const setActiveTab = useAssetsPanelStore((s) => s.setActiveTab);
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(message.content);
	const [copied, setCopied] = useState(false);
	if (isTool) return null;

	// Hide empty bubbles that have no visible content and no tool calls.
	// These can appear while streaming text-based tool calls from Puter.js
	// (e.g. MiniMax) where the XML tags are stripped and the visible text
	// arrives later, leaving a bare placeholder bubble above Thinking….
	if (!message.content?.trim() && !message.toolCalls?.length) return null;

	const toolCallCount = message.toolCalls?.length ?? 0;
	const successCount =
		message.toolCalls?.filter((tc) => tc.result?.ok).length ?? 0;

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(message.content);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard may be blocked — silent fail */
		}
	};

	const handleSaveEdit = () => {
		const trimmed = editText.trim();
		if (!trimmed) return;
		useAIStore.getState().updateMessage(message.id, {
			content: trimmed,
		});
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditText(message.content);
		setIsEditing(false);
	};

	const handleRevert = () => {
		editor.ai.revertToMessage(message.id);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 6, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
			className={cn(
				"group flex gap-2.5",
				isUser ? "flex-row-reverse" : "flex-row",
			)}
		>
			{/* Avatar */}
			<div
				className={cn(
					"mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border transition-all",
					isUser
						? "border-white/[0.1] bg-white/[0.06]"
						: "border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.02]",
				)}
			>
				<HugeiconsIcon
					icon={isUser ? Edit01Icon : SparklesIcon}
					className={cn(
						"size-3.5",
						isUser ? "text-white/60" : "text-white/80",
					)}
				/>
			</div>

			{/* Bubble body */}
			<div
				className={cn(
					"flex min-w-0 max-w-[85%] flex-col gap-1.5",
					isUser ? "items-end" : "items-start",
				)}
			>
				<div
					className={cn(
						"rounded-2xl border px-3 py-2 text-[12px] leading-relaxed transition-all",
						isUser
							? "rounded-tr-md border-white/[0.12] bg-white/[0.07] text-white"
							: "rounded-tl-md border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] text-white/90",
					)}
				>
					{isEditing ? (
						<div className="flex flex-col gap-1.5">
							<textarea
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
								className="w-full resize-none rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-[12px] text-white outline-none focus:border-white/30"
								rows={3}
								// biome-ignore lint/a11y/noAutofocus: focusing the edit textarea is intentional UX
								autoFocus
							/>
							<div className="flex justify-end gap-1.5">
								<button
									type="button"
									onClick={handleCancelEdit}
									className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/[0.06]"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleSaveEdit}
									className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200 hover:bg-emerald-400/20"
								>
									Save
								</button>
							</div>
						</div>
					) : isAssistantQuestion(message) ? (
						<div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 shadow-[0_0_12px_-4px_rgba(34,211,238,0.2)]">
							<div className="grid size-6 shrink-0 place-items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
								<HugeiconsIcon
									icon={Chat01Icon}
									className="size-3.5 text-cyan-300"
								/>
							</div>
							<div className="prose prose-invert prose-sm max-w-none text-[12px] leading-relaxed text-cyan-100">
								<Markdown
									allowedElements={[
										"p",
										"strong",
										"em",
										"code",
										"ul",
										"ol",
										"li",
										"a",
										"br",
									]}
								>
									{linkifyHashtags(message.content)}
								</Markdown>
							</div>
						</div>
					) : message.content ? (
						<div className="prose prose-invert prose-sm max-w-none text-white/90 [&_a]:text-white/80 [&_a]:underline [&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[10.5px] [&_code]:font-mono [&_pre]:rounded-lg [&_pre]:bg-black/30 [&_pre]:px-2.5 [&_pre]:py-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-white">
							<Markdown
								allowedElements={[
									"p",
									"strong",
									"em",
									"code",
									"pre",
									"ul",
									"ol",
									"li",
									"a",
									"br",
								]}
								components={{
									a: ({ href, children }) => {
										// Intercept hashtag links of the form
										// `#tab:tabKey` and switch the assets
										// panel tab instead of navigating.
										if (href?.startsWith("#tab:")) {
											const tabKey = href.slice(5) as AssetsTab;
											return (
												<button
													type="button"
													onClick={(e) => {
														e.preventDefault();
														setActiveTab(tabKey);
													}}
													className="inline-flex items-center rounded bg-cyan-400/15 px-1 py-0.5 text-[11px] font-medium text-cyan-300 no-underline transition hover:bg-cyan-400/25 hover:text-cyan-200"
												>
													{children}
												</button>
											);
										}
										return <a href={href}>{children}</a>;
									},
								}}
							>
								{linkifyHashtags(message.content)}
							</Markdown>
						</div>
					) : null}
				</div>

				{/* Action buttons — copy, edit, revert (visible on hover) */}
				{!isEditing && message.content && (
					<div
						className={cn(
							"flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
							isUser ? "flex-row-reverse" : "flex-row",
						)}
					>
						<button
							type="button"
							onClick={handleCopy}
							title={copied ? "Copied!" : "Copy message"}
							className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
						>
							<HugeiconsIcon
								icon={copied ? CheckmarkSquare01Icon : Copy02Icon}
								className="size-2.5"
							/>
							{copied ? "Copied" : "Copy"}
						</button>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							title="Edit message"
							className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
						>
							<HugeiconsIcon icon={Edit01Icon} className="size-2.5" />
							Edit
						</button>
						{isUser && toolCallCount === 0 && (
							<button
								type="button"
								onClick={handleRevert}
								title="Revert all AI edits made for this message"
								className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-white/40 transition-colors hover:bg-amber-400/10 hover:text-amber-200"
							>
								<HugeiconsIcon
									icon={ArrowTurnBackwardIcon}
									className="size-2.5"
								/>
								Revert
							</button>
						)}
					</div>
				)}

				{/* Tool calls */}
				{toolCallCount > 0 && (
					<div className="flex w-full flex-col gap-1">
						<div className="flex items-center gap-1.5 px-1 text-[9px] font-medium uppercase tracking-wider">
							<motion.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: "spring", stiffness: 300, damping: 20 }}
								className={cn(
									"grid size-4 place-items-center rounded",
									successCount === toolCallCount
										? "bg-emerald-400/15"
										: "bg-white/[0.06]",
								)}
							>
								<HugeiconsIcon
									icon={successCount === toolCallCount ? CheckmarkCircle02Icon : MagicWand05Icon}
									className={cn(
										"size-2.5",
										successCount === toolCallCount
											? "text-emerald-300"
											: "text-white/50",
									)}
								/>
							</motion.div>
							<span className={cn(
								successCount === toolCallCount
									? "text-emerald-300/60"
									: "text-white/35",
							)}>
								{successCount === toolCallCount
									? `${toolCallCount} action${toolCallCount > 1 ? "s" : ""} completed`
									: `${successCount}/${toolCallCount} actions done`}
							</span>
						</div>
						{message.toolCalls?.map((tc, i) => (
							<ToolCallRow
								key={`${tc.name}-${JSON.stringify(tc.args).slice(0, 20)}-${tc.result?.ok ? "ok" : "pending"}`}
								tc={tc}
								idx={i}
							/>
						))}
					</div>
				)}
			</div>
		</motion.div>
	);
}

/**
 * Map a tool name to its category for icon + color assignment.
 * Tool names are prefixed with their category (e.g. "scene_add",
 * "element_update", "generate_video"). MCP tools are prefixed
 * with "mcp__".
 */
interface ToolVisual {
	icon: typeof SparklesIcon;
	color: string;
	bg: string;
	border: string;
	glow: string;
}

function getToolVisual(toolName: string): ToolVisual {
	// MCP tools — all share the puzzle icon since they're external.
	if (toolName.startsWith("mcp__")) {
		return {
			icon: PuzzleIcon,
			color: "text-violet-300",
			bg: "bg-violet-500/10",
			border: "border-violet-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]",
		};
	}

	// Per-tool-name icon overrides. Each tool gets a distinct icon so
	// the user can tell at a glance which tool was called. Colors still
	// come from the category map below.
	const TOOL_ICONS: Record<string, typeof SparklesIcon> = {
		// project
		set_project_fps: SlidersVerticalIcon,
		set_project_canvas: ColorsIcon,
		set_project_background: BackgroundIcon,
		save_project: SaveIcon,
		// scene
		create_scene: Film01Icon,
		rename_scene: Edit01Icon,
		add_bookmark: Bookmark01Icon,
		remove_bookmark: Bookmark02Icon,
		delete_scene: Delete01Icon,
		switch_scene: FilmIcon,
		// track
		add_track: LayersIcon,
		remove_track: Delete02Icon,
		set_track_muted: VolumeMute01Icon,
		set_track_visible: EyeIcon,
		// element
		insert_text_element: TextIcon,
		insert_camera_layer: Camera01Icon,
		insert_null_layer: Grid02Icon,
		move_element: Move01Icon,
		split_element: ScissorIcon,
		delete_elements: Delete03Icon,
		update_element: AdjustPositionIcon,
		group_elements: Group01Icon,
		ungroup_elements: Unlink02Icon,
		duplicate_elements: Copy01Icon,
		toggle_source_audio_separation: CaptionsIcon,
		set_parent: Link01Icon,
		unlink_parent: Unlink01Icon,
		combine_elements: CombineIcon,
		// effect
		add_clip_effect: PaintBoardIcon,
		remove_clip_effect: Delete01Icon,
		update_clip_effect_params: SlidersVerticalIcon,
		toggle_effect_enabled: Settings01Icon,
		reorder_effects: Settings02Icon,
		// mask
		remove_mask: Delete02Icon,
		toggle_mask_inverted: PaintBrushIcon,
		// keyframe
		upsert_keyframe: Key01Icon,
		remove_keyframe: Delete03Icon,
		retime_keyframe: Clock01Icon,
		upsert_effect_param_keyframe: Key01Icon,
		remove_effect_param_keyframe: Delete03Icon,
		// transition
		add_transition: TransitionLeftIcon,
		remove_transition: Delete01Icon,
		update_transition: SlidersHorizontalIcon,
		// playback
		play: PlayIcon,
		seek: Target01Icon,
		set_volume: VolumeHighIcon,
		capture_frame: Camera01Icon,
		// asset
		import_asset_from_url: Upload01Icon,
		list_assets: Search01Icon,
		add_media_to_timeline: CropIcon,
		import_and_add_to_timeline: FileImportIcon,
		create_folder: Folder01Icon,
		move_asset_to_folder: Move01Icon,
		delete_asset: Delete02Icon,
		rename_folder: Edit01Icon,
		delete_folder: Delete03Icon,
		// style
		apply_preset: MagicWand05Icon,
		// export
		export_project: FileExportIcon,
		// history
		undo: ArrowTurnBackwardIcon,
		redo: ArrowTurnForwardIcon,
		// selection
		select_elements: Target01Icon,
		clear_selection: Cancel01Icon,
		// clipboard
		copy: Copy02Icon,
		paste: ClipboardPasteIcon,
		"copy-style": SourceCodeIcon,
		"paste-style": SourceCodeIcon,
		"copy-effect": FilterIcon,
		"paste-effect": FilterIcon,
		paste_keyframes: ClipboardCheckIcon,
		// plan
		create_plan: CheckListIcon,
		update_todo: CheckmarkSquare01Icon,
		// web
		web_fetch: Globe02Icon,
		// generate
		generate_video: Video01Icon,
		generate_image: Image01Icon,
		generate_audio: MusicNote03Icon,
		generate_media: SparklesIcon,
	};

	// Category-based color mapping (icon is overridden per-tool above).
	const prefix = toolName.split("_")[0] ?? "misc";
	const categoryColors: Record<string, { color: string; bg: string; border: string; glow: string }> = {
		project: {
			color: "text-blue-300",
			bg: "bg-blue-500/10",
			border: "border-blue-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(59,130,246,0.3)]",
		},
		scene: {
			color: "text-indigo-300",
			bg: "bg-indigo-500/10",
			border: "border-indigo-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(99,102,241,0.3)]",
		},
		track: {
			color: "text-teal-300",
			bg: "bg-teal-500/10",
			border: "border-teal-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(20,184,166,0.3)]",
		},
		element: {
			color: "text-emerald-300",
			bg: "bg-emerald-500/10",
			border: "border-emerald-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(16,185,129,0.3)]",
		},
		effect: {
			color: "text-purple-300",
			bg: "bg-purple-500/10",
			border: "border-purple-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(168,85,247,0.3)]",
		},
		mask: {
			color: "text-pink-300",
			bg: "bg-pink-500/10",
			border: "border-pink-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(236,72,153,0.3)]",
		},
		keyframe: {
			color: "text-orange-300",
			bg: "bg-orange-500/10",
			border: "border-orange-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(249,115,22,0.3)]",
		},
		transition: {
			color: "text-lime-300",
			bg: "bg-lime-500/10",
			border: "border-lime-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(132,204,22,0.3)]",
		},
		playback: {
			color: "text-green-300",
			bg: "bg-green-500/10",
			border: "border-green-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(34,197,94,0.3)]",
		},
		asset: {
			color: "text-sky-300",
			bg: "bg-sky-500/10",
			border: "border-sky-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(14,165,233,0.3)]",
		},
		web: {
			color: "text-violet-300",
			bg: "bg-violet-500/10",
			border: "border-violet-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(139,92,246,0.3)]",
		},
		style: {
			color: "text-fuchsia-300",
			bg: "bg-fuchsia-500/10",
			border: "border-fuchsia-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(217,70,239,0.3)]",
		},
		export: {
			color: "text-red-300",
			bg: "bg-red-500/10",
			border: "border-red-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(239,68,68,0.3)]",
		},
		history: {
			color: "text-stone-300",
			bg: "bg-stone-500/10",
			border: "border-stone-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(120,113,108,0.3)]",
		},
		selection: {
			color: "text-yellow-300",
			bg: "bg-yellow-500/10",
			border: "border-yellow-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(234,179,8,0.3)]",
		},
		clipboard: {
			color: "text-cyan-300",
			bg: "bg-cyan-500/10",
			border: "border-cyan-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(34,211,238,0.3)]",
		},
		plan: {
			color: "text-indigo-300",
			bg: "bg-indigo-500/10",
			border: "border-indigo-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(99,102,241,0.3)]",
		},
		generate: {
			color: "text-fuchsia-300",
			bg: "bg-fuchsia-500/10",
			border: "border-fuchsia-400/20",
			glow: "shadow-[0_0_12px_-4px_rgba(217,70,239,0.3)]",
		},
	};

	const colors = categoryColors[prefix] ?? {
		color: "text-white/60",
		bg: "bg-white/[0.04]",
		border: "border-white/[0.08]",
		glow: "",
	};

	return {
		icon: TOOL_ICONS[toolName] ?? MagicWand05Icon,
		...colors,
	};
}

/**
 * Expandable tool-call row with colorful category-based icons,
 * glow effects, and smooth animations. Click to expand and see
 * the arguments the AI passed, the result message, and any
 * structured data the tool returned.
 */
function ToolCallRow({
	tc,
	idx,
}: {
	tc: {
		name: string;
		args: Record<string, unknown>;
		result?: { ok: boolean; message?: string; data?: unknown };
	};
	idx: number;
}) {
	const [expanded, setExpanded] = useState(false);
	const visual = getToolVisual(tc.name);

	const hasDetails =
		Object.keys(tc.args).length > 0 ||
		tc.result?.data !== undefined ||
		(tc.result?.message && tc.result.message.length > 40);

	// Pretty-print the tool name: "scene_add" → "scene · add"
	const prettyName = tc.name
		.replace(/^mcp__/, "mcp · ")
		.replace(/__/g, " · ")
		.replace(/_/g, " ");

	return (
		<motion.div
			initial={{ opacity: 0, x: -8, scale: 0.95 }}
			animate={{ opacity: 1, x: 0, scale: 1 }}
			transition={{ delay: idx * 0.06, type: "spring", stiffness: 300, damping: 24 }}
			className={cn(
				"overflow-hidden rounded-lg border transition-all",
				visual.border,
				visual.bg,
				visual.glow,
				tc.result?.ok === false && "border-red-400/25 bg-red-500/[0.06]",
			)}
		>
			<button
				type="button"
				onClick={() => hasDetails && setExpanded((e) => !e)}
				className={cn(
					"flex w-full items-center gap-2 px-2.5 py-2 text-left",
					hasDetails && "cursor-pointer hover:bg-white/[0.03]",
				)}
				aria-expanded={expanded}
			>
				{/* Category icon with colored background */}
				<div
					className={cn(
						"grid size-5 shrink-0 place-items-center rounded-md border",
						visual.border,
						visual.bg,
					)}
				>
					<HugeiconsIcon
						icon={visual.icon}
						className={cn("size-3", visual.color)}
					/>
				</div>
				{/* Tool name */}
				<span className={cn(
					"shrink-0 font-mono text-[10px] font-medium",
					visual.color,
				)}>
					{prettyName}
				</span>
				{/* Status indicator */}
				<div className="ml-auto flex items-center gap-1.5">
					{tc.result?.ok && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 400, damping: 15 }}
							className="grid size-3.5 place-items-center"
						>
							<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								className="size-3.5 text-emerald-400"
							/>
						</motion.div>
					)}
					{tc.result?.ok === false && (
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 400, damping: 15 }}
							className="grid size-3.5 place-items-center"
						>
							<HugeiconsIcon
								icon={AlertCircleIcon}
								className="size-3.5 text-red-400"
							/>
						</motion.div>
					)}
					{!tc.result && (
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
							className="grid size-3.5 place-items-center"
						>
							<HugeiconsIcon
								icon={MagicWand05Icon}
								className="size-3 text-white/40"
							/>
						</motion.div>
					)}
					{tc.result?.message && !expanded && (
						<span className="hidden max-w-[120px] truncate text-[9.5px] text-white/35 sm:inline">
							{tc.result.message}
						</span>
					)}
					{hasDetails && (
						<HugeiconsIcon
							icon={ArrowDown03Icon}
							className={cn(
								"size-3 shrink-0 text-white/30 transition-transform",
								expanded && "rotate-180",
							)}
						/>
					)}
				</div>
			</button>
			{expanded && hasDetails && (
				<motion.div
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					className="border-t border-white/[0.06] px-2.5 py-2"
				>
					{/* Arguments */}
					{Object.keys(tc.args).length > 0 && (
						<div className="mb-2">
							<div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">
								Arguments
							</div>
							<pre className="overflow-x-auto rounded bg-black/30 px-2 py-1.5 text-[9.5px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap break-words">
								{JSON.stringify(tc.args, null, 2)}
							</pre>
						</div>
					)}
					{/* Result message (full, not truncated) */}
					{tc.result?.message && (
						<div className="mb-2">
							<div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">
								Result
							</div>
							<p className={cn(
								"text-[10px] leading-relaxed",
								tc.result.ok ? "text-emerald-300/70" : "text-red-300/70",
							)}>
								{tc.result.message}
							</p>
						</div>
					)}
					{/* Structured data */}
					{tc.result?.data !== undefined && tc.result?.data !== null && (
						<div>
							<div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/30">
								Data
							</div>
							<pre className="max-h-40 overflow-auto rounded bg-black/30 px-2 py-1.5 text-[9.5px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap break-words">
								{JSON.stringify(tc.result.data, null, 2)}
							</pre>
						</div>
					)}
				</motion.div>
			)}
		</motion.div>
	);
}

function TypingDots() {
	return (
		<div className="flex items-center gap-1" aria-hidden="true">
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					className="block size-1 rounded-full bg-white/50"
					animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
					transition={{
						duration: 1.2,
						repeat: Number.POSITIVE_INFINITY,
						delay: i * 0.15,
						ease: "easeInOut",
					}}
				/>
			))}
		</div>
	);
}

// Suppress unused-import warning for icons that are only referenced
// inside the QUICK_ACTIONS table; keep them in scope for tree-shaking.
void Image01Icon;
