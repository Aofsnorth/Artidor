"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { roundToFrame } from "artidor-wasm";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { useEditor } from "@/hooks/use-editor";
import {
	buildTextElement,
	findOrCreateTextTrack,
} from "@/lib/timeline/element-utils";
import type { TimelineDragData } from "@/lib/timeline/drag";
import { getPaletteForId } from "./components/procedural-preview";
import {
	textPresets,
	type TextPreset,
	type TextPresetCategory,
} from "@/lib/text/presets";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { cn } from "@/utils/ui";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { useI18n } from "@/lib/i18n";

const TEXT_CATEGORIES: { key: TextPresetCategory; label: string }[] = [
	{ key: "basic", label: "Basic" },
	{ key: "title", label: "Titles" },
	{ key: "subtitle", label: "Subtitles" },
	{ key: "lower-third", label: "Lower Thirds" },
	{ key: "callout", label: "Callouts" },
	{ key: "quote", label: "Quotes" },
	{ key: "social", label: "Social" },
	{ key: "bold", label: "Bold" },
	{ key: "handwritten", label: "Handwritten" },
	{ key: "neon", label: "Neon" },
];
const TEXT_LABELS = TEXT_CATEGORIES.map((c) => c.label);
const TEXT_KEY_TO_LABEL = new Map(TEXT_CATEGORIES.map((c) => [c.key, c.label]));

export function TextView() {
	const { t } = useI18n();
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: textPresets,
			category,
			getCategory: (p) => TEXT_KEY_TO_LABEL.get(p.category),
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (preset) => [
				preset.name,
				preset.id,
				TEXT_KEY_TO_LABEL.get(preset.category),
				preset.build().content,
			],
		});
	}, [category, query]);

	return (
		<PanelView title={t("catalog.titleText")}>
			<div className="flex flex-col gap-3 pb-3">
				<CategoryBar
					categories={TEXT_LABELS}
					value={category}
					onChange={setCategory}
				/>
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchText")}
				/>
				{filtered.length > 0 ? (
					<AssetGrid gap="gap-2">
						{filtered.map((preset) => (
							<TextPresetItem key={preset.id} preset={preset} />
						))}
					</AssetGrid>
				) : (
					<CatalogEmptyState query={query} />
				)}
			</div>
		</PanelView>
	);
}

function getTextPhotoUrl(_presetId: string): null {
	// Backwards-compat. The text preview now uses procedural CSS via
	// `getPaletteForId` — no remote thumbnail fetch.
	return null;
}

function TextPresetItem({ preset }: { preset: TextPreset }) {
	const { t } = useI18n();
	const editor = useEditor();
	const [busy, setBusy] = useState(false);

	const handleAdd = useCallback(
		async ({ currentTime }: { currentTime: number }) => {
			setBusy(true);
			try {
				const project = editor.project.getActive();
				const startTime =
					roundToFrame({
						time: currentTime,
						rate: project.settings.fps,
					}) ?? currentTime;

				const trackId = findOrCreateTextTrack(editor);
				const element = buildTextElement({
					raw: preset.build(),
					startTime,
				});

				const result = editor.timeline.insertElement({
					element,
					placement: { mode: "explicit", trackId },
				});

				if (!result) {
					throw new Error("Text clip could not be inserted on the timeline.");
				}

				// Note: no auto fade-in. A fade-up preset starts at opacity 0, which
				// left freshly-added text invisible at the playhead (looked like a bug).
				// Users can add an entrance animation explicitly from the Animation tab.

				toast.success(t("textTrack.added", { name: preset.name }));
			} catch (error) {
				toast.error(t("catalog.couldNotAddText"), {
					description:
						error instanceof Error ? error.message : "Unknown error",
				});
			} finally {
				setBusy(false);
			}
		},
		[editor, preset, t],
	);

	const previewData = preset.build();
	const photoUrl = getTextPhotoUrl(preset.id);
	void photoUrl;
	const textPalette = getPaletteForId(preset.id);
	const previewStyle: React.CSSProperties = {
		fontFamily: previewData.fontFamily ?? "var(--font-sans)",
		fontSize: Math.min(previewData.fontSize ?? 32, 22),
		color: previewData.color ?? "#ffffff",
		fontWeight: previewData.fontWeight === "bold" ? 700 : 400,
		fontStyle: previewData.fontStyle ?? "normal",
		background: previewData.background?.enabled
			? previewData.background.color
			: "transparent",
		padding: previewData.background?.enabled
			? `${(previewData.background.paddingY ?? 0) / 6}px ${(previewData.background.paddingX ?? 0) / 6}px`
			: 0,
		borderRadius: preset.build().background.enabled
			? Math.min(preset.build().background.cornerRadius ?? 0, 8)
			: 0,
	};

	const dragData: TimelineDragData = {
		id: preset.id,
		type: "text",
		name: preset.name,
		content: previewData.content ?? "",
		presetId: preset.id,
	};

	return (
		<div className={cn("relative", busy && "pointer-events-none opacity-50")}>
			<DraggableItem
				name={preset.name}
				preview={
					<div className="relative h-full w-full overflow-hidden">
						<div
							aria-hidden
							className="absolute inset-0"
							style={{ background: textPalette.background }}
						/>
						<div className="absolute inset-0 bg-black/30" />
						<div
							className="relative z-10 line-clamp-2 text-balance break-words flex h-full w-full items-center justify-center px-3"
							style={previewStyle}
						>
							{previewData.content}
						</div>
					</div>
				}
				dragPreview={
					<div
						className="flex size-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black p-3"
						title={preset.name}
					>
						<span
							className="line-clamp-3 text-center text-balance break-words"
							style={previewStyle}
						>
							{previewData.content}
						</span>
					</div>
				}
				dragData={dragData}
				onAddToTimeline={handleAdd}
				aspectRatio={16 / 10}
				shouldShowLabel
				isRounded
				variant="card"
				containerClassName="w-full"
			/>
		</div>
	);
}
