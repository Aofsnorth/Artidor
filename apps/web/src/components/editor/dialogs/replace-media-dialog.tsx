import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { useRef, useState } from "react";
import { processMediaAssets } from "@/lib/media/processing";
import { useEditor } from "@/hooks/use-editor";
import { toast } from "sonner";

export function ReplaceMediaDialog({
	isOpen,
	onOpenChange,
	trackId,
	elementId,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	trackId: string;
	elementId: string;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	const handleConfirm = async ({ file }: { file: File }) => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		setBusy(true);
		try {
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) {
				toast.error("Could not process file");
				return;
			}
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!stored) {
				toast.error("Could not save media");
				return;
			}

			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId,
						patch: { mediaId: stored.id, name: stored.name },
					},
				],
			});
			toast.success("Media replaced");
			onOpenChange(false);
		} catch (error) {
			console.error("Replace media failed:", error);
			toast.error(
				error instanceof Error ? error.message : "Could not replace media",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Replace media</DialogTitle>
				</DialogHeader>
				<DialogBody className="gap-3">
					<p className="text-muted-foreground text-sm">
						Pick a new file of the same type (video, audio, or image). The
						clip&apos;s timing and effects stay the same.
					</p>
					<div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6">
						<HugeiconsIcon
							icon={Video01Icon}
							size={32}
							className="text-muted-foreground"
						/>
						<Button
							variant="outline"
							type="button"
							disabled={busy}
							onClick={() => fileInputRef.current?.click()}
						>
							<HugeiconsIcon icon={CloudUploadIcon} className="mr-1.5" />
							{busy ? "Processing..." : "Choose file"}
						</Button>
						<p className="text-muted-foreground text-xs">
							MP4, MOV, MP3, WAV, PNG, JPG...
						</p>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,video/*,audio/*"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (event.target) event.target.value = "";
							if (file) void handleConfirm({ file });
						}}
					/>
				</DialogBody>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onOpenChange(false);
						}}
					>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
