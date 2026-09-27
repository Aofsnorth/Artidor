import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { buildFrameDescriptor } from "./frame-descriptor";
import type { CanvasRenderer } from "../canvas-renderer";
import { GraphicNode } from "../nodes/graphic-node";
import { RootNode } from "../nodes/root-node";
import { TextNode } from "../nodes/text-node";
import { registerDefaultMasks } from "@/lib/masks";
import { measureTextElement } from "@/lib/text/measure-element";
import { DEFAULT_TEXT_ANIMATOR } from "@/lib/text/animator";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type { TextElement } from "@/lib/timeline";
import type { Transform } from "@/lib/rendering";

/**
 * Regression cover for the frame-descriptor raster paths:
 *
 * - a graphic source and an animated text raster are re-drawn into ONE reused
 *   canvas, and their texture id carries a content version so the compositor's
 *   (id, source identity) upload dedupe cannot serve stale pixels;
 * - mask rasters are served from the content-keyed raster cache, so an unchanged
 *   mask costs no canvas allocation and returns the identical canvas object.
 *
 * bun has no `OffscreenCanvas`/`Path2D`, so both are stubbed. Only object
 * identity, ids and allocation counts are asserted — never pixels.
 */
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
	registerDefaultMasks();
});

afterAll(() => {
	globals.OffscreenCanvas = previousOffscreenCanvas;
	globals.Path2D = previousPath2D;
});

const renderer = {
	width: 1920,
	height: 1080,
	canvasSize: { width: 1920, height: 1080 },
	fps: { numerator: 30, denominator: 1 },
} as unknown as CanvasRenderer;

function buildTransform(overrides: Partial<Transform> = {}): Transform {
	return {
		position: { x: 0, y: 0 },
		scaleX: 1,
		scaleY: 1,
		rotate: 0,
		...overrides,
	} as Transform;
}

function addGraphic({
	root,
	masks,
	resolvedParams,
	transform,
}: {
	root: RootNode;
	masks?: RootNode["children"][number]["params"]["masks"];
	resolvedParams: Record<string, number | string | boolean>;
	transform?: Transform;
}): GraphicNode {
	const node = new GraphicNode({
		definitionId: "rectangle",
		params: resolvedParams,
		duration: 1_000,
		timeOffset: 0,
		trimStart: 0,
		trimEnd: 1_000,
		transform: transform ?? buildTransform(),
		opacity: 1,
		masks,
	});
	node.resolved = {
		localTime: 0,
		transform: transform ?? buildTransform(),
		opacity: 1,
		effectPasses: [],
		resolvedParams,
	};
	root.add(node);
	return node;
}

function addAnimatedText(root: RootNode, content: string): TextNode {
	const element = {
		...DEFAULTS.text.element,
		content,
		canvasCenter: { x: 960, y: 540 },
		canvasHeight: 1080,
		textAnimator: DEFAULT_TEXT_ANIMATOR,
	} as unknown as TextElement;
	const node = new TextNode(element as never);
	node.resolved = {
		transform: buildTransform(),
		opacity: 1,
		textColor: "#ffffff",
		backgroundColor: "transparent",
		effectPasses: [],
		measuredText: measureTextElement({
			element,
			canvasHeight: 1080,
			localTime: 0,
			ctx: new StubOffscreenCanvas(
				1,
				1,
			).getContext() as unknown as OffscreenCanvasRenderingContext2D,
		}),
		localTime: 0,
	};
	root.add(node);
	return node;
}

function textureWithPrefix(
	textures: { id: string; source: CanvasImageSource }[],
	prefix: string,
) {
	return textures.find((texture) => texture.id.startsWith(prefix));
}

describe("graphic source texture", () => {
	it("reuses the canvas and versions the texture id when params change", () => {
		const root = new RootNode({ duration: 1_000 });
		const graphic = addGraphic({
			root,
			resolvedParams: { fill: "#ff0000" },
		});

		const first = buildFrameDescriptor({ node: root, renderer });
		const firstTexture = textureWithPrefix(first.textures, "root:0:source");
		expect(firstTexture?.id).toBe("root:0:source#1");
		// The item the compositor renders must reference the versioned id.
		const firstItem = first.frame.items[0];
		expect(firstItem?.type).toBe("layer");
		if (firstItem?.type === "layer") {
			expect(firstItem.textureId).toBe(firstTexture?.id);
		}

		// Unchanged params: same id, same canvas -> the compositor skips upload.
		const second = buildFrameDescriptor({ node: root, renderer });
		const secondTexture = textureWithPrefix(second.textures, "root:0:source");
		expect(secondTexture?.id).toBe(firstTexture?.id);
		expect(secondTexture?.source).toBe(firstTexture?.source);

		// Changed params: same canvas object, new version -> forced re-upload.
		graphic.resolved = {
			...graphic.resolved,
			resolvedParams: { fill: "#00ff00" },
		} as typeof graphic.resolved;
		const third = buildFrameDescriptor({ node: root, renderer });
		const thirdTexture = textureWithPrefix(third.textures, "root:0:source");
		expect(thirdTexture?.id).toBe("root:0:source#2");
		expect(thirdTexture?.source).toBe(firstTexture?.source);
	});
});

describe("animated text raster", () => {
	it("reuses one scratch canvas and bumps the texture id every frame", () => {
		const root = new RootNode({ duration: 1_000 });
		addAnimatedText(root, "animated one");

		const allocationsBefore = canvasAllocations;
		const first = buildFrameDescriptor({ node: root, renderer });
		const allocationsAfterFirstFrame = canvasAllocations;
		const second = buildFrameDescriptor({ node: root, renderer });

		const firstTexture = textureWithPrefix(first.textures, "root:0:text");
		const secondTexture = textureWithPrefix(second.textures, "root:0:text");
		expect(firstTexture?.id).toBe("root:0:text#1");
		expect(secondTexture?.id).toBe("root:0:text#2");
		// One scratch canvas for two frames: a fresh full-canvas OffscreenCanvas
		// per frame was ~8 MB of churn per animated text node at 1080p.
		expect(secondTexture?.source).toBe(firstTexture?.source);
		expect(allocationsAfterFirstFrame - allocationsBefore).toBe(1);
		expect(canvasAllocations).toBe(allocationsAfterFirstFrame);
	});
});

describe("mask rasters", () => {
	function addMaskedGraphic(root: RootNode, strokeWidth: number) {
		return addGraphic({
			root,
			resolvedParams: { fill: "#ff0000" },
			masks: [
				{
					id: "mask-1",
					type: "rectangle",
					params: {
						feather: 0,
						inverted: false,
						strokeColor: "#00ff00",
						strokeWidth,
						strokeAlign: "center",
						centerX: 0,
						centerY: 0,
						width: 0.6,
						height: 0.6,
						rotation: 0,
						scale: 1,
					},
				},
			],
		});
	}

	it("reuses the cached mask canvas for unchanged mask params + transform", () => {
		const root = new RootNode({ duration: 1_000 });
		addMaskedGraphic(root, 0);

		const allocationsBefore = canvasAllocations;
		const first = buildFrameDescriptor({ node: root, renderer });
		const allocationsAfterFirstFrame = canvasAllocations;
		const second = buildFrameDescriptor({ node: root, renderer });

		const firstMask = textureWithPrefix(first.textures, "root:0:mask");
		const secondMask = textureWithPrefix(second.textures, "root:0:mask");
		expect(firstMask).toBeDefined();
		// Identical canvas object for both frames: no per-frame reallocation and
		// a stable id, so the compositor skips the mask re-upload.
		expect(secondMask?.id).toBe(firstMask?.id);
		expect(secondMask?.source).toBe(firstMask?.source);
		// The first frame rasterised the mask; the second allocated nothing.
		expect(allocationsAfterFirstFrame - allocationsBefore).toBeGreaterThan(0);
		expect(canvasAllocations).toBe(allocationsAfterFirstFrame);
	});

	it("re-rasterises when the mask transform changes", () => {
		const root = new RootNode({ duration: 1_000 });
		const graphic = addMaskedGraphic(root, 0);

		const first = buildFrameDescriptor({ node: root, renderer });
		const firstMask = textureWithPrefix(first.textures, "root:0:mask");

		const moved = buildTransform({ position: { x: 40, y: 0 } });
		graphic.resolved = {
			...graphic.resolved,
			transform: moved,
		} as typeof graphic.resolved;
		const second = buildFrameDescriptor({ node: root, renderer });
		const secondMask = textureWithPrefix(second.textures, "root:0:mask");

		expect(secondMask?.source).not.toBe(firstMask?.source);
	});

	it("adds a separate cached stroke raster when a stroke is enabled", () => {
		const root = new RootNode({ duration: 1_000 });
		addMaskedGraphic(root, 6);

		const first = buildFrameDescriptor({ node: root, renderer });
		const stroke = textureWithPrefix(first.textures, "root:0:mask-stroke");
		expect(stroke).toBeDefined();

		const second = buildFrameDescriptor({ node: root, renderer });
		const secondStroke = textureWithPrefix(
			second.textures,
			"root:0:mask-stroke",
		);
		expect(secondStroke?.source).toBe(stroke?.source);
	});
});
