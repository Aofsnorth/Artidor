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

/**
 * Keyframe easing presets, mirroring After Effects' keyframe assistant:
 *  - `ease`     — Easy Ease (F9): smooth in AND out (flat tangents both sides).
 *  - `ease-in`  — Easy Ease In (Shift+F9): smooth the incoming segment only.
 *  - `ease-out` — Easy Ease Out (Ctrl+Shift+F9): smooth the outgoing segment only.
 *  - `linear`   — straight lines through the keyframe (no handles).
 *  - `hold`     — value holds constant until the next keyframe (step).
 */
export type KeyframeEasingMode =
	| "ease"
	| "ease-in"
	| "ease-out"
	| "linear"
	| "hold";

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
 * Builds the curve patches that apply an After-Effects-style easing preset to the
 * given keyframes of a single element.
 *
 * For each affected component channel it adjusts the incoming segment
 * (previous -> current) and/or the outgoing segment (current -> next) according
 * to `mode`. Because a segment's curve is governed by its LEFT keyframe, easing
 * an incoming segment also flips the previous keyframe to bezier so its left
 * handle takes effect.
 *
 * Explicit hold ("step") segments are preserved when easing/linearizing so a
 * deliberate hold survives. Single keyframes with no neighbours produce no
 * patches for the segment they lack.
 */
export function buildKeyframeEasingPatchesForElement({
	element,
	keyframes,
	mode,
}: {
	element: TimelineElement;
	keyframes: EasyEaseKeyframeRef[];
	mode: KeyframeEasingMode;
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

	const easeOutgoing = mode === "ease" || mode === "ease-out";
	const easeIncoming = mode === "ease" || mode === "ease-in";

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

			if (mode === "hold") {
				// Hold is an outgoing-only concept: value stays put until next key.
				if (nextKey) {
					addPatch({
						propertyPath,
						componentKey,
						keyframeId,
						patch: { segmentToNext: "step", rightHandle: null },
					});
				}
				continue;
			}

			if (mode === "linear") {
				// Straight lines through this keyframe: linearize both adjacent
				// segments and drop handles. Preserve deliberate holds.
				if (nextKey && currentKey.segmentToNext !== "step") {
					addPatch({
						propertyPath,
						componentKey,
						keyframeId,
						patch: {
							segmentToNext: "linear",
							rightHandle: null,
							tangentMode: "aligned",
						},
					});
				}
				if (previousKey && previousKey.segmentToNext !== "step") {
					addPatch({
						propertyPath,
						componentKey,
						keyframeId,
						patch: { leftHandle: null, tangentMode: "aligned" },
					});
					addPatch({
						propertyPath,
						componentKey,
						keyframeId: previousKey.id,
						patch: { segmentToNext: "linear", rightHandle: null },
					});
				}
				continue;
			}

			const patch: ScalarCurveKeyframePatch = { tangentMode: "flat" };

			// Ease the outgoing segment (current -> next).
			if (easeOutgoing && nextKey && currentKey.segmentToNext !== "step") {
				patch.segmentToNext = "bezier";
				patch.rightHandle = {
					dt: (nextKey.time - currentKey.time) * EASE_INFLUENCE,
					dv: 0,
				};
			}

			// Ease the incoming segment (previous -> current).
			if (easeIncoming && previousKey && previousKey.segmentToNext !== "step") {
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

/**
 * Convenience wrapper that applies the full "Easy Ease" (smooth in and out)
 * preset. Equivalent to {@link buildKeyframeEasingPatchesForElement} with
 * `mode: "ease"`.
 */
export function buildEasyEasePatchesForElement({
	element,
	keyframes,
}: {
	element: TimelineElement;
	keyframes: EasyEaseKeyframeRef[];
}): EasyEasePatchEntry[] {
	return buildKeyframeEasingPatchesForElement({
		element,
		keyframes,
		mode: "ease",
	});
}
