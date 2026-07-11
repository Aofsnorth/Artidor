import { expect, test } from "bun:test";
import { upsertElementKeyframe } from "./keyframes";
import { resolveMediaGraphicStyleAtTime } from "./media-graphic-style";

test("resolves animated media fill and stroke style", () => {
	let animations = upsertElementKeyframe({
		animations: undefined,
		propertyPath: "graphicStyle.fillOpacity",
		time: 0,
		value: 0,
	});
	animations = upsertElementKeyframe({
		animations,
		propertyPath: "graphicStyle.fillOpacity",
		time: 120_000,
		value: 1,
	});
	animations = upsertElementKeyframe({
		animations,
		propertyPath: "graphicStyle.stroke.width",
		time: 0,
		value: 2,
	});
	animations = upsertElementKeyframe({
		animations,
		propertyPath: "graphicStyle.stroke.width",
		time: 120_000,
		value: 10,
	});

	const style = resolveMediaGraphicStyleAtTime({
		baseStyle: {
			fillColor: "#ffffff",
			fillOpacity: 0,
			stroke: { enabled: true, color: "#000000", width: 2 },
		},
		animations,
		localTime: 60_000,
	});

	expect(style.fillOpacity).toBeCloseTo(0.5);
	expect(style.stroke?.width).toBeCloseTo(6);
});
