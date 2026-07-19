import { describe, expect, test } from "bun:test";
import { resizePreviewCanvasBackingStore } from "./preview-canvas-size";

describe("resizePreviewCanvasBackingStore", () => {
	test("reduces the backing store to the render resolution", () => {
		const canvas = { width: 3840, height: 2160 };

		expect(
			resizePreviewCanvasBackingStore({ canvas, width: 960, height: 540 }),
		).toBe(true);
		expect(canvas).toEqual({ width: 960, height: 540 });
	});

	test("does not reset an unchanged canvas", () => {
		const canvas = { width: 960, height: 540 };
		expect(
			resizePreviewCanvasBackingStore({ canvas, width: 960, height: 540 }),
		).toBe(false);
	});
});
