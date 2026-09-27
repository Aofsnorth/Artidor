import { describe, expect, it } from "bun:test";
import { measureTextElement } from "./measure-element";
import type { TextElement } from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";

/**
 * `measureText` is the expensive call this memo exists for, so the stub counts
 * invocations. Everything else on the context is a no-op.
 */
function createCountingContext() {
	const state = { measureTextCalls: 0 };
	const context = {
		save: () => {},
		restore: () => {},
		font: "",
		textBaseline: "middle",
		textAlign: "left",
		measureText: (text: string) => {
			state.measureTextCalls += 1;
			return {
				width: text.length * 10,
				actualBoundingBoxAscent: 8,
				actualBoundingBoxDescent: 2,
			};
		},
	};
	return {
		state,
		context: context as unknown as OffscreenCanvasRenderingContext2D,
	};
}

function buildElement(overrides: Partial<TextElement> = {}): TextElement {
	return {
		...DEFAULTS.text.element,
		content: "hello",
		canvasCenter: { x: 0, y: 0 },
		canvasHeight: 1080,
		...overrides,
	} as unknown as TextElement;
}

describe("measureTextElement", () => {
	it("memoises font shaping per content + font, not per call", () => {
		const { state, context } = createCountingContext();
		const element = buildElement();

		const first = measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		expect(state.measureTextCalls).toBe(1);

		// Same element, next frame: shaping must not run again.
		const second = measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 16,
			ctx: context,
		});
		expect(state.measureTextCalls).toBe(1);
		expect(second.lineMetrics).toBe(first.lineMetrics);
		expect(second.block).toBe(first.block);
	});

	it("re-shapes when the font string changes", () => {
		const { state, context } = createCountingContext();

		measureTextElement({
			element: buildElement(),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		measureTextElement({
			element: buildElement({ fontSize: 64 }),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		measureTextElement({
			element: buildElement({ fontFamily: "Georgia" }),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		measureTextElement({
			element: buildElement({ letterSpacing: 4 }),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		// Every distinct font/spacing bag is shaped once: 4 total.
		expect(state.measureTextCalls).toBe(4);
	});

	it("re-shapes when the content changes", () => {
		const { state, context } = createCountingContext();

		measureTextElement({
			element: buildElement({ content: "a" }),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		measureTextElement({
			element: buildElement({ content: "ab" }),
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		expect(state.measureTextCalls).toBe(2);
	});

	it("keeps per-line shaping for multi-line content", () => {
		const { state, context } = createCountingContext();
		const element = buildElement({ content: "one\ntwo\nthree" });

		const first = measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		expect(first.lineMetrics).toHaveLength(3);
		expect(state.measureTextCalls).toBe(3);

		measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 16,
			ctx: context,
		});
		expect(state.measureTextCalls).toBe(3);
	});

	it("still recomputes the time-dependent parts on every call", () => {
		const { context } = createCountingContext();
		const element = buildElement();

		const first = measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 0,
			ctx: context,
		});
		const second = measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 16,
			ctx: context,
		});

		// Only the shaped metrics are shared; the returned object is a fresh one
		// with the same shape as before, so animated backgrounds still animate.
		expect(second).not.toBe(first);
		expect(second.resolvedBackground).not.toBe(first.resolvedBackground);
		expect(Object.keys(second).sort()).toEqual(Object.keys(first).sort());
		expect(second.visualRect).toEqual(first.visualRect);
	});
});
