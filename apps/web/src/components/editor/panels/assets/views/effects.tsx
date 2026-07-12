"use client";

import { memo, useEffect, useRef, useCallback, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { effects as presetEffects } from "@/lib/presets/effects";
import { effectsRegistry, EFFECT_TARGET_ELEMENT_TYPES } from "@/lib/effects";
import { createPresetEffectDefinition } from "@/lib/effects/preset-mappings";
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
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { useI18n } from "@/lib/i18n";

const PRESET_EFFECT_CATEGORY_BY_TYPE = new Map(
	presetEffects.map((effect) => [effect.type, effect.category]),
);

const PRESET_EFFECTS: EffectDefinition[] = presetEffects.map(
	createPresetEffectDefinition,
);

/**
 * Categories shown in the Effects panel filter chips. EFFECT_CATEGORIES
 * already covers every preset category after Color grading was moved
 * to the Adjustments panel and the preset-only categories (Distortion /
 * Particles / Texture / Artistic / Generator) were folded in.
 */
const EFFECT_PANEL_CATEGORIES = EFFECT_CATEGORIES;

const EFFECT_CATEGORY_TO_KEY: Record<string, string> = {
	Basic: "effectsCatalog.category.basic",
	Blur: "effectsCatalog.category.blur",
	Light: "effectsCatalog.category.light",
	Glitch: "effectsCatalog.category.glitch",
	Retro: "effectsCatalog.category.retro",
	Cinematic: "effectsCatalog.category.cinematic",
	Stylize: "effectsCatalog.category.stylize",
	Distortion: "effectsCatalog.category.distortion",
	Transform: "effectsCatalog.category.transform",
	Text: "effectsCatalog.category.text",
	Particles: "effectsCatalog.category.particles",
	Texture: "effectsCatalog.category.texture",
	Artistic: "effectsCatalog.category.artistic",
	Generator: "effectsCatalog.category.generator",
};

export function EffectsView() {
	const { t, locale } = useI18n();
	const effects = useMemo(() => {
		for (const effect of PRESET_EFFECTS) {
			if (!effectsRegistry.has(effect.type)) {
				effectsRegistry.register(effect.type, effect);
			}
		}

		return effectsRegistry
			.getAll()
			.filter(
				(definition) => !isAdjustmentEffect({ effectType: definition.type }),
			);
	}, []);
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset category selection when locale changes
	useEffect(() => {
		setCategory(ALL_CATEGORY);
	}, [locale]);

	const categoryLabels = useMemo(
		() => EFFECT_PANEL_CATEGORIES.map((c) => t(EFFECT_CATEGORY_TO_KEY[c])),
		[t],
	);
	const categoryToLabel = useMemo(
		() =>
			new Map<string, string>(
				EFFECT_PANEL_CATEGORIES.map((c) => [c, t(EFFECT_CATEGORY_TO_KEY[c])]),
			),
		[t],
	);

	const getEffectCategoryLabel = useCallback(
		(type: string) => {
			const cat =
				PRESET_EFFECT_CATEGORY_BY_TYPE.get(type) ?? getEffectCategory(type);
			return cat ? categoryToLabel.get(cat) : undefined;
		},
		[categoryToLabel],
	);

	const filtered = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: effects,
			category,
			getCategory: (def) => getEffectCategoryLabel(def.type),
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (def) => [
				def.name,
				def.type,
				getEffectCategoryLabel(def.type),
				...(def.keywords ?? []),
			],
		});
	}, [effects, category, query, getEffectCategoryLabel]);

	return (
		<PanelView
			title={t("catalog.titleEffects")}
			actions={<PopOutAction id="effects" title={t("catalog.titleEffects")} />}
		>
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					{t("catalog.descriptionEffects")}
				</p>
				<CategoryBar
					categories={categoryLabels}
					value={category}
					onChange={setCategory}
				/>
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchEffects")}
				/>
				{filtered.length > 0 ? (
					<EffectsGrid effects={filtered} />
				) : (
					<CatalogEmptyState query={query} />
				)}
			</div>
		</PanelView>
	);
}

function EffectsGrid({ effects }: { effects: EffectDefinition[] }) {
	return (
		<AssetGrid gap="gap-2">
			{effects.map((effect) => (
				<EffectItem key={effect.type} effect={effect} />
			))}
		</AssetGrid>
	);
}

/**
 * Effect preview tile. Renders the effect against a procedural test
 * source (chosen per-effect-type by effectPreviewService so each card
 * shows something different) and overlays a subtle shine that pops
 * in on hover. The bg-black/35 sits behind the canvas so an empty or
 * mid-render frame is still visually distinct from the panel bg.
 *
 * Visibility-gated AND queue-scheduled. The IntersectionObserver
 * only marks the card "visible" once it scrolls inside the
 * panel's 100px rootMargin — out-of-view cards stay in their
 * skeleton state and never compete for GPU time. Visible cards
 * submit their render job to the preview service's bounded queue
 * (4 concurrent GPU jobs) so opening the Effects tab no longer
 * floods the GPU pipeline with 165 simultaneous `applyEffect`
 * calls — the visible cards paint in the first 50-100 ms, the
 * rest trickle in via the idle pump. Cancels its queued job on
 * unmount so a card that scrolls back out of view before its
 * turn doesn't waste a render.
 */
function EffectPreviewCanvas({ effectType }: { effectType: string }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isVisible, setIsVisible] = useState(false);
	const [isPainted, setIsPainted] = useState(false);

	useEffect(() => {
		const node = containerRef.current;
		if (!node) return;
		// Default to visible if the observer API isn't available
		// (extremely old browsers, jsdom tests) — fail open rather
		// than fail closed so the user always sees *something*.
		if (typeof IntersectionObserver === "undefined") {
			setIsVisible(true);
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setIsVisible(true);
						observer.disconnect();
						return;
					}
				}
			},
			{
				// Pre-render when the card is within 100px of the visible
				// area so it appears instantly as the user scrolls. We
				// used to use 250px but that meant opening the Effects
				// tab would enqueue 165 GPU jobs at once, which is why
				// the panel felt laggy and many cards never painted
				// (they were way past the user's viewport). 100 px is
				// enough to keep scrolling smooth without flooding the
				// scheduler.
				rootMargin: "100px 0px",
				threshold: 0,
			},
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!isVisible) return;
		const render = () => {
			if (canvasRef.current) {
				effectPreviewService.renderPreview({
					effectType,
					params: {},
					targetCanvas: canvasRef.current,
				});
				setIsPainted(true);
			}
		};
		// Submit to the service's bounded queue. Negative priority
		// (–1) so visible cards run ahead of off-screen cards that
		// might have been deferred by the IntersectionObserver
		// firing for cards just outside the rootMargin.
		const cancel = effectPreviewService.scheduleRender({
			run: render,
			priority: -1,
		});
		// If the preview image isn't loaded yet, also re-run the
		// render once it does (gradient patterns use it as a base).
		const unsubscribe = effectPreviewService.onPreviewImageReady({
			callback: render,
		});
		return () => {
			cancel();
			unsubscribe();
		};
	}, [effectType, isVisible]);

	return (
		<div
			ref={containerRef}
			className="relative size-full overflow-hidden rounded-sm bg-black/35"
		>
			{isVisible ? (
				<>
					{!isPainted && (
						<div
							aria-hidden
							className="absolute inset-0 z-0 animate-pulse bg-gradient-to-br from-white/[0.03] to-transparent"
						/>
					)}
					<canvas ref={canvasRef} className="relative z-10 size-full" />
					<div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.18)_42%,transparent_68%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
				</>
			) : null}
		</div>
	);
}

const EffectItem = memo(function EffectItem({
	effect,
}: {
	effect: EffectDefinition;
}) {
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
});
