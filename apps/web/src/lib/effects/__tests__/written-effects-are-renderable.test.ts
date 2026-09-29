/**
 * Every effect type the UI writes must be one the renderer will actually run.
 *
 * `resolveEffectPasses` filters on `effectsRegistry.has(effect.type)` and each
 * definition then declares `renderer.passes` (static) or `renderer.buildPasses`
 * (dynamic; it takes priority when present). An effect can be registered yet
 * declare neither, or a panel can write a type that was never registered. In
 * both cases the params persist and the inspector renders them, but the
 * renderer skips the effect and the picture never changes — the worst failure
 * mode a grading tool can have, because it looks like it is working.
 *
 * This file used to carry `KNOWN_NON_RENDERING = ["curves", "hsl", "hsl-curve",
 * "lut"]` — four panels whose controls moved numbers no GPU pass ever read.
 * Phase 1 of the colour roadmap removed those panels (the Advanced card now
 * ships only Wheels and Scopes) and unregistered the zero-pass definitions;
 * real GPU passes for them are tracked as later roadmap work. The debt list is
 * gone on purpose: a new non-rendering write must FAIL these tests, not get
 * appended to an allowlist.
 *
 * Run `bun scripts/audit-effects.ts` for the write-site table.
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
	"tint",
	"hue-rotate",
	"saturation",
	"vibrance",
	"sharpen",
	"clarity",
	"dehaze",
	"fade",
	"vignette",
	"grain",
	// Adjust -> advanced grading panels, each on its own registered primitive.
	"glow",
	"box-blur",
	"color-wheels",
];

/** A definition renders iff it declares static passes or a dynamic builder. */
function declaresRenderPasses(type: string): boolean {
	const definition = effectsRegistry.get(type);
	if (!definition) return false;
	if (definition.renderer?.buildPasses) return true;
	return (definition.renderer?.passes?.length ?? 0) > 0;
}

const unregistered = WRITTEN_EFFECT_TYPES.filter(
	(type) => !effectsRegistry.has(type),
);
const registeredButNoPasses = WRITTEN_EFFECT_TYPES.filter(
	(type) => effectsRegistry.has(type) && !declaresRenderPasses(type),
);

describe("effect types the UI writes are renderable", () => {
	test("nothing the UI writes is skipped by the renderer", () => {
		const broken = [...unregistered, ...registeredButNoPasses].sort();
		expect(
			broken,
			"these are written by a panel but the renderer skips them; " +
				"run `bun scripts/audit-effects.ts` for the write sites",
		).toEqual([]);
	});

	test("the written list is not vacuously empty", () => {
		// Guards the test above: an empty WRITTEN_EFFECT_TYPES would pass
		// whether the panels are clean or broken.
		expect(WRITTEN_EFFECT_TYPES.length).toBeGreaterThan(0);
	});

	test("no registered effect declares zero render passes", () => {
		// The Effects gallery hands out EVERY registered definition, so a
		// zero-pass definition is a user-facing control that silently does
		// nothing — the gallery twin of a panel writing an unrenderable type.
		// `hsl`, `curves` and `lut` sat exactly here until their definitions
		// were removed alongside the panels that wrote them.
		const dead = effectsRegistry
			.getAll()
			.filter((definition) => !declaresRenderPasses(definition.type))
			.map((definition) => definition.type)
			.sort();
		expect(dead).toEqual([]);
	});
});
