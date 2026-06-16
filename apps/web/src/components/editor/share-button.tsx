"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon, UserAddIcon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function ShareButton() {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	const projectId = activeProject?.metadata.id;
	const origin =
		typeof window !== "undefined"
			? window.location.origin
			: "https://artidor.app";
	const inviteLink = projectId
		? `${origin}/editor/${projectId}?invite=viewer`
		: "";

	useEffect(() => {
		if (!open) setCopied(false);
	}, [open]);

	const handleCopy = async () => {
		if (!inviteLink) return;
		try {
			await navigator.clipboard.writeText(inviteLink);
			setCopied(true);
			toast.success("Invite link copied", {
				description: "Anyone with the link can open the project as a viewer.",
			});
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error("Could not copy link", {
				description: "Select the link and copy it manually.",
			});
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Invite collaborators"
						disabled={!hasProject}
						className="group flex h-8 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 text-xs font-medium text-white/70 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
					>
						<HugeiconsIcon icon={UserAddIcon} className="size-3.5" />
						<span>Invite</span>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="z-100 w-56 border-white/[0.08] bg-[#09090b]/95 text-white/95 backdrop-blur-md"
				>
					<DropdownMenuItem
						onSelect={() => setOpen(true)}
						className="hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white"
					>
						<HugeiconsIcon
							icon={Link01Icon}
							className="mr-2 size-3.5 text-white/60"
						/>
						Copy invite link
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="relative overflow-hidden border-white/[0.08] bg-[#09090b]/95 text-white backdrop-blur-md sm:max-w-md">
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
							<div className="flex items-center gap-2">
								<DialogTitle className="text-[0.95rem] font-semibold tracking-tight">
									Invite collaborators
								</DialogTitle>
								<span className="rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/55">
									Soon
								</span>
							</div>
						</div>
						<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
							Real-time collaboration is coming soon. Your project lives
							entirely on this device for now — this link is a placeholder for
							when sharing ships.
						</DialogDescription>
					</DialogHeader>

					<div className="relative mt-1 flex flex-col gap-2.5">
						<label
							htmlFor="invite-link"
							className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45"
						>
							Project link
						</label>
						<div className="flex items-center gap-2">
							<div className="relative flex-1">
								<HugeiconsIcon
									icon={Link01Icon}
									className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/35"
									aria-hidden="true"
								/>
								<input
									id="invite-link"
									type="text"
									readOnly
									value={inviteLink}
									className="h-9 w-full truncate rounded-md border border-white/[0.1] bg-white/[0.04] pr-2.5 pl-8 font-mono text-[0.74rem] text-white/85 focus:border-white/30 focus:outline-none"
									onFocus={(event) => event.currentTarget.select()}
								/>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleCopy}
								disabled={!inviteLink}
								className="h-9 shrink-0 gap-1.5 border-white/15 bg-white/[0.05] px-3 text-[0.72rem] text-white hover:bg-white/[0.1]"
							>
								{copied ? (
									<>
										<Check className="size-3.5" />
										Copied
									</>
								) : (
									<>
										<Copy className="size-3.5" />
										Copy
									</>
								)}
							</Button>
						</div>
						<p className="text-[0.66rem] leading-relaxed text-white/40">
							Tip: once sharing goes live, rotate the project ID from the
							projects page to revoke a link.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
