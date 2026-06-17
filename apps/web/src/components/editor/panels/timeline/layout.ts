import type { TrackType } from "@/lib/timeline";

export const TIMELINE_TRACK_HEIGHTS_PX: Record<TrackType, number> = {
	video: 64,
	text: 44,
	audio: 50,
	graphic: 44,
	effect: 44,
	image: 50,
} as const;

export const KEYFRAME_LANE_HEIGHT_PX = 20;
export const KEYFRAME_DIAMOND_SIZE_PX = 14;
export const EXPANDED_GROUP_HEADER_HEIGHT_PX = 18;

export const TIMELINE_TRACK_GAP_PX = 4;
export const TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX = 230;
export const TIMELINE_RULER_HEIGHT_PX = 22;
export const TIMELINE_BOOKMARK_ROW_HEIGHT_PX = 16;
export const TIMELINE_SCROLLBAR_SIZE_PX = 12;
export const TIMELINE_CONTENT_TOP_PADDING_PX = 2;
// The ruler/track content area gets a small left inset so the
// `00:00:00` label and the first clip's left edge don't sit
// flush against the divider line. Prevents the labels from looking
// glued to the track-labels column.
export const TIMELINE_CONTENT_LEFT_INSET_PX = 8;
