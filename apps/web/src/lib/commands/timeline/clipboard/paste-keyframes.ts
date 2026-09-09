import { EditorCore } from "@/core";
import {
	getKeyframeAtTime,
	resolveAnimationTarget,
	updateScalarKeyframeCurve,
	upsertPathKeyframe,
} from "@/lib/animation";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { KeyframeClipboardItem } from "@/lib/clipboard";
import type { ElementRef, SceneTracks, TimelineElement } from "@/lib/timeline";
import { updateElementInSceneTracks } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";

function pasteKeyframesIntoElement({
	element,
	time,
	clipboardItems,
}: {
	element: TimelineElement;
	time: number;
	clipboardItems: KeyframeClipboardItem[];
}): TimelineElement {
	let nextElement = element;

	for (const item of clipboardItems) {
		const target = resolveAnimationTarget({
			element: nextElement,
			path: item.propertyPath,
		});
		if (!target) {
			continue;
		}

		// Preserve spacing: omit out-of-clip keys instead of piling them at an endpoint.
		const keyframeTime = time + item.timeOffset;
		if (
			!Number.isFinite(keyframeTime) ||
			keyframeTime < 0 ||
			keyframeTime > nextElement.duration
		) {
			continue;
		}
		const nextAnimations = upsertPathKeyframe({
			animations: nextElement.animations,
			propertyPath: item.propertyPath,
			time: keyframeTime,
			value: item.value,
			interpolation: item.interpolation,
			keyframeId: generateUUID(),
			kind: target.kind,
			defaultInterpolation: target.defaultInterpolation,
			coerceValue: target.coerceValue,
		});
		const pastedKeyframe = getKeyframeAtTime({
			animations: nextAnimations,
			propertyPath: item.propertyPath,
			time: keyframeTime,
		});

		let patchedAnimations = nextAnimations;
		if (pastedKeyframe) {
			for (const curvePatch of item.curvePatches) {
				const nextPatchedAnimations = updateScalarKeyframeCurve({
					animations: patchedAnimations,
					propertyPath: item.propertyPath,
					componentKey: curvePatch.componentKey,
					keyframeId: pastedKeyframe.id,
					patch: curvePatch.patch,
				});
				patchedAnimations = nextPatchedAnimations ?? patchedAnimations;
			}
		}

		nextElement = {
			...nextElement,
			animations: patchedAnimations,
		};
	}

	return nextElement;
}

/** Paste at clip-local ticks; keys outside [0, duration] are omitted, never rescaled. */
export class PasteKeyframesCommand extends Command {
	private savedState: SceneTracks | null = null;
	private pastedState: SceneTracks | null = null;
	private readonly targets: ElementRef[];
	private readonly time: number;
	private readonly clipboardItems: KeyframeClipboardItem[];

	constructor({
		targets,
		time,
		clipboardItems,
	}: {
		/** One or more targets; all get the keys in one undoable step (AE behavior). */
		targets: ElementRef[];
		time: number;
		clipboardItems: KeyframeClipboardItem[];
	}) {
		super();
		this.targets = targets;
		this.time = time;
		this.clipboardItems = structuredClone(clipboardItems);
	}

	execute(): CommandResult | undefined {
		if (this.clipboardItems.length === 0 || this.targets.length === 0) {
			return undefined;
		}

		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		let updatedTracks = this.savedState;
		for (const target of this.targets) {
			// A missing target resolves to a no-op update (elementId doesn't match
			// any element), so the other targets still get their keys and the
			// command stays one undo step.
			updatedTracks = updateElementInSceneTracks({
				tracks: updatedTracks,
				trackId: target.trackId,
				elementId: target.elementId,
				update: (element) =>
					pasteKeyframesIntoElement({
						element,
						time: this.time,
						clipboardItems: this.clipboardItems,
					}),
			});
		}

		this.pastedState = structuredClone(updatedTracks);
		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	/** Replays the exact post-execute snapshot so pasted keyframe IDs stay stable. */
	redo(): CommandResult | undefined {
		if (this.pastedState) {
			EditorCore.getInstance().timeline.updateTracks(
				structuredClone(this.pastedState),
			);
		}
		return undefined;
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}
