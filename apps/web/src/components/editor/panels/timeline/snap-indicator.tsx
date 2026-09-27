"use client";

import { usePanelStore } from "@/stores/panel-store";
import { useSnapIndicatorPosition } from "@/hooks/timeline/use-snap-indicator-position";
import type { SnapPoint } from "@/lib/timeline/snap-utils";
import {
	getCenteredLineLeft,
	TIMELINE_INDICATOR_LINE_WIDTH_PX,
} from "@/lib/timeline";
import { TIMELINE_LAYERS } from "./layers";

interface SnapIndicatorProps {
	snapPoint: SnapPoint | null;
	zoomLevel: number;
	isVisible: boolean;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

/** Shared with the keyframe diamonds so the guide reads as one visual language. */
const DIAMOND_CLASS =
	"block size-3.5 transform-[scaleX(0.6)_rotate(45deg)] rounded-xs border border-black/80 bg-linear-to-br from-white to-zinc-300 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_1px_2px_rgba(0,0,0,0.55)]";

export function SnapIndicator({
	snapPoint,
	zoomLevel,
	isVisible,
	timelineRef,
	tracksScrollRef,
}: SnapIndicatorProps) {
	const trackLabelsWidth = usePanelStore((s) => s.trackLabelsWidth);
	const { leftPosition, topPosition, height } = useSnapIndicatorPosition({
		snapPoint,
		zoomLevel,
		timelineRef,
		tracksScrollRef,
		trackLabelsWidth,
		isVisible,
	});

	if (!isVisible || !snapPoint) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: `${getCenteredLineLeft({ centerPixel: leftPosition })}px`,
				top: topPosition,
				height: `${height}px`,
				width: `${TIMELINE_INDICATOR_LINE_WIDTH_PX}px`,
				zIndex: TIMELINE_LAYERS.snapIndicator,
			}}
		>
			{/* Core: a crisp 1px line with a soft halo, so an active magnet reads
			    instantly against clip borders and the ruler. Pure CSS — no work
			    per frame, and the halo is painted by the compositor. */}
			<div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary shadow-[0_0_7px_1px_rgba(255,255,255,0.35)]" />

			{/* Diamond caps, matching the keyframe markers: they tell the user
			    the guide is latched rather than a stray playhead ghost. */}
			<div className="absolute -top-1 left-1/2 -translate-x-1/2">
				<div className={DIAMOND_CLASS} />
			</div>
			<div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
				<div className={DIAMOND_CLASS} />
			</div>
		</div>
	);
}
