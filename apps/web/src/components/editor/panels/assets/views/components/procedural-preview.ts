/** Deterministic gradient palettes for catalog backing plates. Photographs live in preview-photos.ts. */

/** Stable non-negative hash; category-qualified IDs keep catalogs independent. */
export function hashString(value: string): number {
	let hash = 0;
	for (const character of value) {
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 4_294_967_291;
	}
	return hash;
}

const SCENE_PALETTES = [
	{
		label: "clay",
		dark: "#302c31",
		mid: "#b66b50",
		accent: "#e7b96e",
		light: "#e9dfd3",
		contrast: "#538586",
	},
	{
		label: "harbor",
		dark: "#243640",
		mid: "#528eab",
		accent: "#e29b68",
		light: "#d9e5e6",
		contrast: "#b7c882",
	},
	{
		label: "grove",
		dark: "#283c35",
		mid: "#6f9872",
		accent: "#d6be74",
		light: "#e3e8d8",
		contrast: "#bd765f",
	},
	{
		label: "rose",
		dark: "#403039",
		mid: "#ad7184",
		accent: "#e4b59c",
		light: "#ebdfe3",
		contrast: "#85aaa1",
	},
	{
		label: "ochre",
		dark: "#3c3830",
		mid: "#b49a57",
		accent: "#dfc78c",
		light: "#e8e4d7",
		contrast: "#7298aa",
	},
	{
		label: "slate",
		dark: "#303843",
		mid: "#7c8da6",
		accent: "#c5d4d5",
		light: "#e5e7eb",
		contrast: "#cf917a",
	},
] as const;

type ScenePalette = (typeof SCENE_PALETTES)[number];

function scenePalette(id: string): ScenePalette {
	return (
		SCENE_PALETTES[hashString(`palette:${id}`) % SCENE_PALETTES.length] ??
		SCENE_PALETTES[0]
	);
}

/** A subdued backing plate, distinct from the full-color test scene itself. */
export function getPaletteForId(id: string) {
	const palette = scenePalette(id);
	return {
		background: `linear-gradient(135deg, ${palette.dark}, ${palette.mid})`,
		accent: palette.accent,
		label: palette.label,
	};
}

/** Inline background style for content that must remain the card's focal point. */
export function getPreviewBackgroundStyle(id: string): React.CSSProperties {
	return { background: getPaletteForId(id).background };
}
