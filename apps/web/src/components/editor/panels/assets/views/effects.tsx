"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { effects as presetEffects } from "@/lib/presets/effects";
import { effectsRegistry, EFFECT_TARGET_ELEMENT_TYPES } from "@/lib/effects";
import { effectPreviewService } from "@/services/renderer/effect-preview";
import { useEditor } from "@/hooks/use-editor";
import { buildEffectElement } from "@/lib/timeline/element-utils";
import type { EffectDefinition } from "@/lib/effects/types";
import { isAdjustmentEffect } from "@/lib/effects/css-filter";
import { EFFECT_CATEGORIES, getEffectCategory } from "@/lib/effects/categories";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const PRESET_EFFECT_CATEGORY_BY_TYPE = new Map(
	presetEffects.map((effect) => [effect.type, effect.category]),
);

const PRESET_EFFECTS: EffectDefinition[] = presetEffects.map((effect) => ({
	type: effect.type,
	name: effect.name,
	keywords: [effect.category.toLowerCase()],
	params: [],
	renderer: {
		passes: [
			{
				shader: "contrast",
				uniforms: () => ({ amount: 1 }),
			},
		],
	},
}));

/**
 * Categories shown in the Effects panel filter chips. EFFECT_CATEGORIES
 * already covers every preset category after Color grading was moved
 * to the Adjustments panel and the preset-only categories (Distortion /
 * Particles / Texture / Artistic / Generator) were folded in.
 */
const EFFECT_PANEL_CATEGORIES = EFFECT_CATEGORIES;

export function EffectsView() {
	const effects = useMemo(() => {
		const existing = effectsRegistry
			.getAll()
			.filter(
				(definition) => !isAdjustmentEffect({ effectType: definition.type }),
			);
		const existingTypes = new Set(existing.map((effect) => effect.type));
		return [
			...existing,
			...PRESET_EFFECTS.filter((effect) => !existingTypes.has(effect.type)),
		];
	}, []);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: effects,
				category,
				getCategory: (def) =>
					PRESET_EFFECT_CATEGORY_BY_TYPE.get(def.type) ??
					getEffectCategory(def.type),
			}),
		[effects, category],
	);

	return (
		<PanelView
			title="Effects"
			actions={<PopOutAction id="effects" title="Effects" />}
		>
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Effects process the selected clip or an effect track. Color correction
					controls live in Adjustments; visible tint/frame layers live in
					Overlays.
				</p>
				<CategoryBar
					categories={EFFECT_PANEL_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
				<EffectsGrid effects={filtered} />
			</div>
		</PanelView>
	);
}

function EffectsGrid({ effects }: { effects: EffectDefinition[] }) {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	return (
		<div
			className="grid gap-2"
			style={{
				gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
			}}
		>
			{effects.map((effect) => (
				<EffectItem key={effect.type} effect={effect} />
			))}
		</div>
	);
}

/**
 * Effect preview tile. Renders the effect against a procedural test
 * source (chosen per-effect-type by effectPreviewService so each card
 * shows something different) and overlays a subtle shine that pops
 * in on hover. The bg-black/35 sits behind the canvas so an empty or
 * mid-render frame is still visually distinct from the panel bg.
 */
function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const render = () => {
			if (canvasRef.current) {
				effectPreviewService.renderPreview({
					effectType,
					params: {},
					targetCanvas: canvasRef.current,
				});
			}
		};

		render();
		return effectPreviewService.onPreviewImageReady({ callback: render });
	}, [effectType]);

	return (
		<div className="relative size-full overflow-hidden rounded-sm bg-black/35">
			<canvas ref={canvasRef} className="relative z-10 size-full" />
			<div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.18)_42%,transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
		</div>
	);
}

function EffectItem({ effect }: { effect: EffectDefinition }) {
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

	const preview = <EffectPreviewCanvas effectType={effect.type} />;

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
