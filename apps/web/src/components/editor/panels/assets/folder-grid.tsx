"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Folder01Icon,
	FolderAddIcon,
	MoreVerticalIcon,
	PencilEdit01Icon,
	Delete01Icon,
} from "@hugeicons/core-free-icons";
import type { MediaFolder } from "@/lib/media/types";
import { cn } from "@/utils/ui";

interface FolderGridProps {
	folders: MediaFolder[];
	assetCountByFolder: Map<string, number>;
	currentFolderId: string | null;
	onEnterFolder: (folderId: string) => void;
	onCreateFolder: () => void;
	onRenameFolder: (folderId: string, name: string) => void;
	onDeleteFolder: (folderId: string) => void;
	onExitFolder: () => void;
}

/**
 * Renders the folder grid for the Library tab. The grid is a row of
 * compact cards, one per folder, with an inline rename affordance
 * (double-click to edit, blur or Enter to commit) and a per-folder
 * context menu (rename / delete) accessible via the `...` button.
 */
export function FolderGrid({
	folders,
	assetCountByFolder,
	currentFolderId,
	onEnterFolder,
	onCreateFolder,
	onRenameFolder,
	onDeleteFolder,
	onExitFolder,
}: FolderGridProps) {
	if (currentFolderId) {
		return (
			<Breadcrumb
				folder={folders.find((f) => f.id === currentFolderId) ?? null}
				onExit={onExitFolder}
			/>
		);
	}

	if (folders.length === 0) {
		return (
			<div className="flex flex-col gap-2">
				<button
					type="button"
					onClick={onCreateFolder}
					className={cn(
						"flex w-full items-center justify-center gap-2 rounded-lg border border-dashed",
						"border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-white/55",
						"transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80",
					)}
					aria-label="Create new folder"
				>
					<HugeiconsIcon icon={FolderAddIcon} className="size-3.5" />
					New folder
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{/* "+ New folder" button (always visible) */}
			<button
				type="button"
				onClick={onCreateFolder}
				className={cn(
					"flex w-full items-center justify-center gap-2 rounded-lg border border-dashed",
					"border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-white/55",
					"transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80",
				)}
				aria-label="Create new folder"
			>
				<HugeiconsIcon icon={FolderAddIcon} className="size-3.5" />
				New folder
			</button>

			{/* Folder cards */}
			<div className="grid grid-cols-3 gap-2">
				{folders.map((folder) => (
					<FolderCard
						key={folder.id}
						folder={folder}
						assetCount={assetCountByFolder.get(folder.id) ?? 0}
						onEnter={() => onEnterFolder(folder.id)}
						onRename={(name) => onRenameFolder(folder.id, name)}
						onDelete={() => onDeleteFolder(folder.id)}
					/>
				))}
			</div>
		</div>
	);
}

function FolderCard({
	folder,
	assetCount,
	onEnter,
	onRename,
	onDelete,
}: {
	folder: MediaFolder;
	assetCount: number;
	onEnter: () => void;
	onRename: (name: string) => void;
	onDelete: () => void;
}) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(folder.name);
	const [menuOpen, setMenuOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isRenaming) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [isRenaming]);

	useEffect(() => {
		if (!menuOpen) return;
		const onClick = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};
		window.addEventListener("mousedown", onClick);
		return () => window.removeEventListener("mousedown", onClick);
	}, [menuOpen]);

	const commitRename = () => {
		const next = renameValue.trim();
		if (next && next !== folder.name) onRename(next);
		else setRenameValue(folder.name);
		setIsRenaming(false);
	};

	return (
		<div
			className={cn(
				"group relative aspect-square overflow-hidden rounded-lg border border-white/[0.08]",
				"bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.06),transparent_70%)]",
				"transition hover:border-white/15",
			)}
		>
			<button
				type="button"
				onClick={isRenaming ? undefined : onEnter}
				onDoubleClick={(event) => {
					event.preventDefault();
					setRenameValue(folder.name);
					setIsRenaming(true);
				}}
				className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center"
				aria-label={`Open ${folder.name}`}
			>
				<HugeiconsIcon
					icon={Folder01Icon}
					className="size-9 text-white/65 transition group-hover:text-white/85"
				/>
				{isRenaming ? (
					<input
						ref={inputRef}
						type="text"
						value={renameValue}
						onChange={(event) => setRenameValue(event.target.value)}
						onBlur={commitRename}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								commitRename();
							} else if (event.key === "Escape") {
								setRenameValue(folder.name);
								setIsRenaming(false);
							}
						}}
						onClick={(event) => event.stopPropagation()}
						className="w-full rounded border border-white/20 bg-black/40 px-1.5 py-0.5 text-[0.68rem] font-medium text-white focus:border-white/40 focus:outline-none"
					/>
				) : (
					<span className="line-clamp-1 w-full text-[0.7rem] font-medium text-white/85">
						{folder.name}
					</span>
				)}
				<span className="text-[0.6rem] uppercase tracking-[0.14em] text-white/35">
					{assetCount} {assetCount === 1 ? "item" : "items"}
				</span>
			</button>

			{!isRenaming && (
				<div ref={menuRef} className="absolute top-1 right-1">
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							setMenuOpen((value) => !value);
						}}
						className={cn(
							"grid size-5 place-items-center rounded text-white/35 transition",
							"hover:bg-white/[0.08] hover:text-white",
							menuOpen && "bg-white/[0.08] text-white",
						)}
						aria-label="Folder options"
					>
						<HugeiconsIcon icon={MoreVerticalIcon} className="size-3" />
					</button>
					{menuOpen && (
						<div className="absolute top-6 right-0 z-10 w-32 overflow-hidden rounded-md border border-white/10 bg-[#0a0a0c]/95 shadow-xl backdrop-blur-md">
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									setMenuOpen(false);
									setRenameValue(folder.name);
									setIsRenaming(true);
								}}
								className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-white/75 transition hover:bg-white/[0.06] hover:text-white"
							>
								<HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
								Rename
							</button>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									setMenuOpen(false);
									onDelete();
								}}
								className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-red-300/90 transition hover:bg-red-500/10 hover:text-red-200"
							>
								<HugeiconsIcon icon={Delete01Icon} className="size-3" />
								Delete
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function Breadcrumb({
	folder,
	onExit,
}: {
	folder: MediaFolder | null;
	onExit: () => void;
}) {
	return (
		<div className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[0.7rem]">
			<button
				type="button"
				onClick={onExit}
				className="rounded px-1.5 py-0.5 text-white/65 transition hover:bg-white/[0.06] hover:text-white"
			>
				Library
			</button>
			<span className="text-white/30">/</span>
			<span className="truncate font-medium text-white/90">
				{folder?.name ?? "Unknown folder"}
			</span>
		</div>
	);
}
