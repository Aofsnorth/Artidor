"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
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

const EFFECT_PANEL_CATEGORIES = [
	...EFFECT_CATEGORIES,
	"Distortion",
	"Particles",
	"Texture",
	"Artistic",
	"Generator",
] as const;

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
		<PanelView title="Effects">
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

function getEffectBackgroundPosition(effectType: string): string {
	const h = hashString(effectType);
	const positions = [
		"0% 0%",
		"100% 0%",
		"0% 100%",
		"100% 100%",
		"50% 50%",
		"0% 50%",
		"100% 50%",
		"50% 0%",
		"50% 100%",
		"25% 25%",
		"75% 25%",
		"25% 75%",
		"75% 75%",
		"33% 33%",
		"66% 66%",
	];
	return positions[h % positions.length];
}

function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const bgPosition = getEffectBackgroundPosition(effectType);

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
		<div
			className="relative size-full overflow-hidden rounded-sm"
			style={{
				background: `url('/effects/preview.jpg')`,
				backgroundSize: "200% 200%",
				backgroundPosition: bgPosition,
			}}
		>
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

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}
