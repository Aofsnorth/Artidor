/**
 * Collaboration dialogs — the UI for starting and joining collaboration
 * sessions.
 *
 *  - StartCollabDialog: host flow — pick a mode (view/comment/edit/suggest),
 *    enter a nickname, create the room, and get a shareable link.
 *  - JoinCollabDialog: guest flow — enter a nickname and join the room
 *    from a /c/[roomId] link.
 *  - CollabModePicker: shared mode selection UI (host only).
 */

"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	UserAddIcon,
	Link01Icon,
	EyeIcon,
	Comment02Icon,
	PencilEdit02Icon,
	Idea01Icon,
	CheckIcon,
	Copy01Icon,
} from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useCollabStore } from "@/stores/collab-store";
import { cn } from "@/utils/ui";
import { toast } from "sonner";
import type { CollabMode } from "@/lib/collab/types";
import { useI18n } from "@/lib/i18n";

const MODE_OPTIONS: {
	mode: CollabMode;
	labelKey: string;
	descriptionKey: string;
	icon: typeof EyeIcon;
}[] = [
	{
		mode: "view",
		labelKey: "collaboration.mode.view",
		descriptionKey: "collaboration.mode.viewDescription",
		icon: EyeIcon,
	},
	{
		mode: "comment",
		labelKey: "collaboration.mode.comment",
		descriptionKey: "collaboration.mode.commentDescription",
		icon: Comment02Icon,
	},
	{
		mode: "edit",
		labelKey: "collaboration.mode.edit",
		descriptionKey: "collaboration.mode.editDescription",
		icon: PencilEdit02Icon,
	},
	{
		mode: "suggest",
		labelKey: "collaboration.mode.suggest",
		descriptionKey: "collaboration.mode.suggestDescription",
		icon: Idea01Icon,
	},
];

/** Mode picker — used by the host when starting a session. */
export function CollabModePicker({
	mode,
	onChange,
}: {
	mode: CollabMode;
	onChange: (mode: CollabMode) => void;
}) {
	const { t } = useI18n();
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
				{t("collaboration.startDialog.permissionModeLabel")}
			</span>
			<div className="grid grid-cols-2 gap-2">
				{MODE_OPTIONS.map((opt) => (
					<button
						key={opt.mode}
						type="button"
						onClick={() => onChange(opt.mode)}
						className={cn(
							"flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-all",
							mode === opt.mode
								? "border-white/25 bg-white/[0.08]"
								: "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
						)}
					>
						<span className="flex items-center gap-1.5">
							<HugeiconsIcon
								icon={opt.icon}
								className={cn(
									"size-3.5",
									mode === opt.mode ? "text-white/90" : "text-white/50",
								)}
							/>
							<span
								className={cn(
									"text-[11px] font-semibold",
									mode === opt.mode ? "text-white/90" : "text-white/70",
								)}
							>
								{t(opt.labelKey)}
							</span>
						</span>
						<span className="text-[9.5px] leading-relaxed text-white/40">
							{t(opt.descriptionKey)}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

/** Host: start a collaboration session. */
export function StartCollabDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const collab = useCollabStore();
	const { t } = useI18n();
	const [nickname, setNickname] = useState(collab.nickname ?? "");
	const [mode, setMode] = useState<CollabMode>("edit");
	const [creating, setCreating] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCreate = async () => {
		const name = nickname.trim();
		if (name.length < 1) {
			toast.error(t("collaboration.startDialog.nicknameRequiredTitle"), {
				description: t("collaboration.startDialog.nicknameRequiredDescription"),
			});
			return;
		}
		const project = editor.project.getActiveOrNull();
		const projectName =
			project?.metadata.name ?? t("collaboration.defaultProjectName");
		setCreating(true);
		try {
			await editor.collab.host({ projectName, mode, nickname: name });
			const joinUrl = useCollabStore.getState().joinUrl;
			toast.success(t("collaboration.toast.sessionStarted.title"), {
				description: joinUrl
					? t("collaboration.toast.sessionStarted.description", { joinUrl })
					: t("collaboration.toast.sessionStarted.descriptionNoLink"),
			});
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: t("collaboration.toast.startError"),
			);
		} finally {
			setCreating(false);
		}
	};

	const handleCopy = async () => {
		if (!collab.joinUrl) return;
		try {
			await navigator.clipboard.writeText(collab.joinUrl);
			setCopied(true);
			toast.success(t("collaboration.toast.linkCopied.title"), {
				description: t("collaboration.toast.linkCopied.description"),
			});
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error(t("collaboration.toast.copyError"));
		}
	};

	const isActive = collab.status === "connected" && !!collab.joinUrl;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden border-white/[0.08] bg-[#09090b]/95 text-white backdrop-blur-md sm:max-w-md">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-70"
					style={{
						background:
							"radial-gradient(circle at 18% 0%, rgba(99,102,241,0.12), transparent 45%)",
					}}
				/>
				<DialogHeader className="relative">
					<div className="flex items-center gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.05] shadow-inner shadow-white/[0.03]">
							<HugeiconsIcon
								icon={UserAddIcon}
								className="size-4 text-white/85"
							/>
						</span>
						<DialogTitle className="text-[0.95rem] font-semibold tracking-tight">
							{isActive
								? t("collaboration.startDialog.activeTitle")
								: t("collaboration.startDialog.title")}
						</DialogTitle>
					</div>
					<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
						{isActive
							? t("collaboration.startDialog.activeDescription")
							: t("collaboration.startDialog.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="relative flex flex-col gap-4 px-6 pt-4 pb-6">
					{!isActive ? (
						<>
							<div className="flex flex-col gap-1.5">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
									{t("collaboration.startDialog.nicknameLabel")}
								</span>
								<Input
									value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									placeholder={t(
										"collaboration.startDialog.nicknamePlaceholder",
									)}
									maxLength={50}
									className="h-9 border-white/[0.1] bg-white/[0.04] text-[0.8rem] text-white/90 placeholder:text-white/30"
								/>
							</div>
							<CollabModePicker mode={mode} onChange={setMode} />
							<Button
								type="button"
								onClick={handleCreate}
								disabled={creating}
								className="h-9 gap-1.5 self-start bg-white px-4 text-[0.78rem] font-medium text-black hover:bg-white/90"
							>
								<HugeiconsIcon icon={UserAddIcon} className="size-3.5" />
								{creating
									? t("collaboration.startDialog.startingButton")
									: t("collaboration.startDialog.startButton")}
							</Button>
						</>
					) : (
						<>
							<div className="flex flex-col gap-2">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
									{t("collaboration.startDialog.shareLinkLabel")}
								</span>
								<div className="flex items-center gap-2">
									<input
										type="text"
										readOnly
										value={collab.joinUrl ?? ""}
										className="h-9 w-full truncate rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 font-mono text-[0.74rem] text-white/85 focus:border-white/30 focus:outline-none"
										onFocus={(e) => e.currentTarget.select()}
									/>
									<Button
										type="button"
										onClick={handleCopy}
										className="h-9 shrink-0 gap-1.5 bg-white px-3 text-[0.74rem] font-medium text-black hover:bg-white/90"
									>
										<HugeiconsIcon
											icon={copied ? CheckIcon : Copy01Icon}
											className="size-3.5"
										/>
										{copied
											? t("collaboration.startDialog.copiedButton")
											: t("collaboration.startDialog.copyButton")}
									</Button>
								</div>
							</div>
							<div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] text-white/50">
								<HugeiconsIcon icon={Link01Icon} className="size-3 shrink-0" />
								<span>
									{collab.collaborators.length === 1
										? t("collaboration.startDialog.statusSingular", {
												mode: collab.mode,
											})
										: t("collaboration.startDialog.statusPlural", {
												count: collab.collaborators.length,
												mode: collab.mode,
											})}
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								onClick={() => void editor.collab.disconnect()}
								className="h-8 self-start text-[0.74rem] text-white/50 hover:text-white/80"
							>
								{t("collaboration.startDialog.endSessionButton")}
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** Guest: join a collaboration session from a /c/[roomId] link. */
export function JoinCollabDialog({
	roomId,
	open,
	onOpenChange,
}: {
	roomId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const collab = useCollabStore();
	const { t } = useI18n();
	const [nickname, setNickname] = useState(collab.nickname ?? "");
	const [joining, setJoining] = useState(false);

	const handleJoin = async () => {
		const name = nickname.trim();
		if (name.length < 1) {
			toast.error(t("collaboration.joinDialog.nicknameRequiredTitle"), {
				description: t("collaboration.joinDialog.nicknameRequiredDescription"),
			});
			return;
		}
		setJoining(true);
		try {
			await editor.collab.join({ roomId, nickname: name });
			toast.success(t("collaboration.toast.joined.title"), {
				description: t("collaboration.toast.joined.description"),
			});
			onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : t("collaboration.toast.joinError"),
			);
		} finally {
			setJoining(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden border-white/[0.08] bg-[#09090b]/95 text-white backdrop-blur-md sm:max-w-sm">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-70"
					style={{
						background:
							"radial-gradient(circle at 18% 0%, rgba(99,102,241,0.12), transparent 45%)",
					}}
				/>
				<DialogHeader className="relative">
					<div className="flex items-center gap-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.05] shadow-inner shadow-white/[0.03]">
							<HugeiconsIcon
								icon={UserAddIcon}
								className="size-4 text-white/85"
							/>
						</span>
						<DialogTitle className="text-[0.95rem] font-semibold tracking-tight">
							{t("collaboration.joinDialog.title")}
						</DialogTitle>
					</div>
					<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
						{t("collaboration.joinDialog.description")}
					</DialogDescription>
				</DialogHeader>
				<div className="relative flex flex-col gap-4 px-6 pt-4 pb-6">
					<div className="flex flex-col gap-1.5">
						<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
							{t("collaboration.joinDialog.nicknameLabel")}
						</span>
						<Input
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder={t("collaboration.joinDialog.nicknamePlaceholder")}
							maxLength={50}
							autoFocus
							onKeyDown={(e) => {
								if (e.key === "Enter") void handleJoin();
							}}
							className="h-9 border-white/[0.1] bg-white/[0.04] text-[0.8rem] text-white/90 placeholder:text-white/30"
						/>
					</div>
					<Button
						type="button"
						onClick={handleJoin}
						disabled={joining}
						className="h-9 gap-1.5 self-start bg-white px-4 text-[0.78rem] font-medium text-black hover:bg-white/90"
					>
						<HugeiconsIcon icon={UserAddIcon} className="size-3.5" />
						{joining
							? t("collaboration.joinDialog.joiningButton")
							: t("collaboration.joinDialog.joinButton")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
