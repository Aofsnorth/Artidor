"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { useEditor } from "@/hooks/use-editor";
import { buildTextElement } from "@/lib/timeline/element-utils";
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
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: textPresets,
				category,
				getCategory: (p) => TEXT_KEY_TO_LABEL.get(p.category),
			}),
		[category],
	);

	return (
		<PanelView title="Text">
			<div className="flex flex-col gap-3 pb-3">
				<CategoryBar
					categories={TEXT_LABELS}
					value={category}
					onChange={setCategory}
				/>
				<AssetGrid gap="gap-2">
					{filtered.map((preset) => (
						<TextPresetItem key={preset.id} preset={preset} />
					))}
				</AssetGrid>
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
	const editor = useEditor();
	const [busy, setBusy] = useState(false);

	const handleAdd = useCallback(async () => {
		setBusy(true);
		try {
			const currentTime = editor.playback.getCurrentTime();
			const raw = preset.build();
			const element = buildTextElement({
				raw,
				startTime: currentTime,
			});

			editor.timeline.insertElement({
				element,
				placement: { mode: "auto" },
			});

			// Note: no auto fade-in. A fade-up preset starts at opacity 0, which
			// left freshly-added text invisible at the playhead (looked like a bug).
			// Users can add an entrance animation explicitly from the Animation tab.

			toast.success(`${preset.name} added`);
		} catch (error) {
			toast.error("Could not add text", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setBusy(false);
		}
	}, [editor, preset]);

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
