import { useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import { captureFrameFromVideo, ticksToSeconds } from "@/lib/media/frame-capture";
import { processMediaAssets } from "@/lib/media/processing";
import { buildImageElement } from "@/lib/timeline/element-utils";
import { toast } from "sonner";

export function useFreezeFrame() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	return useCallback(async () => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		const selected = editor.selection.getSelectedElements();
		if (selected.length !== 1) {
			toast.error("Select a single video clip first");
			return;
		}
		const ref = selected[0];
		if (!ref) {
			toast.error("Select a single video clip first");
			return;
		}
		const track = editor.timeline.getTrackById({ trackId: ref.trackId });
		const element = track?.elements.find((el) => el.id === ref.elementId);
		if (!element) {
			toast.error("Selected element not found");
			return;
		}
		if (element.type !== "video") {
			toast.error("Freeze frame only works on video clips");
			return;
		}
		if (!("mediaId" in element) || !element.mediaId) {
			toast.error("Clip has no source media");
			return;
		}

		const asset = editor.media.getAssets().find((a) => a.id === element.mediaId);
		if (!asset) {
			toast.error("Source media not found");
			return;
		}

		const playhead = editor.playback.getCurrentTime();
		const clipRelativeTime = Math.max(
			0,
			Math.min(
				playhead - element.startTime + element.trimStart,
				element.duration - 1,
			),
		);
		const timeSeconds = ticksToSeconds({ ticks: clipRelativeTime });

		const toastId = toast.loading("Capturing frame...");
		try {
			const frame = await captureFrameFromVideo({
				file: asset.file,
				timeSeconds,
				fileName: `${asset.name}-freeze.png`,
			});
			if (!frame) {
				toast.error("Could not capture frame", { id: toastId });
				return;
			}

			const file = new File([frame.blob], frame.fileName, { type: "image/png" });
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) {
				toast.error("Could not process captured frame", { id: toastId });
				return;
			}
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!stored) {
				toast.error("Could not save frame", { id: toastId });
				return;
			}

			const imageElement = buildImageElement({
				mediaId: stored.id,
				name: stored.name,
				duration: element.duration,
				startTime: element.startTime,
			});
			editor.timeline.insertElement({
				element: imageElement,
				placement: { mode: "auto" },
			});

			toast.success("Freeze frame inserted", { id: toastId });
		} catch (error) {
			console.error("Freeze frame failed:", error);
			toast.error(
				error instanceof Error ? error.message : "Could not freeze frame",
				{ id: toastId },
			);
		}
	}, [editor, activeProject]);
}
