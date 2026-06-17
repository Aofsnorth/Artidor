"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
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

export function EffectsView() {
	const effects = effectsRegistry
		.getAll()
		.filter(
			(definition) => !isAdjustmentEffect({ effectType: definition.type }),
		);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: effects,
				category,
				getCategory: (def) => getEffectCategory(def.type),
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
					categories={EFFECT_CATEGORIES}
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

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function getEffectBackground(effectType: string): string {
	const h = hashString(effectType);
	const hue1 = h % 360;
	const hue2 = (h * 13) % 360;
	const patternType = h % 4;

	if (patternType === 0) {
		return `linear-gradient(135deg, hsl(${hue1}, 70%, 30%), hsl(${hue2}, 80%, 20%))`;
	}
	if (patternType === 1) {
		return `radial-gradient(circle at 30% 30%, hsl(${hue1}, 80%, 40%), hsl(${hue2}, 70%, 15%))`;
	}
	if (patternType === 2) {
		return `conic-gradient(from ${h % 360}deg, hsl(${hue1}, 70%, 30%), hsl(${hue2}, 80%, 20%), hsl(${hue1}, 70%, 30%))`;
	}
	return `linear-gradient(45deg, hsl(${hue1}, 60%, 25%) 25%, hsl(${hue2}, 60%, 15%) 25%, hsl(${hue2}, 60%, 15%) 50%, hsl(${hue1}, 60%, 25%) 50%, hsl(${hue1}, 60%, 25%) 75%, hsl(${hue2}, 60%, 15%) 75%)`;
}

function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const bgStyle = getEffectBackground(effectType);

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
			style={{ background: bgStyle }}
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
