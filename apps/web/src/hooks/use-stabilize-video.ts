"use client";

import { useCallback, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import { stabilizeVideo } from "@/lib/stabilization";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { toast } from "sonner";
import type { AnimationPath } from "@/lib/animation/types";

export function useStabilizeVideo() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isProcessing, setIsProcessing] = useState(false);

	const stabilize = useCallback(async () => {
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
		if (!element || element.type !== "video") {
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

		const toastId = toast.loading("Analyzing video motion...");
		setIsProcessing(true);
		try {
			const url = URL.createObjectURL(asset.file);
			try {
				const result = await stabilizeVideo({
					videoUrl: url,
					duration: element.duration / TICKS_PER_SECOND,
				});
				if (result.frames.length === 0) {
					toast.info("Video is too short to analyze", { id: toastId });
					return;
				}
				const keyframes = result.frames.flatMap((f) => [
					{
						trackId: ref.trackId,
						elementId: ref.elementId,
						propertyPath: "transform.positionX" as AnimationPath,
						time: f.timeSeconds * TICKS_PER_SECOND,
						value: f.offsetX,
					},
					{
						trackId: ref.trackId,
						elementId: ref.elementId,
						propertyPath: "transform.positionY" as AnimationPath,
						time: f.timeSeconds * TICKS_PER_SECOND,
						value: f.offsetY,
					},
				]);
				editor.timeline.upsertKeyframes({ keyframes });
				toast.success(`Stabilized: ${result.frames.length} frames analyzed`, {
					id: toastId,
				});
			} finally {
				URL.revokeObjectURL(url);
			}
		} catch (error) {
			console.error("Stabilization failed:", error);
			toast.error("Stabilization failed", { id: toastId });
		} finally {
			setIsProcessing(false);
		}
	}, [activeProject, editor]);

	return { stabilize, isProcessing };
}
