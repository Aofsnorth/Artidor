import type { ElementType } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	ArrowRightDoubleIcon,
	ClosedCaptionIcon,
	Folder03Icon,
	Happy01Icon,
	MagicWand05Icon,
	TextIcon,
	Settings01Icon,
	SlidersHorizontalIcon,
	MotionIcon,
	SparklesIcon,
	MusicNote03Icon,
	LayoutGridIcon,
	Image01Icon,
	Plug01Icon,
	HeadphonesIcon,
	FilterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

export const TAB_KEYS = [
	"assets",
	"media",
	"text",
	"elements",
	"transitions",
	"effects",
	"overlays",
	"audio",
	"motion",
	"adjustment",
	"animations",
	"templates",
	"plugins",
	"sounds",
	"stickers",
	"quicktools",
	"filters",
	"captions",
	"settings",
] as const;

export const VISIBLE_TAB_KEYS = [
	"assets",
	"text",
	"elements",
	"transitions",
	"effects",
	"overlays",
	"audio",
	"motion",
	"adjustment",
	"templates",
	"plugins",
	"settings",
] as const satisfies readonly (typeof TAB_KEYS)[number][];

export type Tab = (typeof TAB_KEYS)[number];

const createHugeiconsIcon =
	({ icon }: { icon: IconSvgElement }) =>
	({ className }: { className?: string }) => (
		<HugeiconsIcon icon={icon} className={className} />
	);

export const tabs = {
	assets: {
		icon: createHugeiconsIcon({ icon: Folder03Icon }),
		label: "Assets",
	},
	media: {
		icon: createHugeiconsIcon({ icon: Image01Icon }),
		label: "Media",
	},
	sounds: {
		icon: createHugeiconsIcon({ icon: HeadphonesIcon }),
		label: "Sounds",
	},
	text: {
		icon: createHugeiconsIcon({ icon: TextIcon }),
		label: "Text",
	},
	elements: {
		icon: createHugeiconsIcon({ icon: Happy01Icon }),
		label: "Elements",
	},
	effects: {
		icon: createHugeiconsIcon({ icon: MagicWand05Icon }),
		label: "Effects",
	},
	transitions: {
		icon: createHugeiconsIcon({ icon: ArrowRightDoubleIcon }),
		label: "Transitions",
	},
	overlays: {
		icon: createHugeiconsIcon({ icon: LayoutGridIcon }),
		label: "Overlays",
	},
	audio: {
		icon: createHugeiconsIcon({ icon: MusicNote03Icon }),
		label: "Audio",
	},
	motion: {
		icon: createHugeiconsIcon({ icon: MotionIcon }),
		label: "Motion",
	},
	adjustment: {
		icon: createHugeiconsIcon({ icon: SlidersHorizontalIcon }),
		label: "Adjust",
	},
	animations: {
		icon: createHugeiconsIcon({ icon: MotionIcon }),
		label: "Animations",
	},
	templates: {
		icon: createHugeiconsIcon({ icon: LayoutGridIcon }),
		label: "Templates",
	},
	quicktools: {
		icon: createHugeiconsIcon({ icon: SparklesIcon }),
		label: "Tools",
	},
	plugins: {
		icon: createHugeiconsIcon({ icon: Plug01Icon }),
		label: "Plugins",
	},
	filters: {
		icon: createHugeiconsIcon({ icon: FilterIcon }),
		label: "Filters",
	},
	captions: {
		icon: createHugeiconsIcon({ icon: ClosedCaptionIcon }),
		label: "Captions",
	},
	stickers: {
		icon: createHugeiconsIcon({ icon: Happy01Icon }),
		label: "Stickers",
	},
	settings: {
		icon: createHugeiconsIcon({ icon: Settings01Icon }),
		label: "Settings",
	},
} satisfies Record<
	Tab,
	{ icon: ElementType<{ className?: string }>; label: string }
>;

export type MediaViewMode = "grid" | "list";
export type MediaSortKey = "name" | "type" | "duration" | "size";
export type MediaSortOrder = "asc" | "desc";

interface AssetsPanelStore {
	activeTab: Tab;
	setActiveTab: (tab: Tab) => void;
	highlightMediaId: string | null;
	requestRevealMedia: (mediaId: string) => void;
	clearHighlight: () => void;

	/* Media */
	mediaViewMode: MediaViewMode;
	setMediaViewMode: (mode: MediaViewMode) => void;
	mediaSortBy: MediaSortKey;
	mediaSortOrder: MediaSortOrder;
	setMediaSort: (key: MediaSortKey, order: MediaSortOrder) => void;
}

export const useAssetsPanelStore = create<AssetsPanelStore>()(
	persist(
		(set) => ({
			activeTab: "assets",
			setActiveTab: (tab) => set({ activeTab: tab }),
			highlightMediaId: null,
			requestRevealMedia: (mediaId) =>
				set({ activeTab: "assets", highlightMediaId: mediaId }),
			clearHighlight: () => set({ highlightMediaId: null }),
			mediaViewMode: "grid",
			setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
			mediaSortBy: "name",
			mediaSortOrder: "asc",
			setMediaSort: (key, order) =>
				set({ mediaSortBy: key, mediaSortOrder: order }),
		}),
		{
			name: "assets-panel",
			partialize: (state) => ({
				mediaViewMode: state.mediaViewMode,
				mediaSortBy: state.mediaSortBy,
				mediaSortOrder: state.mediaSortOrder,
			}),
		},
	),
);
