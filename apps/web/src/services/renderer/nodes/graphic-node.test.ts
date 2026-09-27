import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { GraphicNode } from "./graphic-node";
import type { ParamValues } from "@/lib/params";

/**
 * bun has neither `OffscreenCanvas` nor `document`, so `createOffscreenCanvas`
 * would throw. A permissive counting stub is enough: the node's contract is
 * "same canvas object, re-rendered, version bumped" — the pixels themselves are
 * irrelevant to the assertion.
 */
let clearCount = 0;
let canvasAllocations = 0;

class StubOffscreenCanvas {
	width: number;
	height: number;
	readonly stubContext: Record<string, unknown>;

	constructor(width: number, height: number) {
		canvasAllocations += 1;
		this.width = width;
		this.height = height;
		const noop = () => {};
		this.stubContext = new Proxy<Record<string, unknown>>(
			{
				clearRect: () => {
					clearCount += 1;
				},
				measureText: (text: string) => ({
					width: text.length * 10,
					actualBoundingBoxAscent: 8,
					actualBoundingBoxDescent: 2,
				}),
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

	getContext(): Record<string, unknown> {
		return this.stubContext;
	}
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
	OffscreenCanvas?: unknown;
	Path2D?: unknown;
};
const previousOffscreenCanvas = globals.OffscreenCanvas;
const previousPath2D = globals.Path2D;

beforeAll(() => {
	globals.OffscreenCanvas = StubOffscreenCanvas;
	globals.Path2D = StubPath2D;
});

afterAll(() => {
	globals.OffscreenCanvas = previousOffscreenCanvas;
	globals.Path2D = previousPath2D;
});

function buildNode(): GraphicNode {
	return new GraphicNode({
		definitionId: "rectangle",
		params: { fill: "#ff0000" },
		duration: 1_000,
		timeOffset: 0,
		trimStart: 0,
		trimEnd: 1_000,
		transform: {
			position: { x: 0, y: 0 },
			scaleX: 1,
			scaleY: 1,
			rotate: 0,
		},
		opacity: 1,
	});
}

describe("GraphicNode.getSource", () => {
	it("reuses one canvas across frames instead of allocating per param change", () => {
		const node = buildNode();
		const allocationsBefore = canvasAllocations;
		const clearsBefore = clearCount;

		const first = node.getSource({ resolvedParams: { fill: "#ff0000" } });
		const second = node.getSource({
			resolvedParams: { fill: "#00ff00", cornerRadius: 10 },
		});

		// Same backing store, and exactly one 512x512 canvas was allocated for
		// two renders — the bug was a fresh canvas per param change (60x/second
		// for an animated graphic).
		expect(first).toBe(second);
		expect(canvasAllocations - allocationsBefore).toBe(1);
		// Both the node's wipe and the definition's own clear ran again.
		expect(clearCount).toBeGreaterThan(clearsBefore);
	});

	it("bumps the source version only when the rendered params change", () => {
		const node = buildNode();

		const first = node.getSource({
			resolvedParams: { fill: "#ff0000", cornerRadius: 10 },
		});
		expect(node.getSourceVersion()).toBe(1);

		// An identical param bag must not re-render: the compositor relies on a
		// stable version to skip the GPU upload.
		const same = node.getSource({
			resolvedParams: { fill: "#ff0000", cornerRadius: 10 },
		});
		expect(same).toBe(first);
		expect(node.getSourceVersion()).toBe(1);

		// Key insertion order is not part of the identity of a param bag.
		const reordered = node.getSource({
			resolvedParams: { cornerRadius: 10, fill: "#ff0000" },
		});
		expect(reordered).toBe(first);
		expect(node.getSourceVersion()).toBe(1);

		const changed = node.getSource({
			resolvedParams: { cornerRadius: 11, fill: "#ff0000" },
		});
		expect(changed).toBe(first);
		expect(node.getSourceVersion()).toBe(2);
	});

	it("renders a definition resolved from its alias/fallback params", () => {
		const node = buildNode();
		const params: ParamValues = { fill: "#123456" };
		expect(node.getSource({ resolvedParams: params })).not.toBeNull();
		expect(node.getSourceVersion()).toBe(1);
	});
});
