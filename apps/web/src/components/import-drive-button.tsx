"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AlertCircleIcon,
	CloudIcon,
	Link01Icon,
	Settings01Icon,
	GoogleIcon,
	Tick02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { parseDriveUrl } from "@/lib/drive/parse";
import {
	getGoogleClientId,
	setGoogleClientId,
	getGoogleAccessToken,
	initiateGoogleOAuth,
	logoutGoogle,
} from "@/lib/drive/api";

type DriveError = { code: string; message: string };
type DriveFileSuccess = {
	ok: true;
	kind: "file";
	fileId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	dataBase64: string;
};
type DriveFolderSuccess = {
	ok: true;
	kind: "folder";
	folderId: string;
	folderUrl: string;
	folderLabel: string;
};
type DriveSuccess = DriveFileSuccess | DriveFolderSuccess;

const SUPPORTED_PREFIXES = ["video/", "audio/", "image/"];

function isSupportedType(contentType: string): boolean {
	return SUPPORTED_PREFIXES.some((prefix) => contentType.startsWith(prefix));
}

export function ImportDriveButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				size="sm"
				variant="outline"
				className="hidden h-9 items-center gap-1.5 rounded-full border-white/[0.08] bg-white/[0.03] px-3 text-[12px] hover:bg-white/[0.07] lg:flex"
				onClick={() => setOpen(true)}
			>
				<HugeiconsIcon icon={CloudIcon} className="size-3.5" />
				<span className="hidden font-medium xl:block">Drive</span>
			</Button>
			<ImportDriveDialog open={open} onOpenChange={setOpen} />
		</>
	);
}

function ImportDriveDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const editor = useEditor();
	const [link, setLink] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<DriveError | null>(null);

	// Google Drive OAuth states
	const [hasToken, setHasToken] = useState(false);
	const [clientId, setClientId] = useState("");
	const [showConfig, setShowConfig] = useState(false);

	useEffect(() => {
		if (open) {
			setHasToken(!!getGoogleAccessToken());
			const currentId = getGoogleClientId() || "";
			setClientId(currentId);
			setShowConfig(!currentId);
		}
	}, [open]);

	const reset = () => {
		setLink("");
		setBusy(false);
		setError(null);
	};

	const handleGoogleLogin = async () => {
		if (!clientId.trim()) {
			setError({
				code: "invalid_client_id",
				message: "Please enter a Google Client ID first.",
			});
			return;
		}

		setGoogleClientId(clientId.trim());
		setBusy(true);
		setError(null);

		try {
			const _token = await initiateGoogleOAuth();
			setHasToken(true);
			toast.success("Signed in with Google successfully!");
		} catch (err) {
			setError({
				code: "auth_failed",
				message: err instanceof Error ? err.message : "Authentication failed.",
			});
		} finally {
			setBusy(false);
		}
	};

	const handleGoogleLogout = () => {
		logoutGoogle();
		setHasToken(false);
		toast.info("Logged out from Google Drive.");
	};

	const handleImport = async () => {
		if (!link.trim() || busy) return;
		setBusy(true);
		setError(null);

		const parsed = parseDriveUrl({ url: link });
		if (!parsed) {
			setError({
				code: "unsupported_host",
				message: "Only Google Drive share links are supported.",
			});
			setBusy(false);
			return;
		}

		// Folder link logic (OAuth Sync)
		if (parsed.kind === "folder") {
			if (!getGoogleAccessToken()) {
				setError({
					code: "not_authenticated",
					message:
						"Authentication is required to sync Drive folders. Please sign in above.",
				});
				setBusy(false);
				return;
			}

			try {
				toast.info("Starting Google Drive Folder Sync...", {
					description:
						"Connecting and enumerating assets. You will be redirected to the editor shortly.",
				});

				const projectId = await editor.project.syncProjectFromDrive(parsed.id);

				toast.success("Folder Synced!", {
					description:
						"Assets are downloading in the background. Edits will save back to Drive.",
				});

				onOpenChange(false);
				reset();
				router.push(`/editor/${projectId}`);
			} catch (caught) {
				const message =
					caught instanceof Error
						? caught.message
						: "Unexpected error syncing Drive folder.";
				setError({ code: "fetch_failed", message });
			} finally {
				setBusy(false);
			}
			return;
		}

		// File link logic: check if we are authenticated to stream directly, or use public API fallback
		const token = getGoogleAccessToken();
		if (token) {
			// Direct client-side streaming over OAuth
			try {
				const { downloadFileBlob } = await import("@/lib/drive/api");
				toast.info("Downloading file from Google Drive...");

				const blob = await downloadFileBlob(parsed.id);
				const file = new File([blob], `drive-${parsed.id}`, {
					type: blob.type,
				});

				const projectId = await editor.project.createNewProject({
					name: deriveProjectName({ fileName: file.name }),
				});

				const processedAssets = await processMediaAssets({ files: [file] });
				const processed = processedAssets[0];
				if (!processed) {
					setError({
						code: "fetch_failed",
						message: "Drive file was fetched but could not be processed.",
					});
					return;
				}

				const asset = await editor.media.addMediaAsset({
					projectId,
					asset: processed,
				});

				toast.success("Project imported from Drive!");
				onOpenChange(false);
				reset();
				router.push(`/editor/${projectId}?focus=${asset?.id}`);
			} catch (caught) {
				const message =
					caught instanceof Error
						? caught.message
						: "OAuth file import failed.";
				setError({ code: "fetch_failed", message });
			} finally {
				setBusy(false);
			}
			return;
		}

		// Fallback to public backend fetch (requires file to be shared publicly)
		try {
			const response = await fetch("/api/drive/import", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url: link }),
			});
			const payload = (await response.json().catch(() => null)) as
				| DriveSuccess
				| DriveError
				| null;

			if (!payload) {
				setError({
					code: "fetch_failed",
					message: "Drive import returned an unreadable response. Try again.",
				});
				return;
			}

			if (!response.ok || "code" in payload) {
				const err = payload as DriveError;
				setError(err);
				return;
			}

			const ok = payload as DriveSuccess;
			if (ok.kind === "folder") {
				// Fallback when not authenticated: create empty project shell
				const projectId = await editor.project.createNewProject({
					name: ok.folderLabel,
				});
				toast.success("Project created from Drive folder", {
					description: `${ok.folderLabel} opened. Drop files to populate or authenticate to sync automatically.`,
				});
				onOpenChange(false);
				reset();
				router.push(`/editor/${projectId}`);
				return;
			}

			if (!isSupportedType(ok.contentType)) {
				setError({
					code: "fetch_failed",
					message: `Drive returned ${ok.contentType}. Only video, audio, and image files are supported right now.`,
				});
				return;
			}

			const bytes = Uint8Array.from(atob(ok.dataBase64), (c) =>
				c.charCodeAt(0),
			);
			const file = new File([bytes], ok.fileName, { type: ok.contentType });

			const projectId = await editor.project.createNewProject({
				name: deriveProjectName({ fileName: ok.fileName }),
			});

			const processedAssets = await processMediaAssets({ files: [file] });
			const processed = processedAssets[0];
			if (!processed) {
				setError({
					code: "fetch_failed",
					message:
						"Drive file was fetched but could not be processed into a media asset.",
				});
				return;
			}
			const asset = await editor.media.addMediaAsset({
				projectId,
				asset: processed,
			});

			toast.success("Project imported from Drive", {
				description: `${ok.fileName} added to the timeline as a new track.`,
			});

			onOpenChange(false);
			reset();
			router.push(`/editor/${projectId}?focus=${asset?.id}`);
		} catch (caught) {
			const message =
				caught instanceof Error
					? caught.message
					: "Unexpected error importing from Drive.";
			setError({ code: "fetch_failed", message });
		} finally {
			setBusy(false);
		}
	};

	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" && !busy && link.trim()) {
			event.preventDefault();
			void handleImport();
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) reset();
			}}
		>
			<DialogContent className="overflow-hidden border-white/[0.08] bg-[#09090b]/95 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-[460px]">
				<div
					className="pointer-events-none absolute inset-0 opacity-70"
					style={{
						background:
							"radial-gradient(circle at 18% 0%, rgba(99, 102, 241, 0.12), transparent 42%), radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.04), transparent 38%)",
					}}
					aria-hidden="true"
				/>

				<div className="relative p-6 max-h-[90vh] overflow-y-auto scrollbar-hidden">
					{/* Header */}
					<DialogHeader className="space-y-2 pb-3 [&]:border-b-0 [&]:p-0">
						<DialogTitle className="flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight text-white">
							<span className="grid size-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.05] shadow-inner shadow-white/[0.02]">
								<HugeiconsIcon
									icon={CloudIcon}
									className="size-4 text-white/85"
								/>
							</span>
							<span>Import / Sync with Google Drive</span>
						</DialogTitle>
						<DialogDescription className="pl-[2.65rem] text-[0.78rem] leading-relaxed text-white/55 [&]:p-0">
							Paste a Google Drive sharing link for a folder or file. Folders
							will sync metadata and assets automatically.
						</DialogDescription>
					</DialogHeader>

					{/* Divider */}
					<div className="-mx-6 my-4 h-px bg-white/[0.06]" />

					{/* OAuth Section */}
					<div className="mb-4 flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[0.75rem]">
						<div className="flex items-center justify-between">
							<span className="font-semibold text-white/80">
								Google Auth Write Access
							</span>
							<button
								type="button"
								onClick={() => setShowConfig(!showConfig)}
								className="flex items-center gap-1 text-[0.65rem] text-white/40 hover:text-white/70"
							>
								<HugeiconsIcon icon={Settings01Icon} className="size-3" />
								Configure
							</button>
						</div>

						{showConfig && (
							<div className="mt-2 flex flex-col gap-2 border-t border-white/[0.04] pt-2">
								<label
									htmlFor="drive-client-id"
									className="text-[0.62rem] uppercase tracking-wider text-white/45"
								>
									Google OAuth Client ID
								</label>
								<div className="flex gap-2">
									<Input
										id="drive-client-id"
										placeholder="Paste Client ID..."
										value={clientId}
										disabled={busy}
										onChange={(e) => setClientId(e.target.value)}
										className="h-8 font-mono text-[0.7rem]"
									/>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											setGoogleClientId(clientId.trim());
											setShowConfig(false);
											toast.success("Client ID saved!");
										}}
										className="h-8 text-[0.7rem]"
									>
										Save
									</Button>
								</div>
								<DriveOAuthGuide />
							</div>
						)}

						<div className="mt-1 flex items-center justify-between gap-2 border-t border-white/[0.04] pt-2.5">
							{hasToken ? (
								<>
									<div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[0.72rem]">
										<HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
										Authenticated
									</div>
									<Button
										size="sm"
										variant="destructive"
										onClick={handleGoogleLogout}
										className="h-7 px-2.5 text-[0.68rem]"
									>
										Sign Out
									</Button>
								</>
							) : (
								<>
									<span className="text-[0.68rem] text-white/45">
										Sign in to enable write-access syncing:
									</span>
									<Button
										size="sm"
										onClick={handleGoogleLogin}
										disabled={busy}
										className="h-8 gap-1.5 bg-white text-black hover:bg-white/90 text-[0.7rem]"
									>
										<HugeiconsIcon icon={GoogleIcon} className="size-3" />
										Sign In
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Form */}
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between pl-0.5">
								<label
									htmlFor="drive-link"
									className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45"
								>
									Share link (Folder or File)
								</label>
								<button
									type="button"
									onClick={async () => {
										try {
											const text = await navigator.clipboard.readText();
											if (text) {
												setLink(text);
												if (error) setError(null);
											}
										} catch {
											/* clipboard blocked */
										}
									}}
									disabled={busy}
									className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/35 transition hover:text-white/70 disabled:opacity-40"
								>
									Paste
								</button>
							</div>
							<div
								className={cn(
									"group relative flex items-center rounded-md border bg-white/[0.04] transition-colors",
									error
										? "border-red-400/35 focus-within:border-red-400/55"
										: "border-white/[0.1] focus-within:border-white/30 focus-within:bg-white/[0.055]",
								)}
							>
								<HugeiconsIcon
									icon={Link01Icon}
									className="ml-3 size-3.5 shrink-0 text-white/35 transition-colors group-focus-within:text-white/60"
									aria-hidden="true"
								/>
								<input
									id="drive-link"
									type="url"
									inputMode="url"
									spellCheck={false}
									autoComplete="off"
									placeholder="https://drive.google.com/drive/folders/…"
									value={link}
									disabled={busy}
									onChange={(event) => {
										setLink(event.target.value);
										if (error) setError(null);
									}}
									onKeyDown={handleInputKeyDown}
									className="h-9 w-full bg-transparent pr-3 pl-2 font-mono text-[0.78rem] leading-none text-white/90 placeholder:text-white/30 focus:outline-none disabled:opacity-50"
								/>
							</div>
						</div>

						{error && (
							<div
								role="alert"
								className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5 text-[0.72rem] leading-relaxed"
							>
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="mt-0.5 size-3.5 shrink-0 text-red-200/80"
								/>
								<div className="flex flex-col gap-0.5">
									<span className="font-semibold text-red-100">
										{labelForError({ code: error.code })}
									</span>
									<span className="text-red-100/75">{error.message}</span>
								</div>
							</div>
						)}

						{/* Action */}
						<div className="flex items-center justify-between gap-3 pt-1">
							<p className="text-[0.68rem] leading-snug text-white/40">
								Folders will sync metadata and assets, files will be imported as
								tracks.
							</p>
							<Button
								type="button"
								size="sm"
								disabled={busy || !link.trim()}
								onClick={handleImport}
								className={cn(
									"h-9 min-w-[7.5rem] shrink-0 gap-2 rounded-md px-3.5 text-[0.78rem] font-medium",
									"bg-white text-black hover:bg-white/90",
									"disabled:bg-white/[0.08] disabled:text-white/35",
									"transition-colors",
								)}
							>
								{busy ? (
									<>
										<span className="size-3 animate-pulse rounded-full bg-current" />
										Loading…
									</>
								) : (
									<>
										<HugeiconsIcon icon={CloudIcon} className="size-3.5" />
										Import
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function DriveOAuthGuide() {
	const [expanded, setExpanded] = useState(false);
	const [copied, setCopied] = useState(false);

	// The redirect URI must EXACTLY match the current origin — this is what the
	// "oauth-callback" notice refers to. On localhost it's the :3000 URL; once
	// deployed (e.g. artidor.app) it must be that https origin instead.
	const redirectUri =
		typeof window !== "undefined"
			? `${window.location.origin}/oauth-callback`
			: "https://your-domain/oauth-callback";

	const copyRedirect = async () => {
		try {
			await navigator.clipboard.writeText(redirectUri);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard blocked */
		}
	};

	return (
		<div className="mt-1 flex flex-col gap-2 rounded-md border border-white/[0.06] bg-white/[0.015] p-2.5">
			<div className="flex flex-col gap-1">
				<span className="text-[0.58rem] font-semibold uppercase tracking-wider text-white/45">
					Authorized redirect URI
				</span>
				<div className="flex items-center gap-1.5">
					<code className="flex-1 truncate rounded bg-white/10 px-1.5 py-1 font-mono text-[0.62rem] text-white/80">
						{redirectUri}
					</code>
					<button
						type="button"
						onClick={copyRedirect}
						className="shrink-0 rounded border border-white/10 px-1.5 py-1 text-[0.58rem] text-white/55 transition hover:bg-white/10 hover:text-white/85"
					>
						{copied ? "Copied" : "Copy"}
					</button>
				</div>
				<p className="text-[0.58rem] leading-snug text-white/40">
					Paste this into your Google OAuth client's{" "}
					<span className="text-white/60">Authorized redirect URIs</span>. It's
					where Google returns the sign-in result — the popup at this URL hands
					the token back to Artidor, then closes. It must match this site's
					address exactly (use your real domain in production, not localhost).
				</p>
			</div>

			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="self-start text-[0.6rem] font-medium text-indigo-300/80 hover:text-indigo-200"
			>
				{expanded ? "Hide setup guide" : "How do I get a Client ID?"}
			</button>

			{expanded && (
				<ol className="flex list-decimal flex-col gap-1.5 pl-4 text-[0.62rem] leading-relaxed text-white/55">
					<li>
						Open{" "}
						<a
							href="https://console.cloud.google.com/apis/credentials"
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-300 underline underline-offset-2"
						>
							Google Cloud Console → Credentials
						</a>{" "}
						and create (or pick) a project.
					</li>
					<li>
						Enable the{" "}
						<a
							href="https://console.cloud.google.com/apis/library/drive.googleapis.com"
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-300 underline underline-offset-2"
						>
							Google Drive API
						</a>
						.
					</li>
					<li>
						Configure the OAuth consent screen (External). Add your Google
						account under <span className="text-white/70">Test users</span>{" "}
						while it's unpublished.
					</li>
					<li>
						Create credentials →{" "}
						<span className="text-white/70">OAuth client ID</span> →{" "}
						<span className="text-white/70">Web application</span>.
					</li>
					<li>
						Under{" "}
						<span className="text-white/70">Authorized JavaScript origins</span>{" "}
						add{" "}
						<code className="bg-white/10 px-1 rounded">
							{typeof window !== "undefined"
								? window.location.origin
								: "https://your-domain"}
						</code>
						.
					</li>
					<li>
						Under{" "}
						<span className="text-white/70">Authorized redirect URIs</span> add
						the URI above, then Save.
					</li>
					<li>
						Copy the generated <span className="text-white/70">Client ID</span>{" "}
						and paste it in the field above.
					</li>
				</ol>
			)}
		</div>
	);
}

function labelForError({ code }: { code: string }): string {
	switch (code) {
		case "not_authenticated":
			return "Authentication required";
		case "not_public":
			return "Drive file is not public";
		case "not_found":
			return "File not found";
		case "unsupported_host":
			return "Unsupported link";
		case "invalid_url":
			return "Invalid link";
		case "too_large":
			return "File too large";
		default:
			return "Import failed";
	}
}

function deriveProjectName({ fileName }: { fileName: string }): string {
	const base = fileName.replace(/\.[^.]+$/, "").trim();
	if (base.length === 0) return "Drive import";
	if (base.length > 40) return `${base.slice(0, 40)}…`;
	return base;
}
