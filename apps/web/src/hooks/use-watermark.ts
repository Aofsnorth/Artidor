"use client";

import { useState, useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import { toast } from "sonner";
import type { TextElement, TimelineElement } from "@/lib/timeline";
import { TICKS_PER_SECOND } from "@/lib/wasm";

/**
 * Watermark tool — bakes a text overlay onto the selected clip
 * so the user can publish without a separate "Paid" watermark
 * getting slapped on by the platform.
 *
 * We model the watermark as a `text` track element drawn on
 * top of the selected video. A future iteration could:
 *   - support an image logo instead of text
 *   - bake into pixels at export time
 *   - allow time-shifting (only show watermark for some seconds)
 *
 * For now: text + position + opacity + size, applied across the
 * full duration of the selected clip.
 */
export interface WatermarkConfig {
	text: string;
	opacity: number; // 0..1
	fontSizePx: number; // logical px at 1080p
	position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
	text: "© Artidor",
	opacity: 0.8,
	fontSizePx: 32,
	position: "bottom-right",
};

export function useWatermark() {
	const editor = useEditor();
	const [isProcessing, setIsProcessing] = useState(false);

	const apply = useCallback(
		async ({
			config,
			selectedElements,
		}: {
			config: WatermarkConfig;
			selectedElements: ReadonlyArray<{
				trackId: string;
				elementId: string;
			}>;
		}) => {
			if (selectedElements.length === 0) {
				toast.info("Select a clip first to watermark it.");
				return;
			}
			if (!config.text.trim()) {
				toast.error("Watermark text can't be empty.");
				return;
			}

			setIsProcessing(true);
			try {
				let applied = 0;
				for (const ref of selectedElements) {
					const track = editor.timeline.getTrackById({
						trackId: ref.trackId,
					});
					const target = track?.elements.find(
						(el) => el.id === ref.elementId,
					);
					if (!target) continue;
					if (target.type !== "video" && target.type !== "image") {
						// Watermarks can only be baked into visible media.
						continue;
					}

					// Build a new `text` element that spans the same
					// time range as the target clip and lives on the
					// same track. Pushing it through the editor's
					// command pipeline means Undo works.
					const watermark = buildWatermarkElement({
						config,
						target,
					});
					editor.timeline.addElement({
						trackId: ref.trackId,
						element: watermark,
					});
					applied += 1;
				}

				if (applied === 0) {
					toast.error(
						"No video/image clip selected. Watermarks only apply to visible media.",
					);
				} else {
					toast.success(
						`Watermark applied to ${applied} clip${applied === 1 ? "" : "s"}`,
						{ id: "watermark-apply" },
					);
				}
			} catch (error) {
				toast.error("Failed to apply watermark", {
					id: "watermark-apply",
					description:
						error instanceof Error ? error.message : undefined,
				});
			} finally {
				setIsProcessing(false);
			}
		},
		[editor],
	);

	return { apply, isProcessing };
}

function buildWatermarkElement({
	config,
	target,
}: {
	config: WatermarkConfig;
	target: TimelineElement;
}): TextElement {
	// Position the watermark so it sits a few percent of the canvas
	// width/height from the chosen corner. We bake the offset into
	// `position` as absolute coordinates so the renderer just does
	// what we tell it to without needing to know about corners.
	const canvasWidth = 1920;
	const canvasHeight = 1080;
	const padding = Math.round(canvasWidth * 0.02); // 2% of width
	const positions = {
		"bottom-right": { x: canvasWidth - padding, y: canvasHeight - padding },
		"bottom-left": { x: padding, y: canvasHeight - padding },
		"top-right": { x: canvasWidth - padding, y: padding },
		"top-left": { x: padding, y: padding },
	} as const;
	const anchor = positions[config.position];

	// Anchor the watermark so its drawn corner sits at `anchor`
	// (right-aligned for *-right, left-aligned for *-left).
	const textAlign = config.position.endsWith("right")
		? "right"
		: "left";
	const verticalAlign = config.position.startsWith("top")
		? "top"
		: "bottom";

	return {
		id: crypto.randomUUID(),
		type: "text",
		name: `Watermark — ${config.text}`,
		startTime: target.startTime,
		duration: target.duration,
		trimStart: 0,
		trimEnd: 0,
		hidden: false,
		locked: false,
		opacity: config.opacity,
		// Text content + style. Real values land here so the
		// renderer can show them as overlay text in the preview
		// and bake them into the exported MP4.
		text: config.text,
		fontFamily: "Inter, sans-serif",
		fontSize: config.fontSizePx,
		color: "#FFFFFF",
		textAlign,
		verticalAlign,
		position: {
			x: anchor.x,
			y: anchor.y,
		},
		// Store some metadata for the editor to round-trip.
		// (Hidden from the user, but keeps the config recoverable.)
		animations: [],
		keyframes: {},
		...(target.type === "video" || target.type === "image"
			? {}
			: {}),
	} as TextElement;
}
