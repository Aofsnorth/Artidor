"use client";

import { useState } from "react";
import {
	ArrowRight01Icon,
	TransitionTopIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/ui";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import {
	EXPORT_FORMAT_LABELS,
	EXPORT_FORMAT_VALUES,
	EXPORT_QUALITY_VALUES,
	getExportFileExtension,
	getExportMimeType,
	downloadBuffer,
	type ExportFormat,
	type ExportQuality,
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
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const hasProject = !!activeProject;

	const handlePopoverOpenChange = ({ open }: { open: boolean }) => {
		if (!open) {
			editor.project.cancelExport();
			editor.project.clearExportState();
		}
		setIsExportPopoverOpen(open);
	};

	return (
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
					onClick={hasProject ? () => setIsExportPopoverOpen(true) : undefined}
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
						className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-white/0 via-white/35 to-white/0 opacity-60 blur-md export-pulse"
					/>
					{/* Hover boost: a faster, brighter pulse layered on top */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -inset-0.5 rounded-full bg-gradient-to-r from-white/0 via-white/55 to-white/0 opacity-0 blur-md transition-opacity duration-300 group-hover/export:opacity-100 group-hover/export:export-pulse-strong"
					/>
					{/* Inner highlight ring (permanent) */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
					/>
					{/* Icon: extra drop-shadow so it doesn't get lost in the glow */}
					<HugeiconsIcon
						icon={TransitionTopIcon}
						className="z-10 size-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.85)] transition-transform duration-300 group-hover/export:-translate-y-[1px] group-hover/export:drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
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
			{hasProject && <ExportPopover onOpenChange={setIsExportPopoverOpen} />}
		</Popover>
	);
}

function ExportPopover({
	onOpenChange,
}: {
	onOpenChange: (open: boolean) => void;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const exportState = useEditor((e) => e.project.getExportState());
	const { isExporting, progress, result: exportResult } = exportState;
	const [format, setFormat] = useState<ExportFormat>(
		DEFAULT_EXPORT_OPTIONS.format,
	);
	const [quality, setQuality] = useState<ExportQuality>(
		DEFAULT_EXPORT_OPTIONS.quality,
	);
	const [shouldIncludeAudio, setShouldIncludeAudio] = useState<boolean>(
		DEFAULT_EXPORT_OPTIONS.includeAudio ?? true,
	);

	const handleExport = async () => {
		if (!activeProject) return;

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
			downloadBuffer({
				buffer: result.buffer,
				filename: `${activeProject.metadata.name}${getExportFileExtension({ format })}`,
				mimeType: getExportMimeType({ format }),
			});

			editor.project.clearExportState();
			onOpenChange(false);
		}
	};

	const handleCancel = () => {
		editor.project.cancelExport();
	};

	return (
		<PopoverContent
			className={cn(
				"mr-4 flex w-80 flex-col p-0 overflow-hidden rounded-xl select-none",
				"bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-stone-900",
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
			{exportResult && !exportResult.success ? (
				<ExportError
					error={exportResult.error || "Unknown error occurred"}
					onRetry={handleExport}
				/>
			) : (
				<>
					<div className="flex flex-col items-center justify-center pt-6 pb-4 px-4 border-b border-stone-900 bg-gradient-to-b from-stone-900/10 to-transparent relative">
						{/* Ambient light streak behind the emblem */}
						<div className="absolute top-0 w-32 h-10 bg-radial-gradient from-white/5 to-transparent blur-md pointer-events-none" />

						<CustomEmblem />

						<h3 className="font-sans tracking-[0.2em] text-stone-200 text-[10px] uppercase mt-3">
							{isExporting ? "exporting project" : "export project"}
						</h3>
					</div>

					<div className="flex flex-col gap-4">
						{!isExporting && (
							<>
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

								<div className="p-4 pt-1">
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
								</div>
							</>
						)}

						{isExporting && (
							<div className="space-y-4 p-4">
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between text-center select-none">
										<p className="text-white font-sans text-xs font-medium">
											{Math.round(progress * 100)}%
										</p>
									</div>
									<Progress
										value={progress * 100}
										className="w-full bg-stone-900"
									/>
								</div>

								<Button
									variant="outline"
									className="w-full rounded-lg border-stone-800 text-stone-400 hover:bg-stone-900/50 hover:text-white transition-colors py-4 font-sans text-xs uppercase tracking-wider"
									onClick={handleCancel}
								>
									cancel
								</Button>
							</div>
						)}
					</div>
				</>
			)}
		</PopoverContent>
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
