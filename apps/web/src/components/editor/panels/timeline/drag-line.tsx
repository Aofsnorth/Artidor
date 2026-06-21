import { getDropLineY } from "./drop-target";
import type { TimelineTrack, DropTarget } from "@/lib/timeline";
import { TIMELINE_LAYERS } from "./layers";

interface DragLineProps {
	dropTarget: DropTarget | null;
	tracks: TimelineTrack[];
	isVisible: boolean;
	headerHeight?: number;
	dragElementType?: string | null;
}

export function DragLine({
	dropTarget,
	tracks,
	isVisible,
	headerHeight = 0,
	dragElementType,
}: DragLineProps) {
	if (!isVisible || !dropTarget) return null;

	const y = getDropLineY({ dropTarget, tracks });
	const lineTop = y + headerHeight;

	const previewLabel = dragElementType === "text" ? "Text" : "Drop media";
	const centerLabel = (
		<div
			className="pointer-events-none absolute inset-0 grid place-items-center"
			style={{ zIndex: TIMELINE_LAYERS.dragLine + 1 }}
		>
			<div className="rounded-md border border-white/20 bg-black/55 px-4 py-1 text-[0.62rem] font-medium text-white/85 shadow-sm backdrop-blur-sm">
				{previewLabel}
			</div>
		</div>
	);

	if (dropTarget.isNewTrack) {
		return (
			<>
				<div
					className="pointer-events-none absolute right-3 left-3 h-10 -translate-y-1/2 rounded-lg border border-primary/60 bg-primary/5 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
					style={{ top: `${lineTop}px`, zIndex: TIMELINE_LAYERS.dragLine }}
				>
					<div className="absolute inset-1 rounded-md border border-dashed border-primary/50 bg-black/30" />
				</div>
				{centerLabel}
			</>
		);
	}

	return (
		<>
			<div
				className="bg-primary pointer-events-none absolute right-0 left-0 h-0.5"
				style={{ top: `${lineTop}px`, zIndex: TIMELINE_LAYERS.dragLine }}
			/>
			{centerLabel}
		</>
	);
}
