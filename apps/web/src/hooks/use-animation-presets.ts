import { useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import { animationPresetsRegistry } from "@/lib/animation/presets";
import type { AnimationPreset } from "@/lib/animation/presets";

export function useApplyAnimationPreset(): (preset: AnimationPreset) => {
	ok: boolean;
	error?: string;
} {
	const editor = useEditor();

	return useCallback(
		(preset: AnimationPreset) => {
			const selected = editor.selection.getSelectedElements();
			if (selected.length === 0) {
				return { ok: false, error: "Select an element first" };
			}

			for (const ref of selected) {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				if (!track) continue;
				const element = track.elements.find((el) => el.id === ref.elementId);
				if (!element) continue;

				const keyframes = preset.keyframes({
					elementDuration: element.duration,
				});
				editor.timeline.upsertKeyframes({
					keyframes: keyframes.map((k) => ({
						trackId: ref.trackId,
						elementId: ref.elementId,
						propertyPath: k.propertyPath,
						time: k.time,
						value: k.value,
						interpolation: k.interpolation,
					})),
				});
			}

			return { ok: true };
		},
		[editor],
	);
}

export function useAnimationPresets() {
	return animationPresetsRegistry.getAll();
}
