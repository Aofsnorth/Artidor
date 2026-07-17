import { describe, expect, test } from "bun:test";
import { shouldQueuePreviewRender } from "./preview-render-scheduling";

const scene = {};

describe("shouldQueuePreviewRender", () => {
	test("does not queue the frame already being rendered", () => {
		expect(
			shouldQueuePreviewRender({
				activeFrame: 42,
				requestedFrame: 42,
				activeScene: scene,
				requestedScene: scene,
				activeScaleInputs: "auto|false|false",
				requestedScaleInputs: "auto|false|false",
			}),
		).toBe(false);
	});

	test("queues a newer playback frame", () => {
		expect(
			shouldQueuePreviewRender({
				activeFrame: 42,
				requestedFrame: 43,
				activeScene: scene,
				requestedScene: scene,
				activeScaleInputs: "auto|true|false",
				requestedScaleInputs: "auto|true|false",
			}),
		).toBe(true);
	});

	test("queues scene and quality changes", () => {
		expect(
			shouldQueuePreviewRender({
				activeFrame: 42,
				requestedFrame: 42,
				activeScene: scene,
				requestedScene: {},
				activeScaleInputs: "auto|false|false",
				requestedScaleInputs: "medium|false|false",
			}),
		).toBe(true);
	});
});
