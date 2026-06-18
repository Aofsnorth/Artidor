/**
 * Procedural preview backgrounds.
 *
 * Replaces the old `source.unsplash.com` thumbnail fetcher that the
 * library views used to call. Unsplash Source was deprecated in 2024
 * and stopped returning images, which left every asset card with a
 * broken-image icon. Instead of fetching a random photo we now derive
 * a deterministic CSS gradient from the item's id hash — same input
 * always gives the same colors, so the library looks consistent across
 * reloads and works fully offline.
 *
 * All helpers return a `CSSProperties` ready to drop into a `style`
 * prop. They never return a network URL.
 */

/** Stable string → non-negative 32-bit hash. */
export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

/**
 * 12 varied gradient palettes. Index with `hash % palettes.length` so
 * every id maps to exactly one palette — and the palette is rich
 * enough that adjacent cards in the grid look different.
 */
const PALETTES: ReadonlyArray<{
	background: string;
	accent: string;
	label: string;
}> = [
	{
		// Teal / ocean
		background:
			"linear-gradient(135deg, rgba(8,51,68,0.95) 0%, rgba(20,184,166,0.55) 50%, rgba(56,189,248,0.35) 100%)",
		accent: "rgba(34,211,238,0.45)",
		label: "ocean",
	},
	{
		// Sunset / warm
		background:
			"linear-gradient(135deg, rgba(76,5,25,0.95) 0%, rgba(251,113,133,0.55) 50%, rgba(251,191,36,0.35) 100%)",
		accent: "rgba(251,146,60,0.5)",
		label: "sunset",
	},
	{
		// Forest / moss
		background:
			"linear-gradient(135deg, rgba(6,40,30,0.95) 0%, rgba(34,197,94,0.5) 50%, rgba(132,204,22,0.3) 100%)",
		accent: "rgba(74,222,128,0.45)",
		label: "forest",
	},
	{
		// Plum / magenta
		background:
			"linear-gradient(135deg, rgba(40,8,60,0.95) 0%, rgba(168,85,247,0.55) 50%, rgba(236,72,153,0.32) 100%)",
		accent: "rgba(192,132,252,0.5)",
		label: "plum",
	},
	{
		// Amber / honey
		background:
			"linear-gradient(135deg, rgba(60,30,8,0.95) 0%, rgba(245,158,11,0.55) 50%, rgba(251,191,36,0.32) 100%)",
		accent: "rgba(251,191,36,0.5)",
		label: "amber",
	},
	{
		// Slate / steel
		background:
			"linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(71,85,105,0.55) 50%, rgba(148,163,184,0.32) 100%)",
		accent: "rgba(148,163,184,0.45)",
		label: "slate",
	},
	{
		// Cherry / rose
		background:
			"linear-gradient(135deg, rgba(76,5,25,0.95) 0%, rgba(244,63,94,0.5) 50%, rgba(251,113,133,0.32) 100%)",
		accent: "rgba(251,113,133,0.5)",
		label: "rose",
	},
	{
		// Indigo / cobalt
		background:
			"linear-gradient(135deg, rgba(12,15,55,0.95) 0%, rgba(59,130,246,0.55) 50%, rgba(99,102,241,0.32) 100%)",
		accent: "rgba(96,165,250,0.5)",
		label: "indigo",
	},
	{
		// Sand / desert
		background:
			"linear-gradient(135deg, rgba(58,40,18,0.95) 0%, rgba(217,119,6,0.5) 50%, rgba(245,158,11,0.32) 100%)",
		accent: "rgba(245,158,11,0.45)",
		label: "sand",
	},
	{
		// Charcoal / smoke
		background:
			"linear-gradient(135deg, rgba(8,8,10,0.95) 0%, rgba(38,38,42,0.7) 50%, rgba(82,82,91,0.4) 100%)",
		accent: "rgba(161,161,170,0.45)",
		label: "smoke",
	},
	{
		// Aqua / mint
		background:
			"linear-gradient(135deg, rgba(6,40,40,0.95) 0%, rgba(45,212,191,0.55) 50%, rgba(110,231,183,0.32) 100%)",
		accent: "rgba(94,234,212,0.5)",
		label: "aqua",
	},
	{
		// Royal / sapphire
		background:
			"linear-gradient(135deg, rgba(10,15,55,0.95) 0%, rgba(67,56,202,0.55) 50%, rgba(34,211,238,0.32) 100%)",
		accent: "rgba(99,102,241,0.5)",
		label: "royal",
	},
];

/**
 * Pick a palette deterministically from the item id. Same id always
 * returns the same palette, so a re-render never flickers.
 */
export function getPaletteForId(id: string): (typeof PALETTES)[number] {
	return PALETTES[hashString(id) % PALETTES.length] ?? PALETTES[0]!;
}

/**
 * Two distinct palettes for before/after transition previews. The
 * hashes are offset so two adjacent items in the transition grid never
 * end up showing the same A and B backgrounds.
 */
export function getTransitionPalettes(
	type: string,
): { a: (typeof PALETTES)[number]; b: (typeof PALETTES)[number] } {
	const a = getPaletteForId(`${type}-A`);
	const b = getPaletteForId(`${type}-B`);
	return { a, b };
}

/**
 * Reusable inline styles for a procedural preview "background plate"
 * (i.e. the dim gradient that sits behind the actual content like
 * text, sticker, template).
 */
export function getPreviewBackgroundStyle(id: string): React.CSSProperties {
	const palette = getPaletteForId(id);
	return {
		background: palette.background,
		boxShadow: `inset 0 0 0 1px ${palette.accent}`,
	};
}
