"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { templates as presetTemplates } from "@/lib/presets/templates";
import type {
	TemplateBuild,
	TemplateCategory as PresetTemplateCategory,
} from "@/lib/presets/types";
import {
	buildTextElement,
	buildGraphicElement,
	buildEffectElement,
} from "@/lib/timeline/element-utils";
import { effectsRegistry } from "@/lib/effects";
import { DEFAULT_CANVAS_SIZE } from "@/lib/canvas/sizes";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics/types";
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
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";

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

const PRESET_BUILD_BY_ID = new Map(
	presetTemplates.map((template) => [template.id, template.build]),
);

export function TemplatesView() {
	const [category, setCategory] = useState(ALL_CATEGORY);
	const editor = useEditor();

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
				<AssetGrid min={132}>
					{filteredTemplates.map((template) => (
						<TemplateItem
							key={template.id}
							template={template}
							onApply={() => applyTemplate({ editor, template })}
						/>
					))}
				</AssetGrid>
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
		const build = PRESET_BUILD_BY_ID.get(template.id);
		if (!build) {
			toast.error("Template preset unavailable");
			return;
		}
		applyPresetTemplate({ editor, name: template.name, build: build() });
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

// Percent (0–100) coords in a TemplateBuild → editor px offsets from canvas
// center, which is how `transform.position` is interpreted by the renderer
// (frame-descriptor.ts adds position.x/y to width/2, height/2).
const GRAPHIC_KIND_TO_DEFINITION: Record<string, string> = {
	rect: "rectangle",
	rectangle: "rectangle",
	square: "rectangle",
	circle: "ellipse",
	ellipse: "ellipse",
};

function applyPresetTemplate({
	editor,
	name,
	build,
}: {
	editor: EditorCore;
	name: string;
	build: TemplateBuild;
}) {
	const canvasW = DEFAULT_CANVAS_SIZE.width;
	const canvasH = DEFAULT_CANVAS_SIZE.height;
	const sec = (s: number) => Math.round(s * TICKS_PER_SECOND);

	try {
		// Start from a clean project (mirrors the replace behavior of the
		// PROJECT_TEMPLATES path) by reusing applyTemplateToProject with no
		// elements, then layer the preset's content via validated builders.
		const endSec = Math.max(
			0,
			...build.textElements.map((t) => t.startSec + t.durationSec),
			...build.graphicElements.map((g) => g.startSec + g.durationSec),
		);
		const project = applyTemplateToProject({
			template: {
				id: `preset-${name}`,
				name,
				description: "",
				category: "intro",
				canvasSize: DEFAULT_CANVAS_SIZE,
				durationTicks: sec(endSec || 5),
				elements: [],
				placeholders: [],
			},
			mediaIdsByPlaceholder: {},
		});
		editor.project.setActiveProject({ project });
		editor.scenes.setScenes({
			scenes: project.scenes,
			activeSceneId: project.currentSceneId,
		});

		// Graphics first so they sit beneath text in track order.
		for (const g of build.graphicElements) {
			const definitionId = GRAPHIC_KIND_TO_DEFINITION[g.kind] ?? "rectangle";
			const base = buildGraphicElement({
				definitionId,
				name: g.kind,
				startTime: sec(g.startSec),
				params: { fill: g.fill },
			});
			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element: {
					...base,
					duration: sec(g.durationSec),
					transform: {
						scaleX: ((g.width / 100) * canvasW) / DEFAULT_GRAPHIC_SOURCE_SIZE,
						scaleY: ((g.height / 100) * canvasH) / DEFAULT_GRAPHIC_SOURCE_SIZE,
						position: {
							x: ((g.x + g.width / 2) / 100 - 0.5) * canvasW,
							y: ((g.y + g.height / 2) / 100 - 0.5) * canvasH,
						},
						positionZ: 0,
						pivot: { x: 0.5, y: 0.5 },
						rotate: 0,
					},
				},
			});
		}

		for (const t of build.textElements) {
			const element = buildTextElement({
				startTime: sec(t.startSec),
				raw: {
					content: t.text,
					name: t.text.slice(0, 24) || "Text",
					duration: sec(t.durationSec),
					fontSize: t.fontSize,
					color: t.color,
					fontWeight: t.fontWeight >= 600 ? "bold" : "normal",
					textAlign: t.textAlign,
					transform: {
						scaleX: 1,
						scaleY: 1,
						position: { x: 0, y: (t.y / 100 - 0.5) * canvasH },
						positionZ: 0,
						pivot: { x: 0.5, y: 0.5 },
						rotate: 0,
					},
				},
			});
			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
		}

		// Effects use preset ids (fx-*) that mostly don't resolve to runtime
		// effect types; apply the ones that do, skip the rest silently.
		for (const e of build.effects) {
			if (!effectsRegistry.has(e.type)) continue;
			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element: buildEffectElement({ effectType: e.type, startTime: 0 }),
			});
		}

		editor.project.saveCurrentProject();
		toast.success(`Template "${name}" applied`);
	} catch (err) {
		console.error("Failed to apply preset template:", err);
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
