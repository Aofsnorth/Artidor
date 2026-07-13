import { beforeAll, describe, expect, it } from "bun:test";
import { resolveEffectLayerNode, type ResolveContext } from "./resolve";
import type { CanvasRenderer } from "./canvas-renderer";
import { EffectLayerNode, type EffectLayerNodeParams } from "./nodes/effect-layer-node";
import { registerDefaultEffects } from "@/lib/effects";
import { buildDefaultEffectInstance } from "@/lib/effects";

function createEffectLayerNode(params: EffectLayerNodeParams): EffectLayerNode {
	return new EffectLayerNode(params);
}

const mockRenderer = {
	canvasSize: { width: 1920, height: 1080 },
} as unknown as CanvasRenderer;

beforeAll(() => {
	registerDefaultEffects();
});

describe("resolveEffectLayerNode", () => {
	it("still resolves effect at exact boundary with 1e-3 tolerance", () => {
		const node = createEffectLayerNode({
			timeOffset: 0,
			duration: 100,
			effectType: "brightness",
			effectParams: {},
		});
		const result = resolveEffectLayerNode({
			node,
			context: { time: 100 + 1e-4, renderer: mockRenderer } as ResolveContext,
		});
		expect(result).not.toBeNull();
	});

	it("resolves tile effect with default params to non-zero amount", () => {
		const instance = buildDefaultEffectInstance({ effectType: "tile" });
		const node = createEffectLayerNode({
			timeOffset: 0,
			duration: 100,
			effectType: "tile",
			effectParams: instance.params,
		});
		const result = resolveEffectLayerNode({
			node,
			context: { time: 0, renderer: mockRenderer } as ResolveContext,
		});
		expect(result).not.toBeNull();
		expect(result?.passes.length).toBe(1);
		const uniforms = result?.passes[0]?.uniforms;
		expect(uniforms?.u_amount).toBe(0.4);
		expect(uniforms?.u_shift).toBe(0);
		expect(uniforms?.u_single_line).toBe(0);
		expect(uniforms?.u_orientation).toBe(0);
	});
});
