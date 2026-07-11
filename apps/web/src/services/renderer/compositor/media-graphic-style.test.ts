import { expect, test } from "bun:test";
import type { FrameItemDescriptor } from "./types";
import { orderMediaGraphicStyleLayers } from "./media-graphic-style";

const layer = (textureId: string): FrameItemDescriptor => ({
	type: "layer",
	textureId,
	transform: {
		centerX: 0,
		centerY: 0,
		width: 1,
		height: 1,
		rotationDegrees: 0,
		flipX: false,
		flipY: false,
	},
	opacity: 1,
	blendMode: "normal",
	effectPassGroups: [],
	mask: null,
});

test("draws fill above opaque media so Color & Fill replaces pixels", () => {
	const [beforeMedia, afterMedia] = orderMediaGraphicStyleLayers({
		fillLayer: layer("fill"),
		shadowLayer: null,
		strokeLayer: null,
		borderLayer: null,
	});

	expect(beforeMedia).toEqual([]);
	expect(afterMedia.map((item) => item.textureId)).toEqual(["fill"]);
});

test("keeps shadow behind media and stroke above media", () => {
	const [beforeMedia, afterMedia] = orderMediaGraphicStyleLayers({
		fillLayer: null,
		shadowLayer: layer("shadow"),
		strokeLayer: layer("stroke"),
		borderLayer: null,
	});

	expect(beforeMedia.map((item) => item.textureId)).toEqual(["shadow"]);
	expect(afterMedia.map((item) => item.textureId)).toEqual(["stroke"]);
});

test("places border above stroke and media", () => {
	const [beforeMedia, afterMedia] = orderMediaGraphicStyleLayers({
		fillLayer: layer("fill"),
		shadowLayer: layer("shadow"),
		strokeLayer: layer("stroke"),
		borderLayer: layer("border"),
	});

	expect(beforeMedia.map((item) => item.textureId)).toEqual(["shadow"]);
	expect(afterMedia.map((item) => item.textureId)).toEqual([
		"fill",
		"stroke",
		"border",
	]);
});
