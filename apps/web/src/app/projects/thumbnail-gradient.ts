/**
 * Helper: derive a stable, on-brand gradient from a project id.
 * Used for the project card thumbnail when no real PNG exists
 * — gives a "designed" feel without ever loading a remote image.
 *
 * Two adjacent hues from the same brand family (purple, amber,
 * teal, rose) are mixed in a soft radial gradient. The pair is
 * chosen deterministically from a small hash of the id, so the
 * same project always shows the same colors.
 *
 * `seed` is any string (project id, fallback "default"). Returns
 * an inline `background` style value ready for `style={...}`.
 */

const PALETTES: Array<[string, string, string]> = [
	// [bg, from, to] — the 2nd & 3rd are the gradient stops
	["#1a1320", "#7a5af8", "#f0abfc"], // violet → pink
	["#1a1320", "#f59e0b", "#fde68a"], // amber → cream
	["#0f1a1c", "#06b6d4", "#a5f3fc"], // teal → mint
	["#1a1015", "#f43f5e", "#fda4af"], // rose → peach
	["#101726", "#3b82f6", "#93c5fd"], // cobalt → sky
	["#1c1116", "#ec4899", "#fbcfe8"], // magenta → blush
	["#161212", "#ef4444", "#fca5a5"], // crimson → coral
	["#101a14", "#10b981", "#86efac"], // emerald → mint
];

const hash = (s: string): number => {
	let h = 5381;
	for (let i = 0; i < s.length; i++) {
		h = (h * 33) ^ s.charCodeAt(i);
	}
	return h >>> 0;
};

export interface ThumbnailGradient {
	background: string;
	/** A short label (2-3 chars) extracted from the seed, useful
	   for the centre mark of the gradient. */
	monogram: string;
}

export function thumbnailGradientFor({
	seed,
}: {
	seed: string;
}): ThumbnailGradient {
	const idx = hash(seed) % PALETTES.length;
	const [, from, to] = PALETTES[idx];
	const angle = hash(`${seed}angle`) % 360;
	const cx = 20 + (hash(`${seed}cx`) % 60);
	const cy = 20 + (hash(`${seed}cy`) % 60);
	const background = `radial-gradient(${angle}deg at ${cx}% ${cy}%, ${from}, ${to} 60%, transparent 100%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(0,0,0,0.4))`;
	const monogram = seed
		.replace(/[^a-zA-Z0-9]/g, "")
		.slice(0, 2)
		.toUpperCase();
	return { background, monogram: monogram || "··" };
}
