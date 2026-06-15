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
import { TextFontIcon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";

interface RenameElementDialogProps {
	open: boolean;
	trackId: string;
	elementId: string;
	/** Current custom name (empty = using the derived name). */
	currentCustomName?: string;
	/** The name shown when no custom name is set (media filename, text, etc.). */
	derivedName: string;
	maxLength?: number;
	onOpenChange: (open: boolean) => void;
}

/**
 * Rename a single timeline element. Writes `customName` through the standard
 * updateElements command, so the rename is undoable and persists with the
 * project. Submitting an empty field clears the custom name and falls back to
 * the auto-derived label (media filename / text content / effect type).
 *
 * Renaming a clip never touches the underlying media asset's name — two clips
 * of the same source can carry different labels, matching Premiere's
 * clip-name-vs-source-name model.
 */
export function RenameElementDialog({
	open,
	trackId,
	elementId,
	currentCustomName = "",
	derivedName,
	maxLength = 60,
	onOpenChange,
}: RenameElementDialogProps) {
	const editor = useEditor();
	const [name, setName] = useState(currentCustomName);

	// Reset the field every time the dialog opens so a cancelled edit doesn't
	// leak its in-progress value into the next open.
	useEffect(() => {
		if (open) {
			setName(currentCustomName);
		}
	}, [open, currentCustomName]);

	const applyName = (nextCustomName: string | undefined) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId,
					patch: { customName: nextCustomName },
				},
			],
		});
		onOpenChange(false);
	};

	const handleSubmit = (event?: React.FormEvent) => {
		event?.preventDefault();
		const trimmed = name.trim().slice(0, maxLength);
		applyName(trimmed.length > 0 ? trimmed : undefined);
	};

	const handleReset = () => {
		setName("");
		applyName(undefined);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="overflow-hidden border-white/[0.06] bg-gradient-to-b from-[#0e0e10] to-[#08080a] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-[380px] p-0"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="relative px-5 pt-5 pb-3">
					<div className="pointer-events-none absolute -top-10 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-white/[0.03] blur-2xl" />

					<DialogHeader className="gap-3">
						<div className="flex items-center gap-3">
							<div className="relative grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
								<div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent" />
								<HugeiconsIcon
									icon={TextFontIcon}
									className="relative z-10 size-4 text-white/80"
								/>
							</div>
							<div className="flex flex-col gap-0.5">
								<DialogTitle className="text-[0.9rem] font-semibold tracking-tight text-white/95">
									Rename clip
								</DialogTitle>
								<DialogDescription className="text-[0.72rem] text-white/40">
									Give this clip a custom label on the timeline
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="rename-element-input"
							className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-white/35"
						>
							Name
						</label>
						<Input
							id="rename-element-input"
							type="text"
							value={name}
							maxLength={maxLength}
							placeholder={derivedName}
							autoFocus
							autoComplete="off"
							onChange={(event) => setName(event.target.value)}
							className="h-10 rounded-lg border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/90 placeholder:text-white/25 focus:border-white/[0.15] focus:bg-white/[0.04] focus:ring-1 focus:ring-white/[0.08] transition-all"
						/>
						<p className="text-[0.66rem] text-white/30">
							Leave empty to use the default name.
						</p>
					</div>

					<DialogFooter className="flex-row justify-between gap-2 pt-1 border-t-0 p-0 sm:justify-between">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleReset}
							className="h-8 px-3 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
						>
							Reset to default
						</Button>
						<div className="flex gap-2">
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
								className="h-8 px-4 text-xs font-medium bg-white/95 text-[#09090b] hover:bg-white shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all"
							>
								Save
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
