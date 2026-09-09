// Grade preset catalog ported from DonkeyCut (Apache 2.0,
// github.com/DonkeyCut/Donkey — site/packages/effects-kit/src/presets/*.json).
// Each preset is a recipe of Artidor's built-in adjustment effects: a clip
// stores the effect instances, and the GPU pipeline renders them. Fields
// DonkeyCut grades carry that Artidor's adjustment set has no single-knob
// equivalent for (tint, per-band HSL, wheels, per-channel curves) are
// intentionally omitted rather than approximated silently.
import { generateUUID } from "@/utils/id";
import type { Effect } from "./types";

export type GradePresetCategory = "cinematic" | "film" | "warm" | "mood" | "bw";

export interface GradePreset {
	id: string;
	label: string;
	category: GradePresetCategory;
	keywords: string[];
	/** Adjustment effect type → param value (Artidor `amount` units). */
	adjustments: Partial<
		Record<
			| "brightness"
			| "contrast"
			| "saturation"
			| "vibrance"
			| "temperature"
			| "highlights"
			| "shadows",
			number
		>
	>;
}

const gp = (
	id: string,
	label: string,
	category: GradePresetCategory,
	keywords: string[],
	adjustments: GradePreset["adjustments"],
): GradePreset => ({
	id,
	label,
	category,
	keywords: [category, ...keywords],
	adjustments,
});

/* -------------------------------- cinematic ------------------------------- */
const cinematic: GradePreset[] = [
	gp("teal-orange", "Teal & Orange", "cinematic", ["teal", "orange", "film"], {
		contrast: 10,
		vibrance: 10,
		saturation: 6,
	}),
	gp(
		"bleach-bypass",
		"Bleach Bypass",
		"cinematic",
		["bleach", "silver", "harsh"],
		{
			contrast: 22,
			saturation: -30,
			highlights: -6,
			shadows: -8,
		},
	),
	gp("matinee", "Matinee", "cinematic", ["warm", "classic", "bright"], {
		brightness: 3,
		contrast: 8,
		temperature: 4,
		saturation: 18,
		vibrance: 8,
	}),
	gp("thriller", "Thriller", "cinematic", ["cold", "tense", "dark"], {
		temperature: -14,
		contrast: 16,
		shadows: -10,
		saturation: -10,
	}),
	gp("night-market", "Night Market", "cinematic", ["neon", "city", "night"], {
		temperature: -6,
		contrast: 10,
		shadows: 6,
		vibrance: 16,
	}),
	gp("sci-fi", "Sci-Fi", "cinematic", ["blue", "future", "cold"], {
		temperature: -18,
		contrast: 12,
		saturation: -6,
		highlights: -4,
	}),
	gp("western", "Western", "cinematic", ["dusty", "desert", "warm"], {
		temperature: 16,
		contrast: 6,
		shadows: 4,
		saturation: -4,
	}),
	gp("indie", "Indie", "cinematic", ["muted", "natural", "soft"], {
		temperature: 3,
		contrast: -4,
		saturation: -12,
	}),
];

/* ---------------------------------- film ---------------------------------- */
const film: GradePreset[] = [
	gp("16mm", "16mm", "film", ["analog", "grain", "vintage"], {
		saturation: -2,
		vibrance: 6,
		contrast: 4,
		highlights: -6,
		shadows: 3,
	}),
	gp("super-8", "Super 8", "film", ["home", "movie", "warm"], {
		temperature: 14,
		contrast: 8,
		saturation: -6,
		shadows: 8,
	}),
	gp("faded-film", "Faded Film", "film", ["washed", "pale", "old"], {
		contrast: -8,
		saturation: -18,
		temperature: 2,
	}),
	gp("chrome", "Chrome", "film", ["punchy", "vivid", "kodachrome"], {
		contrast: 14,
		saturation: 14,
		vibrance: 6,
		highlights: -6,
		temperature: 2,
	}),
	gp("push-process", "Push Process", "film", ["contrast", "gritty", "raw"], {
		brightness: 4,
		contrast: 20,
		saturation: -22,
		shadows: -10,
	}),
	gp("cine-print", "Cine Print", "film", ["print", "rich", "deep"], {
		contrast: 18,
		saturation: -4,
	}),
	gp("tungsten", "Tungsten", "film", ["indoor", "warm", "lamp"], {
		temperature: 6,
		contrast: 5,
		vibrance: 4,
	}),
	gp("instant", "Instant", "film", ["polaroid", "soft", "pale"], {
		brightness: 5,
		contrast: -10,
		saturation: -14,
	}),
	gp("expired", "Expired", "film", ["shifted", "odd", "vintage"], {
		saturation: -20,
		contrast: -6,
	}),
];

/* ---------------------------------- warm ---------------------------------- */
const warm: GradePreset[] = [
	gp("golden-hour", "Golden Hour", "warm", ["sunset", "gold", "glow"], {
		brightness: 6,
		temperature: 18,
		contrast: 4,
		highlights: -6,
		vibrance: 10,
	}),
	gp("amber", "Amber", "warm", ["honey", "deep", "warm"], {
		temperature: 22,
		contrast: 6,
		shadows: 6,
		saturation: 4,
	}),
	gp("honey", "Honey", "warm", ["soft", "sweet", "light"], {
		temperature: 14,
		brightness: 4,
		contrast: -2,
		vibrance: 8,
		highlights: -4,
	}),
	gp("sunbaked", "Sunbaked", "warm", ["harsh", "bright", "dried"], {
		temperature: 16,
		contrast: 10,
		saturation: -8,
		highlights: -10,
		shadows: -4,
	}),
	gp("peach", "Peach", "warm", ["soft", "pink", "gentle"], {
		temperature: 10,
		brightness: 5,
		saturation: 6,
		contrast: -4,
	}),
	gp("sepia-grade", "Sepia", "warm", ["sepia", "brown", "old"], {
		saturation: -50,
		temperature: 34,
		contrast: 4,
	}),
	gp("ember", "Ember", "warm", ["fire", "red", "dark"], {
		temperature: 20,
		shadows: -8,
		contrast: 12,
		vibrance: 4,
	}),
	gp("bronze", "Bronze", "warm", ["metal", "tanned", "rich"], {
		temperature: 18,
		contrast: 8,
		saturation: -6,
	}),
];

/* ---------------------------------- mood ---------------------------------- */
const mood: GradePreset[] = [
	gp("midnight", "Midnight", "mood", ["night", "dark", "blue"], {
		brightness: -8,
		temperature: -12,
		contrast: 12,
		saturation: -12,
		shadows: -6,
	}),
	gp("moss", "Moss", "mood", ["green", "forest", "earthy"], {
		temperature: 4,
		saturation: -8,
		contrast: 6,
	}),
	gp("slate", "Slate", "mood", ["gray", "cool", "flat"], {
		temperature: -8,
		saturation: -20,
		contrast: 8,
	}),
	gp("dusk", "Dusk", "mood", ["evening", "purple", "dim"], {
		temperature: -4,
		brightness: -3,
		contrast: 4,
		vibrance: 8,
	}),
	gp("neon", "Neon", "mood", ["electric", "vivid", "cyber"], {
		vibrance: 22,
		contrast: 10,
		saturation: 10,
		temperature: -6,
	}),
	gp("arctic", "Arctic", "mood", ["ice", "cold", "pale"], {
		temperature: -20,
		brightness: 2,
		contrast: 6,
		saturation: -6,
		highlights: 4,
	}),
	gp("storm", "Storm", "mood", ["grey", "heavy", "dramatic"], {
		temperature: -10,
		contrast: 14,
		saturation: -16,
		brightness: -4,
		shadows: -8,
	}),
	gp("velvet", "Velvet", "mood", ["luxury", "deep", "wine"], {
		contrast: 10,
		brightness: -4,
		saturation: 12,
		temperature: 4,
		shadows: -6,
	}),
];

/* ----------------------------------- bw ----------------------------------- */
const bw: GradePreset[] = [
	gp("mono", "Mono", "bw", ["black", "white", "classic"], {
		saturation: -50,
		contrast: 10,
	}),
	gp("silver", "Silver", "bw", ["bright", "soft", "silvery"], {
		saturation: -50,
		contrast: -4,
		brightness: 6,
		shadows: 8,
		highlights: -4,
	}),
	gp("ink", "Ink", "bw", ["hard", "graphic", "punchy"], {
		saturation: -50,
		contrast: 24,
		shadows: -8,
	}),
	gp("high-key", "High Key", "bw", ["bright", "airy", "light"], {
		saturation: -50,
		brightness: 10,
		contrast: -6,
		shadows: 10,
		highlights: -2,
	}),
	gp("low-key", "Low Key", "bw", ["dark", "moody", "shadow"], {
		saturation: -50,
		brightness: -8,
		contrast: 16,
		shadows: -10,
		highlights: -4,
	}),
	gp("charcoal", "Charcoal", "bw", ["soft", "dark", "smoky"], {
		saturation: -50,
		contrast: 6,
	}),
	gp("soft-mono", "Soft Mono", "bw", ["gentle", "flat", "quiet"], {
		saturation: -50,
		contrast: -10,
		brightness: 3,
	}),
	gp("grit", "Grit", "bw", ["grainy", "raw", "rough"], {
		saturation: -50,
		contrast: 16,
		brightness: -2,
		highlights: 10,
	}),
];

export const gradePresets: GradePreset[] = [
	...cinematic,
	...film,
	...warm,
	...mood,
	...bw,
];

export const GRADE_PRESET_CATEGORIES: {
	id: GradePresetCategory;
	label: string;
}[] = [
	{ id: "cinematic", label: "Cinematic" },
	{ id: "film", label: "Film" },
	{ id: "warm", label: "Warm" },
	{ id: "mood", label: "Mood" },
	{ id: "bw", label: "B&W" },
];

export function getGradePreset(id: string): GradePreset | null {
	return gradePresets.find((p) => p.id === id) ?? null;
}

/** One line per category, for AI tool descriptions. */
export function gradePresetCatalogText(): string {
	return GRADE_PRESET_CATEGORIES.map(
		(c) =>
			`${c.label}: ${gradePresets
				.filter((p) => p.category === c.id)
				.map((p) => `${p.id} (${p.label})`)
				.join(", ")}`,
	).join("; ");
}

const ADJUSTMENT_TYPES: GradePreset["adjustments"] = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	vibrance: 0,
	temperature: 0,
	highlights: 0,
	shadows: 0,
};

/**
 * Build the effect instances for one grade preset at `amount` (0..1). Values
 * scale linearly toward identity as the amount drops, the same way
 * DonkeyCut's grades interpolate.
 */
export function buildGradePresetEffects({
	preset,
	amount = 1,
}: {
	preset: GradePreset;
	amount?: number;
}): Effect[] {
	const k = Math.max(0, Math.min(1, amount));
	return (
		Object.keys(ADJUSTMENT_TYPES) as Array<keyof GradePreset["adjustments"]>
	)
		.map((type) => {
			const value = preset.adjustments[type] ?? 0;
			return { type, scaled: Math.round(value * k) };
		})
		.filter(({ scaled }) => Math.abs(scaled) > 0)
		.map(({ type, scaled }) => ({
			id: generateUUID(),
			type,
			params: { amount: scaled },
			enabled: true,
		}));
}
