import { expect, test } from "bun:test";
import {
	getPaletteForId,
	getTransitionPhotoPair,
	getTransitionPalettes,
} from "./procedural-preview";

test("motion palettes stay neutral", () => {
	expect(getPaletteForId("fade-up").label).toBe("default");
});

test("transition palettes use different neutral plates", () => {
	const palettes = getTransitionPalettes("cross-dissolve");

	expect(palettes.a.label).not.toBe(palettes.b.label);
	expect(palettes.a.label).toStartWith("neutral-");
	expect(palettes.b.label).toStartWith("neutral-");
});

test("transition photos are deterministic licensed local assets", () => {
	const first = getTransitionPhotoPair("cross-dissolve");
	const second = getTransitionPhotoPair("cross-dissolve");

	expect(first).toEqual(second);
	expect(first.a.src).toStartWith("/assets/transition-previews/");
	expect(first.b.src).toStartWith("/assets/transition-previews/");
	expect(first.a.src).not.toBe(first.b.src);
	expect(first.a.license).toBe("Unsplash License");
});
