import { beforeAll, describe, expect, it } from "bun:test";
import { buildFrameDescriptor } from "./frame-descriptor";
import { resolveRenderTree } from "../resolve";
import { RootNode } from "../nodes/root-node";
import { EffectLayerNode } from "../nodes/effect-layer-node";
import type { CanvasRenderer } from "../canvas-renderer";
import { registerDefaultEffects } from "@/lib/effects";

beforeAll(() => {
	registerDefaultEffects();
});

const mockRenderer = {
	width: 1920,
	height: 1080,
	canvasSize: { width: 1920, height: 1080 },
	fps: { numerator: 30, denominator: 1 },
} as unknown as CanvasRenderer;

describe("buildFrameDescriptor for scene effects", () => {
	it("includes sceneEffect for an EffectLayerNode", async () => {
		const root = new RootNode({ duration: 600_000 });
		root.add(
			new EffectLayerNode({
				effectType: "tile",
				effectParams: { amount: 40, shift: 0, singleLine: false, orientation: "horizontal" },
				timeOffset: 0,
				duration: 600_000,
			}),
		);

		await resolveRenderTree({ node: root, renderer: mockRenderer, time: 0 });
		const { frame } = await buildFrameDescriptor({ node: root, renderer: mockRenderer });

		expect(frame.items.length).toBe(1);
		const item = frame.items[0];
		expect(item.type).toBe("sceneEffect");
		if (item.type === "sceneEffect") {
			expect(item.effectPassGroups.length).toBe(1);
			expect(item.effectPassGroups[0]?.length).toBe(1);
			const pass = item.effectPassGroups[0]?.[0];
			expect(pass?.shader).toBe("tile");
			expect(pass?.uniforms.u_amount).toBe(0.4);
			expect(pass?.uniforms.u_single_line).toBe(0);
			expect(pass?.uniforms.u_orientation).toBe(0);
		}
	});
});
