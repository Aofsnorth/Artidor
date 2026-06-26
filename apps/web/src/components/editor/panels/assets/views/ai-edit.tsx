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
	type FormEvent,
	type KeyboardEvent,
} from "react";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowDown03Icon,
	ArrowUp02Icon,
	AttachmentIcon,
	Cancel01Icon,
	Chat01Icon,
	Delete02Icon,
	Edit01Icon,
	Image01Icon,
	MagicWand05Icon,
	PaintBrushIcon,
	SparklesIcon,
	StopIcon,
	Upload01Icon,
	Video01Icon,
	PlugIcon,
	ChatAdd01Icon,
} from "@hugeicons/core-free-icons";
import { useAIStore, type ChatMessage } from "@/stores/ai-store";
import { useAIProvidersStore } from "@/stores/ai-providers-store";
import { useTelemetryStore } from "@/lib/ai/telemetry/store";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
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
import { AIProvidersManager } from "./ai-providers-manager";

const QUICK_ACTIONS: {
	label: string;
	prompt: string;
	icon: typeof SparklesIcon;
}[] = [
	{
		label: "Motion graphic",
		prompt:
			"Create a kinetic typography motion graphic: 3 text layers that fly in, hold, then fly out, with a smooth 1-second ease. Use the current project's canvas size.",
		icon: SparklesIcon,
	},
	{
		label: "60s reel",
		prompt:
			"Make this a 60-second reel: trim the longest clip, add captions using the available audio, drop a beat-synced zoom on each cut.",
		icon: Video01Icon,
	},
	{
		label: "Cinematic grade",
		prompt:
			"Apply a cinematic look: add a subtle blur effect to the background track, fade in the first 0.5s and fade out the last 1s, set background to blur intensity 12.",
		icon: PaintBrushIcon,
	},
	{
		label: "Match style",
		prompt:
			"Match the cut pacing and transition style of the reference video I attached. Start with a 4-cut intro and add quick keyframes on each text element.",
		icon: MagicWand05Icon,
	},
];

export function AIEditView() {
	const editor = useEditor();
	const ai = useAIStore();
	const telemetry = useTelemetryStore();
	const defaultProvider = useAIProvidersStore((s) => s.getDefault());
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
		ai.status === "streaming" || ai.status === "awaiting-tools";
	// A single value that changes whenever the chat content changes
	// (new message, streaming token, status change) so the effect fires.
	const chatTick = `${ai.messages.length}:${ai.messages[ai.messages.length - 1]?.content ?? ""}:${ai.status}`;
	// biome-ignore lint/correctness/useExhaustiveDependencies: chatTick is a proxy for ai.messages changes
	useEffect(() => {
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
			if (!trimmed || isStreaming) return;
			setDraft("");
			setMentionQuery(null);
			await editor.ai.send({ text: trimmed });
		},
		[editor.ai, isStreaming],
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
			await editor.ai.applyReferenceVideo(file);
		} finally {
			setIsExtracting(false);
		}
	};

	const handleCancel = () => {
		editor.ai.cancel();
	};

	return (
		<>
			<div className="flex h-full min-h-0 flex-col gap-2 px-1.5 pb-1.5 pt-1.5">
				<StatusBar
					referenceVideoName={ai.referenceVideoName}
					styleProfile={ai.styleProfile}
					recentCount={recentCount}
					isStreaming={isStreaming}
					defaultProvider={defaultProvider}
					compactedSummary={ai.compactedSummary}
					autoLearnEnabled={autoLearnEnabled}
					conversations={ai.conversations}
					onToggleAutoLearn={() => telemetry.setEnabled(!autoLearnEnabled)}
					onOpenProviders={() => setProvidersOpen(true)}
					onClearReference={() => editor.ai.clearReference()}
					onNewChat={() => ai.clearConversation()}
					onLoadConversation={(id) => ai.loadConversation(id)}
					onRenameConversation={(id, name) => ai.renameConversation(id, name)}
					onDeleteConversation={(id) => ai.deleteConversation(id)}
				/>

				{/* Quick actions */}
				<div className="flex flex-wrap gap-1">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isExtracting}
						className={cn(
							"flex h-6 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium transition-all",
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
					{QUICK_ACTIONS.map((qa) => (
						<button
							key={qa.label}
							type="button"
							onClick={() => handleQuickAction(qa.prompt)}
							disabled={isStreaming}
							className={cn(
								"flex h-6 items-center gap-1 rounded-md border px-2 text-[10.5px] font-medium transition-all",
								"border-white/[0.08] bg-white/[0.03] text-white/60 hover:border-white/15 hover:bg-white/[0.06] hover:text-white/80",
								isStreaming && "cursor-not-allowed opacity-50",
							)}
						>
							<HugeiconsIcon icon={qa.icon} className="size-3" />
							{qa.label}
						</button>
					))}
				</div>

				{/* Messages */}
				<div
					ref={messagesContainerRef}
					onScroll={handleMessagesScroll}
					className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
				>
					{ai.messages.length === 0 ? (
						<EmptyState onPick={(t) => setDraft(t)} recentCount={recentCount} />
					) : (
						ai.messages.map((m) => <MessageBubble key={m.id} message={m} />)
					)}
					{isStreaming && (
						<div className="flex items-center gap-2 self-start rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/65">
							<Spinner />
							{ai.status === "awaiting-tools"
								? "Executing tool calls…"
								: "Thinking…"}
						</div>
					)}
					{ai.error && (
						<div className="rounded-md border border-red-400/30 bg-red-500/[0.08] px-2.5 py-1.5 text-[11px] text-red-300">
							{ai.error}
						</div>
					)}
					<div ref={messagesEndRef} />

					{/* Scroll-to-top button — only visible when not at top */}
					{!isAtTop && ai.messages.length > 0 && (
						<button
							type="button"
							onClick={scrollToTop}
							title="Scroll to top"
							className="sticky top-1 left-1/2 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1e]/90 text-white/60 backdrop-blur transition-all hover:text-white/90 hover:border-white/20"
						>
							<HugeiconsIcon icon={ArrowUp02Icon} className="size-3" />
						</button>
					)}

					{/* Scroll-to-bottom button — only visible when not at bottom */}
					{!isAtBottom && ai.messages.length > 0 && (
						<button
							type="button"
							onClick={scrollToBottom}
							title="Scroll to bottom"
							className="sticky bottom-1 left-1/2 z-10 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1e]/90 text-white/60 backdrop-blur transition-all hover:text-white/90 hover:border-white/20"
						>
							<HugeiconsIcon icon={ArrowDown03Icon} className="size-3" />
						</button>
					)}
				</div>

				{/* Composer */}
				<form
					onSubmit={handleSubmit}
					className="relative flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-2.5 backdrop-blur"
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
						placeholder="Ask Arth to edit, plan a motion graphic, or describe what you want…  Use @ to mention an asset"
						rows={2}
						className="w-full resize-none border-none bg-transparent text-[12.5px] text-white/95 outline-none placeholder:text-white/30"
					/>
					<div className="flex items-center justify-between text-[10px] text-white/35">
						<span className="flex items-center gap-1">
							<HugeiconsIcon icon={AttachmentIcon} className="size-3" />
							Enter to send · Shift+Enter for newline
						</span>
						{isStreaming ? (
							<button
								type="button"
								onClick={handleCancel}
								className="flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-white/80 transition-colors hover:bg-white/[0.08]"
							>
								<HugeiconsIcon icon={StopIcon} className="size-3" />
								Stop
							</button>
						) : (
							<button
								type="submit"
								disabled={!draft.trim()}
								className={cn(
									"flex items-center gap-1 rounded-md px-2.5 py-1 text-[10.5px] font-medium transition-all",
									draft.trim()
										? "bg-white text-[#0a0a0c] hover:bg-white/90 hover:shadow-[0_0_20px_-4px_rgba(255,255,255,0.3)]"
										: "cursor-not-allowed bg-white/[0.08] text-white/25",
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

function StatusBar({
	referenceVideoName,
	styleProfile,
	recentCount,
	isStreaming,
	defaultProvider,
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
	defaultProvider: { name: string; model: string; kind: string } | undefined;
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
		<div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-[#0c0c10] to-[#08080c] p-0">
			{/* Top accent line */}
			<div
				aria-hidden
				className="absolute top-0 left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
				}}
			/>
			{/* Ambient glow */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255,255,255,0.06), transparent 60%)",
				}}
			/>

			<div className="relative flex flex-col gap-2 p-2.5">
				{/* Header row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="grid size-7 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
							<HugeiconsIcon
								icon={isStreaming ? SparklesIcon : MagicWand05Icon}
								className={cn(
									"size-4",
									isStreaming ? "text-white animate-pulse" : "text-white/70",
								)}
							/>
						</div>
						<span className="font-serif text-[13px] text-white">Arth</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span
							className={cn(
								"rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
								isStreaming
									? "border-white/20 bg-white/[0.08] text-white/80"
									: "border-white/[0.08] bg-white/[0.03] text-white/40",
							)}
						>
							{isStreaming ? "live" : "ready"}
						</span>
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

				{/* Provider chip */}
				<button
					type="button"
					onClick={onOpenProviders}
					className={cn(
						"group flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left transition-all",
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
								<span className="truncate text-[11px] text-white/80">
									{defaultProvider.name}
								</span>
								<span className="shrink-0 font-mono text-[9.5px] text-white/35">
									{defaultProvider.model}
								</span>
							</>
						) : (
							<span className="text-[11px] text-amber-100">
								Set up AI provider
							</span>
						)}
					</span>
					<span className="shrink-0 text-[9.5px] text-white/35 transition-colors group-hover:text-white/60">
						Manage
					</span>
				</button>

				{/* Meta row: learned edits + compaction + reference video */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-3 text-[10px] text-white/40">
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
								? `Learned from ${recentCount} edits`
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
						<div className="flex items-center justify-between gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1">
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

function EmptyState({
	onPick,
	recentCount,
}: {
	onPick: (text: string) => void;
	recentCount: number;
}) {
	const suggestions = useMemo(
		() => [
			"Add a 'Subscribe' text animation at the end of the timeline.",
			"Cut every 2 seconds, alternating between two clips.",
			"Build a 3-layer parallax intro that resolves in 1.5 seconds.",
			"Take the audio waveform and turn it into a motion path.",
		],
		[],
	);
	return (
		<div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
			<div className="flex items-center gap-1.5">
				<HugeiconsIcon icon={SparklesIcon} className="size-3.5 text-white/70" />
				<span className="text-[12px] font-semibold text-white/85">
					Start a conversation
				</span>
			</div>
			<p className="text-[11px] leading-relaxed text-white/45">
				Describe what you want in plain English. The AI can edit clips, change
				effects, set the canvas, add motion graphics, or import media
				{recentCount > 0
					? ` — and it has learned from ${recentCount} of your edits.`
					: "."}
			</p>
			<div className="flex flex-col gap-1">
				{suggestions.map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => onPick(s)}
						className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left text-[10.5px] text-white/65 transition-all hover:border-white/15 hover:bg-white/[0.05] hover:text-white/85"
					>
						{s}
					</button>
				))}
			</div>
		</div>
	);
}

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";
	const isTool = message.role === "tool";
	if (isTool) return null;
	return (
		<motion.div
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className={cn(
				"flex flex-col gap-1.5 rounded-xl border p-2.5 text-[12px] leading-relaxed",
				isUser
					? "self-end max-w-[92%] border-white/[0.1] bg-white/[0.06] text-white"
					: "self-start max-w-[92%] border-white/[0.06] bg-white/[0.02] text-white/90",
			)}
		>
			<div
				className={cn(
					"flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider",
					isUser ? "text-white/40" : "text-white/35",
				)}
			>
				{isUser ? "You" : "AI"}
			</div>
			{message.content && (
				<div className="whitespace-pre-wrap text-white/90">
					{message.content}
				</div>
			)}
			{message.toolCalls?.length ? (
				<div className="flex flex-col gap-1 border-t border-white/[0.06] pt-1.5">
					{message.toolCalls.map((tc) => {
						const argsHash = tc.result?.message
							? `${tc.name}-${tc.result.message}`
							: `${tc.name}-${JSON.stringify(tc.args)}`;
						return (
							<div
								key={argsHash}
								className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1"
							>
								<HugeiconsIcon
									icon={tc.result?.ok ? MagicWand05Icon : Cancel01Icon}
									className={cn(
										"size-3",
										tc.result?.ok ? "text-white/80" : "text-white/45",
									)}
								/>
								<span className="font-mono text-[10px] text-white/75">
									{tc.name}
								</span>
								{tc.result?.message ? (
									<span className="truncate text-[10px] text-white/45">
										— {tc.result.message}
									</span>
								) : null}
							</div>
						);
					})}
				</div>
			) : null}
		</motion.div>
	);
}

function Spinner() {
	return (
		<svg
			className="size-3 animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<title>Loading</title>
			<circle
				cx="12"
				cy="12"
				r="9"
				stroke="currentColor"
				strokeOpacity={0.2}
				strokeWidth="3"
			/>
			<path
				d="M21 12a9 9 0 0 0-9-9"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

// Suppress unused-import warning for icons that are only referenced
// inside the QUICK_ACTIONS table; keep them in scope for tree-shaking.
void Image01Icon;
