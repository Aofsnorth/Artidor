"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
	AlertCircleIcon,
	FileUploadIcon,
	Video01Icon,
	Mic01Icon,
	Image01Icon,
	Tick02Icon,
	Link01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import type { ImportedMediaRef } from "@/lib/project/file";

interface MatchResult {
	mediaId: string;
	expectedName: string;
	expectedType: "video" | "audio" | "image";
	expectedDuration: number;
	matchedFile?: File;
	matchedBy: "filename" | "duration" | "manual" | null;
}

interface MissingMediaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	missingMedia: ImportedMediaRef[];
	onConfirm: (matches: Map<string, File>) => void;
}

function formatDuration(seconds: number): string {
	if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	const min = Math.floor(seconds / 60);
	const sec = Math.round(seconds % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getTypeIcon(type: "video" | "audio" | "image") {
	switch (type) {
		case "video":
			return Video01Icon;
		case "audio":
			return Mic01Icon;
		case "image":
			return Image01Icon;
	}
}

function getTypeColor(type: "video" | "audio" | "image") {
	switch (type) {
		case "video":
			return "text-blue-400 bg-blue-400/10 border-blue-400/20";
		case "audio":
			return "text-amber-400 bg-amber-400/10 border-amber-400/20";
		case "image":
			return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
	}
}

function getMediaDuration(file: File): Promise<number> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const cleanup = () => URL.revokeObjectURL(url);

		if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
			const el = document.createElement(
				file.type.startsWith("video/") ? "video" : "audio",
			);
			el.preload = "metadata";
			el.onloadedmetadata = () => {
				cleanup();
				resolve(el.duration);
			};
			el.onerror = () => {
				cleanup();
				resolve(-1);
			};
			el.src = url;
		} else {
			cleanup();
			resolve(0);
		}
	});
}

function stripExtension(name: string): string {
	return name.replace(/\.[^/.]+$/, "");
}

const DURATION_TOLERANCE = 0.5;

export function MissingMediaDialog({
	open,
	onOpenChange,
	missingMedia,
	onConfirm,
}: MissingMediaDialogProps) {
	const [matches, setMatches] = useState<Map<string, MatchResult>>(new Map());
	const [isMatching, setIsMatching] = useState(false);
	const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const matchedCount = useMemo(
		() => [...matches.values()].filter((m) => m.matchedFile).length,
		[matches],
	);

	const handleFilesSelected = useCallback(
		async (files: FileList | File[]) => {
			const fileList = Array.from(files);
			setDroppedFiles(fileList);
			setIsMatching(true);

			const newMatches = new Map<string, MatchResult>();

			// Phase 1: filename match
			for (const ref of missingMedia) {
				const refName = stripExtension(ref.name).toLowerCase();
				const fileByName = fileList.find(
					(f) => stripExtension(f.name).toLowerCase() === refName,
				);
				if (fileByName) {
					newMatches.set(ref.mediaId, {
						mediaId: ref.mediaId,
						expectedName: ref.name,
						expectedType: ref.type,
						expectedDuration: ref.duration,
						matchedFile: fileByName,
						matchedBy: "filename",
					});
				}
			}

			// Phase 2: duration match for unmatched
			const unmatchedRefs = missingMedia.filter(
				(ref) => !newMatches.has(ref.mediaId),
			);
			const usedFiles = new Set(
				[...newMatches.values()].map((m) => m.matchedFile?.name),
			);

			for (const ref of unmatchedRefs) {
				for (const file of fileList) {
					if (usedFiles.has(file.name)) continue;
					const duration = await getMediaDuration(file);
					if (
						duration > 0 &&
						Math.abs(duration - ref.duration) < DURATION_TOLERANCE
					) {
						newMatches.set(ref.mediaId, {
							mediaId: ref.mediaId,
							expectedName: ref.name,
							expectedType: ref.type,
							expectedDuration: ref.duration,
							matchedFile: file,
							matchedBy: "duration",
						});
						usedFiles.add(file.name);
						break;
					}
				}
			}

			// Phase 3: fill remaining unmatched refs
			for (const ref of missingMedia) {
				if (!newMatches.has(ref.mediaId)) {
					newMatches.set(ref.mediaId, {
						mediaId: ref.mediaId,
						expectedName: ref.name,
						expectedType: ref.type,
						expectedDuration: ref.duration,
						matchedFile: undefined,
						matchedBy: null,
					});
				}
			}

			setMatches(newMatches);
			setIsMatching(false);
		},
		[missingMedia],
	);

	const handleManualAssign = useCallback((mediaId: string, file: File) => {
		setMatches((prev) => {
			const next = new Map(prev);
			const existing = next.get(mediaId);
			if (existing) {
				next.set(mediaId, {
					...existing,
					matchedFile: file,
					matchedBy: "manual",
				});
			}
			return next;
		});
	}, []);

	const handleConfirm = useCallback(() => {
		const fileMap = new Map<string, File>();
		for (const [mediaId, match] of matches) {
			if (match.matchedFile) {
				fileMap.set(mediaId, match.matchedFile);
			}
		}
		onConfirm(fileMap);
		onOpenChange(false);
	}, [matches, onConfirm, onOpenChange]);

	const handleSkip = useCallback(() => {
		onConfirm(new Map());
		onOpenChange(false);
	}, [onConfirm, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"sm:max-w-[560px] p-0 overflow-hidden",
					"bg-gradient-to-b from-[#0c0c10] to-[#07070a]",
					"border border-white/[0.08] shadow-[0_32px_96px_-16px_rgba(0,0,0,0.7)]",
				)}
			>
				{/* Ambient glow */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-60"
					style={{
						background:
							"radial-gradient(ellipse 50% 40% at 30% 0%, rgba(168, 85, 247, 0.1), transparent 60%), radial-gradient(ellipse 40% 50% at 80% 100%, rgba(234, 179, 8, 0.06), transparent 50%)",
					}}
				/>

				<div className="relative">
					<DialogHeader className="p-6 pb-4 border-b border-white/[0.06]">
						<div className="flex items-center gap-3">
							<div className="grid size-10 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08]">
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="size-5 text-amber-400"
								/>
							</div>
							<div>
								<DialogTitle className="text-base font-semibold text-white tracking-tight">
									Missing Media Files
								</DialogTitle>
								<DialogDescription className="text-xs text-white/50 mt-0.5">
									{missingMedia.length} media file
									{missingMedia.length !== 1 ? "s" : ""} not found in this
									project. Provide the files to relink them.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
						{!droppedFiles.length ? (
							<button
								type="button"
								className={cn(
									"flex w-full flex-col items-center gap-4 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] p-8",
									"hover:border-white/25 hover:bg-white/[0.04] transition-all cursor-pointer",
								)}
								onClick={() => fileInputRef.current?.click()}
								onDragOver={(e) => {
									e.preventDefault();
									e.currentTarget.classList.add(
										"border-purple-400/40",
										"bg-purple-400/[0.04]",
									);
								}}
								onDragLeave={(e) => {
									e.currentTarget.classList.remove(
										"border-purple-400/40",
										"bg-purple-400/[0.04]",
									);
								}}
								onDrop={(e) => {
									e.preventDefault();
									e.currentTarget.classList.remove(
										"border-purple-400/40",
										"bg-purple-400/[0.04]",
									);
									if (e.dataTransfer.files.length) {
										handleFilesSelected(e.dataTransfer.files);
									}
								}}
							>
								<div className="grid size-12 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
									<HugeiconsIcon
										icon={FileUploadIcon}
										className="size-6 text-white/60"
									/>
								</div>
								<div className="text-center">
									<p className="text-sm font-medium text-white/85">
										Drop or select media files
									</p>
									<p className="text-xs text-white/40 mt-1">
										Files will be matched by name and duration automatically
									</p>
								</div>
							</button>
						) : (
							<div className="space-y-2">
								{missingMedia.map((ref) => {
									const match = matches.get(ref.mediaId);
									const TypeIcon = getTypeIcon(ref.type);
									const colorClass = getTypeColor(ref.type);
									const isMatched = !!match?.matchedFile;

									return (
										<div
											key={ref.mediaId}
											className={cn(
												"flex items-center gap-3 rounded-lg border p-3 transition-all",
												isMatched
													? "border-emerald-400/20 bg-emerald-400/[0.04]"
													: "border-white/[0.06] bg-white/[0.02]",
											)}
										>
											<div
												className={cn(
													"grid size-8 shrink-0 place-items-center rounded-lg border",
													colorClass,
												)}
											>
												<HugeiconsIcon icon={TypeIcon} className="size-4" />
											</div>
											<div className="flex-1 min-w-0">
												<div className="text-xs font-medium text-white/85 truncate">
													{ref.name}
												</div>
												<div className="flex items-center gap-2 mt-0.5">
													<span className="text-[10px] text-white/40 uppercase">
														{ref.type}
													</span>
													<span className="text-[10px] text-white/25">
														{formatDuration(ref.duration)}
													</span>
												</div>
											</div>
											{isMatched ? (
												<div className="flex items-center gap-1.5 shrink-0">
													{match.matchedBy && (
														<span className="text-[10px] text-emerald-400/70 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
															{match.matchedBy === "filename"
																? "Name"
																: match.matchedBy === "duration"
																	? "Duration"
																	: "Manual"}
														</span>
													)}
													<HugeiconsIcon
														icon={Tick02Icon}
														className="size-4 text-emerald-400"
													/>
												</div>
											) : (
												<Button
													variant="ghost"
													size="sm"
													className="h-7 text-[10px] text-white/50 hover:text-white/80 shrink-0"
													onClick={() => {
														const input = document.createElement("input");
														input.type = "file";
														const accept =
															ref.type === "video"
																? "video/*"
																: ref.type === "audio"
																	? "audio/*"
																	: "image/*";
														input.accept = accept;
														input.onchange = (e) => {
															const f = (e.target as HTMLInputElement)
																.files?.[0];
															if (f) handleManualAssign(ref.mediaId, f);
														};
														input.click();
													}}
												>
													<HugeiconsIcon
														icon={Link01Icon}
														className="size-3 mr-1"
													/>
													Relink
												</Button>
											)}
										</div>
									);
								})}
							</div>
						)}

						{isMatching && (
							<div className="flex items-center gap-2 text-xs text-white/50 py-2">
								<div className="size-3 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
								Matching files...
							</div>
						)}
					</div>

					<DialogFooter className="p-6 pt-4 border-t border-white/[0.06]">
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="video/*,audio/*,image/*"
							className="hidden"
							onChange={(e) => {
								if (e.target.files?.length) {
									handleFilesSelected(e.target.files);
								}
							}}
						/>
						<div className="flex items-center gap-2 w-full">
							<Button
								variant="outline"
								onClick={handleSkip}
								className="flex-1 h-10 border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white text-xs"
							>
								Skip for now
							</Button>
							{droppedFiles.length > 0 && (
								<Button
									onClick={() => fileInputRef.current?.click()}
									variant="outline"
									className="h-10 border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white text-xs"
								>
									Add more files
								</Button>
							)}
							{matchedCount > 0 && (
								<Button
									onClick={handleConfirm}
									className={cn(
										"flex-1 h-10 gap-2 text-xs font-semibold",
										"bg-white text-black hover:bg-white/90",
										"shadow-[0_4px_20px_rgba(255,255,255,0.1)]",
									)}
								>
									<HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
									Link {matchedCount} file{matchedCount !== 1 ? "s" : ""}
								</Button>
							)}
						</div>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
