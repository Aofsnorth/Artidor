import { getEditableScalarChannels } from "@/lib/animation/graph-channels";
import type {
	AnimationPath,
	ScalarAnimationKey,
	ScalarCurveKeyframePatch,
} from "@/lib/animation/types";
import type { TimelineElement } from "@/lib/timeline";

/**
 * Influence of an Easy-Ease handle, as a fraction of the segment's time span.
 * Matches After Effects' default "Easy Ease" influence of ~33.33%.
 */
const EASE_INFLUENCE = 1 / 3;

export interface EasyEaseKeyframeRef {
	propertyPath: AnimationPath;
	keyframeId: string;
}

export interface EasyEasePatchEntry {
	propertyPath: AnimationPath;
	componentKey: string;
	keyframeId: string;
	patch: ScalarCurveKeyframePatch;
}

function mergePatch({
	target,
	patch,
}: {
	target: ScalarCurveKeyframePatch;
	patch: ScalarCurveKeyframePatch;
}): ScalarCurveKeyframePatch {
	return {
		...target,
		...patch,
	};
}

/**
 * Builds the curve patches that apply an After-Effects-style "Easy Ease" to the
 * given keyframes of a single element.
 *
 * An Easy Ease makes the value arrive at and leave the keyframe with zero
 * velocity (flat tangents), producing a smooth ease-in/ease-out. For each
 * affected component channel it:
 *  - eases the OUTGOING segment by converting it to bezier and giving the
 *    keyframe a flat right handle,
 *  - eases the INCOMING segment by giving the keyframe a flat left handle and
 *    converting the previous keyframe's segment to bezier (otherwise the left
 *    handle would be ignored).
 *
 * Hold ("step") segments are left untouched so explicit holds survive.
 * Single keyframes with no neighbours produce no patches.
 */
export function buildEasyEasePatchesForElement({
	element,
	keyframes,
}: {
	element: TimelineElement;
	keyframes: EasyEaseKeyframeRef[];
}): EasyEasePatchEntry[] {
	if (!element.animations || keyframes.length === 0) {
		return [];
	}

	// Merge patches per (componentKey, keyframeId) so a keyframe that is both
	// selected and the predecessor of another selected keyframe collapses into a
	// single command instead of racing two partial updates.
	const merged = new Map<
		string,
		{
			propertyPath: AnimationPath;
			componentKey: string;
			keyframeId: string;
			patch: ScalarCurveKeyframePatch;
		}
	>();

	const addPatch = ({
		propertyPath,
		componentKey,
		keyframeId,
		patch,
	}: EasyEasePatchEntry) => {
		const mapKey = `${propertyPath}:${componentKey}:${keyframeId}`;
		const existing = merged.get(mapKey);
		if (existing) {
			existing.patch = mergePatch({ target: existing.patch, patch });
			return;
		}
		merged.set(mapKey, { propertyPath, componentKey, keyframeId, patch });
	};

	for (const { propertyPath, keyframeId } of keyframes) {
		const scalarResult = getEditableScalarChannels({
			animations: element.animations,
			propertyPath,
		});
		if (!scalarResult) {
			continue;
		}

		for (const { componentKey, channel } of scalarResult.channels) {
			const sortedKeys = [...channel.keys].sort((a, b) => a.time - b.time);
			const index = sortedKeys.findIndex((key) => key.id === keyframeId);
			if (index < 0) {
				continue;
			}

			const currentKey = sortedKeys[index];
			const previousKey: ScalarAnimationKey | undefined = sortedKeys[index - 1];
			const nextKey: ScalarAnimationKey | undefined = sortedKeys[index + 1];

			const patch: ScalarCurveKeyframePatch = { tangentMode: "flat" };

			// Ease the outgoing segment (current -> next).
			if (nextKey && currentKey.segmentToNext !== "step") {
				patch.segmentToNext = "bezier";
				patch.rightHandle = {
					dt: (nextKey.time - currentKey.time) * EASE_INFLUENCE,
					dv: 0,
				};
			}

			// Ease the incoming segment (previous -> current).
			if (previousKey && previousKey.segmentToNext !== "step") {
				patch.leftHandle = {
					dt: -(currentKey.time - previousKey.time) * EASE_INFLUENCE,
					dv: 0,
				};
				// The segment type is governed by the LEFT key, so the previous
				// keyframe must be bezier for the left handle to take effect.
				addPatch({
					propertyPath,
					componentKey,
					keyframeId: previousKey.id,
					patch: { segmentToNext: "bezier" },
				});
			}

			addPatch({ propertyPath, componentKey, keyframeId, patch });
		}
	}

	return [...merged.values()];
}
