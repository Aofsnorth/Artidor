"use client";

import { useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { effectsRegistry, EFFECT_TARGET_ELEMENT_TYPES } from "@/lib/effects";
import { useEditor } from "@/hooks/use-editor";
import { buildEffectElement } from "@/lib/timeline/element-utils";
import type { EffectDefinition } from "@/lib/effects/types";
import { isAdjustmentEffect } from "@/lib/effects/css-filter";
import { ADJUST_CATEGORIES, getAdjustCategory } from "@/lib/effects/categories";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

export function AdjustmentsView() {
	const all = effectsRegistry.getAll();
	const adjustments = all.filter((def) =>
		isAdjustmentEffect({ effectType: def.type }),
	);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: adjustments,
				category,
				getCategory: (def) => getAdjustCategory(def.type),
			}),
		[adjustments, category],
	);

	return (
		<PanelView
			title="Adjustments"
			actions={<PopOutAction id="adjust" title="Adjustments" />}
		>
			<div className="flex flex-col gap-3 pb-3">
				<CategoryBar
					categories={ADJUST_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
				<AdjustmentsGrid adjustments={filtered} />
			</div>
		</PanelView>
	);
}

function AdjustmentsGrid({ adjustments }: { adjustments: EffectDefinition[] }) {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
			}}
		>
			{adjustments.map((effect) => (
				<AdjustmentItem key={effect.type} effect={effect} />
			))}
		</div>
	);
}

function AdjustmentPreview({ effectType }: { effectType: string }) {
	const filters: Record<string, string> = {
		brightness: "brightness(1.45)",
		contrast: "contrast(1.55)",
		saturation: "saturate(1.85)",
		"hue-rotate": "hue-rotate(120deg) saturate(1.35)",
		temperature: "sepia(0.36) saturate(1.25)",
		sepia: "sepia(0.82)",
		grayscale: "grayscale(1)",
		invert: "invert(1)",
		highlights: "brightness(1.28) contrast(1.12)",
		shadows: "brightness(0.82) contrast(1.18)",
		sharpen: "contrast(1.38) saturate(1.16)",
		vibrance: "saturate(2.05) contrast(1.08)",
		vignette: "brightness(0.78) contrast(1.28)",
		grain: "contrast(1.22) sepia(0.12)",
		clarity: "contrast(1.46) brightness(1.08)",
		dehaze: "contrast(1.32) saturate(1.18)",
		fade: "brightness(1.18) contrast(0.72) saturate(0.82)",
		whites: "brightness(1.36)",
		blacks: "brightness(0.68) contrast(1.26)",
		"color-wheels": "hue-rotate(32deg) saturate(1.55) contrast(1.1)",
		hsl: "hue-rotate(210deg) saturate(1.7)",
		curves: "contrast(1.62) brightness(1.08)",
		lut: "sepia(0.22) saturate(1.42) contrast(1.16)",
	};

	return (
		<div
			className="size-full"
			style={{
				background:
					"linear-gradient(135deg, #f97316 0%, #ec4899 35%, #8b5cf6 70%, #06b6d4 100%)",
				filter: filters[effectType] ?? "none",
			}}
		/>
	);
}

function AdjustmentItem({ effect }: { effect: EffectDefinition }) {
	const editor = useEditor();

	const handleAddToTimeline = useCallback(() => {
		const currentTime = editor.playback.getCurrentTime();
		const element = buildEffectElement({
			effectType: effect.type,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			placement: { mode: "auto", trackType: "effect" },
			element,
		});
	}, [editor, effect.type]);

	const preview = <AdjustmentPreview effectType={effect.type} />;

	return (
		<DraggableItem
			name={effect.name}
			preview={preview}
			dragData={{
				id: effect.type,
				name: effect.name,
				type: "effect",
				effectType: effect.type,
				targetElementTypes: EFFECT_TARGET_ELEMENT_TYPES,
			}}
			onAddToTimeline={handleAddToTimeline}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}
