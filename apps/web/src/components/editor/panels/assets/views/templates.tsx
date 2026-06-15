"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import {
	PROJECT_TEMPLATES,
	TEMPLATE_CATEGORIES,
	applyTemplateToProject,
	type ProjectTemplate,
} from "@/lib/templates";
import { useEditor } from "@/hooks/use-editor";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { cn } from "@/utils/ui";
import type { EditorCore } from "@/core";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

export function TemplatesView() {
	const [category, setCategory] = useState<string>("all");
	const editor = useEditor();
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);

	const filteredTemplates =
		category === "all"
			? PROJECT_TEMPLATES
			: PROJECT_TEMPLATES.filter((t) => t.category === category);

	return (
		<PanelView title="Templates">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Start with a pre-built template and replace the placeholder media with
					your own.
				</p>
				<div className="flex flex-wrap gap-1">
					<TemplateCategoryChip
						id="all"
						label="All"
						active={category === "all"}
						onClick={setCategory}
					/>
					{TEMPLATE_CATEGORIES.map((cat) => (
						<TemplateCategoryChip
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

function TemplateCategoryChip({
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
