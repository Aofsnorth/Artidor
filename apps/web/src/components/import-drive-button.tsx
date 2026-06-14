"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor } from "@/hooks/use-editor";
import { processMediaAssets } from "@/lib/media/processing";
import { Button } from "@/components/ui/button";
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
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { cn } from "@/utils/ui";

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
				size="lg"
				variant="outline"
				className="flex items-center gap-1.5 px-4 md:px-5"
				onClick={() => setOpen(true)}
			>
				<HugeiconsIcon icon={CloudIcon} className="size-4" />
				<span className="text-sm font-medium hidden md:block">Import</span>
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

	const reset = () => {
		setLink("");
		setBusy(false);
		setError(null);
	};

	const handleImport = async () => {
		if (!link.trim() || busy) return;
		setBusy(true);
		setError(null);

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
				// Folder link: the public Drive surface does not expose
				// the folder's contents, so we create a new empty
				// project and persist it locally. The user can then drag
				// files in from the assets panel or use the Import
				// button again per-file.
				const projectId = await editor.project.createNewProject({
					name: ok.folderLabel,
				});
				toast.success("Project created from Drive folder", {
					description: `${ok.folderLabel} opened in the editor. Drop files in from the assets panel to populate it.`,
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
			if (!asset) {
				setError({
					code: "fetch_failed",
					message:
						"Drive file was processed but could not be saved to the project.",
				});
				return;
			}

			toast.success("Project imported from Drive", {
				description: `${ok.fileName} added to the timeline as a new track.`,
			});

			onOpenChange(false);
			reset();
			router.push(`/editor/${projectId}?focus=${asset.id}`);
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

	// Keyboard ergonomics: ⏎ on the input submits, ⎋ closes the dialog.
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
				{/* Subtle background gradient: a soft Drive-blue radial wash to
				    hint at the action ("import from cloud") without overpowering
				    the rest of the dialog. */}
				<div
					className="pointer-events-none absolute inset-0 opacity-70"
					style={{
						background:
							"radial-gradient(circle at 18% 0%, rgba(99, 102, 241, 0.12), transparent 42%), radial-gradient(circle at 100% 100%, rgba(255, 255, 255, 0.04), transparent 38%)",
					}}
					aria-hidden="true"
				/>

				<div className="relative p-6">
					{/* ── Header ──────────────────────────────────────────── */}
					<DialogHeader className="space-y-2 pb-3 [&]:border-b-0 [&]:p-0">
						<DialogTitle className="flex items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight text-white">
							<span className="grid size-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.05] shadow-inner shadow-white/[0.02]">
								<HugeiconsIcon
									icon={CloudIcon}
									className="size-4 text-white/85"
								/>
							</span>
							<span>Import from Google Drive</span>
						</DialogTitle>
						<DialogDescription className="pl-[2.65rem] text-[0.78rem] leading-relaxed text-white/55 [&]:p-0">
							Paste a public Google Drive share link. The file is fetched once,
							added to a new project, and opened in the editor.
						</DialogDescription>
					</DialogHeader>

					{/* ── Divider ──────────────────────────────────────────── */}
					<div className="-mx-6 my-4 h-px bg-white/[0.06]" />

					{/* ── Form ────────────────────────────────────────────── */}
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between pl-0.5">
								<label
									htmlFor="drive-link"
									className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45"
								>
									Share link
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
											/* clipboard blocked — silent fall-through */
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
									autoFocus
									placeholder="https://drive.google.com/file/d/…/view"
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

						{/* ── Help + Action ────────────────────────────────────── */}
						<div className="flex items-center justify-between gap-3 pt-1">
							<p className="text-[0.68rem] leading-snug text-white/40">
								Set Drive sharing to{" "}
								<span className="text-white/60">
									&ldquo;Anyone with the link&rdquo;
								</span>
								.
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
										Importing…
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

					{/* ── Footer reassurance strip ──────────────────────────── */}
					<div className="mt-5 flex items-center gap-2 border-t border-white/[0.05] pt-3 text-[0.66rem] text-white/35">
						<HugeiconsIcon
							icon={CloudIcon}
							className="size-3 shrink-0 text-white/25"
							aria-hidden="true"
						/>
						<span>
							We only download the file you paste &mdash; your Drive credentials
							and other files are never touched.
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function labelForError({ code }: { code: string }): string {
	switch (code) {
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
