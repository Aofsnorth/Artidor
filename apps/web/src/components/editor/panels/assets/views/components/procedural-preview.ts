/** Original geometric test scenes. No photographs, external assets or fonts. */

/** Stable non-negative hash; category-qualified IDs keep catalogs independent. */
export function hashString(value: string): number {
	let hash = 0;
	for (const character of value) {
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 4_294_967_291;
	}
	return hash;
}

const SCENE_PALETTES = [
	{ label: "clay", dark: "#302c31", mid: "#b66b50", accent: "#e7b96e", light: "#e9dfd3", contrast: "#538586" },
	{ label: "harbor", dark: "#243640", mid: "#528eab", accent: "#e29b68", light: "#d9e5e6", contrast: "#b7c882" },
	{ label: "grove", dark: "#283c35", mid: "#6f9872", accent: "#d6be74", light: "#e3e8d8", contrast: "#bd765f" },
	{ label: "rose", dark: "#403039", mid: "#ad7184", accent: "#e4b59c", light: "#ebdfe3", contrast: "#85aaa1" },
	{ label: "ochre", dark: "#3c3830", mid: "#b49a57", accent: "#dfc78c", light: "#e8e4d7", contrast: "#7298aa" },
	{ label: "slate", dark: "#303843", mid: "#7c8da6", accent: "#c5d4d5", light: "#e5e7eb", contrast: "#cf917a" },
] as const;

type ScenePalette = (typeof SCENE_PALETTES)[number];

function scenePalette(id: string): ScenePalette {
	return SCENE_PALETTES[hashString(`palette:${id}`) % SCENE_PALETTES.length] ?? SCENE_PALETTES[0];
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

/** Deterministic SVG data URI with bounded geometry and no network references. */
export function getSceneImageUrlForId(id: string): string {
	const seed = hashString(`geometry:${id}`);
	const palette = scenePalette(id);
	const layout = hashString(`layout:${id}`) % SCENE_RENDERERS.length;
	const render = SCENE_RENDERERS[layout] ?? SCENE_RENDERERS[0];
	const geometry = render(palette, seededRandom(seed));
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><title>Geometric study</title><defs><linearGradient id="sky" x2="0.8" y2="1"><stop stop-color="${palette.dark}"/><stop offset="1" stop-color="${palette.mid}"/></linearGradient></defs><rect width="160" height="160" fill="url(#sky)"/>${geometry}</svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A separate seed for a second scene, not a recoloring of the same plate. */
export function getSceneImageUrlForIdWithOffset(id: string, offset: number): string {
	return getSceneImageUrlForId(`${id}:${offset}`);
}

/** Independent A/B compositions let movement and blending remain legible. */
export function getTransitionScenePair(id: string) {
	return {
		a: getSceneImageUrlForId(`transitions:${id}:a`),
		b: getSceneImageUrlForId(`transitions:${id}:b`),
	};
}

function seededRandom(seed: number): () => number {
	let state = seed % 233_280;
	return () => {
		state = (state * 9_301 + 49_297) % 233_280;
		return state / 233_280;
	};
}

type SceneRenderer = (palette: ScenePalette, random: () => number) => string;

const ridges: SceneRenderer = (palette, random) => {
	const sunX = 35 + Math.round(random() * 90);
	const peak = 30 + Math.round(random() * 60);
	return `<circle cx="${sunX}" cy="38" r="${15 + Math.round(random() * 10)}" fill="${palette.accent}"/>
		<path d="M0 120L${peak} 55L110 123L160 75V160H0Z" fill="${palette.contrast}"/>
		<path d="M0 146L55 92L112 145L142 116L160 135V160H0Z" fill="${palette.dark}"/>
		<path d="M${peak} 55L${peak - 15} 81L${peak + 16} 75Z" fill="${palette.light}"/>
		<path d="M0 148Q65 128 160 153V160H0Z" fill="${palette.mid}"/>`;
};

const columns: SceneRenderer = (palette, random) => {
	let shapes = `<path d="M0 126L160 70V160H0Z" fill="${palette.dark}"/>`;
	for (let index = 0; index < 4; index++) {
		const x = 10 + index * 36;
		const y = 36 + Math.round(random() * 54);
		shapes += `<path d="M${x} ${y}l20 -10l16 10l-20 10Z" fill="${palette.light}"/>
			<path d="M${x} ${y}l16 10v${135 - y}l-16 -10Z" fill="${palette.mid}"/>
			<path d="M${x + 16} ${y + 10}l20 -10v${135 - y}l-20 10Z" fill="${palette.accent}"/>`;
	}
	return shapes;
};

const orbits: SceneRenderer = (palette, random) => {
	const center = 52 + Math.round(random() * 50);
	return `<circle cx="${center}" cy="78" r="48" fill="${palette.mid}"/>
		<circle cx="${center}" cy="78" r="31" fill="${palette.dark}"/>
		<ellipse cx="${center}" cy="78" rx="69" ry="23" transform="rotate(-32 ${center} 78)" fill="none" stroke="${palette.light}" stroke-width="3"/>
		<circle cx="${center + 30}" cy="48" r="13" fill="${palette.accent}"/>
		<circle cx="30" cy="130" r="${5 + Math.round(random() * 8)}" fill="${palette.contrast}"/>
		<path d="M116 123h27M130 109v28" stroke="${palette.light}" stroke-width="2"/>`;
};

const tiles: SceneRenderer = (palette, random) => {
	const colors = [palette.mid, palette.accent, palette.contrast, palette.light];
	let shapes = "";
	for (let index = 0; index < 16; index++) {
		const x = (index % 4) * 40;
		const y = Math.floor(index / 4) * 40;
		const color = colors[Math.floor(random() * colors.length)];
		shapes += random() > 0.5
			? `<path d="M${x + 4} ${y + 4}h32v32Z" fill="${color}"/>`
			: `<circle cx="${x + 20}" cy="${y + 20}" r="${10 + Math.round(random() * 7)}" fill="${color}"/>`;
	}
	return shapes;
};

const ribbons: SceneRenderer = (palette, random) => {
	const colors = [palette.contrast, palette.mid, palette.accent, palette.light];
	const bend = 10 + Math.round(random() * 50);
	return colors.map((color, index) => {
		const y = 36 + index * 29;
		return `<path d="M-10 ${y}C45 ${y - bend} 95 ${y + bend} 170 ${y - 12}" fill="none" stroke="${color}" stroke-width="18"/>`;
	}).join("");
};

const stillLife: SceneRenderer = (palette, random) => {
	const x = 26 + Math.round(random() * 24);
	return `<rect y="120" width="160" height="40" fill="${palette.dark}"/>
		<ellipse cx="86" cy="133" rx="57" ry="10" fill="${palette.mid}"/>
		<rect x="${x}" y="60" width="45" height="69" fill="${palette.contrast}"/>
		<ellipse cx="${x + 22.5}" cy="60" rx="22.5" ry="9" fill="${palette.light}"/>
		<circle cx="108" cy="${86 + Math.round(random() * 15)}" r="28" fill="${palette.accent}"/>
		<path d="M85 126h56l-14 -28h-28Z" fill="${palette.mid}"/>
		<rect x="20" y="25" width="70" height="3" fill="${palette.light}"/>`;
};

const SCENE_RENDERERS: readonly SceneRenderer[] = [ridges, columns, orbits, tiles, ribbons, stillLife];
