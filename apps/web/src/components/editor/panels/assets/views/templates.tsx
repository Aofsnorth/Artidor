"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import {
	PROJECT_TEMPLATES,
	TEMPLATE_CATEGORIES,
	applyTemplateToProject,
	type ProjectTemplate,
} from "@/lib/templates";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useEditor } from "@/hooks/use-editor";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { cn } from "@/utils/ui";
import type { EditorCore } from "@/core";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

const TEMPLATE_LABELS = TEMPLATE_CATEGORIES.map((c) => c.label);
const TEMPLATE_ID_TO_LABEL = new Map(
	TEMPLATE_CATEGORIES.map((c) => [c.id, c.label]),
);

export function TemplatesView() {
	const [category, setCategory] = useState(ALL_CATEGORY);
	const editor = useEditor();
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);

	const filteredTemplates = useMemo(
		() =>
			filterByCategory({
				items: PROJECT_TEMPLATES,
				category,
				getCategory: (t) => TEMPLATE_ID_TO_LABEL.get(t.category),
			}),
		[category],
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
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
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

function TemplateItem({
	template,
	onApply,
}: {
	template: ProjectTemplate;
	onApply: () => void;
}) {
	const durationSec = Math.round(template.durationTicks / TICKS_PER_SECOND);
	return (
		<button
			type="button"
			onClick={onApply}
			className={cn(
				"group bg-accent hover:bg-accent/70 relative flex flex-col items-center gap-1.5 overflow-hidden rounded-sm p-2 text-center transition-colors aspect-[3/4]",
			)}
		>
			<div className="bg-muted-foreground/30 relative w-full flex-1 overflow-hidden rounded-sm flex items-center justify-center">
				<div className="text-2xl font-bold opacity-30">
					{template.name.slice(0, 2).toUpperCase()}
				</div>
				<div className="absolute bottom-1 right-1 text-[0.6rem] text-muted-foreground bg-background/70 px-1 rounded">
					{durationSec}s
				</div>
			</div>
			<span className="text-muted-foreground w-full truncate text-[0.7rem]">
				{template.name}
			</span>
			<HugeiconsIcon
				icon={PlusSignIcon}
				className="absolute right-1 top-1 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	);
}
