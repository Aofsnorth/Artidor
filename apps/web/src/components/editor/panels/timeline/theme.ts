import type { TrackType } from "@/lib/timeline";

export const TIMELINE_TRACK_THEME: Record<
	Exclude<TrackType, "audio">,
	{ elementClassName: string; waveformColor?: string }
> & {
	audio: {
		variants: {
			elementClassName: string;
			waveformColor: string;
			beatColor: string;
		}[];
	};
} = {
	video: { elementClassName: "transparent" },
	text: { elementClassName: "bg-[#4c2d78]/90 border border-[#9a73ff]/45" },
	audio: {
		variants: [
			{
				elementClassName:
					"bg-linear-to-br from-[#0b0b0d]/98 via-[#151517]/96 to-[#050506]/98 border border-white/25",
				waveformColor: "rgba(255, 255, 255, 0.52)",
				beatColor: "rgba(255, 255, 255, 1)",
			},
			{
				elementClassName:
					"bg-linear-to-br from-[#111113]/98 via-[#1a1a1d]/96 to-[#060607]/98 border border-white/20",
				waveformColor: "rgba(255, 255, 255, 0.45)",
				beatColor: "rgba(255, 255, 255, 1)",
			},
		],
	},
	graphic: { elementClassName: "bg-[#053b4a]/90 border border-[#52d8ff]/35" },
	effect: { elementClassName: "bg-[#3a2867]/90 border border-[#b28cff]/35" },
	image: { elementClassName: "bg-[#0b3a36]/90 border border-[#5fe6c4]/35" },
	camera: { elementClassName: "bg-[#881337]/90 border border-[#fda4af]/35" },
} as const;

export const SELECTED_TRACK_ROW_CLASS =
	"border-white/[0.18] bg-white/[0.065] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_34px_rgba(0,0,0,0.28)]";
export const DEFAULT_TIMELINE_BOOKMARK_COLOR = "#ffffff";

/**
 * Curated color presets for custom track colors. The user picks from these
 * in a compact swatch row inside the track-label popover.
 */
export const TRACK_COLOR_PRESETS: string[] = [
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#06b6d4", // cyan
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#f43f5e", // rose
	"#ffffff", // white (reset to default)
];

/** Derive accent/accentSoft from an arbitrary hex color. */
export function customColorToAccent(color: string): {
	accent: string;
	accentSoft: string;
} {
	// Parse hex to rgb
	const hex = color.replace("#", "");
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	return {
		accent: `rgba(${r}, ${g}, ${b}, 0.95)`,
		accentSoft: `rgba(${r}, ${g}, ${b}, 0.18)`,
	};
}

export const GROUP_COLORS: string[] = [
	"#f97316", // orange
	"#22c55e", // green
	"#3b82f6", // blue
	"#ec4899", // pink
	"#eab308", // yellow
	"#8b5cf6", // violet
	"#06b6d4", // cyan
	"#ef4444", // red
];

export function getGroupColor(groupId?: string): string | null {
	if (!groupId) return null;
	let hash = 0;
	for (let i = 0; i < groupId.length; i++) {
		hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % GROUP_COLORS.length;
	return GROUP_COLORS[index];
}

/**
 * Accent palette per track type. Used for the "fx" badge, track label dot,
 * and the top accent stripe inside clip cards. Pairs with the gradient
 * backgrounds in TIMELINE_TRACK_THEME so the visual identity matches.
 */
export const TRACK_TYPE_PALETTE: Record<
	TrackType,
	{ accent: string; accentSoft: string; badgeBg: string; badgeText: string }
> = {
	video: {
		accent: "rgba(96, 165, 250, 0.95)",
		accentSoft: "rgba(96, 165, 250, 0.18)",
		badgeBg: "rgba(96, 165, 250, 0.18)",
		badgeText: "rgba(191, 219, 254, 1)",
	},
	text: {
		accent: "rgba(168, 132, 255, 0.95)",
		accentSoft: "rgba(168, 132, 255, 0.18)",
		badgeBg: "rgba(168, 132, 255, 0.18)",
		badgeText: "rgba(221, 214, 254, 1)",
	},
	audio: {
		accent: "rgba(255, 255, 255, 0.95)",
		accentSoft: "rgba(255, 255, 255, 0.16)",
		badgeBg: "rgba(255, 255, 255, 0.16)",
		badgeText: "rgba(255, 255, 255, 0.92)",
	},
	graphic: {
		accent: "rgba(82, 216, 255, 0.95)",
		accentSoft: "rgba(82, 216, 255, 0.18)",
		badgeBg: "rgba(82, 216, 255, 0.18)",
		badgeText: "rgba(186, 230, 253, 1)",
	},
	effect: {
		accent: "rgba(178, 140, 255, 0.95)",
		accentSoft: "rgba(178, 140, 255, 0.18)",
		badgeBg: "rgba(178, 140, 255, 0.18)",
		badgeText: "rgba(221, 214, 254, 1)",
	},
	image: {
		accent: "rgba(95, 230, 196, 0.95)",
		accentSoft: "rgba(95, 230, 196, 0.18)",
		badgeBg: "rgba(95, 230, 196, 0.18)",
		badgeText: "rgba(204, 251, 241, 1)",
	},
	camera: {
		accent: "rgba(244, 63, 94, 0.95)",
		accentSoft: "rgba(244, 63, 94, 0.18)",
		badgeBg: "rgba(244, 63, 94, 0.18)",
		badgeText: "rgba(254, 205, 211, 1)",
	},
};

/**
 * Audio tracks stay monochrome so beat visualizers read as black/white instead
 * of duplicating the old green/cyan music track language.
 */
export const AUDIO_VARIANT_ACCENT: Array<{
	accent: string;
	accentSoft: string;
}> = [
	{
		accent: "rgba(255, 255, 255, 0.95)",
		accentSoft: "rgba(255, 255, 255, 0.16)",
	},
	{
		accent: "rgba(210, 210, 215, 0.9)",
		accentSoft: "rgba(255, 255, 255, 0.11)",
	},
];

export function getTrackTypeAccent({
	type,
	trackIndex = 0,
	customColor,
}: {
	type: TrackType;
	trackIndex?: number;
	customColor?: string;
}): { accent: string; accentSoft: string } {
	if (customColor) {
		return customColorToAccent(customColor);
	}
	if (type === "audio") {
		return AUDIO_VARIANT_ACCENT[
			Math.max(0, trackIndex) % AUDIO_VARIANT_ACCENT.length
		];
	}
	const palette = TRACK_TYPE_PALETTE[type];
	return { accent: palette.accent, accentSoft: palette.accentSoft };
}

export function getTimelineElementClassName({
	type,
	trackIndex = 0,
}: {
	type: TrackType;
	trackIndex?: number;
}): string {
	if (type === "audio") {
		const variant =
			TIMELINE_TRACK_THEME.audio.variants[
				trackIndex % TIMELINE_TRACK_THEME.audio.variants.length
			];
		return variant.elementClassName.trim();
	}
	return TIMELINE_TRACK_THEME[type].elementClassName.trim();
}
