import { expect, test } from "bun:test";
import {
	getPaletteForId,
	getSceneImageUrlForId,
	getTransitionScenePair,
} from "./procedural-preview";

const UNSAFE_SVG = /<script|<image|<foreignObject|href=|onload=|https:\/\//i;

test("@fast catalog artwork is deterministic and distinct across presets", () => {
	const ids = Array.from({ length: 100 }, (_, index) => `preset-${index}`);
	const scenes = ids.map(getSceneImageUrlForId);
	expect(scenes).toEqual(ids.map(getSceneImageUrlForId));
	expect(new Set(scenes).size).toBeGreaterThan(90);
	expect(new Set(ids.map((id) => getPaletteForId(id).label)).size).toBe(6);
});

test("@fast transition pairs use independent original compositions", () => {
	const first = getTransitionScenePair("cross-dissolve");
	expect(first).toEqual(getTransitionScenePair("cross-dissolve"));
	expect(first.a).not.toBe(first.b);
	expect(first.a).toStartWith("data:image/svg+xml,");
	expect(first.b).toStartWith("data:image/svg+xml,");
});

test("@fast generated artwork is bounded and cannot embed input markup or external media", () => {
	for (const id of ["", "blur", "<script>alert(1)</script>", "\" onload=\"alert(1)", "🌅".repeat(200)]) {
		const uri = getSceneImageUrlForId(id);
		const svg = decodeURIComponent(uri.slice("data:image/svg+xml,".length));
		expect(svg).toContain('viewBox="0 0 160 160"');
		expect(svg).toContain("<title>");
		expect(svg).not.toMatch(UNSAFE_SVG);
		expect(svg.length).toBeLessThan(4_000);
	}
});
