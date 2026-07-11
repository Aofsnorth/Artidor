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

const DEFAULT_PALETTE = {
	background:
		"linear-gradient(135deg, rgba(10,10,12,0.95) 0%, rgba(39,39,42,0.85) 55%, rgba(82,82,91,0.65) 100%)",
	accent: "rgba(161,161,170,0.45)",
	label: "default",
} as const;

const TRANSITION_PALETTES = [
	{
		background:
			"linear-gradient(135deg, #101014 0%, #2a2420 46%, #7c6f62 100%)",
		accent: "rgba(214,202,184,0.42)",
		label: "neutral-warm",
	},
	{
		background:
			"linear-gradient(135deg, #0b1116 0%, #1f2a33 48%, #71808a 100%)",
		accent: "rgba(190,203,212,0.4)",
		label: "neutral-cool",
	},
	{
		background:
			"linear-gradient(135deg, #0f1110 0%, #242b24 52%, #6f7a68 100%)",
		accent: "rgba(197,207,186,0.38)",
		label: "neutral-sage",
	},
	{
		background:
			"linear-gradient(135deg, #130f12 0%, #2c2329 50%, #7a6a75 100%)",
		accent: "rgba(213,196,208,0.38)",
		label: "neutral-mauve",
	},
] as const;

const PALETTES: ReadonlyArray<typeof DEFAULT_PALETTE> = [DEFAULT_PALETTE];

const TRANSITION_PHOTOS = [
	{
		src: "/assets/transition-previews/venice-interior.webp",
		pageUrl: "https://unsplash.com/photos/HzJd0GAdukc",
		photographer: "Falco Negenman",
		license: "Unsplash License",
	},
	{
		src: "/assets/transition-previews/concrete-stairs.webp",
		pageUrl: "https://unsplash.com/photos/Z61MuLuFQDQ",
		photographer: "Ricardo Gomez Angel",
		license: "Unsplash License",
	},
	{
		src: "/assets/transition-previews/spiral-stair.webp",
		pageUrl: "https://unsplash.com/photos/ScEKf8u7y-c",
		photographer: "Len Cruz",
		license: "Unsplash License",
	},
	{
		src: "/assets/transition-previews/diagonal-building.webp",
		pageUrl: "https://unsplash.com/photos/-cf0jq-ldjg",
		photographer: "Ricardo Gomez Angel",
		license: "Unsplash License",
	},
] as const;

export function getTransitionPhotoPair(type: string) {
	const baseIndex = hashString(type) % TRANSITION_PHOTOS.length;
	const nextIndex = (baseIndex + 1) % TRANSITION_PHOTOS.length;
	return {
		a: TRANSITION_PHOTOS[baseIndex] ?? TRANSITION_PHOTOS[0],
		b: TRANSITION_PHOTOS[nextIndex] ?? TRANSITION_PHOTOS[1],
	};
}

/**
 * Pick a palette deterministically from the item id. Same id always
 * returns the same palette, so a re-render never flickers.
 */
export function getPaletteForId(_id: string): (typeof PALETTES)[number] {
	return DEFAULT_PALETTE;
}

/**
 * Two distinct palettes for before/after transition previews. The
 * hashes are offset so two adjacent items in the transition grid never
 * end up showing the same A and B backgrounds.
 */
export function getTransitionPalettes(type: string): {
	a: (typeof TRANSITION_PALETTES)[number];
	b: (typeof TRANSITION_PALETTES)[number];
} {
	const baseIndex = hashString(type) % TRANSITION_PALETTES.length;
	const nextIndex = (baseIndex + 1) % TRANSITION_PALETTES.length;
	return {
		a: TRANSITION_PALETTES[baseIndex] ?? TRANSITION_PALETTES[0],
		b: TRANSITION_PALETTES[nextIndex] ?? TRANSITION_PALETTES[1],
	};
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

/* -------------------------------------------------------------------------- */
/*                            Procedural image scenes                         */
/* -------------------------------------------------------------------------- */

/**
 * Generate a deterministic SVG scene image URL for a given id. The scene
 * looks like a small photo (landscape, city, ocean, etc.) and is used as a
 * CSS background-image for transition / motion previews so they don't look
 * like flat gradients.
 *
 * The output is a data URI, so it works offline and makes no network request.
 */
export function getSceneImageUrlForId(id: string): string {
	return buildSceneImageUrl(hashString(id));
}

/**
 * Same as above but with an extra offset so the "B" side of a transition
 * always differs from the "A" side.
 */
export function getSceneImageUrlForIdWithOffset(
	id: string,
	offset: number,
): string {
	return buildSceneImageUrl(hashString(`${id}-${offset}`));
}

/**
 * Build a deterministic SVG scene image data URI from a numeric seed.
 */
function buildSceneImageUrl(seed: number): string {
	const type = SCENE_TYPES[seed % SCENE_TYPES.length] ?? SCENE_TYPES[0];
	const palette =
		SCENE_PALETTES[seed % SCENE_PALETTES.length] ?? SCENE_PALETTES[0];
	const svg = buildSceneSvg({ type, palette, seed });
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Scene "themes". Each renderer below produces a visually different kind of
 * thumbnail, so adjacent cards in the grid never look identical.
 */
const SCENE_TYPES = [
	"landscape",
	"cityscape",
	"ocean",
	"forest",
	"desert",
	"abstract",
	"portrait",
	"space",
	"aurora",
	"neon",
] as const;

type SceneType = (typeof SCENE_TYPES)[number];

/**
 * Color palettes used by the scene renderers. Each palette is a 5-stop
 * gradient, chosen deterministically from the seed.
 */
const SCENE_PALETTES: ReadonlyArray<{
	name: string;
	stops: [string, string, string, string, string];
	accent: string;
	light: string;
}> = [
	{
		name: "warm-sunset",
		stops: ["#2d1b4e", "#8b3a3a", "#d97706", "#f59e0b", "#fde68a"],
		accent: "#fbbf24",
		light: "#fff7ed",
	},
	{
		name: "cool-ocean",
		stops: ["#0c4a6e", "#075985", "#0ea5e9", "#38bdf8", "#e0f2fe"],
		accent: "#7dd3fc",
		light: "#f0f9ff",
	},
	{
		name: "deep-forest",
		stops: ["#052e16", "#14532d", "#16a34a", "#4ade80", "#dcfce7"],
		accent: "#86efac",
		light: "#f0fdf4",
	},
	{
		name: "magenta-night",
		stops: ["#3b0764", "#6b21a8", "#a855f7", "#e879f9", "#fae8ff"],
		accent: "#e9d5ff",
		light: "#faf5ff",
	},
	{
		name: "amber-desert",
		stops: ["#451a03", "#92400e", "#b45309", "#d97706", "#fef3c7"],
		accent: "#fbbf24",
		light: "#fffbeb",
	},
	{
		name: "slate-steel",
		stops: ["#0f172a", "#1e293b", "#334155", "#64748b", "#e2e8f0"],
		accent: "#cbd5e1",
		light: "#f8fafc",
	},
	{
		name: "cherry-blossom",
		stops: ["#4c0519", "#9f1239", "#e11d48", "#fb7185", "#ffe4e6"],
		accent: "#fecdd3",
		light: "#fff1f2",
	},
	{
		name: "tropical",
		stops: ["#115e59", "#0d9488", "#14b8a6", "#2dd4bf", "#ccfbf1"],
		accent: "#99f6e4",
		light: "#f0fdfa",
	},
	{
		name: "midnight",
		stops: ["#020617", "#172554", "#1e40af", "#3b82f6", "#dbeafe"],
		accent: "#93c5fd",
		light: "#eff6ff",
	},
	{
		name: "golden-hour",
		stops: ["#3f2e05", "#854d0e", "#ca8a04", "#facc15", "#fef9c3"],
		accent: "#fde047",
		light: "#fefce8",
	},
];

function buildSceneSvg({
	type,
	palette,
	seed,
}: {
	type: SceneType;
	palette: (typeof SCENE_PALETTES)[number];
	seed: number;
}): string {
	const [c1, c2, c3, c4, c5] = palette.stops;
	const gradientId = `g-${seed}`;
	const width = 160;
	const height = 160;

	const sky = `<defs>
		<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="${c1}" />
			<stop offset="25%" stop-color="${c2}" />
			<stop offset="50%" stop-color="${c3}" />
			<stop offset="75%" stop-color="${c4}" />
			<stop offset="100%" stop-color="${c5}" />
		</linearGradient>
	</defs>
	<rect width="${width}" height="${height}" fill="url(#${gradientId})" />`;

	const ornaments = sceneOrnaments(type, palette, seed, width, height);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">${sky}${ornaments}</svg>`;
}

function sceneOrnaments(
	type: SceneType,
	palette: (typeof SCENE_PALETTES)[number],
	seed: number,
	w: number,
	h: number,
): string {
	const a = palette.accent;
	const l = palette.light;
	const rnd = seededRandom(seed);

	switch (type) {
		case "landscape": {
			const sunY = 35 + Math.floor(rnd() * 20);
			return `
			<circle cx="${Math.floor(120 + rnd() * 20)}" cy="${sunY}" r="${12 + Math.floor(rnd() * 8)}" fill="${l}" opacity="0.9" />
			<path d="M0 ${h} L0 ${h * 0.62} L${w * 0.25} ${h * 0.45} L${w * 0.55} ${h * 0.58} L${w} ${h * 0.42} L${w} ${h} Z" fill="${a}" opacity="0.35" />
			<path d="M0 ${h} L0 ${h * 0.74} L${w * 0.3} ${h * 0.62} L${w * 0.65} ${h * 0.72} L${w} ${h * 0.55} L${w} ${h} Z" fill="${palette.stops[0]}" opacity="0.55" />
			<path d="M0 ${h} L0 ${h * 0.85} L${w * 0.4} ${h * 0.78} L${w} ${h * 0.68} L${w} ${h} Z" fill="${palette.stops[1]}" opacity="0.7" />
		`;
		}
		case "cityscape": {
			let buildings = "";
			let x = 0;
			while (x < w) {
				const bw = 12 + Math.floor(rnd() * 18);
				const bh = h * 0.35 + Math.floor(rnd() * h * 0.45);
				const windows = Array.from({ length: Math.floor(bh / 14) }, (_, i) => {
					const wy = h - bh + 6 + i * 14;
					return `<rect x="${x + 4}" y="${wy}" width="${bw - 8}" height="6" fill="${l}" opacity="${0.3 + rnd() * 0.5}" rx="1" />`;
				}).join("");
				buildings += `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" fill="${palette.stops[1]}" opacity="0.75" rx="2" />${windows}`;
				x += bw + 2 + Math.floor(rnd() * 4);
			}
			return `
			<circle cx="${20 + Math.floor(rnd() * 25)}" cy="${20 + Math.floor(rnd() * 15)}" r="10" fill="${l}" opacity="0.8" />
			${buildings}
			<rect x="0" y="${h - 6}" width="${w}" height="6" fill="${palette.stops[0]}" opacity="0.9" />
		`;
		}
		case "ocean": {
			const sunX = 20 + Math.floor(rnd() * 40);
			const sunY = 20 + Math.floor(rnd() * 25);
			const waves = Array.from({ length: 6 }, (_, i) => {
				const y = h * 0.55 + i * 14;
				const opacity = 0.15 + i * 0.08;
				return `<path d="M0 ${y} Q${w * 0.25} ${y - 6} ${w * 0.5} ${y} T${w} ${y}" fill="none" stroke="${l}" stroke-width="2" opacity="${opacity}" />`;
			}).join("");
			return `
			<circle cx="${sunX}" cy="${sunY}" r="${14 + Math.floor(rnd() * 6)}" fill="${l}" opacity="0.85" />
			<rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="${palette.stops[0]}" opacity="0.35" />
			${waves}
		`;
		}
		case "forest": {
			const sunY = 20 + Math.floor(rnd() * 20);
			const trees = Array.from({ length: 8 }, (_, i) => {
				const tx = 8 + i * 20 + Math.floor(rnd() * 8);
				const th = h * 0.4 + Math.floor(rnd() * h * 0.3);
				const tw = 14 + Math.floor(rnd() * 8);
				return `
					<rect x="${tx + tw / 2 - 2}" y="${h - th}" width="4" height="${th}" fill="${palette.stops[1]}" opacity="0.8" />
					<path d="M${tx} ${h - th + 10} L${tx + tw / 2} ${h - th - 10} L${tx + tw} ${h - th + 10} Z" fill="${a}" opacity="0.55" />
					<path d="M${tx} ${h - th + 24} L${tx + tw / 2} ${h - th + 4} L${tx + tw} ${h - th + 24} Z" fill="${a}" opacity="0.5" />
				`;
			}).join("");
			return `
			<circle cx="${120 + Math.floor(rnd() * 25)}" cy="${sunY}" r="${12 + Math.floor(rnd() * 6)}" fill="${l}" opacity="0.8" />
			${trees}
			<rect x="0" y="${h - 8}" width="${w}" height="8" fill="${palette.stops[0]}" opacity="0.85" />
		`;
		}
		case "desert": {
			const dunes = Array.from({ length: 4 }, (_, i) => {
				const y = h * 0.55 + i * 18;
				return `<path d="M0 ${y} Q${w * 0.35} ${y - 16} ${w * 0.7} ${y} T${w} ${y + 4} L${w} ${h} L0 ${h} Z" fill="${palette.stops[Math.max(0, i - 1)]}" opacity="${0.25 + i * 0.12}" />`;
			}).join("");
			return `
			<circle cx="${w - 30 - Math.floor(rnd() * 20)}" cy="${35 + Math.floor(rnd() * 15)}" r="${16 + Math.floor(rnd() * 6)}" fill="${l}" opacity="0.9" />
			${dunes}
		`;
		}
		case "abstract": {
			const shapes = Array.from({ length: 6 }, (_, i) => {
				const cx = 20 + Math.floor(rnd() * 120);
				const cy = 20 + Math.floor(rnd() * 120);
				const r = 10 + Math.floor(rnd() * 30);
				const opacity = 0.2 + rnd() * 0.3;
				if (i % 2 === 0) {
					return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${a}" opacity="${opacity}" />`;
				}
				const size = 15 + Math.floor(rnd() * 25);
				const rot = Math.floor(rnd() * 90);
				return `<rect x="${cx}" y="${cy}" width="${size}" height="${size}" fill="${l}" opacity="${opacity}" transform="rotate(${rot} ${cx + size / 2} ${cy + size / 2})" />`;
			}).join("");
			return shapes;
		}
		case "portrait": {
			const cx = w / 2;
			const cy = h * 0.4;
			return `
			<circle cx="${cx}" cy="${cy}" r="${28 + Math.floor(rnd() * 6)}" fill="${a}" opacity="0.45" />
			<path d="M${cx - 35} ${h * 0.82} Q${cx} ${h * 0.52} ${cx + 35} ${h * 0.82} L${cx + 35} ${h} L${cx - 35} ${h} Z" fill="${palette.stops[1]}" opacity="0.6" />
			<ellipse cx="${cx - 10}" cy="${cy - 4}" rx="3" ry="4" fill="${l}" opacity="0.7" />
			<ellipse cx="${cx + 10}" cy="${cy - 4}" rx="3" ry="4" fill="${l}" opacity="0.7" />
			<path d="M${cx - 8} ${cy + 8} Q${cx} ${cy + 14} ${cx + 8} ${cy + 8}" stroke="${l}" stroke-width="2" fill="none" opacity="0.7" />
		`;
		}
		case "space": {
			const stars = Array.from({ length: 24 }, () => {
				const sx = Math.floor(rnd() * w);
				const sy = Math.floor(rnd() * h);
				const sr = 1 + Math.floor(rnd() * 2);
				return `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${l}" opacity="${0.4 + rnd() * 0.6}" />`;
			}).join("");
			const px = 30 + Math.floor(rnd() * 100);
			const py = 30 + Math.floor(rnd() * 100);
			return `
			${stars}
			<circle cx="${px}" cy="${py}" r="${18 + Math.floor(rnd() * 8)}" fill="${a}" opacity="0.5" />
			<ellipse cx="${px}" cy="${py}" rx="${40 + Math.floor(rnd() * 15)}" ry="8" fill="none" stroke="${a}" stroke-width="2" opacity="0.35" transform="rotate(${Math.floor(rnd() * 40)} ${px} ${py})" />
		`;
		}
		case "aurora": {
			const bands = Array.from({ length: 5 }, (_, i) => {
				const y = 20 + i * 22;
				return `<path d="M0 ${y} Q${w * 0.3} ${y - 18} ${w * 0.55} ${y} T${w} ${y - 10} L${w} ${y + 14} Q${w * 0.6} ${y + 26} ${w * 0.3} ${y + 10} T0 ${y + 18} Z" fill="${a}" opacity="${0.15 + i * 0.06}" />`;
			}).join("");
			return `
			<circle cx="${w - 30 - Math.floor(rnd() * 20)}" cy="${20 + Math.floor(rnd() * 15)}" r="8" fill="${l}" opacity="0.8" />
			${bands}
			<path d="M0 ${h} L0 ${h * 0.82} L${w * 0.35} ${h * 0.75} L${w} ${h * 0.8} L${w} ${h} Z" fill="${palette.stops[0]}" opacity="0.65" />
		`;
		}
		case "neon": {
			const lines = Array.from({ length: 5 }, (_, i) => {
				const y = h * 0.4 + i * 14;
				return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${a}" stroke-width="2" opacity="${0.2 + i * 0.1}" />`;
			}).join("");
			const towers = Array.from({ length: 4 }, (_, i) => {
				const tx = 20 + i * 38 + Math.floor(rnd() * 8);
				const th = h * 0.3 + Math.floor(rnd() * h * 0.35);
				return `
					<rect x="${tx}" y="${h - th}" width="8" height="${th}" fill="${palette.stops[1]}" opacity="0.7" />
					<rect x="${tx - 2}" y="${h - th}" width="12" height="4" fill="${a}" opacity="0.9" />
				`;
			}).join("");
			return `
			${lines}
			${towers}
			<rect x="0" y="${h - 4}" width="${w}" height="4" fill="${a}" opacity="0.8" />
		`;
		}
		default:
			return "";
	}
}

/**
 * Tiny seeded PRNG so scene details are deterministic for the same seed.
 */
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 9301 + 49297) % 233280;
		return s / 233280;
	};
}
