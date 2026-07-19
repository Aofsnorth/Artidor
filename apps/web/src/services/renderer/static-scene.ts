import type { SerializedNode } from "./scene-serializer";

const STATIC_NODE_TYPES = new Set([
	"root",
	"color",
	"image",
	"sticker",
	"text",
	"graphic",
]);

function hasEntries(value: unknown): boolean {
	return (
		typeof value === "object" && value !== null && Object.keys(value).length > 0
	);
}

function isNodeStatic(node: SerializedNode, durationTicks: number): boolean {
	if (!STATIC_NODE_TYPES.has(node.type)) return false;
	if (node.type !== "root" && node.type !== "color") {
		const timeOffset = Number(node.params.timeOffset ?? 0);
		const duration = Number(node.params.duration ?? 0);
		const endTime = timeOffset + duration;
		if (timeOffset > 0 || endTime < durationTicks) return false;
	}

	if (hasEntries(node.params.animations)) return false;
	if (hasEntries(node.params.parentChain)) return false;
	if (hasEntries(node.params.effects)) return false;
	if (hasEntries(node.params.masks)) return false;
	if (node.params.retime !== undefined) return false;
	if (node.params.textAnimator !== undefined) return false;

	return node.children.every((child) => isNodeStatic(child, durationTicks));
}

/**
 * Returns true only when one rendered frame is valid for the entire timeline.
 * False negatives are intentional: uncertain scenes use the normal frame loop.
 */
export function isStaticScene({
	sceneTree,
	durationTicks,
}: {
	sceneTree: SerializedNode;
	durationTicks: number;
}): boolean {
	return durationTicks > 0 && isNodeStatic(sceneTree, durationTicks);
}
