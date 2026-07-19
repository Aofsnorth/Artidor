import { describe, expect, test } from "bun:test";
import type { SerializedNode } from "./scene-serializer";
import { isStaticScene } from "./static-scene";

const durationTicks = 600_000;

function root(child: SerializedNode): SerializedNode {
	return {
		type: "root",
		params: { duration: durationTicks },
		children: [child],
	};
}

function image(overrides: Record<string, unknown> = {}): SerializedNode {
	return {
		type: "image",
		params: {
			timeOffset: 0,
			duration: durationTicks,
			trimStart: 0,
			trimEnd: 0,
			...overrides,
		},
		children: [],
	};
}

describe("isStaticScene", () => {
	test("accepts a full-duration still image", () => {
		expect(isStaticScene({ sceneTree: root(image()), durationTicks })).toBe(
			true,
		);
	});

	test("rejects video, effects, and animated layers", () => {
		expect(
			isStaticScene({
				sceneTree: root({ ...image(), type: "video" }),
				durationTicks,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: root(image({ effects: [{ type: "blur" }] })),
				durationTicks,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: root(image({ animations: { channels: {} } })),
				durationTicks,
			}),
		).toBe(false);
	});

	test("rejects layers that do not cover the entire timeline", () => {
		expect(
			isStaticScene({
				sceneTree: root(image({ duration: durationTicks / 2 })),
				durationTicks,
			}),
		).toBe(false);
		expect(
			isStaticScene({
				sceneTree: root(image({ timeOffset: -1, duration: durationTicks })),
				durationTicks,
			}),
		).toBe(false);
	});
});
