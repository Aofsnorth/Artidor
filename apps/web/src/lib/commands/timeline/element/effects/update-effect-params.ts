import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isVisualElement, updateElementInSceneTracks } from "@/lib/timeline";
import { effectsRegistry } from "@/lib/effects";
import { coerceAnimationValueForParam } from "@/lib/animation";
import type { ParamValues } from "@/lib/params";
import type { SceneTracks, VisualElement } from "@/lib/timeline";

/**
 * Clamp/coerce incoming effect params against the effect definition.
 *
 * Mirrors the keyframe path (coerceAnimationValueForParam): numbers snap to
 * the definition's step and clamp to [min, max], other types are rejected
 * unless they match. Raw writes from the AI executor or clipboard paste used
 * to store out-of-range values (e.g. blur intensity 9999 vs max 100) that
 * renderers then treated as valid.
 *
 * Unknown effect types and unknown param keys are left untouched — a param
 * without a definition has nothing to clamp against, and dropping it would
 * silently discard custom/plugin params.
 */
function clampEffectParams({
	effectType,
	params,
}: {
	effectType: string;
	params: Partial<ParamValues>;
}): Partial<ParamValues> {
	if (!effectsRegistry.has(effectType)) {
		return params;
	}

	const definition = effectsRegistry.get(effectType);
	const byKey = new Map(definition.params.map((param) => [param.key, param]));
	const clamped: Partial<ParamValues> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) {
			continue;
		}
		const param = byKey.get(key);
		if (!param) {
			clamped[key] = value;
			continue;
		}
		const coerced = coerceAnimationValueForParam({ param, value });
		if (coerced !== null) {
			clamped[key] = coerced;
		}
		// null = wrong type for this param (e.g. string for a number param): skip
		// the key rather than store a value the renderer can't interpret.
	}
	return clamped;
}

function updateEffectParamsOnElement({
	element,
	effectId,
	params,
}: {
	element: VisualElement;
	effectId: string;
	params: Partial<ParamValues>;
}): VisualElement {
	const currentEffects = element.effects ?? [];
	const updated = currentEffects.map((effect) => {
		if (effect.id !== effectId) {
			return effect;
		}

		const clampedParams = clampEffectParams({
			effectType: effect.type,
			params,
		});
		const nextParams = { ...effect.params };
		for (const [key, value] of Object.entries(clampedParams)) {
			if (value !== undefined) {
				nextParams[key] = value;
			}
		}

		return { ...effect, params: nextParams };
	});
	return { ...element, effects: updated };
}

export class UpdateClipEffectParamsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly effectId: string;
	private readonly params: Partial<ParamValues>;

	constructor({
		trackId,
		elementId,
		effectId,
		params,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		params: Partial<ParamValues>;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.effectId = effectId;
		this.params = params;
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
				return updateEffectParamsOnElement({
					element: element as VisualElement,
					effectId: this.effectId,
					params: this.params,
				});
			},
		});

		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
