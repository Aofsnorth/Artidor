import { beforeEach, describe, expect, it } from "bun:test";
import { buildSubtitleTextElement } from "./build-subtitle-text-element";

beforeEach(() => {
	// Provide a minimal document so the builder can run in a non-browser
	// test environment. A null canvas context disables measurement, which is
	// fine for these style-only assertions.
	(globalThis as unknown as { document: Document }).document = {
		createElement: () => ({
			getContext: () => null,
			width: 0,
			height: 0,
		}),
	} as unknown as Document;
});

describe("buildSubtitleTextElement", () => {
	it("applies caption preset style", () => {
		const element = buildSubtitleTextElement({
			index: 0,
			caption: {
				text: "Hello",
				startTime: 0,
				duration: 1,
				style: { presetId: "caption-pop" },
			},
			canvasSize: { width: 1920, height: 1080 },
		});
		expect(element.fontFamily).toBe("Impact");
		expect(element.color).toBe("#ffeb3b");
	});

	it("uses explicit overrides over preset values", () => {
		const element = buildSubtitleTextElement({
			index: 0,
			caption: {
				text: "Hello",
				startTime: 0,
				duration: 1,
				style: { presetId: "caption-pop", color: "#ffffff" },
			},
			canvasSize: { width: 1920, height: 1080 },
		});
		expect(element.color).toBe("#ffffff");
		expect(element.fontFamily).toBe("Impact");
	});
});
