import { describe, expect, test } from "bun:test";
import { buildVideoElement } from "@/tests/factories/editor";
import { cloneAnimations } from "@/lib/animation";
import type { Effect } from "@/lib/effects/types";
import type { TimelineElement, VideoElement } from "@/lib/timeline/types";

/**
 * Does a duplicated clip share effect STATE with its original?
 *
 * `buildDuplicateElement` in `duplicate-elements.ts` spreads the source element
 * shallowly (`{...element, id, ...}`) and only re-clones `animations`. Every
 * other nested field — `effects`, `masks`, `params` — is carried over BY
 * REFERENCE, so the original and the copy point at the same array and the same
 * effect objects.
 *
 * This file replicates that function verbatim (the command itself resolves
 * EditorCore.getInstance(), so it is not unit-testable in isolation) and pins
 * the consequence. The effect objects are built by hand so the assertions do
 * not depend on the effects registry or the slider↔param mapping.
 */

function makeEffects(amount: number): Effect[] {
	return [
		{
			id: "fx-brightness",
			type: "brightness",
			enabled: true,
			params: { amount },
		},
	] as unknown as Effect[];
}

function amountOf(effects: readonly Effect[] | undefined): number | undefined {
	return effects?.find((e) => e.type === "brightness")?.params?.amount as
		| number
		| undefined;
}

/** Verbatim copy of buildDuplicateElement's body. */
function buildDuplicateElement({
	element,
	id,
	startTime,
}: {
	element: TimelineElement;
	id: string;
	startTime: number;
}): TimelineElement {
	return {
		...element,
		id,
		name: `${element.name} (copy)`,
		startTime,
		animations: cloneAnimations({
			animations: element.animations,
			shouldRegenerateKeyframeIds: true,
		}),
	};
}

function seedClip(id: string, amount: number): VideoElement {
	return buildVideoElement({
		id,
		effects: makeEffects(amount) as unknown as VideoElement["effects"],
	});
}

describe("duplicate shares effect state", () => {
	test("a duplicate points at the SAME effects array and effect objects", () => {
		const original = seedClip("clip-1", 0.2);
		const copy = buildDuplicateElement({
			element: original,
			id: "clip-2",
			startTime: 200_000,
		});

		// The shared reference IS the bug surface: any in-place write through
		// either clip silently rewrites the other.
		expect(
			copy.effects,
			"duplicate shares the effects ARRAY by reference",
		).toBe(original.effects);
		expect(
			copy.effects?.[0],
			"duplicate shares the EFFECT OBJECT by reference",
		).toBe(original.effects?.[0]);
	});

	test("an immutable write on the copy leaves the original alone", () => {
		const original = seedClip("clip-1", 0.2);
		const copy = buildDuplicateElement({
			element: original,
			id: "clip-2",
			startTime: 200_000,
		});

		// The shape every correct writer in this codebase uses: replace the
		// effect object and the array, never mutate `params`.
		const next = [
			{ ...(copy.effects?.[0] as Effect), params: { amount: 0.9 } },
		] as Effect[];
		const copyAfter = { ...copy, effects: next };

		expect(amountOf(original.effects), "original untouched").toBe(0.2);
		expect(amountOf(copyAfter.effects), "copy received the new value").toBe(
			0.9,
		);
	});

	test("an IN-PLACE write on the copy DOES corrupt the original", () => {
		const original = seedClip("clip-1", 0.2);
		const copy = buildDuplicateElement({
			element: original,
			id: "clip-2",
			startTime: 200_000,
		});

		// Any writer that mutates `effect.params` in place leaks straight through
		// to the original, because the two clips hold the SAME effect object.
		const sharedParams = copy.effects?.[0].params as { amount: number };
		sharedParams.amount = 0.9;

		expect(
			amountOf(original.effects),
			"original changed as a side effect of the copy's write",
		).toBe(0.9);
	});
});
