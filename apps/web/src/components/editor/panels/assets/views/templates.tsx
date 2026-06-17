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
import { MarqueeText } from "@/components/ui/marquee-text";
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
			<div className="relative flex w-full flex-1 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(135deg,#111827,#020617)]">
				<div className="absolute inset-2 rounded border border-white/[0.08] bg-white/[0.03]" />
				<div className="absolute left-3 top-4 h-3 w-11 rounded bg-white/18" />
				<div className="absolute bottom-7 left-3 h-2 w-16 rounded bg-cyan-300/35" />
				<div className="absolute bottom-4 left-3 h-2 w-10 rounded bg-white/16" />
				<div className="absolute right-3 top-4 grid size-10 place-items-center rounded bg-gradient-to-br from-cyan-400/45 to-fuchsia-500/40 text-[0.62rem] font-bold text-white/70">
					{template.name.slice(0, 2).toUpperCase()}
				</div>
				<div className="absolute bottom-1 right-1 rounded bg-black/65 px-1 text-[0.6rem] text-white/60">
					{durationSec}s
				</div>
			</div>
			<MarqueeText
				className="text-muted-foreground w-full text-[0.7rem]"
				pxPerSecond={30}
			>
				{template.name}
			</MarqueeText>
			<HugeiconsIcon
				icon={PlusSignIcon}
				className="absolute right-1 top-1 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	);
}
