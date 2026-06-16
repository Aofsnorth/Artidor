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
	AiBrain01Icon,
	SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

export const TAB_KEYS = [
	"assets",
	"ai",
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
	"scripting",
	"settings",
] as const;

export const VISIBLE_TAB_KEYS = [
	"assets",
	"ai",
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
	"scripting",
	"settings",
] as const satisfies readonly (typeof TAB_KEYS)[number][];

export type Tab = (typeof TAB_KEYS)[number];

const createHugeiconsIcon =
	({ icon }: { icon: IconSvgElement }) =>
	({ className }: { className?: string }) => (
		<HugeiconsIcon icon={icon} className={className} />
	);

export const tabs = {
	ai: {
		icon: createHugeiconsIcon({ icon: AiBrain01Icon }),
		label: "AI Edit",
	},
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
	scripting: {
		icon: createHugeiconsIcon({ icon: SourceCodeIcon }),
		label: "Scripting",
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

/**
 * Bounds for the user-resizable asset card size. The lower bound keeps
 * thumbnails recognisable on small panels; the upper bound prevents a
 * single card from filling the whole assets panel. 96px matches the
 * historical default for most of the asset grids (effects, transitions,
 * animations, filters, adjustments) and 120px was the special-case value
 * for templates and text — we now let the user pick a single value
 * that the CSS grid `minmax(...)` honours uniformly.
 */
export const ASSET_CARD_SIZE_MIN_PX = 64;
export const ASSET_CARD_SIZE_MAX_PX = 220;
export const ASSET_CARD_SIZE_DEFAULT_PX = 96;

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

	/* Asset card size (the minimum width each grid item will accept before
	   wrapping). The value is clamped to ASSET_CARD_SIZE_MIN_PX .. MAX. */
	assetCardSize: number;
	setAssetCardSize: (sizePx: number) => void;
	resetAssetCardSize: () => void;
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

			assetCardSize: ASSET_CARD_SIZE_DEFAULT_PX,
			setAssetCardSize: (sizePx) => {
				// Clamp at the store boundary so consumers can rely on the
				// value being in-range even if a stray slider goes wild.
				const clamped = Math.max(
					ASSET_CARD_SIZE_MIN_PX,
					Math.min(ASSET_CARD_SIZE_MAX_PX, Math.round(sizePx)),
				);
				set({ assetCardSize: clamped });
			},
			resetAssetCardSize: () =>
				set({ assetCardSize: ASSET_CARD_SIZE_DEFAULT_PX }),
		}),
		{
			name: "assets-panel",
			partialize: (state) => ({
				mediaViewMode: state.mediaViewMode,
				mediaSortBy: state.mediaSortBy,
				mediaSortOrder: state.mediaSortOrder,
				assetCardSize: state.assetCardSize,
			}),
		},
	),
);
