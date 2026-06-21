import { getDropLineY } from "./drop-target";
import type { TimelineTrack, DropTarget } from "@/lib/timeline";
import { TIMELINE_LAYERS } from "./layers";

interface DragLineProps {
	dropTarget: DropTarget | null;
	tracks: TimelineTrack[];
	isVisible: boolean;
	headerHeight?: number;
	dragElementType?: string | null;
	elementDuration?: number;
	xPosition?: number;
}

export function DragLine({
	dropTarget,
	tracks,
	isVisible,
	headerHeight = 0,
	dragElementType,
	elementDuration,
	xPosition,
}: DragLineProps) {
	if (!isVisible || !dropTarget) return null;

	const y = getDropLineY({ dropTarget, tracks });
	const lineTop = y + headerHeight;

	if (dropTarget.isNewTrack) {
		const previewWidth = elementDuration ? Math.max(60, elementDuration * 0.5) : 120;
		const previewLeft = xPosition ? Math.max(12, xPosition * 0.5) : 12;
		const previewLabel = dragElementType === "audio" ? "Audio" : dragElementType === "text" ? "Text" : dragElementType === "image" ? "Image" : dragElementType === "video" ? "Video" : "Clip";

		return (
			<div
				className="pointer-events-none absolute right-3 left-3 h-10 -translate-y-1/2 rounded-lg border border-primary/60 bg-primary/5 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition-all duration-200"
				style={{ top: `${lineTop}px`, zIndex: TIMELINE_LAYERS.dragLine }}
			>
				<div className="absolute inset-1 rounded-md border border-dashed border-primary/50 bg-black/30" />
				<div
					className="absolute top-1/2 -translate-y-1/2 rounded-md border border-white/20 bg-white/10 px-3 py-1 text-[0.62rem] font-medium text-white/80 shadow-sm backdrop-blur-sm"
					style={{ left: `${previewLeft}px`, width: `${previewWidth}px` }}
				>
					<div className="truncate">{previewLabel}</div>
				</div>
				<div className="absolute left-3 top-1/2 -translate-y-1/2 rounded bg-black/60 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-primary/90">
					New track
				</div>
			</div>
		);
	}

	return (
		<div
			className="bg-primary pointer-events-none absolute right-0 left-0 h-0.5"
			style={{ top: `${lineTop}px`, zIndex: TIMELINE_LAYERS.dragLine }}
		/>
	);
}
