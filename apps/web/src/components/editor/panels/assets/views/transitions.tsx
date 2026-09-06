"use client";

import { memo, useCallback, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { PopOutAction } from "@/components/editor/floating-window";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { transitions as presetTransitions } from "@/lib/presets/transitions";
import { transitionsRegistry } from "@/lib/transitions";
import { useEditor } from "@/hooks/use-editor";
import { useTransitions } from "@/hooks/use-transitions";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { getTransitionScenePair } from "./components/procedural-preview";
import { CatalogPreviewTitle } from "./components/catalog-preview";
import { useCatalogPreviewMotion } from "./components/use-catalog-preview";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "./components/catalog-search";
import type { TransitionDefinition } from "@/lib/transitions";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import { useI18n } from "@/lib/i18n";


const TRANSITION_CATEGORIES = [
	"Fade",
	"Slide",
	"Push",
	"Zoom",
	"Rotate",
	"Wipe",
	"Morph",
	"Glitch",
	"Liquid",
	"Light",
	"3D",
	"Geometric",
] as const;

const PRESET_TRANSITION_CATEGORY_BY_TYPE = new Map(
	presetTransitions.map((transition) => {
		const category = TRANSITION_CATEGORIES.find((candidate) =>
			transition.keywords.includes(candidate.toLowerCase()),
		);
		return [transition.type, category ?? transition.category];
	}),
);

export function TransitionsView() {
	const { t } = useI18n();
	const transitions = useMemo(() => {
		const existing = transitionsRegistry.getAll();
		const existingTypes = new Set(
			existing.map((transition) => transition.type),
		);
		return [
			...existing,
			...presetTransitions.filter(
				(transition) => !existingTypes.has(transition.type),
			),
		];
	}, []);
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: transitions,
			category,
			getCategory: (def) =>
				PRESET_TRANSITION_CATEGORY_BY_TYPE.get(def.type) ?? def.category,
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (def) => [
				def.name,
				def.type,
				PRESET_TRANSITION_CATEGORY_BY_TYPE.get(def.type) ?? def.category,
				...(def.keywords ?? []),
			],
		});
	}, [transitions, category, query]);

	return (
		<PanelView
			title={t("catalog.titleTransitions")}
			actions={
				<PopOutAction id="transitions" title={t("catalog.titleTransitions")} />
			}
		>
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					{t("catalog.descriptionTransitions")}
				</p>
				<CategoryBar
					categories={TRANSITION_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchTransitions")}
				/>
				{filtered.length > 0 ? (
					<AssetGrid gap="gap-2">
						{filtered.map((def) => (
							<TransitionItem key={def.type} definition={def} />
						))}
					</AssetGrid>
				) : (
					<CatalogEmptyState query={query} />
				)}
			</div>
		</PanelView>
	);
}

function TransitionItem({ definition }: { definition: TransitionDefinition }) {
	const { t } = useI18n();
	const editor = useEditor();
	const { addTransition } = useTransitions();
	const [busy, setBusy] = useState(false);
	const { ref, active, interactionProps } = useCatalogPreviewMotion();

	const handleAdd = useCallback(async () => {
		setBusy(true);
		try {
			const selected = editor.selection.getSelectedElements();
			if (selected.length < 2) {
				toast.error(t("catalog.selectTwoClipsFirst"), {
					description: t("catalog.selectTwoClipsShift"),
				});
				return;
			}

			const sorted = [...selected].sort((a, b) => {
				const aTrack = editor.timeline.getTrackById({ trackId: a.trackId });
				const bTrack = editor.timeline.getTrackById({ trackId: b.trackId });
				const aEl = aTrack?.elements.find((e) => e.id === a.elementId);
				const bEl = bTrack?.elements.find((e) => e.id === b.elementId);
				return (aEl?.startTime ?? 0) - (bEl?.startTime ?? 0);
			});

			if (sorted.length < 2) {
				toast.error(t("catalog.couldNotFindSelectedClips"));
				return;
			}

			const first = sorted[0];
			const second = sorted[1];
			if (!first || !second) {
				toast.error(t("catalog.selectTwoClips"));
				return;
			}

			const firstTrack = editor.timeline.getTrackById({
				trackId: first.trackId,
			});
			const firstEl = firstTrack?.elements.find(
				(e) => e.id === first.elementId,
			);
			if (!firstEl) {
				toast.error(t("catalog.firstClipNotFound"));
				return;
			}

			const startTime = firstEl.startTime + firstEl.duration;
			const duration = Math.min(
				definition.defaultDuration,
				Math.max(definition.minDuration, TICKS_PER_SECOND),
			);

			addTransition({
				transitionType: definition.type,
				fromTrackId: first.trackId,
				fromElementId: first.elementId,
				toTrackId: second.trackId,
				toElementId: second.elementId,
				startTime,
				duration,
			});

			toast.success(t("catalog.transitionAdded", { name: definition.name }), {
				description: t("catalog.transitionInserted"),
			});
		} catch (error) {
			toast.error(t("catalog.failedToAddTransition"), {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setBusy(false);
		}
	}, [definition, editor, addTransition, t]);

	return (
		// biome-ignore lint/a11y/useSemanticElements: card contains nested add button, so outer button would be invalid HTML
		<div
			ref={ref}
			{...interactionProps}
			role="button"
			tabIndex={0}
			onClick={handleAdd}
			onKeyDown={(e) => {
				if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					handleAdd();
				}
			}}
			className={`asset-preview-container group ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
		>
			<div className="asset-preview-overlay" />

			<TransitionPreview definition={definition} active={active} />
			<CatalogPreviewTitle>{definition.name}</CatalogPreviewTitle>
			<div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
				<Button
					size="icon"
					variant="secondary"
					className="size-5 bg-black/50 hover:bg-black/80 border border-white/10"
					aria-label={t("catalog.addAria", { name: definition.name })}
					onClick={(e) => {
						e.stopPropagation();
						handleAdd();
					}}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3 text-cyan-400" />
				</Button>
			</div>
		</div>
	);
}

const KEYFRAME_NAME = /@keyframes\s+([^{\s]+)/;

function extractKeyframeName(css: string): string | null {
	return css.match(KEYFRAME_NAME)?.[1] ?? null;
}

const TransitionPreview = memo(function TransitionPreview({
	definition,
	active,
}: {
	definition: TransitionDefinition;
	active: boolean;
}) {
	const id = useId().replaceAll(":", "");
	const keyframeCss = definition.previewStyle({
		duration: 1000,
		direction: "cross",
	});
	const keyframeName = extractKeyframeName(keyframeCss);
	const scopedName = keyframeName
		? `${keyframeName}-${id}`
		: `transition-preview-${id}`;
	const scopedCss = keyframeName
		? keyframeCss.replaceAll(keyframeName, scopedName)
		: keyframeCss;

	const scenes = useMemo(() => getTransitionScenePair(definition.type), [definition.type]);

	return (
		<div
			className="relative mx-auto mt-2 size-full overflow-hidden rounded-sm border border-white/10 bg-zinc-950"
			style={{ width: "80%", height: "80%" }}
		>
			<div
				aria-hidden
				className="absolute inset-0 bg-cover bg-center"
				style={{ backgroundImage: `url("${scenes.a}")` }}
			/>
			<div
				aria-hidden
				className="absolute inset-0 z-10 bg-cover bg-center"
				style={{
					animation: active ? `${scopedName} 2.4s ${definition.easing} infinite alternate` : "none",
					clipPath: active ? undefined : "inset(0 0 0 50%)",
					backgroundImage: `url("${scenes.b}")`,
				}}
			/>
			<style>{scopedCss}</style>
		</div>
	);
});
