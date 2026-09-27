import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { buildGraphicPreviewUrl } from "./index";

/**
 * The preview data-URL cache used to be an unbounded `Map` keyed by the full
 * param bag, so a parameter drag added one base64 PNG per step for the life of
 * the tab. These tests pin the LRU cap and the "same input, same URL" contract.
 */
let toDataUrlCalls = 0;
let renderCalls = 0;

const noop = () => {};

function createStubContext(): unknown {
	return new Proxy<Record<string, unknown>>(
		{
			measureText: (text: string) => ({ width: text.length * 10 }),
			createLinearGradient: () => ({ addColorStop: noop }),
		},
		{
			get: (target, property) => {
				if (property in target) {
					return target[property as string];
				}
				if (typeof property === "symbol") {
					return undefined;
				}
				return noop;
			},
		},
	);
}

class StubPath2D {
	moveTo(): void {}
	lineTo(): void {}
	closePath(): void {}
	roundRect(): void {}
	rect(): void {}
	arc(): void {}
}

const globals = globalThis as unknown as {
	document?: unknown;
	Path2D?: unknown;
};
const previousDocument = globals.document;
const previousPath2D = globals.Path2D;

beforeAll(() => {
	globals.Path2D = StubPath2D;
	globals.document = {
		createElement: () => {
			const canvas = {
				width: 0,
				height: 0,
				getContext: () => {
					renderCalls += 1;
					return createStubContext();
				},
				// Deterministic in the input, so "same input -> same URL" is a
				// real assertion rather than an artefact of the stub.
				toDataURL: () => {
					toDataUrlCalls += 1;
					return `data:image/png;base64,${canvas.width}x${canvas.height}`;
				},
			};
			return canvas;
		},
	};
});

afterAll(() => {
	globals.document = previousDocument;
	globals.Path2D = previousPath2D;
});

describe("buildGraphicPreviewUrl", () => {
	it("returns the identical url for repeated input and renders once", () => {
		const first = buildGraphicPreviewUrl({
			definitionId: "rectangle",
			params: { fill: "#123456" },
		});
		const toDataUrlBefore = toDataUrlCalls;
		const rendersBefore = renderCalls;
		const second = buildGraphicPreviewUrl({
			definitionId: "rectangle",
			params: { fill: "#123456" },
		});
		expect(second).toBe(first);
		expect(toDataUrlCalls).toBe(toDataUrlBefore);
		// Nothing was re-rendered: neither the raster nor the data-URL encode.
		expect(renderCalls).toBe(rendersBefore);
	});

	it("stops growing past the entry cap", () => {
		const first = buildGraphicPreviewUrl({
			definitionId: "rectangle",
			params: { fill: "#abcdef" },
			size: 128,
		});
		const toDataUrlBefore = toDataUrlCalls;

		// One entry per distinct param bag, the way a parameter drag behaves.
		for (let i = 0; i < 200; i++) {
			buildGraphicPreviewUrl({
				definitionId: "rectangle",
				params: { cornerRadius: i },
			});
		}

		// The original entry fell out of the 200-entry LRU, so it re-renders —
		// and re-renders to the same URL, so a cap can never change the result.
		const refetched = buildGraphicPreviewUrl({
			definitionId: "rectangle",
			params: { fill: "#abcdef" },
			size: 128,
		});
		expect(toDataUrlCalls).toBeGreaterThan(toDataUrlBefore);
		expect(refetched).toBe(first);
		expect(first).toBe("data:image/png;base64,128x128");
	});
});
