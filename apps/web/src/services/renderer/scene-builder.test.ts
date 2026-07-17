import { describe, expect, it } from "bun:test";
import { buildScene } from "./scene-builder";
import { serializeSceneTree } from "./scene-serializer";
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
						params: {
							amount: 40,
							shift: 0,
							singleLine: false,
							orientation: "horizontal",
						},
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
		const effectLayerNode = root.children.find(
			(child) => child instanceof EffectLayerNode,
		);
		expect(effectLayerNode).toBeDefined();
		if (effectLayerNode instanceof EffectLayerNode) {
			expect(effectLayerNode.params.effectType).toBe("tile");
		}
	});
});

describe("image scene worker serialization", () => {
	it("transfers the image file so the worker can restore its blob URL", () => {
		const file = new File(["image"], "frame.png", { type: "image/png" });
		const tracks = buildSceneTracks();
		tracks.main.elements.push({
			id: "image-1",
			name: "Frame",
			type: "image",
			mediaId: "media-1",
			startTime: 0,
			duration: 600_000,
			trimStart: 0,
			trimEnd: 0,
			transform: {
				position: { x: 0, y: 0 },
				scaleX: 1,
				scaleY: 1,
				rotate: 0,
			},
			opacity: 1,
		});

		const root = buildScene({
			tracks,
			mediaAssets: [
				{
					id: "media-1",
					name: "frame.png",
					type: "image",
					file,
					url: "blob:http://localhost/media-1",
				},
			],
			duration: 600_000,
			canvasSize: { width: 1920, height: 1080 },
			background: { type: "color", color: "#000000" },
		});

		const serialized = serializeSceneTree(root);
		const image = serialized.tree.children.find(
			(node) => node.type === "image",
		);

		expect(serialized.files.get("media-1")).toBe(file);
		expect(image?.params.mediaId).toBe("media-1");
		expect(image?.params.url).toBeUndefined();
	});
});
