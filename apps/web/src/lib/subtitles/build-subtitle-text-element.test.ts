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

	it("reuses one small measurement canvas for every cue", () => {
		let created = 0;
		const context = {
			letterSpacing: "",
			font: "",
			measureText: (text: string) => ({ width: text.length * 10 }),
		};
		(globalThis as unknown as { document: Document }).document = {
			createElement: () => {
				created += 1;
				return {
					width: 0,
					height: 0,
					getContext: () => context,
				};
			},
		} as unknown as Document;

		const caption = { text: "Hello world", startTime: 0, duration: 1 };
		buildSubtitleTextElement({
			index: 0,
			caption,
			canvasSize: { width: 1920, height: 1080 },
		});
		buildSubtitleTextElement({
			index: 1,
			caption,
			canvasSize: { width: 1920, height: 1080 },
		});

		// One canvas at module scope, not one 4096×4096 canvas per cue.
		expect(created).toBe(1);
	});
});
