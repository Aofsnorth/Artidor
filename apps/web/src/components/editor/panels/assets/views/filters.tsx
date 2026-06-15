"use client";

import { useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import {
	FILTER_CATEGORIES,
	FILTER_PRESETS,
	type FilterPreset,
} from "@/lib/filters";
import { useEditor } from "@/hooks/use-editor";
import type { EditorCore } from "@/core";
import { generateUUID } from "@/utils/id";
import { cn } from "@/utils/ui";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

export function FiltersView() {
	const [category, setCategory] = useState<string>("all");
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const editor = useEditor();

	const filtered =
		category === "all"
			? FILTER_PRESETS
			: FILTER_PRESETS.filter((p) => p.category === category);

	return (
		<PanelView title="Filters">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					One-click color grading. Select a video clip first, then tap a filter
					to apply.
				</p>
				<div className="flex flex-wrap gap-1">
					<FilterCategoryChip
						id="all"
						label="All"
						active={category === "all"}
						onClick={setCategory}
					/>
					{FILTER_CATEGORIES.map((cat) => (
						<FilterCategoryChip
							key={cat.id}
							id={cat.id}
							label={cat.label}
							active={category === cat.id}
							onClick={setCategory}
						/>
					))}
				</div>
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

function FilterCategoryChip({
	id,
	label,
	active,
	onClick,
}: {
	id: string;
	label: string;
	active: boolean;
	onClick: (id: string) => void;
}) {
	return (
		<Button
			size="sm"
			variant={active ? "secondary" : "ghost"}
			className="h-7 px-2 text-xs"
			onClick={() => onClick(id)}
		>
			{label}
		</Button>
	);
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
