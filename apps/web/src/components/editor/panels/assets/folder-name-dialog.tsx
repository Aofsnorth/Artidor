"use client";

import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder01Icon } from "@hugeicons/core-free-icons";

interface FolderNameDialogProps {
	open: boolean;
	mode: "create" | "rename";
	initialName?: string;
	// Limit so folder names don't overflow the asset panel grid cards.
	maxLength?: number;
	onOpenChange: (open: boolean) => void;
	onSubmit: (name: string) => void;
}

/**
 * Custom modal dialog for naming / renaming a folder. We deliberately
 * avoid `window.prompt()` here:
 *
 * 1. The browser-native dialog inherits the OS theme and looks out of
 *    place inside a dark-mode video editor.
 * 2. It can't be styled, can't autofocus the input, and is not
 *    keyboard-aware (no Enter-to-submit shortcut that maps to the
 *    app's design language).
 * 3. It's a sync DOM blocking call that throws the dev server's
 *    HMR for a loop on some browsers.
 */
export function FolderNameDialog({
	open,
	mode,
	initialName = "",
	maxLength = 40,
	onOpenChange,
	onSubmit,
}: FolderNameDialogProps) {
	const [name, setName] = useState(initialName);
	const [error, setError] = useState<string | null>(null);

	// Reset the field every time the dialog opens. Without this, a
	// user who renames, cancels, then reopens would see the previous
	// name pre-filled (or worse, the in-progress mid-typing value).
	useEffect(() => {
		if (open) {
			setName(initialName);
			setError(null);
		}
	}, [open, initialName]);

	const handleSubmit = (event?: React.FormEvent) => {
		event?.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			setError("Folder name can't be empty.");
			return;
		}
		if (trimmed.length > maxLength) {
			setError(`Folder name must be ${maxLength} characters or fewer.`);
			return;
		}
		onSubmit(trimmed);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="overflow-hidden border-white/[0.06] bg-gradient-to-b from-[#0e0e10] to-[#08080a] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-[380px] p-0"
				onClick={(event) => event.stopPropagation()}
			>
				{/* Header with ambient glow */}
				<div className="relative px-5 pt-5 pb-3">
					{/* Subtle ambient light streak */}
					<div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-white/[0.03] blur-2xl" />

					<DialogHeader className="gap-3">
						<div className="flex items-center gap-3">
							<div className="relative grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
								<div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent" />
								<HugeiconsIcon
									icon={Folder01Icon}
									className="relative z-10 size-4 text-white/80"
								/>
							</div>
							<div className="flex flex-col gap-0.5">
								<DialogTitle className="text-[0.9rem] font-semibold tracking-tight text-white/95">
									{mode === "create" ? "New folder" : "Rename folder"}
								</DialogTitle>
								<DialogDescription className="text-[0.72rem] text-white/40">
									{mode === "create"
										? "Organize your media library"
										: "Pick a new name for this folder"}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
				</div>

				{/* Form body */}
				<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="folder-name-input"
							className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-white/35"
						>
							Name
						</label>
						<Input
							id="folder-name-input"
							type="text"
							value={name}
							maxLength={maxLength}
							placeholder="Untitled folder"
							autoFocus
							autoComplete="off"
							onChange={(event) => {
								setName(event.target.value);
								if (error) setError(null);
							}}
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "folder-name-error" : undefined}
							className="h-10 rounded-lg border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/90 placeholder:text-white/25 focus:border-white/[0.15] focus:bg-white/[0.04] focus:ring-1 focus:ring-white/[0.08] transition-all"
						/>
						{error && (
							<p
								id="folder-name-error"
								role="alert"
								className="text-[0.68rem] text-red-400/80"
							>
								{error}
							</p>
						)}
					</div>

					<DialogFooter className="flex-row justify-end gap-2 pt-1 border-t-0 p-0 sm:justify-end">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="h-8 px-3 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!name.trim()}
							className="h-8 px-4 text-xs font-medium bg-white/95 text-[#09090b] hover:bg-white shadow-[0_0_12px_rgba(255,255,255,0.08)] disabled:opacity-30 disabled:shadow-none transition-all"
						>
							{mode === "create" ? "Create" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
