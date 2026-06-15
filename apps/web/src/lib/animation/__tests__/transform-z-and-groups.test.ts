import { beforeAll, describe, expect, mock, test } from "bun:test";
import type { ElementAnimations } from "@/lib/animation/types";

mock.module("artidor-wasm", () => ({
	TICKS_PER_SECOND: () => 1000,
}));

let getGroupKeyframesAtTime: typeof import("@/lib/animation/property-groups").getGroupKeyframesAtTime;
let hasGroupKeyframeAtTime: typeof import("@/lib/animation/property-groups").hasGroupKeyframeAtTime;
let resolveTransformAtTime: typeof import("@/lib/animation/resolve").resolveTransformAtTime;
let upsertElementKeyframe: typeof import("@/lib/animation/keyframes").upsertElementKeyframe;

beforeAll(async () => {
	({ getGroupKeyframesAtTime, hasGroupKeyframeAtTime } = await import(
		"@/lib/animation/property-groups"
	));
	({ resolveTransformAtTime } = await import("@/lib/animation/resolve"));
	({ upsertElementKeyframe } = await import("@/lib/animation/keyframes"));
});

describe("transform Z animation", () => {
	test("resolves static and animated Z position with the rest of transform", () => {
		const baseTransform = {
			scaleX: 1,
			scaleY: 1,
			position: { x: 10, y: 20 },
			positionZ: 5,
			rotate: 0,
		};

		let animations: ElementAnimations | undefined;
		animations = upsertElementKeyframe({
			animations,
			propertyPath: "transform.positionZ",
			time: 0,
			value: 5,
		});
		animations = upsertElementKeyframe({
			animations,
			propertyPath: "transform.positionZ",
			time: 10,
			value: 25,
		});

		expect(
			resolveTransformAtTime({
				baseTransform,
				animations,
				localTime: 5,
			}).positionZ,
		).toBe(15);
	});
});

describe("transform position keyframe group", () => {
	test("groups X, Y, and Z position keyframes at the playhead", () => {
		let animations: ElementAnimations | undefined;
		for (const [propertyPath, value] of [
			["transform.positionX", 100],
			["transform.positionY", 200],
			["transform.positionZ", 300],
		] as const) {
			animations = upsertElementKeyframe({
				animations,
				propertyPath,
				time: 12,
				value,
			});
		}

		expect(
			hasGroupKeyframeAtTime({
				animations,
				group: "transform.position",
				time: 12,
			}),
		).toBe(true);
		expect(
			getGroupKeyframesAtTime({
				animations,
				group: "transform.position",
				time: 12,
			}).map((ref) => ref.propertyPath),
		).toEqual([
			"transform.positionX",
			"transform.positionY",
			"transform.positionZ",
		]);
	});
});
