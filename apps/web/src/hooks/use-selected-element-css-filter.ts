"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/hooks/use-editor";
import {
	effectsToCssFilter,
	isAdjustmentEffect,
} from "@/lib/effects/css-filter";
import type { Effect } from "@/lib/effects/types";
import type {
	TimelineElement,
	VisualElement,
	EffectElement,
} from "@/lib/timeline";

function getElementEffects({
	element,
}: {
	element: TimelineElement | undefined;
}): Effect[] {
	if (!element) return [];
	if (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "audio"
	) {
		const visual = element as VisualElement;
		return visual.effects ?? [];
	}
	if (element.type === "effect") {
		const effect = element as EffectElement;
		return [
			{
				id: effect.id,
				type: effect.effectType,
				params: effect.params,
				enabled: true,
			},
		];
	}
	return [];
}

export function useSelectedElementCssFilter(): string {
	const editor = useEditor();
	const [filter, setFilter] = useState("none");

	useEffect(() => {
		const update = () => {
			const selected = editor.selection.getSelectedElements();
			if (selected.length === 0) {
				setFilter("none");
				return;
			}
			const ref = selected[0];
			if (!ref) {
				setFilter("none");
				return;
			}
			const track = editor.timeline.getTrackById({ trackId: ref.trackId });
			if (!track) {
				setFilter("none");
				return;
			}
			const element = track.elements.find((el) => el.id === ref.elementId);
			const effects = getElementEffects({ element });
			const adjustmentEffects = effects.filter((effect) =>
				isAdjustmentEffect({ effectType: effect.type }),
			);
			setFilter(effectsToCssFilter({ effects: adjustmentEffects }));
		};

		update();
		const unsubscribe = editor.timeline.subscribe(update);
		return unsubscribe;
	}, [editor]);

	return filter;
}
