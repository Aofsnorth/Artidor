"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Video01Icon,
	CloudUploadIcon,
	GoogleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import { toast } from "sonner";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	initiateGoogleOAuth,
} from "@/lib/drive/api";
import {
	EXPORT_FORMAT_LABELS,
	EXPORT_FORMAT_VALUES,
	EXPORT_MODE_LABELS,
	EXPORT_MODE_VALUES,
	type ExportFormat,
	type ExportMode,
} from "@/lib/export";

interface ExportVideoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	projectName: string;
}

export function ExportVideoDialog({
	open,
	onOpenChange,
	projectId,
	projectName,
}: ExportVideoDialogProps) {
	const router = useRouter();
	const [format, setFormat] = useState<ExportFormat>("mp4");
	const [quality, setQuality] = useState<"low" | "medium" | "high" | "very_high">("medium");
	const [exportMode, setExportMode] = useState<ExportMode>("auto");
	const [includeAudio, setIncludeAudio] = useState(true);
	const [saveToDrive, setSaveToDrive] = useState(false);
	const [busy, setBusy] = useState(false);

	const handleExport = async () => {
		setBusy(true);

		if (saveToDrive) {
			if (!getGoogleClientId()) {
				toast.error("Google Drive isn't set up yet", {
					description: "Add your Google Client ID via the Drive import dialog first.",
				});
				setBusy(false);
				return;
			}
			if (!getGoogleAccessToken()) {
				try {
					await initiateGoogleOAuth();
				} catch {
					toast.error("Google Drive sign-in required");
					setBusy(false);
					return;
				}
			}
		}

		localStorage.setItem(
			"artidor-pending-export",
			JSON.stringify({
				format,
				quality,
				mode: exportMode,
				includeAudio,
				saveToDrive,
			}),
		);

		router.push(`/editor/${projectId}`);
		onOpenChange(false);
		setBusy(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"sm:max-w-[520px] p-0 overflow-hidden",
					"bg-gradient-to-b from-[#0c0c10] to-[#08080c]",
					"border border-white/[0.07]",
					"shadow-[0_40px_120px_-20px_rgba(0,0,0,0.75),0_0_80px_-20px_rgba(255,255,255,0.06)]",
				)}
			>
				{/* White glow ambient */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						background: [
							"radial-gradient(ellipse 60% 30% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 60%)",
							"radial-gradient(ellipse 50% 40% at 50% 100%, rgba(255, 255, 255, 0.04), transparent 55%)",
							"repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.008) 60px, rgba(255,255,255,0.008) 61px)",
						].join(", "),
					}}
				/>

				{/* White accent line */}
				<div
					aria-hidden
					className="absolute top-0 left-0 right-0 h-px"
					style={{
						background:
							"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 25%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.35) 75%, transparent 100%)",
					}}
				/>

				<div className="relative">
					<DialogHeader className="p-6 pb-5">
						<div className="flex items-center gap-3.5">
							<div
								className={cn(
									"grid size-11 place-items-center rounded-xl",
									"border border-white/15 bg-white/[0.06]",
									"shadow-[0_0_30px_rgba(255,255,255,0.08)]",
								)}
							>
								<HugeiconsIcon
									icon={Video01Icon}
									className="size-5 text-white/80"
								/>
							</div>
							<div>
								<DialogTitle className="text-[15px] font-semibold text-white tracking-tight">
									Export to Video
								</DialogTitle>
								<DialogDescription className="text-xs text-white/45 mt-0.5">
									{projectName}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					{/* Stepped Art Deco divider */}
					<div className="mx-6 flex items-center gap-2">
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
						<div className="flex gap-0.5">
							<div className="size-1 bg-white/20" />
							<div className="size-1 bg-white/30" />
							<div className="size-1 bg-white/20" />
						</div>
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
					</div>

					<div className="p-6 space-y-5 max-h-[55vh] overflow-y-auto">
						<Section label="Format">
							<RadioGroup
								value={format}
								onValueChange={(v) => {
									if (EXPORT_FORMAT_VALUES.includes(v as ExportFormat))
										setFormat(v as ExportFormat);
								}}
								className="gap-2"
							>
								{EXPORT_FORMAT_VALUES.map((f) => (
									<div key={f} className="flex items-center gap-2.5">
										<RadioGroupItem
											value={f}
											id={`ev-format-${f}`}
											className="border-white/20 text-white"
										/>
										<Label
											htmlFor={`ev-format-${f}`}
											className="text-xs text-white/70 cursor-pointer select-none"
										>
											{EXPORT_FORMAT_LABELS[f]}
										</Label>
									</div>
								))}
							</RadioGroup>
						</Section>

						<Section label="Quality">
							<RadioGroup
								value={quality}
								onValueChange={(v) => setQuality(v as typeof quality)}
								className="gap-2"
							>
								{(["low", "medium", "high", "very_high"] as const).map((q) => (
									<div key={q} className="flex items-center gap-2.5">
										<RadioGroupItem
											value={q}
											id={`ev-quality-${q}`}
											className="border-white/20 text-white"
										/>
										<Label
											htmlFor={`ev-quality-${q}`}
											className="text-xs text-white/70 cursor-pointer select-none"
										>
											{q === "low"
												? "Low — Smallest file"
												: q === "medium"
													? "Medium — Balanced"
													: q === "high"
														? "High — Recommended"
														: "Very High — Largest file"}
										</Label>
									</div>
								))}
							</RadioGroup>
						</Section>

						<Section label="Engine">
							<RadioGroup
								value={exportMode}
								onValueChange={(v) => {
									if (EXPORT_MODE_VALUES.includes(v as ExportMode))
										setExportMode(v as ExportMode);
								}}
								className="gap-2"
							>
								{EXPORT_MODE_VALUES.map((m) => (
									<div key={m} className="flex items-center gap-2.5">
										<RadioGroupItem
											value={m}
											id={`ev-mode-${m}`}
											className="border-white/20 text-white"
										/>
										<Label
											htmlFor={`ev-mode-${m}`}
											className="text-xs text-white/70 cursor-pointer select-none"
										>
											{EXPORT_MODE_LABELS[m]}
										</Label>
									</div>
								))}
							</RadioGroup>
						</Section>

						<Section label="Audio">
							<div className="flex items-center gap-2.5">
								<Checkbox
									id="ev-audio"
									checked={includeAudio}
									onCheckedChange={(c) => setIncludeAudio(!!c)}
									className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
								/>
								<Label
									htmlFor="ev-audio"
									className="text-xs text-white/70 cursor-pointer select-none"
								>
									Include audio in export
								</Label>
							</div>
						</Section>

						<Section label="Destination">
							<div className="flex items-center gap-2.5">
								<Checkbox
									id="ev-drive"
									checked={saveToDrive}
									onCheckedChange={(c) => setSaveToDrive(!!c)}
									className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
								/>
								<Label
									htmlFor="ev-drive"
									className="text-xs text-white/70 cursor-pointer select-none flex items-center gap-1.5"
								>
									<HugeiconsIcon
										icon={GoogleIcon}
										className="size-3 text-white/50"
									/>
									Save to Google Drive
								</Label>
							</div>
						</Section>
					</div>

					<DialogFooter className="p-6 pt-4 border-t border-white/[0.06]">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-10 border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white text-xs"
						>
							Cancel
						</Button>
						<Button
							onClick={handleExport}
							disabled={busy}
							className={cn(
								"h-10 gap-2 text-xs font-semibold min-w-[140px]",
								"bg-white text-black",
								"hover:bg-white/90",
								"shadow-[0_4px_24px_rgba(255,255,255,0.15),0_0_40px_rgba(255,255,255,0.06)]",
								"active:scale-[0.98] transition-all",
							)}
						>
							{busy ? (
								<div className="size-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
							) : saveToDrive ? (
								<HugeiconsIcon
									icon={CloudUploadIcon}
									className="size-3.5"
								/>
							) : (
								<HugeiconsIcon icon={Video01Icon} className="size-3.5" />
							)}
							{busy
								? "Preparing..."
								: saveToDrive
									? "Export & Save to Drive"
									: "Open Editor & Export"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function Section({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-2.5">
			<div className="flex items-center gap-2">
				<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
					{label}
				</span>
				<div className="h-px flex-1 bg-white/[0.04]" />
			</div>
			{children}
		</div>
	);
}
