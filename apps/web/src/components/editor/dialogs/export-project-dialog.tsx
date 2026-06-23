"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
	FileExportIcon,
	CloudUploadIcon,
	GoogleIcon,
	Download04Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import { toast } from "sonner";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	initiateGoogleOAuth,
} from "@/lib/drive/api";
import { storageService } from "@/services/storage/service";
import { exportProject } from "@/lib/project/file";

interface ExportProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	projectName: string;
	onExportToDrive?: () => Promise<void>;
}

export function ExportProjectDialog({
	open,
	onOpenChange,
	projectId,
	projectName,
	onExportToDrive,
}: ExportProjectDialogProps) {
	const [saveToDrive, setSaveToDrive] = useState(false);
	const [busy, setBusy] = useState(false);

	const handleExport = async () => {
		setBusy(true);

		try {
			// Always download the file
			const fullProject = await storageService.loadProject({ id: projectId });
			if (!fullProject?.project) {
				toast.error("Failed to load project for export");
				return;
			}
			exportProject(fullProject.project);

			// Optionally save to Drive
			if (saveToDrive) {
				if (!getGoogleClientId()) {
					toast.error("Google Drive isn't set up yet", {
						description:
							"Add your Google Client ID via the Drive import dialog first.",
					});
					return;
				}
				if (!getGoogleAccessToken()) {
					try {
						await initiateGoogleOAuth();
					} catch {
						toast.error("Google Drive sign-in required");
						return;
					}
				}
				if (onExportToDrive) {
					await onExportToDrive();
				}
			}

			toast.success("Project exported");
			onOpenChange(false);
		} catch {
			toast.error("Export failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"sm:max-w-[480px] p-0 overflow-hidden",
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
							"radial-gradient(ellipse 55% 30% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 60%)",
							"radial-gradient(ellipse 45% 40% at 50% 100%, rgba(255, 255, 255, 0.04), transparent 55%)",
							"repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.008) 80px, rgba(255,255,255,0.008) 81px)",
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
									icon={FileExportIcon}
									className="size-5 text-white/80"
								/>
							</div>
							<div>
								<DialogTitle className="text-[15px] font-semibold text-white tracking-tight">
									Export Project File
								</DialogTitle>
								<DialogDescription className="text-xs text-white/45 mt-0.5">
									{projectName}.artidor
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					{/* White stepped divider */}
					<div className="mx-6 flex items-center gap-2">
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
						<div className="flex gap-0.5">
							<div className="size-1 bg-white/20" />
							<div className="size-1 bg-white/30" />
							<div className="size-1 bg-white/20" />
						</div>
						<div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
					</div>

					<div className="p-6 space-y-5">
						{/* Info */}
						<div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5 space-y-2">
							<div className="flex items-center gap-2">
								<div className="size-1.5 rounded-full bg-white/40" />
								<span className="text-[11px] text-white/60">
									Downloads a{" "}
									<code className="text-white/80 bg-white/10 px-1 rounded text-[10px]">
										.artidor
									</code>{" "}
									project file
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-1.5 rounded-full bg-white/40" />
								<span className="text-[11px] text-white/60">
									Media files are referenced, not embedded
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-1.5 rounded-full bg-white/40" />
								<span className="text-[11px] text-white/60">
									Can be imported back into Artidor anytime
								</span>
							</div>
						</div>

						{/* Save to Drive */}
						<div className="space-y-2.5">
							<div className="flex items-center gap-2">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
									Destination
								</span>
								<div className="h-px flex-1 bg-white/[0.04]" />
							</div>
							<div className="flex items-center gap-2.5">
								<Checkbox
									id="ep-drive"
									checked={saveToDrive}
									onCheckedChange={(c) => setSaveToDrive(!!c)}
									className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
								/>
								<Label
									htmlFor="ep-drive"
									className="text-xs text-white/70 cursor-pointer select-none flex items-center gap-1.5"
								>
									<HugeiconsIcon
										icon={GoogleIcon}
										className="size-3 text-white/50"
									/>
									Save to Google Drive
								</Label>
							</div>
						</div>
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
							) : (
								<HugeiconsIcon
									icon={saveToDrive ? CloudUploadIcon : Download04Icon}
									className="size-3.5"
								/>
							)}
							{busy
								? "Exporting..."
								: saveToDrive
									? "Download & Save to Drive"
									: "Download Project File"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
