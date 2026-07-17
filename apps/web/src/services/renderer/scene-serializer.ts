/**
 * Serializes a scene tree for transfer to a Web Worker.
 *
 * Class instances with methods (BaseNode, VideoNode, etc.) cannot be
 * transferred via postMessage. This module converts the tree to a plain
 * data format and extracts File/Blob objects as Transferables.
 */

import type { AnyBaseNode } from "./nodes/base-node";
import type { RootNode } from "./nodes/root-node";
import { VideoNode } from "./nodes/video-node";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { StickerNode } from "./nodes/sticker-node";
import { GraphicNode } from "./nodes/graphic-node";
import { BlurBackgroundNode } from "./nodes/blur-background-node";
import { EffectLayerNode } from "./nodes/effect-layer-node";
import { ColorNode } from "./nodes/color-node";

export type SerializedNode = {
	type: string;
	params: Record<string, unknown>;
	children: SerializedNode[];
};

export type SerializedSceneTree = {
	tree: SerializedNode;
	files: Map<string, File>;
};

/**
 * Extract the node type tag from a class instance.
 */
function getNodeType(node: AnyBaseNode): string {
	if (node instanceof VideoNode) return "video";
	if (node instanceof ImageNode) return "image";
	if (node instanceof TextNode) return "text";
	if (node instanceof StickerNode) return "sticker";
	if (node instanceof GraphicNode) return "graphic";
	if (node instanceof BlurBackgroundNode) return "blur-background";
	if (node instanceof EffectLayerNode) return "effect-layer";
	if (node instanceof ColorNode) return "color";
	return "root";
}

/**
 * Serialize a node tree to a plain data format.
 * Extracts File objects into a separate map keyed by mediaId.
 */
export function serializeSceneTree(root: RootNode): SerializedSceneTree {
	const files = new Map<string, File>();

	function serialize(node: AnyBaseNode): SerializedNode {
		const params = { ...node.params } as Record<string, unknown>;

		// Extract media files for worker transfer. Blob URLs are scoped to the
		// current global, so the worker must create its own URL from the File.
		if (
			node instanceof VideoNode ||
			node instanceof ImageNode ||
			node instanceof BlurBackgroundNode
		) {
			const file = params.file as File | undefined;
			const mediaId = params.mediaId as string | undefined;
			if (file && mediaId) {
				files.set(mediaId, file);
				// Replace File with a placeholder; worker will reconstruct
				delete params.file;
			}
		}

		// Replace Blob URLs with mediaId references; worker creates its own URLs
		if (typeof params.url === "string" && params.url.startsWith("blob:")) {
			delete params.url;
		}

		return {
			type: getNodeType(node),
			params,
			children: node.children.map((child) => serialize(child)),
		};
	}

	return {
		tree: serialize(root),
		files,
	};
}
