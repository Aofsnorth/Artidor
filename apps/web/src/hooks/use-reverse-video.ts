"use client";

import { useCallback, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { generateReversedVideo } from "@/lib/media/reverse-video";
import { processMediaAssets } from "@/lib/media/processing";
import { buildVideoElement } from "@/lib/timeline/element-utils";
import { toast } from "sonner";
import type { VideoElement } from "@/lib/timeline";

export function useReverseVideo() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isProcessing, setIsProcessing] = useState(false);

	const reverse = useCallback(async () => {
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
		if (element?.type !== "video") {
			toast.error("Selected element is not a video");
			return;
		}
		if (!("mediaId" in element) || !element.mediaId) {
			toast.error("Video has no source media");
			return;
		}

		const asset = editor.media
			.getAssets()
			.find((a) => a.id === element.mediaId);
		if (!asset) {
			toast.error("Source media not found");
			return;
		}

		const toastId = toast.loading("Reversing video...");
		setIsProcessing(true);
		try {
			const reversedFile = await generateReversedVideo({ file: asset.file });
			if (!reversedFile) {
				toast.error("Could not reverse video", { id: toastId });
				return;
			}
			const [processed] = await processMediaAssets({ files: [reversedFile] });
			if (!processed) {
				toast.error("Could not process reversed video", { id: toastId });
				return;
			}
			const stored = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!stored) {
				toast.error("Could not save reversed video", { id: toastId });
				return;
			}

			const videoElement: VideoElement = buildVideoElement({
				mediaId: stored.id,
				name: `${asset.name} (Reversed)`,
				duration: element.duration,
				startTime: element.startTime,
			}) as VideoElement;
			editor.timeline.insertElement({
				element: videoElement,
				placement: { mode: "auto" },
			});

			toast.success("Reversed video added", { id: toastId });
		} catch (error) {
			console.error("Reverse failed:", error);
			toast.error("Reverse failed", { id: toastId });
		} finally {
			setIsProcessing(false);
		}
	}, [activeProject, editor]);

	return { reverse, isProcessing };
}
