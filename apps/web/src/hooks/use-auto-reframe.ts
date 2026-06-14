"use client";

import { useCallback, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import {
	computeReframeFrames,
	reframeFramesToKeyframes,
} from "@/lib/auto-reframe/index-impl";
import { detectSubjectCenter } from "@/lib/auto-reframe/detection";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { toast } from "sonner";
import type { TCanvasSize } from "@/lib/project/types";
import type { VideoElement } from "@/lib/timeline";
import type { AnimationPath, } from "@/lib/animation/types";

export function useAutoReframe() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isProcessing, setIsProcessing] = useState(false);

	const reframe = useCallback(
		async ({
			targetSize,
		}: {
			targetSize: TCanvasSize;
		}) => {
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
			const element = track?.elements.find((el) => el.id === ref.elementId) as
				| VideoElement
				| undefined;
			if (!element || element.type !== "video") {
				toast.error("Selected element is not a video");
				return;
			}
			if (!("mediaId" in element) || !element.mediaId) {
				toast.error("Video has no source media");
				return;
			}

			const asset = editor.media.getAssets().find((a) => a.id === element.mediaId);
			if (!asset) {
				toast.error("Source media not found");
				return;
			}

			const toastId = toast.loading("Detecting subject...");
			setIsProcessing(true);
			try {
				const url = URL.createObjectURL(asset.file);
				try {
					const frames = await detectSubjectCenter({
						videoUrl: url,
						duration: element.duration / TICKS_PER_SECOND,
					});
					if (frames.length === 0) {
						toast.info("No subject detected", { id: toastId });
						return;
					}
					const reframes = computeReframeFrames({
						frames,
						options: {
							sourceSize: { width: asset.width ?? 1920, height: asset.height ?? 1080 },
							targetSize,
							padding: 0.1,
							smoothing: 0.5,
							easing: "ease-in-out",
						},
					});
					const reframeKeyframes = reframeFramesToKeyframes({
						reframes,
						canvasHeight: activeProject.settings.canvasSize.height,
					});
					const keyframes = reframeKeyframes.flatMap((k) => [
						{
							trackId: ref.trackId,
							elementId: ref.elementId,
							propertyPath: "transform.positionX" as AnimationPath,
							time: k.timeSeconds * TICKS_PER_SECOND,
							value: k.positionX,
						},
						{
							trackId: ref.trackId,
							elementId: ref.elementId,
							propertyPath: "transform.positionY" as AnimationPath,
							time: k.timeSeconds * TICKS_PER_SECOND,
							value: k.positionY,
						},
					]);
					editor.timeline.upsertKeyframes({ keyframes });
					toast.success(
						`Auto reframe applied: ${frames.length} frames`,
						{ id: toastId },
					);
				} finally {
					URL.revokeObjectURL(url);
				}
			} catch (error) {
				console.error("Auto reframe failed:", error);
				toast.error("Auto reframe failed", { id: toastId });
			} finally {
				setIsProcessing(false);
			}
		},
		[activeProject, editor],
	);

	return { reframe, isProcessing };
}
