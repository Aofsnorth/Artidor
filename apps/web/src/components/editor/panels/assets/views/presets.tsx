"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	BookmarkAdd02Icon,
	Delete02Icon,
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { PanelView } from "./base-panel";
import { useEditor } from "@/hooks/use-editor";
import { usePresetsStore } from "@/stores/presets-store";
import { presetToClipboardItems } from "@/lib/presets";
import type { UserPreset } from "@/lib/presets/types";
import { PasteCommand } from "@/lib/commands/timeline";
import { cn } from "@/utils/ui";

export function PresetsView() {
	const { presets, isLoaded, loadPresets } = usePresetsStore();

	useEffect(() => {
		if (!isLoaded) void loadPresets();
	}, [isLoaded, loadPresets]);

	return (
		<PanelView title="Preset Tools">
			{presets.length === 0 ? (
				<EmptyState />
			) : (
				<div
					className="grid gap-2 pb-4"
					style={{
						gridTemplateColumns:
							"repeat(auto-fill, minmax(var(--preset-min, 96px), 1fr))",
					}}
				>
					{presets.map((preset) => (
						<PresetCard key={preset.id} preset={preset} />
					))}
				</div>
			)}
		</PanelView>
	);
}

function EmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
			<HugeiconsIcon
				icon={BookmarkAdd02Icon}
				className="size-9 text-white/30"
			/>
			<p className="text-sm font-medium text-white/80">No presets yet</p>
			<p className="text-xs text-white/40 leading-relaxed text-balance">
				Select a layer or group on the timeline, right-click, and choose{" "}
				<span className="text-white/70">Save to preset</span>. Coin designs,
				animated logos, or any styled layer can be reused here.
			</p>
		</div>
	);
}

function PresetCard({ preset }: { preset: UserPreset }) {
	const editor = useEditor();
	const removePreset = usePresetsStore((s) => s.removePreset);

	const handleInsert = () => {
		try {
			const clipboardItems = presetToClipboardItems({ preset });
			const time = editor.playback.getCurrentTime();
			editor.command.execute({
				command: new PasteCommand({ time, clipboardItems }),
			});
			toast.success(`Added "${preset.name}"`);
		} catch (error) {
			console.error("Failed to insert preset:", error);
			toast.error("Failed to add preset");
		}
	};

	const handleDelete = (event: React.MouseEvent) => {
		event.stopPropagation();
		void removePreset(preset.id);
	};

	return (
		<div className="group relative flex flex-col gap-1">
			<button
				type="button"
				onClick={handleInsert}
				className={cn(
					"relative aspect-square w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0c]",
					"transition hover:border-white/30",
				)}
				title={`Add "${preset.name}"`}
			>
				{preset.thumbnail ? (
					// biome-ignore lint/performance/noImgElement: thumbnail is an in-memory data URL, not an optimizable asset
					<img
						src={preset.thumbnail}
						alt={preset.name}
						className="size-full object-contain"
						loading="lazy"
					/>
				) : (
					<div className="flex size-full items-center justify-center">
						<HugeiconsIcon
							icon={BookmarkAdd02Icon}
							className="size-5 text-white/30"
						/>
					</div>
				)}
				<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
					<HugeiconsIcon icon={PlayIcon} className="size-6 text-white" />
				</div>
			</button>
			<div className="flex items-center justify-between gap-1">
				<span
					className="truncate text-[0.65rem] text-white/60"
					title={preset.name}
				>
					{preset.name}
				</span>
				<button
					type="button"
					onClick={handleDelete}
					className="shrink-0 rounded p-0.5 text-white/30 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
					title="Delete preset"
					aria-label={`Delete ${preset.name}`}
				>
					<HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
