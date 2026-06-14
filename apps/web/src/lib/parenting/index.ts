/**
 * Layer parenting system — inspired by Alight Motion and After Effects.
 *
 * Each element can have a `parentId` referring to another element. The
 * parent's transform propagates to the child: when a parent is moved,
 * scaled, or rotated, the child follows. This makes it easy to rig complex
 * motion (e.g. a hat that follows a character's head).
 *
 * Parenting also forms a single inheritance chain (no cycles) — we walk up
 * the chain to compute the world transform of any layer.
 */

import type { Transform } from "@/lib/rendering";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type { TimelineElement, VisualElement } from "@/lib/timeline";

export type ParentableElement = VisualElement;

export interface ParentLink {
	parentId: string;
}

/**
 * Validate the parent assignment and return a sanitized link. Returns
 * `undefined` if the assignment is invalid (e.g. self-parent, cycle,
 * parent not found, or non-parentable target).
 */
export function validateParentAssignment({
	childId,
	desiredParentId,
	elementsById,
}: {
	childId: string;
	desiredParentId: string | null | undefined;
	elementsById: Map<string, TimelineElement>;
}): { parentId: string | null } {
	if (!desiredParentId) {
		return { parentId: null };
	}
	if (desiredParentId === childId) {
		return { parentId: null };
	}
	const desiredParent = elementsById.get(desiredParentId);
	if (!desiredParent || !isParentable({ element: desiredParent })) {
		return { parentId: null };
	}
	// Check for cycle: walk up from the desired parent and ensure we don't
	// hit `childId`.
	let cursor: string | undefined = desiredParentId;
	const seen = new Set<string>();
	while (cursor) {
		if (seen.has(cursor)) break;
		seen.add(cursor);
		if (cursor === childId) return { parentId: null };
		const el = elementsById.get(cursor);
		const link = (el as VisualElement | undefined)?.parentId;
		cursor = link ?? undefined;
	}
	return { parentId: desiredParentId };
}

export function isParentable({
	element,
}: {
	element: TimelineElement;
}): boolean {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "text" ||
		element.type === "sticker" ||
		element.type === "graphic" ||
		element.type === "audio"
	);
}

/**
 * Collect the chain of ancestors of `element` (closest first, then
 * grandparents, etc.). Used to detect cycles and to walk the chain when
 * rendering.
 */
export function collectAncestors({
	elementId,
	elementsById,
}: {
	elementId: string;
	elementsById: Map<string, TimelineElement>;
}): TimelineElement[] {
	const ancestors: TimelineElement[] = [];
	let cursor: string | undefined = (elementsById.get(elementId) as VisualElement | undefined)
		?.parentId;
	const seen = new Set<string>();
	while (cursor) {
		if (seen.has(cursor)) break;
		seen.add(cursor);
		const el = elementsById.get(cursor);
		if (!el) break;
		ancestors.push(el);
		cursor = (el as VisualElement).parentId ?? undefined;
	}
	return ancestors;
}

/**
 * Build a `parent → children` index for the elements.
 */
export function buildChildrenIndex({
	elements,
}: {
	elements: TimelineElement[];
}): Map<string, string[]> {
	const index = new Map<string, string[]>();
	for (const el of elements) {
		const parentId = (el as VisualElement).parentId;
		if (!parentId) continue;
		const list = index.get(parentId) ?? [];
		list.push(el.id);
		index.set(parentId, list);
	}
	return index;
}

/**
 * Compose transforms from the root down to the leaf. Each level's position
 * is relative to the parent, so we add. Scale multiplies, rotation
 * composes, and opacity is multiplicative.
 */
export function composeWorldTransform({
	ancestors,
	leaf,
}: {
	ancestors: TimelineElement[];
	leaf: ParentableElement;
}): Transform & { opacity: number } {
	let posX = leaf.transform.position.x;
	let posY = leaf.transform.position.y;
	let scaleX = leaf.transform.scaleX;
	let scaleY = leaf.transform.scaleY;
	let rotate = leaf.transform.rotate;
	let opacity = leaf.opacity;

	// ancestors are ordered closest-first, so we walk from innermost parent
	// outwards.
	for (let i = ancestors.length - 1; i >= 0; i--) {
		const parent = ancestors[i] as ParentableElement;
		const rad = (parent.transform.rotate * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		// Rotate the leaf's local position by the parent's rotation, then
		// scale, then translate.
		const lx = posX * scaleX;
		const ly = posY * scaleY;
		const rx = lx * cos - ly * sin;
		const ry = lx * sin + ly * cos;

		posX = (parent.transform.position.x + rx) / Math.max(1e-6, parent.transform.scaleX);
		posY = (parent.transform.position.y + ry) / Math.max(1e-6, parent.transform.scaleY);
		scaleX *= parent.transform.scaleX;
		scaleY *= parent.transform.scaleY;
		rotate += parent.transform.rotate;
		opacity *= parent.opacity;
	}

	return {
		position: { x: posX, y: posY },
		scaleX,
		scaleY,
		rotate,
		opacity,
	};
}

export function defaultTransform(): Transform {
	return { ...DEFAULTS.element.transform };
}
