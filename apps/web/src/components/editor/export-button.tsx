"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	CloudUploadIcon,
	FileExportIcon,
	GoogleIcon,
	TransitionTopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	initiateGoogleOAuth,
} from "@/lib/drive/api";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ExportModal } from "./export-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/ui";
import { Check, Copy, Download, RotateCcw, Play } from "lucide-react";
import {
	EXPORT_FORMAT_VALUES,
	EXPORT_QUALITY_VALUES,
	getExportFileExtension,
	getExportMimeType,
	downloadBuffer,
	type ExportFormat,
	type ExportQuality,
	type ExportResult,
} from "@/lib/export";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_EXPORT_OPTIONS } from "@/lib/export/defaults";

function isExportFormat(value: string): value is ExportFormat {
	return EXPORT_FORMAT_VALUES.some((formatValue) => formatValue === value);
}

function isExportQuality(value: string): value is ExportQuality {
	return EXPORT_QUALITY_VALUES.some((qualityValue) => qualityValue === value);
}

const EXPORT_FORMAT_OPTIONS: Record<
	ExportFormat,
	{ label: string; detail: string }
> = {
	mp4: { label: "MP4", detail: "H.264" },
	webm: { label: "WebM", detail: "VP9" },
	hevc: { label: "HEVC", detail: "H.265" },
	av1: { label: "AV1", detail: "Modern" },
};

const EXPORT_QUALITY_OPTIONS: Record<
	ExportQuality,
	{ label: string; detail: string }
> = {
	low: { label: "Low", detail: "Smallest" },
	medium: { label: "Medium", detail: "Balanced" },
	high: { label: "High", detail: "Recommended" },
	very_high: { label: "Very high", detail: "Largest" },
};

export function ExportButton() {
	const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
	const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const exportState = useEditor((e) => e.project.getExportState());
	const hasProject = !!activeProject;
	const { result: exportResult } = exportState;

	// Check for pending export from /project page
	useEffect(() => {
		if (!hasProject) return;
		const stored = localStorage.getItem("artidor-pending-export");
		if (!stored) return;
		localStorage.removeItem("artidor-pending-export");
		try {
			const settings = JSON.parse(stored) as {
				format?: string;
				quality?: string;
				includeAudio?: boolean;
				saveToDrive?: boolean;
			};
			// Store settings for the popover to read
			localStorage.setItem("artidor-export-prefs", JSON.stringify(settings));
			setIsExportPopoverOpen(true);
		} catch {
			// ignore invalid stored data
		}
	}, [hasProject]);

	// Auto-close the popover when export starts so only the blocking modal is visible
	useEffect(() => {
		if (exportState.isExporting && isExportPopoverOpen) {
			setIsExportPopoverOpen(false);
		}
	}, [exportState.isExporting, isExportPopoverOpen]);

	// Show completion overlay only for fresh (non-cached) exports.
	// Cached/history exports already show a toast via handleExport, so the
	// large center overlay should only appear once — the first time.
	useEffect(() => {
		if (
			exportResult?.success &&
			exportResult.buffer &&
			!exportState.isExporting &&
			!exportResult.cached
		) {
			setShowCompletionOverlay(true);
		}
	}, [exportResult, exportState.isExporting]);

	const resultFormat =
		exportResult?.success && exportResult.format
			? exportResult.format
			: DEFAULT_EXPORT_OPTIONS.format;

	const handleDownloadFromOverlay = () => {
		if (!exportResult?.buffer || !activeProject) return;
		const ext = getExportFileExtension({ format: resultFormat });
		const mime = getExportMimeType({ format: resultFormat });
		downloadBuffer({
			buffer: exportResult.buffer,
			filename: `${activeProject.metadata.name}${ext}`,
			mimeType: mime,
		});
	};

	const handlePopoverOpenChange = ({ open }: { open: boolean }) => {
		// Don't allow closing the popover during export (modal is shown instead)
		if (!open && exportState.isExporting) return;
		if (!open) {
			editor.project.clearExportState();
		}
		setIsExportPopoverOpen(open);
	};

	return (
		<>
			<Popover
				open={isExportPopoverOpen}
				onOpenChange={(open) => handlePopoverOpenChange({ open })}
			>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors",
							"border-foreground bg-foreground text-background hover:bg-foreground/90",
							"focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							isExportPopoverOpen && "bg-foreground/90",
							hasProject ? "cursor-pointer" : "cursor-not-allowed opacity-40",
						)}
						onClick={
							hasProject ? () => setIsExportPopoverOpen(true) : undefined
						}
						disabled={!hasProject}
						onKeyDown={(event) => {
							if (hasProject && (event.key === "Enter" || event.key === " ")) {
								event.preventDefault();
								setIsExportPopoverOpen(true);
							}
						}}
					>
						<HugeiconsIcon icon={TransitionTopIcon} className="size-3.5" />
						<span>Export</span>
					</button>
				</PopoverTrigger>
				{hasProject && (
					<ExportPopover
						onOpenChange={setIsExportPopoverOpen}
						isOpen={isExportPopoverOpen}
					/>
				)}
			</Popover>
			{/* Render the blocking modal at the top level so it isn't affected by the popover lifecycle */}
			{hasProject && (
				<ExportModal
					isOpen={exportState.isExporting}
					progress={exportState.progress}
					onCancel={() => editor.project.cancelExport()}
				/>
			)}
			{/* CapCut-style completion overlay */}
			{showCompletionOverlay &&
				exportResult?.success &&
				exportResult.buffer &&
				activeProject && (
					<ExportCompletionOverlay
						result={exportResult}
						filename={`${activeProject.metadata.name}${getExportFileExtension({ format: resultFormat })}`}
						mimeType={getExportMimeType({
							format: resultFormat,
						})}
						onClose={() => {
							setShowCompletionOverlay(false);
							editor.project.clearExportState();
						}}
						onDownload={handleDownloadFromOverlay}
					/>
				)}
		</>
	);
}

function ExportPopover({
	onOpenChange,
	isOpen,
}: {
	onOpenChange: (open: boolean) => void;
	isOpen: boolean;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const exportState = useEditor((e) => e.project.getExportState());
	const { result: exportResult } = exportState;

	// Read stored preferences from /project page export dialog. Applied via
	// effect (not a render-body read): the remove-on-read side effect is not
	// re-render safe (StrictMode double render would drop the prefs), and
	// localStorage access must not happen during render.
	const [storedPrefs, setStoredPrefs] = useState<{
		format?: ExportFormat;
		quality?: ExportQuality;
		includeAudio?: boolean;
		saveToDrive?: boolean;
	} | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		try {
			const raw = localStorage.getItem("artidor-export-prefs");
			if (!raw) return;
			localStorage.removeItem("artidor-export-prefs");
			setStoredPrefs(JSON.parse(raw));
		} catch {
			// ignore invalid stored data
		}
	}, [isOpen]);

	const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format);
	const [quality, setQuality] = useState<ExportQuality>(
		DEFAULT_EXPORT_OPTIONS.quality,
	);
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState<boolean>(
		DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
	);

	useEffect(() => {
		if (!storedPrefs) return;
		if (storedPrefs.format && isExportFormat(storedPrefs.format)) {
			setFormat(storedPrefs.format);
		}
		if (storedPrefs.quality && isExportQuality(storedPrefs.quality)) {
			setQuality(storedPrefs.quality);
		}
		if (typeof storedPrefs.includeAudio === "boolean") {
			setShouldIncludeAudio(storedPrefs.includeAudio);
		}
	}, [storedPrefs]);
	const filename = `${activeProject.metadata.name}${getExportFileExtension({ format })}`;
	const mimeType = getExportMimeType({ format });
	const { canvasSize, fps } = activeProject.settings;
	const frameRate = Math.round(fps.numerator / Math.max(1, fps.denominator));

	const handleExport = async () => {
		if (!activeProject) return;

		// Auto-pause playback before starting export
		if (editor.playback.getIsPlaying()) {
			editor.playback.pause();
		}

		const result = await editor.project.export({
			options: {
				format,
				quality,
				fps: activeProject.settings.fps,
				includeAudio: shouldIncludeAudio,
			},
		});

		if (result.cancelled) {
			editor.project.clearExportState();
			return;
		}

		if (result.success && result.buffer) {
			toast.success(
				result.cached ? "Export restored from history" : "Export ready",
			);
		} else if (!result.success && !result.cancelled) {
			// The popover is auto-closed while exporting, so the in-popover
			// error card is invisible — the toast is the only failure feedback.
			toast.error("Export failed", {
				description: result.error || "Unknown error occurred",
			});
		}
	};

	// Don't render the popover at all if it's closed or if export is in progress
	if (!isOpen || exportState.isExporting) return null;

	return (
		<PopoverContent
			align="end"
			sideOffset={8}
			className="mr-2 flex max-h-(--radix-popover-content-available-height,calc(100vh-1rem)) w-[min(22.5rem,calc(100vw-1rem))] flex-col overflow-y-auto rounded-xl border bg-popover p-0 text-popover-foreground shadow-lg select-none"
		>
			{exportResult?.success && exportResult.buffer ? (
				<ExportResultCard
					result={exportResult}
					filename={filename}
					mimeType={mimeType}
					onNewExport={() => editor.project.clearExportState()}
				/>
			) : exportResult && !exportResult.success ? (
				<ExportError
					error={exportResult.error || "Unknown error occurred"}
					onRetry={handleExport}
				/>
			) : (
				<>
					<header className="border-b px-4 py-4">
						<h2 className="text-base font-semibold tracking-tight">
							Export video
						</h2>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{filename}
						</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{canvasSize.width} × {canvasSize.height} · {frameRate} fps
						</p>
					</header>

					<div className="flex flex-col gap-5 p-4">
						<div className="space-y-2">
							<Label className="text-xs font-medium text-foreground">
								Format
							</Label>
							<RadioGroup
								aria-label="Export format"
								value={format}
								onValueChange={(value) => {
									if (isExportFormat(value)) {
										setFormat(value);
									}
								}}
								className="grid grid-cols-2 gap-2"
							>
								{EXPORT_FORMAT_VALUES.map((formatValue) => {
									const option = EXPORT_FORMAT_OPTIONS[formatValue];
									return (
										<Label
											key={formatValue}
											htmlFor={`export-format-${formatValue}`}
											className={cn(
												"flex min-h-11 cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors",
												format === formatValue
													? "border-foreground bg-accent text-foreground"
													: "border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground",
											)}
										>
											<span className="min-w-0">
												<span className="block text-xs font-medium">
													{option.label}
												</span>
												<span className="block text-[0.6875rem] font-normal text-muted-foreground">
													{option.detail}
												</span>
											</span>
											<RadioGroupItem
												value={formatValue}
												id={`export-format-${formatValue}`}
											/>
										</Label>
									);
								})}
							</RadioGroup>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-medium text-foreground">
								Quality
							</Label>
							<RadioGroup
								aria-label="Export quality"
								value={quality}
								onValueChange={(value) => {
									if (isExportQuality(value)) {
										setQuality(value);
									}
								}}
								className="grid grid-cols-2 gap-2"
							>
								{EXPORT_QUALITY_VALUES.map((qualityValue) => {
									const option = EXPORT_QUALITY_OPTIONS[qualityValue];
									return (
										<Label
											key={qualityValue}
											htmlFor={`export-quality-${qualityValue}`}
											className={cn(
												"flex min-h-11 cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors",
												quality === qualityValue
													? "border-foreground bg-accent text-foreground"
													: "border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground",
											)}
										>
											<span className="min-w-0">
												<span className="block text-xs font-medium">
													{option.label}
												</span>
												<span className="block text-[0.6875rem] font-normal text-muted-foreground">
													{option.detail}
												</span>
											</span>
											<RadioGroupItem
												value={qualityValue}
												id={`export-quality-${qualityValue}`}
											/>
										</Label>
									);
								})}
							</RadioGroup>
						</div>

						<Label
							htmlFor="include-audio"
							className="flex min-h-11 cursor-pointer items-center justify-between rounded-md border px-3 py-2"
						>
							<span>
								<span className="block text-xs font-medium text-foreground">
									Include audio
								</span>
								<span className="block text-[0.6875rem] font-normal text-muted-foreground">
									Use the project audio mix
								</span>
							</span>
							<Checkbox
								id="include-audio"
								checked={shouldIncludeAudio}
								onCheckedChange={(checked) =>
									setShouldIncludeAudio(checked === true)
								}
							/>
						</Label>

						<Button onClick={handleExport} className="h-10 w-full gap-2">
							<Download className="size-4" />
							Export video
						</Button>
					</div>

					<div className="border-t px-4 py-3">
						<p className="mb-2 text-xs text-muted-foreground">
							Other export options
						</p>
						<div className="flex gap-2">
							<ExportToDriveButton onDone={() => onOpenChange(false)} />
							<ExportProjectFileButton onDone={() => onOpenChange(false)} />
						</div>
					</div>
				</>
			)}
		</PopoverContent>
	);
}

function ExportResultCard({
	result,
	filename,
	mimeType,
	onNewExport,
}: {
	result: ExportResult;
	filename: string;
	mimeType: string;
	onNewExport: () => void;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!result.buffer) return;

		const url = URL.createObjectURL(
			new Blob([result.buffer], { type: mimeType }),
		);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [result.buffer, mimeType]);

	const handleDownload = () => {
		if (!result.buffer) return;
		downloadBuffer({ buffer: result.buffer, filename, mimeType });
	};

	return (
		<div className="flex flex-col">
			<header className="px-4 pb-3 pt-4">
				<div className="flex min-w-0 items-start justify-between gap-3">
					<div className="min-w-0">
						<h2 className="text-base font-semibold tracking-tight">
							Export ready
						</h2>
						<p className="mt-1 truncate text-sm font-medium text-foreground">
							{filename}
						</p>
					</div>
					<span className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium text-muted-foreground">
						{formatBytes(result.buffer?.byteLength ?? 0)}
					</span>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">
					{result.cached
						? "Restored from export history"
						: "Video rendered successfully"}
				</p>
			</header>

			<div className="mx-4 overflow-hidden rounded-lg border bg-background">
				{previewUrl ? (
					<video
						controls
						className="aspect-video w-full bg-black"
						src={previewUrl}
					>
						<track kind="captions" />
					</video>
				) : (
					<div className="flex aspect-video items-center justify-center text-muted-foreground">
						<Play className="size-5" />
					</div>
				)}
			</div>

			<div className="flex flex-col gap-2 p-4">
				<Button className="h-10 w-full gap-2" onClick={handleDownload}>
					<Download className="size-4" />
					Download
				</Button>
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="text"
						className="text-xs text-muted-foreground hover:text-foreground"
						onClick={onNewExport}
					>
						New export
					</Button>
					<div className="w-40">
						<ExportToDriveButton onDone={() => {}} />
					</div>
				</div>
			</div>
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function ExportCompletionOverlay({
	result,
	filename,
	mimeType,
	onClose,
	onDownload,
}: {
	result: ExportResult;
	filename: string;
	mimeType: string;
	onClose: () => void;
	onDownload: () => void;
}) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (!result.buffer) return;
		const url = URL.createObjectURL(
			new Blob([result.buffer], { type: mimeType }),
		);
		setPreviewUrl(url);
		// Trigger entrance animation
		requestAnimationFrame(() => setIsVisible(true));
		return () => URL.revokeObjectURL(url);
	}, [result.buffer, mimeType]);

	const handleClose = () => {
		setIsVisible(false);
		setTimeout(onClose, 300);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: overlay backdrop needs click-to-dismiss
		<div
			role="button"
			tabIndex={0}
			className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
			onClick={handleClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") handleClose();
			}}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: inner card stops click propagation */}
			<div
				role="button"
				tabIndex={0}
				className={`relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b from-[#111114] to-[#0a0a0a] shadow-[0_24px_80px_rgba(0,0,0,0.6)] transition-all duration-300 ${isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Header glow */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 bg-linear-to-b from-emerald-500/20 to-transparent blur-2xl pointer-events-none" />

				{/* Video preview */}
				<div className="relative overflow-hidden border-b border-white/6">
					{previewUrl ? (
						<video
							controls
							autoPlay
							muted
							className="aspect-video w-full bg-black"
							src={previewUrl}
						>
							<track kind="captions" />
						</video>
					) : (
						<div className="flex aspect-video items-center justify-center bg-black text-white/30">
							<Play className="size-8" />
						</div>
					)}
					{/* Top-right close button */}
					<button
						type="button"
						onClick={handleClose}
						className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/50 text-white/70 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
					>
						✕
					</button>
				</div>

				{/* Info section */}
				<div className="flex flex-col gap-3 p-5">
					<div className="flex items-center gap-3">
						<div className="grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
							<Check className="size-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold text-white">
								Export complete
							</p>
							<p className="truncate text-xs text-white/50">{filename}</p>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2">
						<div className="rounded-lg border border-white/6 bg-white/2 p-2 text-center">
							<p className="text-[0.6rem] uppercase tracking-wider text-white/40">
								Format
							</p>
							<p className="text-xs font-medium text-white/80">
								{mimeType.split("/")[1]?.toUpperCase() || "MP4"}
							</p>
						</div>
						<div className="rounded-lg border border-white/6 bg-white/2 p-2 text-center">
							<p className="text-[0.6rem] uppercase tracking-wider text-white/40">
								Size
							</p>
							<p className="text-xs font-medium text-white/80">
								{formatBytes(result.buffer?.byteLength ?? 0)}
							</p>
						</div>
						<div className="rounded-lg border border-white/6 bg-white/2 p-2 text-center">
							<p className="text-[0.6rem] uppercase tracking-wider text-white/40">
								Source
							</p>
							<p className="text-xs font-medium text-white/80">
								{result.cached ? "History" : "Rendered"}
							</p>
						</div>
					</div>

					<div className="flex gap-2 mt-1">
						<Button
							variant="outline"
							className="h-9 flex-1 border-white/10 text-xs text-white/70 hover:bg-white/5"
							onClick={handleClose}
						>
							Close
						</Button>
						<Button
							className="h-9 flex-1 gap-2 bg-emerald-600 text-xs text-white hover:bg-emerald-500"
							onClick={onDownload}
						>
							<Download className="size-3.5" />
							Download
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function ExportToDriveButton({ onDone }: { onDone: () => void }) {
	const editor = useEditor();
	const [busy, setBusy] = useState(false);

	const handleExportToDrive = async () => {
		// Ensure Drive is configured + connected before attempting the copy.
		if (!getGoogleClientId()) {
			toast.error("Google Drive isn't set up yet", {
				description:
					"Add your Google Client ID via the Drive import dialog first.",
			});
			return;
		}
		setBusy(true);
		try {
			if (!getGoogleAccessToken()) {
				await initiateGoogleOAuth();
			}
			const folderId = await editor.project.exportProjectToDrive();
			toast.success("Project exported to Google Drive", {
				description:
					"A copy (project + media) now lives in a new Drive folder and will keep syncing.",
				action: {
					label: "Open",
					onClick: () =>
						window.open(
							`https://drive.google.com/drive/folders/${folderId}`,
							"_blank",
							"noopener,noreferrer",
						),
				},
			});
			onDone();
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Export to Drive failed";
			toast.error(
				message === "unauthenticated"
					? "Connect Google Drive to export."
					: message,
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={busy}
			onClick={handleExportToDrive}
			className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
		>
			<HugeiconsIcon
				icon={busy ? CloudUploadIcon : GoogleIcon}
				className="size-3.5"
			/>
			{busy ? "Exporting to Drive…" : "Google Drive"}
		</Button>
	);
}

function ExportProjectFileButton({ onDone }: { onDone: () => void }) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [busy, setBusy] = useState(false);

	const handleExportProjectFile = async () => {
		if (!activeProject) return;
		setBusy(true);
		try {
			const { exportProject } = await import("@/lib/project/file");
			await editor.save.flush();
			// The React closure predates the save; serialize the freshly saved project.
			const savedProject = editor.project.getActiveOrNull();
			if (!savedProject || savedProject.metadata.id !== activeProject.metadata.id) {
				throw new Error("Active project changed during export");
			}
			exportProject(savedProject);
			toast.success("Project file exported");
			onDone();
		} catch {
			toast.error("Failed to export project file");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={busy}
			onClick={handleExportProjectFile}
			className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
		>
			<HugeiconsIcon icon={FileExportIcon} className="size-3.5" />
			{busy ? "Exporting…" : "Project file"}
		</Button>
	);
}

function ExportError({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => void;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(error);
		setCopied(true);
		setTimeout(() => setCopied(false), 1000);
	};

	return (
		<div className="space-y-4 p-3">
			<div className="flex flex-col gap-1.5">
				<p className="text-destructive text-sm font-medium">Export failed</p>
				<p className="text-muted-foreground text-xs">{error}</p>
			</div>

			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					className="h-8 flex-1 text-xs"
					onClick={handleCopy}
				>
					{copied ? <Check className="text-constructive" /> : <Copy />}
					Copy
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="h-8 flex-1 text-xs"
					onClick={onRetry}
				>
					<RotateCcw />
					Retry
				</Button>
			</div>
		</div>
	);
}
