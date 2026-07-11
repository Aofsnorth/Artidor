"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
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
import { MarqueeText } from "@/components/ui/marquee-text";
import type { EditorCore } from "@/core";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { useI18n } from "@/lib/i18n";

const TEMPLATE_CATEGORY_TO_KEY: Record<TemplateCategory, string> = {
	intro: "templates.category.intro",
	outro: "templates.category.outro",
	"lower-third": "templates.category.lowerThird",
	social: "templates.category.social",
	vlog: "templates.category.vlog",
	promo: "templates.category.promo",
	slideshow: "templates.category.slideshow",
	lyric: "templates.category.lyric",
	tutorial: "templates.category.tutorial",
};

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
	const { t, locale } = useI18n();
	const [category, setCategory] = useState(ALL_CATEGORY);
	const [query, setQuery] = useState("");
	const editor = useEditor();

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset category selection when locale changes
	useEffect(() => {
		setCategory(ALL_CATEGORY);
	}, [locale]);

	const categoryLabels = useMemo(
		() => TEMPLATE_CATEGORIES.map((c) => t(TEMPLATE_CATEGORY_TO_KEY[c.id])),
		[t],
	);
	const idToLabel = useMemo(
		() =>
			new Map(
				TEMPLATE_CATEGORIES.map((c) => [
					c.id,
					t(TEMPLATE_CATEGORY_TO_KEY[c.id]),
				]),
			),
		[t],
	);

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

	const filteredTemplates = useMemo(() => {
		const categoryFiltered = filterByCategory({
			items: allTemplates,
			category,
			getCategory: (template) => idToLabel.get(template.category),
		});
		return filterCatalogItems({
			items: categoryFiltered,
			query,
			getText: (template) => [
				template.name,
				template.id,
				template.description,
				idToLabel.get(template.category),
			],
		});
	}, [allTemplates, category, query, idToLabel]);

	return (
		<PanelView title={t("catalog.titleTemplates")}>
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					{t("catalog.descriptionTemplates")}
				</p>
				<CategoryBar
					categories={categoryLabels}
					value={category}
					onChange={setCategory}
				/>
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchTemplates")}
				/>
				{filteredTemplates.length > 0 ? (
					<AssetGrid gap="gap-2">
						{filteredTemplates.map((template) => (
							<TemplateItem
								key={template.id}
								template={template}
								onApply={() => applyTemplate({ editor, template, t })}
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

function applyTemplate({
	editor,
	template,
	t,
}: {
	editor: EditorCore;
	template: ProjectTemplate;
	t: (key: string, values?: Record<string, string | number>) => string;
}) {
	if (PRESET_TEMPLATE_IDS.has(template.id)) {
		const build = PRESET_BUILD_BY_ID.get(template.id);
		if (!build) {
			toast.error(t("catalog.templatePresetUnavailable"));
			return;
		}
		applyPresetTemplate({ editor, name: template.name, build: build(), t });
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
		toast.success(t("catalog.templateApplied", { name: template.name }));
	} catch (err) {
		console.error("Failed to apply template:", err);
		toast.error(t("catalog.failedToApplyTemplate"));
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
	t,
}: {
	editor: EditorCore;
	name: string;
	build: TemplateBuild;
	t: (key: string, values?: Record<string, string | number>) => string;
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
		toast.success(t("catalog.templateApplied", { name }));
	} catch (err) {
		console.error("Failed to apply preset template:", err);
		toast.error(t("catalog.failedToApplyTemplate"));
	}
}

function TemplateItem({
	template,
	onApply,
}: {
	template: ProjectTemplate;
	onApply: () => void;
}) {
	const { t } = useI18n();
	const durationSec = Math.round(template.durationTicks / TICKS_PER_SECOND);
	const h = hashString(template.id);
	const layoutType = h % 5;

	const templatePalette = getPaletteForId(template.id);

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
				className="relative mx-auto mt-2 size-full overflow-hidden rounded-sm border border-white/10"
				style={{ width: "80%", height: "80%" }}
			>
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
				{layoutType === 3 && (
					<>
						{/* Split-screen vertical */}
						<div className="absolute inset-x-2 top-2 h-1/2 rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute inset-x-2 bottom-2 h-1/2 rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute left-4 top-4 h-2 w-12 rounded bg-white/30 backdrop-blur-sm" />
						<div className="absolute left-4 bottom-4 h-3 w-16 rounded bg-white/25 backdrop-blur-sm" />
						<div className="absolute left-4 bottom-9 h-2 w-10 rounded bg-white/20 backdrop-blur-sm" />
					</>
				)}
				{layoutType === 4 && (
					<>
						{/* Grid 2×2 */}
						<div className="absolute left-2 top-2 size-[40%] rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute right-2 top-2 size-[40%] rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute left-2 bottom-2 size-[40%] rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute right-2 bottom-2 size-[40%] rounded border border-white/20 backdrop-blur-sm" />
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-8 rounded bg-white/30" />
					</>
				)}

				<div className="absolute right-3 top-4 grid size-10 place-items-center rounded bg-white/90 text-[0.62rem] font-bold text-black">
					{template.name.slice(0, 2).toUpperCase()}
				</div>
			</div>
			<MarqueeText
				className="text-foreground z-10 block w-full px-2 text-center text-[0.7rem] font-medium drop-shadow-md"
				pxPerSecond={30}
			>
				{template.name}
			</MarqueeText>
			<div className="text-white/70 absolute right-1.5 top-1.5 z-20 flex items-center gap-0.5 rounded bg-black/60 border border-white/10 px-1 py-0.5 text-[0.55rem] backdrop-blur-sm">
				{t("templates.durationSeconds", { duration: durationSec })}
			</div>
		</div>
	);
}
