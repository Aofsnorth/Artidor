"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
	FILTER_CATEGORIES,
	FILTER_PRESETS,
	type FilterPreset,
	type FilterCategory,
} from "@/lib/filters";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useEditor } from "@/hooks/use-editor";
import type { EditorCore } from "@/core";
import { generateUUID } from "@/utils/id";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import { Button } from "@/components/ui/button";
import { MarqueeText } from "@/components/ui/marquee-text";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { useI18n } from "@/lib/i18n";

const FILTER_CATEGORY_TO_KEY: Record<FilterCategory, string> = {
	cinematic: "filters.category.cinematic",
	vintage: "filters.category.vintage",
	film: "filters.category.film",
	bw: "filters.category.bw",
	warm: "filters.category.warm",
	cool: "filters.category.cool",
	moody: "filters.category.moody",
	dream: "filters.category.dream",
	retro: "filters.category.retro",
	neon: "filters.category.neon",
	polaroid: "filters.category.polaroid",
	movie: "filters.category.movie",
	korea: "filters.category.korea",
	social: "filters.category.social",
};

export function FiltersView() {
	const { t, locale } = useI18n();
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");
	const editor = useEditor();

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset category selection when locale changes
	useEffect(() => {
		setCategory(ALL_CATEGORY);
	}, [locale]);

	const categoryLabels = useMemo(
		() => FILTER_CATEGORIES.map((c) => t(FILTER_CATEGORY_TO_KEY[c.id])),
		[t],
	);
	const idToLabel = useMemo(
		() =>
			new Map(
				FILTER_CATEGORIES.map((c) => [
					c.id,
					t(FILTER_CATEGORY_TO_KEY[c.id]),
				]),
			),
		[t],
	);

	const filtered = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: FILTER_PRESETS,
			category,
			getCategory: (p) => idToLabel.get(p.category),
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (preset) => [
				preset.name,
				preset.id,
				idToLabel.get(preset.category),
			],
		});
	}, [category, query, idToLabel]);

	return (
		<PanelView title={t("catalog.titleFilters")}>
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					{t("catalog.descriptionFilters")}
				</p>
				<CategoryBar
					categories={categoryLabels}
					value={category}
					onChange={setCategory}
				/>
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchFilters")}
				/>
				{filtered.length > 0 ? (
					<AssetGrid gap="gap-2">
						{filtered.map((preset) => (
							<FilterItem
								key={preset.id}
								preset={preset}
								onApply={() => applyFilter({ editor, preset, t })}
							/>
						))}
					</AssetGrid>
				) : (
					<CatalogEmptyState query={query} />
				)}
			</div>
		</PanelView>
	);
}

function applyFilter({
	editor,
	preset,
	t,
}: {
	editor: EditorCore;
	preset: FilterPreset;
	t: (key: string, values?: Record<string, string | number>) => string;
}) {
	const selected = editor.selection.getSelectedElements();
	if (selected.length === 0) {
		toast.error(t("catalog.selectVideoClipFirst"));
		return;
	}
	const ref = selected[0];
	if (!ref) {
		toast.error(t("catalog.selectVideoClipFirst"));
		return;
	}
	const track = editor.timeline.getTrackById({ trackId: ref.trackId });
	const element = track?.elements.find((el) => el.id === ref.elementId);
	if (!element) {
		toast.error(t("catalog.elementNotFound"));
		return;
	}
	const existingEffects =
		(
			element as {
				effects?: Array<{
					id: string;
					type: string;
					params: Record<string, number | string>;
					enabled: boolean;
				}>;
			}
		).effects ?? [];

	const newEffects = [
		...existingEffects,
		...preset.effects.map((spec) => ({
			id: generateUUID(),
			type: spec.type,
			params: { ...spec.params },
			enabled: true,
		})),
	];

	editor.timeline.updateElements({
		updates: [
			{
				trackId: ref.trackId,
				elementId: ref.elementId,
				patch: { effects: newEffects },
			},
		],
	});
	toast.success(t("catalog.filterApplied", { name: preset.name }));
}

function FilterItem({
	preset,
	onApply,
}: {
	preset: FilterPreset;
	onApply: () => void;
}) {
	const { t } = useI18n();
	const [r, g, b] = preset.thumbnailColor;
	return (
		// biome-ignore lint/a11y/useSemanticElements: card contains hover badges and nested affordances; outer button would be invalid
		<div
			role="button"
			tabIndex={0}
			onClick={onApply}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onApply();
				}
			}}
			className="asset-preview-container group cursor-pointer"
		>
			<div className="asset-preview-overlay" />
			<div
				className="relative mx-auto mt-2 size-full overflow-hidden rounded-sm border border-white/10 flex items-center justify-center"
				style={{
					width: "80%",
					height: "80%",
					background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}) 100%)`,
				}}
			>
				<div className="text-white text-xl font-bold opacity-30 mix-blend-overlay">
					{preset.name.slice(0, 1)}
				</div>
			</div>
			<MarqueeText
				className="text-foreground z-10 block w-full px-2 text-center text-[0.7rem] font-medium drop-shadow-md"
				pxPerSecond={30}
			>
				{preset.name}
			</MarqueeText>
			<div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					size="icon"
					variant="secondary"
					className="size-5 bg-black/50 hover:bg-black/80 border border-white/10"
					aria-label={t("catalog.applyAria", { name: preset.name })}
					onClick={(event) => {
						event.stopPropagation();
						onApply();
					}}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3 text-cyan-400" />
				</Button>
			</div>
		</div>
	);
}
