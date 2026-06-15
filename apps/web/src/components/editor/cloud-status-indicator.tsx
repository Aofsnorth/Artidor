"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	AlertCircleIcon,
	CloudIcon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

export function CloudStatusIndicator() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const syncState = useEditor((e) => e.project.getDriveSyncState());

	if (!activeProject || !activeProject.metadata.googleDriveFolderId) {
		return null;
	}

	const renderContent = () => {
		switch (syncState.status) {
			case "saving":
				return (
					<div className="flex items-center gap-1.5 text-amber-400">
						<div className="size-3.5 animate-spin rounded-full border border-amber-400/25 border-t-amber-400" />
						<span className="text-[0.7rem] font-medium hidden sm:inline">
							Saving to Google Drive...
						</span>
					</div>
				);
			case "saved":
				return (
					<div className="flex items-center gap-1.5 text-emerald-400">
						<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
						<span className="text-[0.7rem] font-medium hidden sm:inline">
							Saved to Google Drive
						</span>
					</div>
				);
			case "syncing-assets":
				return (
					<div className="flex items-center gap-2 text-sky-400 max-w-[280px]">
						<div className="size-3.5 animate-spin rounded-full border border-sky-400/25 border-t-sky-400 shrink-0" />
						<div className="flex flex-col min-w-0">
							<span className="text-[0.7rem] font-semibold truncate leading-tight">
								Syncing Assets ({syncState.progress}%)
							</span>
							{syncState.message && (
								<span className="text-[0.58rem] text-sky-300/60 truncate leading-none mt-0.5">
									{syncState.message}
								</span>
							)}
						</div>
					</div>
				);
			case "error":
				return (
					<div className="flex items-center gap-1.5 text-rose-400">
						<HugeiconsIcon
							icon={AlertCircleIcon}
							className="size-3.5 shrink-0"
						/>
						<span
							className="text-[0.7rem] font-medium truncate hidden sm:inline"
							title={syncState.message || "Sync failed"}
						>
							{syncState.message || "Drive Error"}
						</span>
					</div>
				);
			case "idle":
			default:
				return (
					<div
						className="flex items-center gap-1.5 text-white/40 hover:text-white/60 transition-colors cursor-help"
						title="Linked to Google Drive folder"
					>
						<HugeiconsIcon icon={CloudIcon} className="size-3.5" />
						<span className="text-[0.7rem] font-medium hidden sm:inline">
							Drive Synced
						</span>
					</div>
				);
		}
	};

	return (
		<div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 backdrop-blur-md shrink-0 select-none">
			{renderContent()}
		</div>
	);
}
