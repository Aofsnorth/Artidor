"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { templates as presetTemplates } from "@/lib/presets/templates";
import type { TemplateCategory as PresetTemplateCategory } from "@/lib/presets/types";
import { getPaletteForId, hashString } from "./components/procedural-preview";
import {
	PROJECT_TEMPLATES,
	TEMPLATE_CATEGORIES,
	applyTemplateToProject,
	type ProjectTemplate,
	type TemplateCategory,
} from "@/lib/templates";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useEditor } from "@/hooks/use-editor";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { cn } from "@/utils/ui";
import { MarqueeText } from "@/components/ui/marquee-text";
import type { EditorCore } from "@/core";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const TEMPLATE_LABELS = TEMPLATE_CATEGORIES.map((c) => c.label);
const TEMPLATE_ID_TO_LABEL = new Map(
	TEMPLATE_CATEGORIES.map((c) => [c.id, c.label]),
);

const PRESET_TEMPLATE_CATEGORY_MAP: Record<
	PresetTemplateCategory,
	TemplateCategory
> = {
	Intro: "intro",
	Outro: "outro",
	LowerThird: "lower-third",
	Title: "intro",
	Slideshow: "slideshow",
	Promo: "promo",
	Social: "social",
	Story: "social",
	Wedding: "slideshow",
	Travel: "vlog",
	Sports: "promo",
	Music: "lyric",
	Business: "promo",
	Tutorial: "tutorial",
	Sale: "promo",
};

const presetProjectTemplates: ProjectTemplate[] = presetTemplates.map(
	(template) => ({
		id: template.id,
		name: template.name,
		description: template.description,
		category: PRESET_TEMPLATE_CATEGORY_MAP[template.category],
		durationTicks: template.durationSec * TICKS_PER_SECOND,
		elements: [],
		placeholders: [],
	}),
);

const PRESET_TEMPLATE_IDS = new Set(
	presetTemplates.map((template) => template.id),
);

export function TemplatesView() {
	const [category, setCategory] = useState(ALL_CATEGORY);
	const editor = useEditor();
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);

	const allTemplates = useMemo(() => {
		const existingIds = new Set(
			PROJECT_TEMPLATES.map((template) => template.id),
		);
		return [
			...PROJECT_TEMPLATES,
			...presetProjectTemplates.filter(
				(template) => !existingIds.has(template.id),
			),
		];
	}, []);

	const filteredTemplates = useMemo(
		() =>
			filterByCategory({
				items: allTemplates,
				category,
				getCategory: (t) => TEMPLATE_ID_TO_LABEL.get(t.category),
			}),
		[allTemplates, category],
	);

	return (
		<PanelView title="Templates">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Start with a pre-built template and replace the placeholder media with
					your own.
				</p>
				<CategoryBar
					categories={TEMPLATE_LABELS}
					value={category}
					onChange={setCategory}
				/>
				<div
					className="grid gap-3"
					style={{
						gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(assetCardSize, 132)}px, 1fr))`,
					}}
				>
					{filteredTemplates.map((template) => (
						<TemplateItem
							key={template.id}
							template={template}
							onApply={() => applyTemplate({ editor, template })}
						/>
					))}
				</div>
			</div>
		</PanelView>
	);
}

function applyTemplate({
	editor,
	template,
}: {
	editor: EditorCore;
	template: ProjectTemplate;
}) {
	if (PRESET_TEMPLATE_IDS.has(template.id)) {
		toast.info("Template preset not yet wired");
		return;
	}

	try {
		const project = applyTemplateToProject({
			template,
			mediaIdsByPlaceholder: {},
		});
		editor.project.setActiveProject({ project });
		editor.scenes.setScenes({
			scenes: project.scenes,
			activeSceneId: project.currentSceneId,
		});
		editor.project.saveCurrentProject();
		toast.success(`Template "${template.name}" applied`);
	} catch (err) {
		console.error("Failed to apply template:", err);
		toast.error("Failed to apply template");
	}
}

function getTemplatePhotoUrl(_templateId: string): null {
	// Backwards-compat. The template preview now uses `getPaletteForId`
	// for a procedural background — no remote thumbnail fetch.
	return null;
}



function TemplateItem({
	template,
	onApply,
}: {
	template: ProjectTemplate;
	onApply: () => void;
}) {
	const durationSec = Math.round(template.durationTicks / TICKS_PER_SECOND);
	const h = hashString(template.id);
	const layoutType = h % 3;
	const photoUrl = getTemplatePhotoUrl(template.id);
	void photoUrl;
	const templatePalette = getPaletteForId(template.id);

	return (
		<button
			type="button"
			onClick={onApply}
			className={cn(
				"group bg-accent hover:bg-accent/70 relative flex flex-col overflow-hidden rounded-sm p-2 text-left transition-colors aspect-[4/5]",
			)}
		>
			<div className="relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-sm border border-white/10">
				<div
					aria-hidden
					className="absolute inset-0"
					style={{ background: templatePalette.background }}
				/>
				<div className="absolute inset-0 bg-black/40" />

				{layoutType === 0 && (
					<>
						<div className="absolute left-3 top-4 h-3 w-11 rounded bg-white/30 backdrop-blur-sm" />
						<div className="absolute bottom-7 left-3 h-2 w-16 rounded bg-white/25 backdrop-blur-sm" />
						<div className="absolute bottom-4 left-3 h-2 w-10 rounded bg-white/20 backdrop-blur-sm" />
					</>
				)}
				{layoutType === 1 && (
					<>
						<div className="absolute inset-x-2 top-2 bottom-10 rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute inset-x-2 bottom-2 h-6 rounded bg-white/15 backdrop-blur-sm flex gap-1 p-1">
							<div className="flex-1 rounded bg-white/25" />
							<div className="flex-1 rounded bg-white/25" />
							<div className="flex-1 rounded bg-white/25" />
						</div>
					</>
				)}
				{layoutType === 2 && (
					<>
						<div className="absolute left-2 top-2 bottom-2 w-1/3 rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute right-2 top-2 bottom-2 w-[58%] rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute right-4 top-4 h-3 w-10 rounded bg-white/30 backdrop-blur-sm" />
						<div className="absolute right-4 top-9 h-2 w-14 rounded bg-white/25 backdrop-blur-sm" />
					</>
				)}

				<div className="absolute right-3 top-4 grid size-10 place-items-center rounded bg-white/90 text-[0.62rem] font-bold text-black">
					{template.name.slice(0, 2).toUpperCase()}
				</div>
			</div>
			<div className="flex w-full min-w-0 items-center justify-between gap-2 text-[0.68rem]">
				<MarqueeText
					className="text-foreground min-w-0 flex-1 font-medium"
					pxPerSecond={30}
				>
					{template.name}
				</MarqueeText>
				<span className="text-muted-foreground shrink-0 tabular-nums">
					{durationSec}s
				</span>
			</div>
			<HugeiconsIcon
				icon={PlusSignIcon}
				className="absolute right-1 top-1 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	);
}
