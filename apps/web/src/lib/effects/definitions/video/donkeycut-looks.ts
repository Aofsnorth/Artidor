import type { EffectDefinition } from "@/lib/effects/types";

// One-click graded looks ported from DonkeyCut (Apache 2.0,
// github.com/DonkeyCut/Donkey — site/packages/effects-kit/src/looks.ts).
// Each is a single WGSL shader that composes the look's base grading with
// its post passes (vignette, grain, washes, glow), all scaled by the same
// `amount` knob so 30% reads the same as DonkeyCut at 30%.

const TICKS_PER_SECOND = 120_000;

function lookEffect({
	type,
	name,
	keywords,
	defaultValue,
}: {
	type: string;
	name: string;
	keywords: string[];
	defaultValue: number;
}): EffectDefinition {
	return {
		type,
		name,
		keywords,
		params: [
			{
				key: "amount",
				label: "Amount",
				type: "number",
				default: defaultValue,
				min: 0,
				max: 100,
				step: 1,
			},
		],
		renderer: {
			passes: [
				{
					shader: type,
					uniforms: ({ effectParams, localTime }) => ({
						u_amount:
							(typeof effectParams.amount === "number"
								? effectParams.amount
								: Number.parseFloat(String(effectParams.amount))) / 100,
						u_time: Math.max(0, (localTime ?? 0) / TICKS_PER_SECOND),
					}),
				},
			],
		},
	};
}

export const lookVintageEffectDefinition = lookEffect({
	type: "look-vintage",
	name: "Vintage",
	keywords: ["vintage", "sepia", "film", "old", "retro", "look"],
	defaultValue: 60,
});

export const lookHorrorEffectDefinition = lookEffect({
	type: "look-horror",
	name: "Analogue Horror",
	keywords: ["horror", "analog", "grayscale", "dark", "creepy", "look"],
	defaultValue: 60,
});

export const lookHalationEffectDefinition = lookEffect({
	type: "look-halation",
	name: "Halation",
	keywords: ["halation", "bloom", "highlight", "glow", "cinema", "look"],
	defaultValue: 50,
});

export const lookTechEffectDefinition = lookEffect({
	type: "look-tech",
	name: "Modern Tech",
	keywords: ["tech", "cool", "blue", "clean", "modern", "look"],
	defaultValue: 50,
});

export const lookNoirEffectDefinition = lookEffect({
	type: "look-noir",
	name: "Noir",
	keywords: ["noir", "black and white", "mono", "detective", "look"],
	defaultValue: 70,
});

export const lookPastelEffectDefinition = lookEffect({
	type: "look-pastel",
	name: "Pastel",
	keywords: ["pastel", "soft", "faded", "gentle", "cozy", "look"],
	defaultValue: 60,
});

export const lookBlockbusterEffectDefinition = lookEffect({
	type: "look-blockbuster",
	name: "Blockbuster",
	keywords: ["blockbuster", "teal", "orange", "epic", "action", "look"],
	defaultValue: 50,
});

export const lookDreamyEffectDefinition = lookEffect({
	type: "look-dreamy",
	name: "Dreamy",
	keywords: ["dreamy", "soft", "ethereal", "romance", "glow", "look"],
	defaultValue: 50,
});
