"use client";

import { useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
	FILTER_CATEGORIES,
	FILTER_PRESETS,
	type FilterPreset,
} from "@/lib/filters";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useEditor } from "@/hooks/use-editor";
import type { EditorCore } from "@/core";
import { generateUUID } from "@/utils/id";
import { cn } from "@/utils/ui";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const FILTER_LABELS = FILTER_CATEGORIES.map((c) => c.label);
const FILTER_ID_TO_LABEL = new Map(
	FILTER_CATEGORIES.map((c) => [c.id, c.label]),
);

export function FiltersView() {
	const [category, setCategory] = useState(ALL_CATEGORY);
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const editor = useEditor();

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: FILTER_PRESETS,
				category,
				getCategory: (p) => FILTER_ID_TO_LABEL.get(p.category),
			}),
		[category],
	);

	return (
		<PanelView title="Filters">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					One-click color grading. Select a video clip first, then tap a filter
					to apply.
				</p>
				<CategoryBar
					categories={FILTER_LABELS}
					value={category}
					onChange={setCategory}
				/>
				<div
					className="grid gap-3"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
					}}
				>
					{filtered.map((preset) => (
						<FilterItem
							key={preset.id}
							preset={preset}
							onApply={() => applyFilter({ editor, preset })}
						/>
					))}
				</div>
			</div>
		</PanelView>
	);
}

function applyFilter({
	editor,
	preset,
}: {
	editor: EditorCore;
	preset: FilterPreset;
}) {
	const selected = editor.selection.getSelectedElements();
	if (selected.length === 0) {
		toast.error("Select a video clip first");
		return;
	}
	const ref = selected[0];
	if (!ref) {
		toast.error("Select a video clip first");
		return;
	}
	const track = editor.timeline.getTrackById({ trackId: ref.trackId });
	const element = track?.elements.find((el) => el.id === ref.elementId);
	if (!element) {
		toast.error("Element not found");
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
	toast.success(`Filter "${preset.name}" applied`);
}

function FilterItem({
	preset,
	onApply,
}: {
	preset: FilterPreset;
	onApply: () => void;
}) {
	const [r, g, b] = preset.thumbnailColor;
	return (
		<button
			type="button"
			onClick={onApply}
			className={cn(
				"group bg-accent hover:bg-accent/70 relative flex flex-col items-center gap-1.5 overflow-hidden rounded-sm p-2 text-center transition-colors",
			)}
		>
			<div
				className="relative w-full aspect-video overflow-hidden rounded-sm flex items-center justify-center"
				style={{
					background: `linear-gradient(135deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}) 100%)`,
				}}
			>
				<div className="text-white text-xl font-bold opacity-30 mix-blend-overlay">
					{preset.name.slice(0, 1)}
				</div>
			</div>
			<span className="text-muted-foreground w-full truncate text-[0.7rem]">
				{preset.name}
			</span>
			<HugeiconsIcon
				icon={PlusSignIcon}
				className="absolute right-1 top-1 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	);
}
