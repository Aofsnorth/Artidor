import { hashString } from "./procedural-preview";

/**
 * Local Unsplash-licensed photographs; see
 * public/assets/transition-previews/README.md for licensing and sources.
 */
const PHOTO_BASE = "/assets/transition-previews";

const PHOTO_FILES = [
	...Array.from({ length: 60 }, (_, index) => `${index}.jpg`),
	"venice-interior.webp",
	"concrete-stairs.webp",
	"spiral-stair.webp",
	"diagonal-building.webp",
] as const;

/** Deterministic catalog photograph for a seed id. */
export function getSceneImageUrlForId(id: string): string {
	const file = PHOTO_FILES[hashString(`photo:${id}`) % PHOTO_FILES.length];
	return `${PHOTO_BASE}/${file}`;
}

/** Two distinct photos so transition movement and blending stay legible. */
export function getTransitionPhotoPair(id: string): { a: string; b: string } {
	const seed = hashString(`pair:${id}`);
	const first = seed % PHOTO_FILES.length;
	const stride =
		1 + (Math.floor(seed / PHOTO_FILES.length) % (PHOTO_FILES.length - 1));
	const second = (first + stride) % PHOTO_FILES.length;
	return {
		a: `${PHOTO_BASE}/${PHOTO_FILES[first]}`,
		b: `${PHOTO_BASE}/${PHOTO_FILES[second]}`,
	};
}
