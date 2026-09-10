/**
 * Deserializes a scene tree in a Web Worker.
 *
 * Reconstructs class instances from the plain data format sent by the
 * main thread, and creates Blob URLs for media files. The caller owns the
 * returned tree and must call {@link revokeSceneBlobUrls} when the export
 * finishes (or is cancelled) so per-export blob URLs do not accumulate.
 */

import type { AnyBaseNode } from "./nodes/base-node";
import { RootNode } from "./nodes/root-node";
import { VideoNode, type VideoNodeParams } from "./nodes/video-node";
import { ImageNode, type ImageNodeParams } from "./nodes/image-node";
import { TextNode, type TextNodeParams } from "./nodes/text-node";
import { StickerNode, type StickerNodeParams } from "./nodes/sticker-node";
import { GraphicNode, type GraphicNodeParams } from "./nodes/graphic-node";
import {
	BlurBackgroundNode,
	type BlurBackgroundNodeParams,
} from "./nodes/blur-background-node";
import {
	EffectLayerNode,
	type EffectLayerNodeParams,
} from "./nodes/effect-layer-node";
import { ColorNode, type ColorNodeParams } from "./nodes/color-node";
import type { SerializedNode } from "./scene-serializer";

/**
 * Release the blob URLs created by {@link deserializeSceneTree} for one
 * export run. Safe to call with an empty map or with URLs that were already
 * revoked.
 */
export function revokeSceneBlobUrls(blobUrls: Map<string, string>): void {
	for (const url of blobUrls.values()) {
		try {
			URL.revokeObjectURL(url);
		} catch {
			// Already revoked or invalid — nothing left to free.
		}
	}
	blobUrls.clear();
}

/**
 * Reconstruct a node tree from serialized data.
 * Creates Blob URLs for media files and attaches them to the nodes.
 *
 * Returns both the tree and the created blob URLs so the caller can revoke
 * them with {@link revokeSceneBlobUrls} after the export settles.
 */
export function deserializeSceneTree(
	serialized: SerializedNode,
	files: Map<string, File>,
): { root: AnyBaseNode; blobUrls: Map<string, string> } {
	// Create blob URLs for media files
	const blobUrls = new Map<string, string>();
	for (const [mediaId, file] of files) {
		blobUrls.set(mediaId, URL.createObjectURL(file));
	}

	function deserialize(data: SerializedNode): AnyBaseNode {
		const params = { ...data.params } as Record<string, unknown>;

		// Reattach File objects and Blob URLs for video/image/blur-background nodes
		if (
			data.type === "video" ||
			data.type === "image" ||
			data.type === "blur-background"
		) {
			const mediaId = params.mediaId as string | undefined;
			if (mediaId) {
				const file = files.get(mediaId);
				if (file) {
					params.file = file;
				}
				const blobUrl = blobUrls.get(mediaId);
				if (blobUrl) {
					params.url = blobUrl;
				}
			}
		}

		let node: AnyBaseNode;

		switch (data.type) {
			case "video":
				node = new VideoNode(params as unknown as VideoNodeParams);
				break;
			case "image":
				node = new ImageNode(params as unknown as ImageNodeParams);
				break;
			case "text":
				node = new TextNode(params as unknown as TextNodeParams);
				break;
			case "sticker":
				node = new StickerNode(params as unknown as StickerNodeParams);
				break;
			case "graphic":
				node = new GraphicNode(params as unknown as GraphicNodeParams);
				break;
			case "blur-background":
				node = new BlurBackgroundNode(
					params as unknown as BlurBackgroundNodeParams,
				);
				break;
			case "effect-layer": {
				// A stale effectType (removed plugin) must not fail the whole
				// export — resolve.ts already skips unregistered types, so keep
				// the node and let resolution produce no passes.
				node = new EffectLayerNode(params as unknown as EffectLayerNodeParams);
				break;
			}
			case "color":
				node = new ColorNode(params as unknown as ColorNodeParams);
				break;
			default:
				node = new RootNode(params as { duration: number });
				break;
		}

		node.children = data.children.map((child) => deserialize(child));
		return node;
	}

	return { root: deserialize(serialized), blobUrls };
}
