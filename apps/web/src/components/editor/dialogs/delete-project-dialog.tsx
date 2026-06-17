import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/stores/settings-store";

const CONFIRM_WORD = "DELETE";

export function DeleteProjectDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	projectNames,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	projectNames: string[];
}) {
	const count = projectNames.length;
	const isSingle = count === 1;
	const singleName = isSingle ? projectNames[0] : null;

	const skipDeleteConfirm = useSettingsStore((s) => s.skipDeleteConfirm);
	const [confirmText, setConfirmText] = useState("");
	const canDelete = skipDeleteConfirm || confirmText.trim().toUpperCase() === CONFIRM_WORD;

	// Clear the field whenever the dialog opens/closes so a stale "DELETE"
	// can't carry over into the next confirmation.
	useEffect(() => {
		if (!isOpen) setConfirmText("");
	}, [isOpen]);

	const handleConfirm = () => {
		if (!canDelete) return;
		onConfirm();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<DialogHeader>
					<DialogTitle>
						{singleName ? (
							<>
								{"Delete '"}
								<span className="inline-block max-w-[300px] truncate align-bottom">
									{singleName}
								</span>
								{"'?"}
							</>
						) : (
							`Delete ${count} projects?`
						)}
					</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Alert variant="destructive">
						<AlertTitle>Warning</AlertTitle>
						<AlertDescription>
							This will permanently delete{" "}
							{singleName ? `"${singleName}"` : `${count} projects`} and all
							associated files.
						</AlertDescription>
					</Alert>
					<div className="flex flex-col gap-3">
						{skipDeleteConfirm ? (
							<p className="text-xs text-slate-400">
								Click <span className="font-semibold text-slate-200">Delete</span>{" "}
								to permanently remove{" "}
								{singleName ? `"${singleName}"` : `${count} projects`}.
							</p>
						) : (
							<>
								<Label className="text-xs font-semibold text-slate-500">
									Type "DELETE" to confirm
								</Label>
								<Input
									type="text"
									placeholder="DELETE"
									size="lg"
									variant="destructive"
									value={confirmText}
									onChange={(event) => setConfirmText(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											handleConfirm();
										}
									}}
									autoFocus
								/>
							</>
						)}
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!canDelete}
					>
						Delete {isSingle ? "project" : `${count} projects`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
