import { expect, test } from "bun:test";
import {
	getPaletteForId,
	getPreviewBackgroundStyle,
} from "./procedural-preview";
import {
	getSceneImageUrlForId,
	getTransitionPhotoPair,
} from "./preview-photos";

const PHOTO_URL =
	/^\/assets\/transition-previews\/(\d{1,2}\.jpg|[a-z-]+\.webp)$/;

test("@fast catalog photos are deterministic and varied", () => {
	const ids = Array.from({ length: 100 }, (_, index) => `preset-${index}`);
	const urls = ids.map(getSceneImageUrlForId);
	expect(urls).toEqual(ids.map(getSceneImageUrlForId));
	expect(new Set(urls).size).toBeGreaterThan(30);
	for (const url of urls) {
		expect(url).toMatch(PHOTO_URL);
	}
});

test("@fast transition pairs use two distinct local photos", () => {
	const pair = getTransitionPhotoPair("cross-dissolve");
	expect(pair).toEqual(getTransitionPhotoPair("cross-dissolve"));
	expect(pair.a).toMatch(PHOTO_URL);
	expect(pair.b).toMatch(PHOTO_URL);
	expect(pair.a).not.toBe(pair.b);
});

test("@fast palette plates remain gradient-only backing surfaces", () => {
	expect(getPreviewBackgroundStyle("effects:blur").background).toContain(
		"linear-gradient",
	);
	expect(
		new Set(
			Array.from(
				{ length: 12 },
				(_, index) => getPaletteForId(`id-${index}`).label,
			),
		).size,
	).toBeGreaterThan(1);
});
