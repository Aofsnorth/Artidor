"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useApplyAnimationPreset } from "@/hooks/use-animation-presets";
import { animationPresetsRegistry } from "@/lib/animation/presets";
import { buildTextElement } from "@/lib/timeline/element-utils";
import {
	textPresets,
	type TextPreset,
	type TextPresetCategory,
} from "@/lib/text/presets";
import { cn } from "@/utils/ui";

const CATEGORIES: { key: TextPresetCategory | "all"; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "title", label: "Titles" },
	{ key: "subtitle", label: "Subtitles" },
	{ key: "lower-third", label: "Lower Thirds" },
	{ key: "callout", label: "Callouts" },
	{ key: "quote", label: "Quotes" },
];

export function TextView() {
	const [filter, setFilter] = useState<TextPresetCategory | "all">("all");

	const filtered = useMemo(() => {
		if (filter === "all") return textPresets;
		return textPresets.filter((p) => p.category === filter);
	}, [filter]);

	return (
		<PanelView title="Text">
			<div className="flex flex-col gap-3 pb-3">
				<div className="flex flex-wrap gap-1">
					{CATEGORIES.map((cat) => (
						<Button
							key={cat.key}
							variant={filter === cat.key ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setFilter(cat.key)}
							className="h-7 px-2 text-xs"
						>
							{cat.label}
						</Button>
					))}
				</div>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
					}}
				>
					{filtered.map((preset) => (
						<TextPresetItem key={preset.id} preset={preset} />
					))}
				</div>
			</div>
		</PanelView>
	);
}

function TextPresetItem({ preset }: { preset: TextPreset }) {
	const editor = useEditor();
	const applyAnimation = useApplyAnimationPreset();
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

			// Apply default fade-in animation to the just-inserted text element
			const fadeInPreset = animationPresetsRegistry.get("fade-up");
			if (fadeInPreset) {
				const tracks = editor.scenes.getActiveScene().tracks;
				const textTrack = [...tracks.overlay]
					.reverse()
					.find((t) => t.type === "text" && t.elements.length > 0);
				const lastInserted = textTrack?.elements[textTrack.elements.length - 1];
				if (textTrack && lastInserted) {
					editor.selection.setSelectedElements({
						elements: [{ trackId: textTrack.id, elementId: lastInserted.id }],
					});
					applyAnimation(fadeInPreset);
					editor.selection.clearSelection();
				}
			}

			toast.success(`${preset.name} added`);
		} catch (error) {
			toast.error("Could not add text", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setBusy(false);
		}
	}, [editor, preset, applyAnimation]);

	const previewData = preset.build();
	const previewStyle: React.CSSProperties = {
		fontFamily: previewData.fontFamily ?? "var(--font-sans)",
		fontSize: Math.min(previewData.fontSize ?? 32, 18),
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

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleAdd}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleAdd();
				}
			}}
			className={cn(
				`asset-preview-container group ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`,
			)}
		>
			<div className="asset-preview-overlay" />

			<div
				className="line-clamp-2 text-balance break-words z-10 mx-auto mt-4"
				style={previewStyle}
			>
				{preset.build().content}
			</div>
			<span className="text-foreground z-10 w-full truncate px-2 text-[0.7rem] font-medium drop-shadow-md">
				{preset.name}
			</span>
			<div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity group-hover:opacity-100">
				<Button
					size="icon"
					variant="secondary"
					className="size-5 bg-black/50 hover:bg-black/80 border border-white/10"
					aria-label={`Add ${preset.name}`}
					onClick={(e) => {
						e.stopPropagation();
						handleAdd();
					}}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3 text-cyan-400" />
				</Button>
			</div>
		</div>
	);
}
