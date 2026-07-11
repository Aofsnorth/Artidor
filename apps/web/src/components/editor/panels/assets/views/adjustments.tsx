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
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { AdvancedView } from "./advanced";
import { cn } from "@/utils/ui";
import { useI18n } from "@/lib/i18n";

const SUB_TABS = [
	{ id: "library" as const, labelKey: "advanced.subTabAdjustments" as const },
	{ id: "advanced" as const, labelKey: "advanced.subTabAdvanced" as const },
];

/**
 * Top-level card shown when the user clicks the Adjust tab in the
 * left rail. Two facets:
 *
 *   Library  → the existing preset grid (Basic / Manual / Color /
 *              Adjustments chips → drag-to-timeline cards).
 *   Advanced → the full colour-correction card (Lift / Gamma /
 *              Gain / Offset wheels, master + per-band HSL, RGB
 *              curves, .cube LUT import).
 *
 * Both views read the same underlying effect params on the selected
 * element, so a grade made in one is visible in the other. The
 * "Advanced" card is what used to live as its own left-rail tab —
 * folding it in here keeps the rail clean (no duplicate icon
 * collisions with Overlays / Templates / etc.) while still giving
 * the user a single tap to reach the colour tools.
 */
export function AdjustmentsView() {
	const { t } = useI18n();
	const [activeSubTab, setActiveSubTab] = useState<"library" | "advanced">(
		"library",
	);

	return (
		<PanelView
			title={t("catalog.titleAdjust")}
			actions={
				activeSubTab === "library" ? (
					<PopOutAction id="adjust" title={t("catalog.titleAdjustments")} />
				) : null
			}
		>
			<div className="border-b border-white/[0.06] px-2 py-2">
				<div className="scrollbar-hidden flex gap-1 overflow-x-auto">
					{SUB_TABS.map((tab) => {
						const isActive = activeSubTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveSubTab(tab.id)}
								aria-pressed={isActive}
								className={cn(
									"shrink-0 rounded-md border px-2.5 py-1 text-[0.68rem] font-medium transition",
									isActive
										? "border-white/20 bg-white text-[#09090b] shadow-sm"
										: "border-white/[0.06] bg-white/[0.025] text-white/[0.55] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								{t(tab.labelKey)}
							</button>
						);
					})}
				</div>
			</div>

			{activeSubTab === "library" ? (
				<AdjustmentsLibrary />
			) : (
				<div className="flex-1 min-h-0 overflow-hidden">
					<AdvancedView embedded />
				</div>
			)}
		</PanelView>
	);
}

function AdjustmentsLibrary() {
	const { t } = useI18n();
	const adjustments = useMemo(
		() =>
			effectsRegistry
				.getAll()
				.filter((def) => isAdjustmentEffect({ effectType: def.type })),
		[],
	);
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: adjustments,
			category,
			getCategory: (def) => getAdjustCategory(def.type),
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (def) => [
				def.name,
				def.type,
				getAdjustCategory(def.type),
				...(def.keywords ?? []),
			],
		});
	}, [adjustments, category, query]);

	return (
		<div className="flex h-full flex-col gap-3 overflow-hidden">
			<div className="px-2 pt-2">
				<CategoryBar
					categories={ADJUST_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
			</div>
			<div className="px-2">
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchAdjustments")}
				/>
			</div>
			<div className="flex-1 min-h-0 overflow-auto px-2 pb-3">
				{filtered.length > 0 ? (
					<AdjustmentsGrid adjustments={filtered} />
				) : (
					<CatalogEmptyState
						query={query}
						label={t("catalog.noResults", { query: query.trim() })}
					/>
				)}
			</div>
		</div>
	);
}

function AdjustmentsGrid({ adjustments }: { adjustments: EffectDefinition[] }) {
	return (
		<AssetGrid gap="gap-2">
			{adjustments.map((effect) => (
				<AdjustmentItem key={effect.type} effect={effect} />
			))}
		</AssetGrid>
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
