import { describe, expect, it } from "bun:test";
import { buildScene } from "./scene-builder";
import { EffectLayerNode } from "./nodes/effect-layer-node";
import { RootNode } from "./nodes/root-node";
import type { SceneTracks } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";

function buildSceneTracks(): SceneTracks {
	return {
		overlay: [
			{
				id: "effect-track-1",
				name: "Effect Track",
				type: "effect",
				hidden: false,
				elements: [
					{
						id: "effect-1",
						name: "Tile",
						type: "effect",
						effectType: "tile",
						params: { amount: 40, shift: 0, singleLine: false, orientation: "horizontal" },
						startTime: 0,
						duration: 600_000,
						trimStart: 0,
						trimEnd: 0,
					},
				],
			},
		],
		main: {
			id: "main-track",
			name: "Main Video",
			type: "video",
			elements: [],
			hidden: false,
			muted: false,
		},
		overlayAfter: [],
		audio: [],
	};
}

describe("buildScene with effect tracks", () => {
	it("includes an EffectLayerNode in the render tree", () => {
		const root = buildScene({
			tracks: buildSceneTracks(),
			mediaAssets: [] as MediaAsset[],
			duration: 600_000,
			canvasSize: { width: 1920, height: 1080 },
			background: { type: "color", color: "#000000" },
		});

		expect(root).toBeInstanceOf(RootNode);
		const effectLayerNode = root.children.find((child) => child instanceof EffectLayerNode);
		expect(effectLayerNode).toBeDefined();
		if (effectLayerNode instanceof EffectLayerNode) {
			expect(effectLayerNode.params.effectType).toBe("tile");
		}
	});
});
