/**
 * Layer parenting utilities (Alight Motion "Link parent and child layers").
 *
 * When a layer has a `parentId`, its world-space transform is the composition
 * of its own transform with its parent's world-space transform. This module
 * walks up the parent chain to compute the final transform.
 */
import type { Transform } from "@/lib/rendering";
import type { TimelineElement, SceneTracks } from "@/lib/timeline";

const DEFAULT_TRANSFORM: Transform = {
	scaleX: 1,
	scaleY: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

export function getEffectiveTransform({
	element,
	tracks,
}: {
	element: TimelineElement;
	tracks: SceneTracks;
}): Transform {
	const baseTransform = "transform" in element ? element.transform : DEFAULT_TRANSFORM;
	const allElements = collectAllElements({ tracks });
	return composeParentTransform({
		element,
		baseTransform,
		allElements,
		visited: new Set<string>(),
	});
}

function composeParentTransform({
	element,
	baseTransform,
	allElements,
	visited,
}: {
	element: TimelineElement;
	baseTransform: Transform;
	allElements: Map<string, { element: TimelineElement; trackId: string }>;
	visited: Set<string>;
}): Transform {
	const parentId = (element as { parentId?: string }).parentId;
	if (!parentId || visited.has(parentId)) {
		return baseTransform;
	}
	const parentEntry = allElements.get(parentId);
	if (!parentEntry) {
		return baseTransform;
	}
	visited.add(element.id);

	const parentElement = parentEntry.element;
	const parentBaseTransform =
		"transform" in parentElement ? parentElement.transform : DEFAULT_TRANSFORM;

	// Recurse up to get the parent's world transform, then combine.
	const parentWorld = composeParentTransform({
		element: parentElement,
		baseTransform: parentBaseTransform,
		allElements,
		visited,
	});

	return composeTransforms({ child: baseTransform, parent: parentWorld });
}

function composeTransforms({
	child,
	parent,
}: {
	child: Transform;
	parent: Transform;
}): Transform {
	// Position: child position rotated by parent rotation, scaled by parent
	// scale, then offset by parent position.
	const childPosRotated = rotatePoint({
		point: child.position,
		rotationDegrees: parent.rotate,
	});
	const childPosScaled = {
		x: childPosRotated.x * parent.scaleX,
		y: childPosRotated.y * parent.scaleY,
	};
	return {
		scaleX: child.scaleX * parent.scaleX,
		scaleY: child.scaleY * parent.scaleY,
		rotate: child.rotate + parent.rotate,
		position: {
			x: parent.position.x + childPosScaled.x,
			y: parent.position.y + childPosScaled.y,
		},
	};
}

function rotatePoint({
	point,
	rotationDegrees,
}: {
	point: { x: number; y: number };
	rotationDegrees: number;
}): { x: number; y: number } {
	const rad = (rotationDegrees * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return {
		x: point.x * cos - point.y * sin,
		y: point.x * sin + point.y * cos,
	};
}

function collectAllElements({
	tracks,
}: {
	tracks: SceneTracks;
}): Map<string, { element: TimelineElement; trackId: string }> {
	const map = new Map<string, { element: TimelineElement; trackId: string }>();
	for (const track of [
		...tracks.overlay,
		tracks.main,
		...tracks.audio,
	]) {
		for (const el of track.elements) {
			map.set(el.id, { element: el, trackId: track.id });
		}
	}
	return map;
}

/**
 * Validate the parent chain to detect cycles. Returns true if the chain
 * is valid (acyclic), false if it would form a loop.
 */
export function isValidParentChain({
	element,
	tracks,
	newParentId,
}: {
	element: TimelineElement;
	tracks: SceneTracks;
	newParentId: string | undefined;
}): boolean {
	if (!newParentId) return true;
	if (newParentId === element.id) return false;
	const map = collectAllElements({ tracks });
	let cursor: string | undefined = newParentId;
	const seen = new Set<string>();
	while (cursor) {
		if (cursor === element.id) return false;
		if (seen.has(cursor)) return false; // existing cycle
		seen.add(cursor);
		const parent = map.get(cursor);
		cursor = parent?.element
			? (parent.element as { parentId?: string }).parentId
			: undefined;
	}
	return true;
}

/**
 * Return all children of a given parent id (direct children only).
 */
export function getDirectChildren({
	parentId,
	tracks,
}: {
	parentId: string;
	tracks: SceneTracks;
}): TimelineElement[] {
	const map = collectAllElements({ tracks });
	const children: TimelineElement[] = [];
	for (const { element } of map.values()) {
		const pid = (element as { parentId?: string }).parentId;
		if (pid === parentId) children.push(element);
	}
	return children;
}
