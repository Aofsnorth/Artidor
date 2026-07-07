"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	ArrowRight01Icon,
	CloudUploadIcon,
	GoogleIcon,
	TransitionTopIcon,
	FileExportIcon,
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
	EXPORT_FORMAT_LABELS,
	EXPORT_FORMAT_VALUES,
	EXPORT_QUALITY_VALUES,
	getExportFileExtension,
	getExportMimeType,
	downloadBuffer,
	type ExportFormat,
	type ExportQuality,
	type ExportResult,
} from "@/lib/export";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_EXPORT_OPTIONS } from "@/lib/export/defaults";

function isExportFormat(value: string): value is ExportFormat {
	return EXPORT_FORMAT_VALUES.some((formatValue) => formatValue === value);
}

function isExportQuality(value: string): value is ExportQuality {
	return EXPORT_QUALITY_VALUES.some((qualityValue) => qualityValue === value);
}

const CustomEmblem = () => (
	<div className="relative flex items-center justify-center size-8 select-none">
		{/* Ambient white glowing background */}
		<div className="absolute inset-0 bg-white/5 rounded-full blur-md" />

		<svg
			aria-hidden="true"
			className="size-6 text-stone-300 z-10"
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			{/* Clean cross */}
			<line x1="50" y1="20" x2="50" y2="80" />
			<line x1="20" y1="50" x2="80" y2="50" />
			{/* Diagonal lines */}
			<line x1="29" y1="29" x2="71" y2="71" strokeWidth="1.2" />
			<line x1="71" y1="29" x2="29" y2="71" strokeWidth="1.2" />
			{/* Symmetrical diamond */}
			<path d="M50 35 L65 50 L50 65 L35 50 Z" />
			<circle
				cx="50"
				cy="50"
				r="3"
				className="fill-[#0a0a0a] stroke-stone-300"
			/>
		</svg>
	</div>
);

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
			localStorage.setItem(
				"artidor-export-prefs",
				JSON.stringify(settings),
			);
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

	const handleDownloadFromOverlay = () => {
		if (!exportResult?.buffer || !activeProject) return;
		const ext = getExportFileExtension({ format: DEFAULT_EXPORT_OPTIONS.format });
		const mime = getExportMimeType({ format: DEFAULT_EXPORT_OPTIONS.format });
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
							"group/export relative flex h-8 items-center gap-1.5 overflow-hidden rounded-full border px-3.5 text-xs font-semibold transition-all duration-300",
							// Always-glowing base state — soft halo + warm tint so it reads as the primary CTA in the header
							"border-white/30 text-white",
							"shadow-[0_0_14px_rgba(255,255,255,0.18),0_0_2px_rgba(255,255,255,0.35)_inset,inset_0_1px_0_rgba(255,255,255,0.22)]",
							// Hover: pump the glow + add a wider color halo
							"hover:border-white/50 hover:shadow-[0_0_28px_rgba(255,255,255,0.42),0_0_8px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.32)]",
							// Open: same as hover but locked
							isExportPopoverOpen &&
								"border-white/55 shadow-[0_0_30px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]",
							hasProject
								? "cursor-pointer active:scale-95"
								: "cursor-not-allowed opacity-40",
						)}
						style={{
							// Permanent radial sheen so the button never reads as flat
							background: isExportPopoverOpen
								? "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.12) 100%)"
								: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
						}}
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
						{/* Slow-pulsing aura so the button feels alive even when untouched */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -inset-1 rounded-full bg-linear-to-r from-white/0 via-white/35 to-white/0 opacity-60 blur-md export-pulse"
						/>
						{/* Hover boost: a faster, brighter pulse layered on top */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute -inset-0.5 rounded-full bg-linear-to-r from-white/0 via-white/55 to-white/0 opacity-0 blur-md transition-opacity duration-300 group-hover/export:opacity-100 group-hover/export:export-pulse-strong"
						/>
						{/* Inner highlight ring (permanent) */}
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
						/>
						{/* Icon: extra drop-shadow so it doesn't get lost in the glow */}
						<HugeiconsIcon
							icon={TransitionTopIcon}
							className="z-10 size-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.85)] transition-transform duration-300 group-hover/export:-translate-y-px group-hover/export:drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
						/>
						<span className="z-10 font-sans text-xs font-semibold tracking-wide">
							Export
						</span>
						{/* Subtle arrow affordance — hints at the action without adding weight */}
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							className="z-10 size-3 text-white/70 transition-all duration-300 group-hover/export:translate-x-0.5 group-hover/export:text-white"
						/>
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
			{showCompletionOverlay && exportResult?.success && exportResult.buffer && activeProject && (
				<ExportCompletionOverlay
					result={exportResult}
					filename={`${activeProject.metadata.name}${getExportFileExtension({ format: DEFAULT_EXPORT_OPTIONS.format })}`}
					mimeType={getExportMimeType({ format: DEFAULT_EXPORT_OPTIONS.format })}
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

	// Read stored preferences from /project page export dialog
	const storedPrefs = (() => {
		try {
			const raw = localStorage.getItem("artidor-export-prefs");
			if (raw) {
				localStorage.removeItem("artidor-export-prefs");
				return JSON.parse(raw) as {
					format?: ExportFormat;
					quality?: ExportQuality;
					includeAudio?: boolean;
					saveToDrive?: boolean;
				};
			}
		} catch {}
		return null;
	})();

	const [format, setFormat] = useState<ExportFormat>(
		storedPrefs?.format && isExportFormat(storedPrefs.format)
			? storedPrefs.format
			: DEFAULT_EXPORT_OPTIONS.format,
	);
	const [quality, setQuality] = useState<ExportQuality>(
		storedPrefs?.quality && isExportQuality(storedPrefs.quality)
			? storedPrefs.quality
			: DEFAULT_EXPORT_OPTIONS.quality,
	);
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState<boolean>(
		storedPrefs?.includeAudio ?? DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
	);
	const filename = `${activeProject.metadata.name}${getExportFileExtension({ format })}`;
	const mimeType = getExportMimeType({ format });

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
		}
	};

	// Don't render the popover at all if it's closed or if export is in progress
	if (!isOpen || exportState.isExporting) return null;

	return (
		<PopoverContent
			className={cn(
				"mr-4 flex w-80 flex-col p-0 overflow-hidden rounded-xl select-none",
				"bg-linear-to-b from-[#0a0a0a] to-[#050505] border border-stone-900",
				"shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200",
			)}
			style={
				{
					"--primary": "hsl(0, 0%, 100%)",
					"--primary-foreground": "hsl(0, 0%, 0%)",
					"--border": "hsl(0, 0%, 12%)",
					"--accent": "hsl(0, 0%, 15%)",
					"--accent-foreground": "hsl(0, 0%, 100%)",
					"--muted-foreground": "hsl(0, 0%, 50%)",
					"--foreground": "hsl(0, 0%, 90%)",
					"--ring": "hsl(0, 0%, 100%)",
				} as React.CSSProperties
			}
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
					<div className="flex flex-col items-center justify-center pt-6 pb-4 px-4 border-b border-stone-900 bg-linear-to-b from-stone-900/10 to-transparent relative">
						{/* Ambient light streak behind the emblem */}
						<div className="absolute top-0 w-32 h-10 bg-radial-gradient from-white/5 to-transparent blur-md pointer-events-none" />

						<CustomEmblem />

						<h3 className="font-sans tracking-[0.2em] text-stone-200 text-[10px] uppercase mt-3">
							export project
						</h3>
					</div>

					<div className="flex flex-col gap-4">
						<div className="flex flex-col">
							<Section
								collapsible
								defaultOpen={false}
								showTopBorder={false}
								className="border-b border-stone-950 hover:bg-stone-900/20 transition-colors"
							>
								<SectionHeader>
									<SectionTitle className="font-sans text-xs uppercase tracking-wider text-stone-300">
										format
									</SectionTitle>
								</SectionHeader>
								<SectionContent>
									<RadioGroup
										value={format}
										onValueChange={(value) => {
											if (isExportFormat(value)) {
												setFormat(value);
											}
										}}
										className="gap-2.5 pt-1"
									>
										{EXPORT_FORMAT_VALUES.map((formatValue) => (
											<div
												key={formatValue}
												className="flex items-center space-x-2.5 cursor-pointer"
											>
												<RadioGroupItem
													value={formatValue}
													id={formatValue}
													className="border-stone-700 text-stone-300"
												/>
												<Label
													htmlFor={formatValue}
													className="text-stone-300 text-xs font-light cursor-pointer select-none"
												>
													{EXPORT_FORMAT_LABELS[formatValue]}
												</Label>
											</div>
										))}
									</RadioGroup>
								</SectionContent>
							</Section>

							<Section
								collapsible
								defaultOpen={false}
								className="border-b border-stone-950 hover:bg-stone-900/20 transition-colors"
							>
								<SectionHeader>
									<SectionTitle className="font-sans text-xs uppercase tracking-wider text-stone-300">
										quality
									</SectionTitle>
								</SectionHeader>
								<SectionContent>
									<RadioGroup
										value={quality}
										onValueChange={(value) => {
											if (isExportQuality(value)) {
												setQuality(value);
											}
										}}
										className="gap-2.5 pt-1"
									>
										<div className="flex items-center space-x-2.5 cursor-pointer">
											<RadioGroupItem
												value="low"
												id="low"
												className="border-stone-700 text-stone-300"
											/>
											<Label
												htmlFor="low"
												className="text-stone-300 text-xs font-light cursor-pointer select-none"
											>
												Low - Smallest file size
											</Label>
										</div>
										<div className="flex items-center space-x-2.5 cursor-pointer">
											<RadioGroupItem
												value="medium"
												id="medium"
												className="border-stone-700 text-stone-300"
											/>
											<Label
												htmlFor="medium"
												className="text-stone-300 text-xs font-light cursor-pointer select-none"
											>
												Medium - Balanced
											</Label>
										</div>
										<div className="flex items-center space-x-2.5 cursor-pointer">
											<RadioGroupItem
												value="high"
												id="high"
												className="border-stone-700 text-stone-300"
											/>
											<Label
												htmlFor="high"
												className="text-stone-300 text-xs font-light cursor-pointer select-none"
											>
												High - Recommended
											</Label>
										</div>
										<div className="flex items-center space-x-2.5 cursor-pointer">
											<RadioGroupItem
												value="very_high"
												id="very_high"
												className="border-stone-700 text-stone-300"
											/>
											<Label
												htmlFor="very_high"
												className="text-stone-300 text-xs font-light cursor-pointer select-none"
											>
												Very high - Largest file size
											</Label>
										</div>
									</RadioGroup>
								</SectionContent>
							</Section>

							<Section
								collapsible
								defaultOpen={false}
								className="border-b border-stone-950 hover:bg-stone-900/20 transition-colors"
							>
								<SectionHeader>
									<SectionTitle className="font-sans text-xs uppercase tracking-wider text-stone-300">
										audio
									</SectionTitle>
								</SectionHeader>
								<SectionContent>
									<div className="flex items-center space-x-2.5 pt-1 cursor-pointer">
										<Checkbox
											id="include-audio"
											checked={shouldIncludeAudio}
											onCheckedChange={(checked) =>
												setShouldIncludeAudio(!!checked)
											}
											className="border-stone-700 text-stone-300 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
										/>
										<Label
											htmlFor="include-audio"
											className="text-stone-300 text-xs font-light cursor-pointer select-none"
										>
											Include audio in export
										</Label>
									</div>
								</SectionContent>
							</Section>
						</div>

						<div className="flex flex-col gap-2 p-4 pt-1">
							<Button
								onClick={handleExport}
								className={cn(
									"w-full gap-2 py-5 rounded-lg border-0 shadow-[0_4px_20px_rgba(255,255,255,0.05)] select-none",
									"bg-[#FAF8F5] text-black hover:bg-white hover:shadow-[0_4px_25px_rgba(255,255,255,0.15)] active:scale-98 transition-all duration-300",
									"font-sans text-xs uppercase tracking-widest font-semibold",
								)}
							>
								<Download className="size-4 stroke-black stroke-[2.5px]" />
								export
							</Button>
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
		<div className="flex flex-col gap-4 p-4">
			<div className="overflow-hidden rounded-lg border border-stone-800 bg-black">
				{previewUrl ? (
					<video
						controls
						className="aspect-video w-full bg-black"
						src={previewUrl}
					>
						<track kind="captions" />
					</video>
				) : (
					<div className="flex aspect-video items-center justify-center text-stone-500">
						<Play className="size-5" />
					</div>
				)}
			</div>

			<div className="space-y-1">
				<p className="text-sm font-medium text-stone-100">Export ready</p>
				<p className="truncate text-xs text-stone-500">{filename}</p>
				<p className="text-xs text-stone-500">
					{result.cached ? "From history" : "Fresh render"} ·{" "}
					{formatBytes(result.buffer?.byteLength ?? 0)}
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="h-9 flex-1 border-stone-800 text-xs text-stone-300 hover:bg-stone-900"
						onClick={onNewExport}
					>
						New export
					</Button>
					<Button
						className="h-9 flex-1 gap-2 bg-[#FAF8F5] text-xs text-black hover:bg-white"
						onClick={handleDownload}
					>
						<Download className="size-3.5" />
						Download
					</Button>
				</div>
				<ExportToDriveButton onDone={() => {}} />
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
			disabled={busy}
			onClick={handleExportToDrive}
			className={cn(
				"w-full gap-2 rounded-lg border-stone-800 py-4 text-stone-300",
				"hover:bg-stone-900/50 hover:text-white transition-colors",
				"font-sans text-[11px] uppercase tracking-wider",
			)}
		>
			<HugeiconsIcon
				icon={busy ? CloudUploadIcon : GoogleIcon}
				className="size-3.5"
			/>
			{busy ? "Exporting to Drive…" : "Export to Drive"}
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
			await editor.project.saveCurrentProject();
			const { exportProject } = await import("@/lib/project/file");
			exportProject(activeProject);
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
			disabled={busy}
			onClick={handleExportProjectFile}
			className={cn(
				"w-full gap-2 rounded-lg border-stone-800 py-4 text-stone-300",
				"hover:bg-stone-900/50 hover:text-white transition-colors",
				"font-sans text-[11px] uppercase tracking-wider",
			)}
		>
			<HugeiconsIcon
				icon={FileExportIcon}
				className="size-3.5"
			/>
			{busy ? "Exporting…" : "Export Project File"}
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
