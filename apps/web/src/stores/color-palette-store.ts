import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Shared swatch state for any colour control (draw tools, etc.):
 * a fixed default palette plus a persisted MRU list of recently
 * used colours. Recents are normalised to lowercase `#rrggbb` and
 * deduped, newest first.
 */
export const DEFAULT_PALETTE: string[] = [
	"#ffffff",
	"#000000",
	"#ef4444",
	"#f97316",
	"#f59e0b",
	"#eab308",
	"#84cc16",
	"#22c55e",
	"#10b981",
	"#06b6d4",
	"#3b82f6",
	"#6366f1",
	"#8b5cf6",
	"#a855f7",
	"#ec4899",
	"#f43f5e",
];

const MAX_RECENT_COLORS = 12;

function normalizeColor(value: string): string | null {
	const hex = value.trim().toLowerCase();
	if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
	if (/^#[0-9a-f]{3}$/.test(hex)) {
		return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
	}
	if (/^#[0-9a-f]{8}$/.test(hex)) return hex.slice(0, 7); // drop alpha
	return null;
}

interface ColorPaletteState {
	recentColors: string[];
	addRecentColor: (color: string) => void;
	clearRecentColors: () => void;
}

export const useColorPaletteStore = create<ColorPaletteState>()(
	persist(
		(set) => ({
			recentColors: [],
			addRecentColor: (color) => {
				const normalized = normalizeColor(color);
				if (!normalized) return;
				set((state) => ({
					recentColors: [
						normalized,
						...state.recentColors.filter((c) => c !== normalized),
					].slice(0, MAX_RECENT_COLORS),
				}));
			},
			clearRecentColors: () => set({ recentColors: [] }),
		}),
		{ name: "color-palette" },
	),
);
