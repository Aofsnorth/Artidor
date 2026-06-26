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

const MODE_OPTIONS: {
	mode: CollabMode;
	label: string;
	description: string;
	icon: typeof EyeIcon;
}[] = [
	{
		mode: "view",
		label: "View",
		description: "Collaborators can watch but not edit.",
		icon: EyeIcon,
	},
	{
		mode: "comment",
		label: "Comment",
		description: "Collaborators can view and leave comments on the timeline.",
		icon: Comment02Icon,
	},
	{
		mode: "edit",
		label: "Edit",
		description: "Collaborators can fully edit the timeline. Element locking prevents conflicts.",
		icon: PencilEdit02Icon,
	},
	{
		mode: "suggest",
		label: "Suggest",
		description: "Collaborators propose edits; the host approves or rejects each one.",
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
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
				Permission mode
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
								{opt.label}
							</span>
						</span>
						<span className="text-[9.5px] leading-relaxed text-white/40">
							{opt.description}
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
	const [nickname, setNickname] = useState(collab.nickname ?? "");
	const [mode, setMode] = useState<CollabMode>("edit");
	const [creating, setCreating] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleCreate = async () => {
		const name = nickname.trim();
		if (name.length < 1) {
			toast.error("Enter a nickname", {
				description: "Collaborators will see this name on your cursor.",
			});
			return;
		}
		const project = editor.project.getActiveOrNull();
		const projectName = project?.metadata.name ?? "Shared project";
		setCreating(true);
		try {
			await editor.collab.host({ projectName, mode, nickname: name });
			toast.success("Collaboration session started", {
				description: "Share the link with your team.",
			});
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not start collaboration.",
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
			toast.success("Link copied", {
				description: "Send this to your collaborators.",
			});
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error("Could not copy link");
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
							<HugeiconsIcon icon={UserAddIcon} className="size-4 text-white/85" />
						</span>
						<DialogTitle className="text-[0.95rem] font-semibold tracking-tight">
							Start collaborating
						</DialogTitle>
					</div>
					<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
						Invite your team to edit together in real time. Each person gets a
						colored cursor on the timeline.
					</DialogDescription>
				</DialogHeader>

				<div className="relative flex flex-col gap-4 px-6 pt-4 pb-6">
					{!isActive ? (
						<>
							<div className="flex flex-col gap-1.5">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
									Your nickname
								</span>
								<Input
									value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									placeholder="e.g. Alex"
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
								{creating ? "Starting…" : "Start session"}
							</Button>
						</>
					) : (
						<>
							<div className="flex flex-col gap-2">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
									Share link
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
										{copied ? "Copied" : "Copy"}
									</Button>
								</div>
							</div>
							<div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] text-white/50">
								<HugeiconsIcon icon={Link01Icon} className="size-3 shrink-0" />
								<span>
									{collab.collaborators.length} collaborator
									{collab.collaborators.length !== 1 ? "s" : ""} connected ·
									Mode: {collab.mode}
								</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								onClick={() => void editor.collab.disconnect()}
								className="h-8 self-start text-[0.74rem] text-white/50 hover:text-white/80"
							>
								End session
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
	const [nickname, setNickname] = useState(collab.nickname ?? "");
	const [joining, setJoining] = useState(false);

	const handleJoin = async () => {
		const name = nickname.trim();
		if (name.length < 1) {
			toast.error("Enter a nickname", {
				description: "Others will see this name on your cursor.",
			});
			return;
		}
		setJoining(true);
		try {
			await editor.collab.join({ roomId, nickname: name });
			toast.success("Joined collaboration", {
				description: `You're now editing with the team.`,
			});
			onOpenChange(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not join collaboration.",
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
							<HugeiconsIcon icon={UserAddIcon} className="size-4 text-white/85" />
						</span>
						<DialogTitle className="text-[0.95rem] font-semibold tracking-tight">
							Join collaboration
						</DialogTitle>
					</div>
					<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
						Enter your name to join the editing session. You'll get a colored
						cursor on the timeline.
					</DialogDescription>
				</DialogHeader>
				<div className="relative flex flex-col gap-4 px-6 pt-4 pb-6">
					<div className="flex flex-col gap-1.5">
						<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
							Your nickname
						</span>
						<Input
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder="e.g. Sam"
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
						{joining ? "Joining…" : "Join session"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
