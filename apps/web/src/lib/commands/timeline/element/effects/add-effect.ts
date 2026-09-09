import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isVisualElement, updateElementInSceneTracks } from "@/lib/timeline";
import type { SceneTracks, VisualElement } from "@/lib/timeline";
import { buildDefaultEffectInstance } from "@/lib/effects";
import type { Effect } from "@/lib/effects/types";

function buildDefaultEffectInstanceDeep({
	effectType,
}: {
	effectType: string;
}): Effect | null {
	const instance = buildDefaultEffectInstance({ effectType });
	if (!instance) {
		return null;
	}
	// buildDefaultEffectInstance may return shared default params; clone the
	// instance so two clips never animate or mutate the same param object.
	return structuredClone(instance);
}

function addEffectToElement({
	element,
	effectType,
}: {
	element: VisualElement;
	effectType: string;
}): VisualElement {
	const instance = buildDefaultEffectInstanceDeep({ effectType });
	const currentEffects = element.effects ?? [];
	return { ...element, effects: [...currentEffects, ...(instance ? [instance] : [])] };
}

export class AddClipEffectCommand extends Command {
	private savedState: SceneTracks | null = null;
	/** Post-execute snapshot so redo restores the exact same effect id. */
	private addedState: SceneTracks | null = null;
	private effectId: string | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly effectType: string;

	constructor({
		trackId,
		elementId,
		effectType,
	}: {
		trackId: string;
		elementId: string;
		effectType: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.effectType = effectType;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const updatedTracks = updateElementInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isVisualElement,
			update: (element) => {
				const updated = addEffectToElement({
					element: element as VisualElement,
					effectType: this.effectType,
				});
				const effects = updated.effects ?? [];
				this.effectId = effects[effects.length - 1]?.id ?? null;
				return updated;
			},
		});

		editor.timeline.updateTracks(updatedTracks);
		this.addedState = structuredClone(updatedTracks);
		return undefined;
	}

	/** Replays the exact post-execute snapshot so the effect id stays stable. */
	redo(): CommandResult | undefined {
		if (this.addedState) {
			EditorCore.getInstance().timeline.updateTracks(
				structuredClone(this.addedState),
			);
		}
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getEffectId(): string | null {
		return this.effectId;
	}
}
