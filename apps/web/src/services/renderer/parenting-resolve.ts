import { getElementLocalTime, resolveTransformAtTime } from "@/lib/animation";
import type { ElementAnimations } from "@/lib/animation/types";
import type { Transform } from "@/lib/rendering";

/**
 * One ancestor in a layer's parent chain, with everything needed to resolve its
 * own animated transform at an arbitrary timeline time. Ordered closest-first
 * (direct parent, then grandparent, ...).
 */
export interface ParentChainEntry {
	transform: Transform;
	animations: ElementAnimations | undefined;
	/** Parent element's start time on the timeline (ticks). */
	timeOffset: number;
	/** Parent element's duration (ticks). */
	duration: number;
}

/**
 * Composes a child transform into its parent's world transform. Position is
 * rotated by the parent's rotation, scaled by the parent's scale, then offset by
 * the parent's position; scales multiply and rotations add. The child's own
 * `positionZ` and `pivot` are preserved (parenting only links 2D position,
 * scale and rotation — matching After Effects).
 */
function composeChildIntoParent({
	child,
	parent,
}: {
	child: Transform;
	parent: Transform;
}): Transform {
	const radians = (parent.rotate * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const rotatedX = child.position.x * cos - child.position.y * sin;
	const rotatedY = child.position.x * sin + child.position.y * cos;

	return {
		...child,
		position: {
			x: parent.position.x + rotatedX * parent.scaleX,
			y: parent.position.y + rotatedY * parent.scaleY,
		},
		scaleX: child.scaleX * parent.scaleX,
		scaleY: child.scaleY * parent.scaleY,
		rotate: child.rotate + parent.rotate,
	};
}

/**
 * Resolves a layer's effective (world) transform by composing its already
 * locally-resolved transform with each ancestor's animated transform evaluated
 * at the same timeline `time`. Returns `localTransform` unchanged when the layer
 * has no parent chain.
 */
export function resolveParentedTransform({
	localTransform,
	parentChain,
	time,
}: {
	localTransform: Transform;
	parentChain: ParentChainEntry[] | undefined;
	time: number;
}): Transform {
	if (!parentChain || parentChain.length === 0) {
		return localTransform;
	}

	// Build the outermost ancestor's world transform first, then fold inward so
	// each closer ancestor is composed on top of the accumulated world.
	let parentWorld: Transform | null = null;
	for (let index = parentChain.length - 1; index >= 0; index--) {
		const entry = parentChain[index];
		const localTime = getElementLocalTime({
			timelineTime: time,
			elementStartTime: entry.timeOffset,
			elementDuration: entry.duration,
		});
		const resolved = resolveTransformAtTime({
			baseTransform: entry.transform,
			animations: entry.animations,
			localTime,
		});
		parentWorld = parentWorld
			? composeChildIntoParent({ child: resolved, parent: parentWorld })
			: resolved;
	}

	return parentWorld
		? composeChildIntoParent({ child: localTransform, parent: parentWorld })
		: localTransform;
}
