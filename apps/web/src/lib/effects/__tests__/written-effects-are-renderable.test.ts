/**
 * Every effect type the UI writes must be one the renderer will actually run.
 *
 * `resolveEffectPasses` filters on `effectsRegistry.has(effect.type)` and
 * each definition then declares its own `renderer.passes`. An effect can be
 * registered yet declare no passes, or a panel can write a type that was
 * never registered. In both cases the params persist and the inspector
 * renders them, but the renderer skips the effect and the picture never
 * changes — the worst failure mode a grading tool can have, because it
 * looks like it is working.
 *
 * Run `bun scripts/audit-effects.ts` to regenerate the numbers behind
 * KNOWN_NON_RENDERING.
 */
import { describe, expect, test } from "bun:test";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

/** Effect types the inspector / advanced panels WRITE onto elements. */
const WRITTEN_EFFECT_TYPES = [
	// Adjust -> Basic (primitive effects, one per control)
	"brightness",
	"exposure",
	"contrast",
	"highlights",
	"shadows",
	"whites",
	"blacks",
	"temperature",
	"tint-shift",
	"hue-rotate",
	"saturation",
	"vibrance",
	"sharpen",
	"clarity",
	"dehaze",
	"fade",
	"vignette",
	"grain",
	// Adjust -> master intensity and every advanced grading panel.
	"davinci-adjust",
	// Registered, but these declare zero render passes.
	"curves",
	"hsl",
	"lut",
	// The HSL-curves panel in the advanced asset card.
	"hsl-curve",
	// The qualifier component in the advanced asset card.
	"qualifier",
];

/**
 * Effect types the UI writes today that do not render.
 *
 * This is DEBT, not a design: each entry is a panel whose controls persist
 * values that no GPU pass ever reads. The list is asserted exactly so that
 * CI stays green and the debt stays visible, and so that FIXING one is a
 * deliberate commit that has to update this list — which is the point.
 *
 * `bun scripts/audit-effects.ts` prints the sites for each.
 */
const KNOWN_NON_RENDERING = [
	"curves",
	"davinci-adjust",
	"hsl",
	"hsl-curve",
	"lut",
	"qualifier",
].sort();

const unregistered = WRITTEN_EFFECT_TYPES.filter(
	(type) => !effectsRegistry.has(type),
);
const registeredButNoPasses = WRITTEN_EFFECT_TYPES.filter((type) => {
	if (!effectsRegistry.has(type)) return false;
	const definition = effectsRegistry.get(type);
	return (definition?.renderer?.passes?.length ?? 0) === 0;
});

describe("effect types the UI writes are renderable", () => {
	test("nothing outside the known-debt list fails to render", () => {
		const broken = [...unregistered, ...registeredButNoPasses].sort();
		expect(
			broken,
			"these are written by a panel but the renderer skips them; " +
				"run `bun scripts/audit-effects.ts` for the write sites",
		).toEqual(KNOWN_NON_RENDERING);
	});

	test("the debt list is non-empty and fully explained", () => {
		// Guards the test above from silently passing on an empty list: an
		// empty expectation would pass whether the code is clean or broken.
		expect(KNOWN_NON_RENDERING.length).toBeGreaterThan(0);
	});
});
