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

type DriveError = { code: string; message: string };
type DriveSuccess = {
	ok: true;
	fileId: string;
	fileName: string;
	contentType: string;
	sizeBytes: number;
	dataBase64: string;
};

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

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) reset();
			}}
		>
			<DialogContent className="border-white/[0.08] bg-[#09090b]/95 text-white backdrop-blur-md sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={CloudIcon} className="size-4 text-white/80" />
						Import from Google Drive
					</DialogTitle>
					<DialogDescription className="text-white/60">
						Paste a public Google Drive share link. The file is fetched once,
						added to a new project, and opened in the editor.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3">
					<label
						htmlFor="drive-link"
						className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/45"
					>
						Share link
					</label>
					<div className="relative">
						<HugeiconsIcon
							icon={Link01Icon}
							className="text-white/35 absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
							aria-hidden="true"
						/>
						<input
							id="drive-link"
							type="url"
							inputMode="url"
							spellCheck={false}
							autoComplete="off"
							placeholder="https://drive.google.com/file/d/.../view"
							value={link}
							disabled={busy}
							onChange={(event) => {
								setLink(event.target.value);
								if (error) setError(null);
							}}
							className="h-10 w-full rounded-md border border-white/[0.1] bg-white/[0.04] pl-8 pr-3 font-mono text-[0.78rem] text-white/90 placeholder:text-white/30 focus:border-white/30 focus:outline-none disabled:opacity-50"
						/>
					</div>

					{error && (
						<div
							role="alert"
							className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/[0.06] p-3 text-[0.72rem] text-red-100/85"
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

					<div className="flex items-center justify-between gap-2 pt-1">
						<p className="text-[0.66rem] text-white/40">
							Set Drive sharing to &ldquo;Anyone with the link&rdquo; for the
							import to succeed.
						</p>
						<Button
							type="button"
							size="sm"
							disabled={busy || !link.trim()}
							onClick={handleImport}
							className="h-9 min-w-[7rem] gap-2"
						>
							{busy ? (
								<>
									<span className="size-3 animate-pulse rounded-full bg-white/80" />
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
