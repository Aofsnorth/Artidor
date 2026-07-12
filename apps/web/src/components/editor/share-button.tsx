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
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	GoogleIcon,
	Link01Icon,
	LockPasswordIcon,
	UserAddIcon,
	Comment02Icon,
} from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	initiateGoogleOAuth,
} from "@/lib/drive/api";
import { buildShareUrl, createShare } from "@/lib/share/client";
import { StartCollabDialog } from "@/components/editor/collab/collab-dialogs";
import { CollabPresenceBar } from "@/components/editor/collab/collab-overlay";
import { useCollabStore } from "@/stores/collab-store";

export function ShareButton() {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [driveConnected, setDriveConnected] = useState(false);
	const [connecting, setConnecting] = useState(false);

	// Secure-share state
	const [usePassword, setUsePassword] = useState(false);
	const [password, setPassword] = useState("");
	const [creating, setCreating] = useState(false);
	const [shareUrl, setShareUrl] = useState("");
	const [manageToken, setManageToken] = useState("");
	const [collabOpen, setCollabOpen] = useState(false);
	const collabActive = useCollabStore((s) => s.status === "connected");

	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	const origin =
		typeof window !== "undefined"
			? window.location.origin
			: "https://artidor.vercel.app";

	useEffect(() => {
		if (!open) {
			setCopied(false);
			setShareUrl("");
			setManageToken("");
			setPassword("");
			setUsePassword(false);
		}
	}, [open]);

	// Sharing is Drive-backed, so the dialog reflects the live Drive connection.
	useEffect(() => {
		const refresh = () => setDriveConnected(Boolean(getGoogleAccessToken()));
		refresh();
		window.addEventListener("drive-auth-changed", refresh);
		window.addEventListener("focus", refresh);
		return () => {
			window.removeEventListener("drive-auth-changed", refresh);
			window.removeEventListener("focus", refresh);
		};
	}, []);

	const handleCopy = async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			toast.success("Share link copied", {
				description: "Only people with this link (and password) can open it.",
			});
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error("Could not copy link", {
				description: "Select the link and copy it manually.",
			});
		}
	};

	const handleConnect = async () => {
		if (!getGoogleClientId()) {
			toast.error("Google Drive isn't set up yet", {
				description: "Add your Google Client ID via Import, then sign in.",
			});
			return;
		}
		setConnecting(true);
		try {
			await initiateGoogleOAuth();
			toast.success("Connected to Google Drive");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Google sign-in failed");
		} finally {
			setConnecting(false);
		}
	};

	const handleCreateShare = async () => {
		const project = activeProject;
		if (!project) return;
		if (usePassword && password.trim().length < 4) {
			toast.error("Password too short", {
				description: "Use at least 4 characters, or turn the password off.",
			});
			return;
		}
		setCreating(true);
		try {
			const result = await createShare({
				name: project.metadata.name || "Shared project",
				password: usePassword ? password.trim() : undefined,
				payload: {
					v: 1,
					projectId: project.metadata.id,
					projectName: project.metadata.name || "Shared project",
					driveFolderId: project.metadata.googleDriveFolderId ?? undefined,
					driveFileId: project.metadata.googleDriveFileId ?? undefined,
				},
			});
			const url = buildShareUrl({ origin, shareId: result.shareId });
			setShareUrl(url);
			setManageToken(result.manageToken);
			toast.success("Secure share link created", {
				description: usePassword
					? "Password required to open. Save your revoke token."
					: "Save your revoke token to disable the link later.",
			});
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Could not create share",
			);
		} finally {
			setCreating(false);
		}
	};

	return (
		<>
			<div className="flex items-center gap-2">
				<CollabPresenceBar />
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
							{collabActive && (
								<span className="ml-0.5 size-1.5 rounded-full bg-emerald-400" />
							)}
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
							Share read-only link
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => setCollabOpen(true)}
							className="hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-white"
						>
							<HugeiconsIcon
								icon={Comment02Icon}
								className="mr-2 size-3.5 text-white/60"
							/>
							Collaboration
							{collabActive && (
								<span className="ml-auto size-1.5 rounded-full bg-emerald-400" />
							)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<StartCollabDialog open={collabOpen} onOpenChange={setCollabOpen} />

			<Dialog open={open} onOpenChange={setOpen}>
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
								Share read-only link
							</DialogTitle>
						</div>
						<DialogDescription className="pt-1 text-[0.8rem] leading-relaxed text-white/55">
							Creates a private, capability-based link (random id, optional
							password, revocable). A viewer loads the project read-only from{" "}
							<em className="not-italic text-white/75">your</em> Google Drive —
							nothing is uploaded to our servers.
						</DialogDescription>
					</DialogHeader>

					{!driveConnected ? (
						<div className="relative px-6 pt-5 pb-6">
							<div className="flex flex-col gap-3.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
								<p className="text-[0.78rem] leading-relaxed text-white/60">
									Connect Google Drive first — that's where viewers read the
									project and media from.
								</p>
								<Button
									type="button"
									onClick={handleConnect}
									disabled={connecting}
									className="h-9 gap-1.5 self-start bg-white px-3.5 text-[0.78rem] font-medium text-black hover:bg-white/90"
								>
									<HugeiconsIcon icon={GoogleIcon} className="size-3.5" />
									{connecting ? "Connecting…" : "Connect Google Drive"}
								</Button>
							</div>
						</div>
					) : shareUrl ? (
						<div className="relative flex flex-col gap-3 px-6 pt-5 pb-6">
							<div className="flex flex-col gap-2">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
									Share link
								</span>
								<div className="flex items-center gap-2">
									<input
										type="text"
										readOnly
										value={shareUrl}
										className="h-9 w-full truncate rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 font-mono text-[0.74rem] text-white/85 focus:border-white/30 focus:outline-none"
										onFocus={(event) => event.currentTarget.select()}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleCopy}
										className="h-9 shrink-0 gap-1.5 border-white/15 bg-white/[0.05] px-3 text-[0.72rem] text-white hover:bg-white/[0.1]"
									>
										{copied ? (
											<>
												<Check className="size-3.5" /> Copied
											</>
										) : (
											<>
												<Copy className="size-3.5" /> Copy
											</>
										)}
									</Button>
								</div>
							</div>
							<div className="flex flex-col gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/[0.06] p-3">
								<span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
									Revoke token — save this
								</span>
								<code className="break-all font-mono text-[0.72rem] text-amber-100/90">
									{manageToken}
								</code>
								<p className="text-[0.66rem] leading-relaxed text-amber-100/55">
									This is shown once. Keep it to disable the link later; we
									don't store it in a recoverable form.
								</p>
							</div>
						</div>
					) : (
						<div className="relative flex flex-col gap-4 px-6 pt-5 pb-6">
							<label className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
								<input
									type="checkbox"
									checked={usePassword}
									onChange={(e) => setUsePassword(e.target.checked)}
									className="mt-0.5 size-4 accent-white"
								/>
								<div className="flex flex-col gap-0.5">
									<span className="flex items-center gap-1.5 text-[0.8rem] font-medium text-white/85">
										<HugeiconsIcon
											icon={LockPasswordIcon}
											className="size-3.5 text-white/60"
										/>
										Require a password
									</span>
									<span className="text-[0.7rem] leading-relaxed text-white/50">
										Viewers must enter it to open the project. Verified
										server-side; never stored in plaintext.
									</span>
								</div>
							</label>

							{usePassword && (
								<Input
									type="password"
									value={password}
									autoComplete="new-password"
									placeholder="Share password (min 4 chars)"
									onChange={(e) => setPassword(e.target.value)}
									className="h-9"
								/>
							)}

							<Button
								type="button"
								onClick={handleCreateShare}
								disabled={creating}
								className="h-9 gap-1.5 self-start bg-white px-3.5 text-[0.78rem] font-medium text-black hover:bg-white/90"
							>
								<HugeiconsIcon icon={Link01Icon} className="size-3.5" />
								{creating ? "Creating…" : "Create share link"}
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
