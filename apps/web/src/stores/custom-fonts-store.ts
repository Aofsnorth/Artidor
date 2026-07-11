import { create } from "zustand";
import { persist } from "zustand/middleware";
import { browserStorage } from "@/stores/browser-storage";

export interface CustomFont {
	/** User-given name (from the file name). */
	name: string;
	/** The CSS font-family string used to reference this font. */
	family: string;
	/** Original file name. */
	fileName: string;
}

interface CustomFontsState {
	fonts: CustomFont[];
	/** Font families the user has starred. Persisted to localStorage. */
	favorites: string[];
	/**
	 * Import a font file (.ttf, .otf, .woff, .woff2) using the FontFace
	 * API. Returns the font family name on success, or null on failure.
	 */
	importFont: (file: File) => Promise<string | null>;
	/** Remove a previously imported custom font. */
	removeFont: (family: string) => void;
	/** Add or remove a font family from the favorites list. */
	toggleFavorite: (family: string) => void;
}

const CUSTOM_FONT_PREFIX = "ArtidorCustom_";

export const useCustomFontsStore = create<CustomFontsState>()(
	persist(
		(set) => ({
			fonts: [],
			favorites: [],

			importFont: async (file: File) => {
				try {
					const buffer = await file.arrayBuffer();
					// Derive a CSS-safe family name from the file name.
					const baseName = file.name.replace(/\.[^.]+$/, "");
					const family = `${CUSTOM_FONT_PREFIX}${baseName}`;

					const face = new FontFace(family, buffer);
					await face.load();
					document.fonts.add(face);

					const entry: CustomFont = {
						name: baseName,
						family,
						fileName: file.name,
					};

					set((state) => ({
						fonts: [...state.fonts.filter((f) => f.family !== family), entry],
					}));

					return family;
				} catch (error) {
					console.error("[CustomFonts] Failed to import font:", error);
					return null;
				}
			},

			removeFont: (family: string) => {
				// Remove all FontFace entries for this family.
				for (const face of document.fonts) {
					if (face.family === family) {
						document.fonts.delete(face);
					}
				}
				set((state) => ({
					fonts: state.fonts.filter((f) => f.family !== family),
				}));
			},

			toggleFavorite: (family: string) => {
				set((state) => ({
					favorites: state.favorites.includes(family)
						? state.favorites.filter((f) => f !== family)
						: [...state.favorites, family],
				}));
			},
		}),
		{
			name: "artidor-custom-fonts",
			storage: browserStorage,
			// Only persist favorites — custom fonts are re-loaded via FontFace
			// API on each session and don't survive a refresh anyway (the
			// FontFace is gone once the page reloads). Persisting the `fonts`
			// array would show stale entries with no backing FontFace.
			partialize: (state) => ({ favorites: state.favorites }),
		},
	),
);
