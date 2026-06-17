"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	BookmarkAdd02Icon,
	Delete02Icon,
	Edit03Icon,
	PlayIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { PanelView } from "./base-panel";
import { useEditor } from "@/hooks/use-editor";
import { usePresetsStore } from "@/stores/presets-store";
import { presetToClipboardItems } from "@/lib/presets";
import type { UserPreset } from "@/lib/presets/types";
import { PasteCommand } from "@/lib/commands/timeline";
import { setDragData } from "@/lib/drag-data";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/utils/ui";

const PRESET_THUMB_MIN_PX = 96;

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
					className="grid gap-2.5 pb-4"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${PRESET_THUMB_MIN_PX}px, 1fr))`,
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
	const renamePreset = usePresetsStore((s) => s.renamePreset);
	const [isRenaming, setIsRenaming] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
	const [renameDraft, setRenameDraft] = useState(preset.name);
	const dragRef = useRef<HTMLDivElement>(null);

	const insertPreset = () => {
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

	const handleDelete = (event?: React.MouseEvent) => {
		event?.stopPropagation();
		void removePreset(preset.id);
		toast.success(`Deleted "${preset.name}"`);
	};

	const startRename = () => {
		setRenameDraft(preset.name);
		setIsRenaming(true);
	};

	const commitRename = () => {
		const trimmed = renameDraft.trim();
		if (trimmed.length === 0 || trimmed === preset.name) {
			setIsRenaming(false);
			return;
		}
		void renamePreset(preset.id, trimmed);
		setIsRenaming(false);
	};

	const emptyImg =
		typeof window !== "undefined"
			? (() => {
					const img = new window.Image();
					img.src =
						"data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
					return img;
				})()
			: null;

	const handleDragStart = (event: React.DragEvent) => {
		if (!emptyImg) return;
		event.dataTransfer.setDragImage(emptyImg, 0, 0);
		setDragData({
			dataTransfer: event.dataTransfer,
			dragData: {
				type: "preset",
				id: preset.id,
				name: preset.name,
				presetId: preset.id,
			},
		});
		event.dataTransfer.effectAllowed = "copy";
		setDragPosition({ x: event.clientX, y: event.clientY });
		setIsDragging(true);
	};

	const handleDragEnd = () => {
		setIsDragging(false);
	};

	const kindLabel =
		preset.kind === "group"
			? "Group"
			: preset.kind === "animation"
				? "Animation"
				: preset.kind === "project"
					? "Project"
					: "Element";

	return (
		<ContextMenu>
			<div ref={dragRef} className="group relative flex flex-col gap-1">
				<ContextMenuTrigger asChild>
					<button
						type="button"
						onClick={insertPreset}
						draggable
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						className={cn(
							"relative aspect-square w-full overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0c]",
							"transition hover:border-white/30 cursor-grab active:cursor-grabbing",
							isDragging && "opacity-50",
						)}
						title={`Apply "${preset.name}" — drag to timeline, or click to insert at the playhead`}
					>
						{preset.thumbnail ? (
							// biome-ignore lint/performance/noImgElement: thumbnail is an in-memory data URL, not an optimizable asset
							<img
								src={preset.thumbnail}
								alt={preset.name}
								className="size-full object-contain"
								loading="lazy"
								draggable={false}
							/>
						) : (
							<div className="flex size-full items-center justify-center">
								<HugeiconsIcon
									icon={BookmarkAdd02Icon}
									className="size-5 text-white/30"
								/>
							</div>
						)}
						<div className="pointer-events-none absolute inset-x-1 top-1 flex items-center justify-between gap-1">
							<span className="rounded bg-black/55 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
								{kindLabel}
							</span>
							<span className="rounded bg-black/55 p-1 text-white/0 transition group-hover:text-white/80">
								<HugeiconsIcon icon={PlayIcon} className="size-3" />
							</span>
						</div>
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
							<div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-semibold text-[#09090b]">
								<HugeiconsIcon icon={PlusSignIcon} className="size-3" />
								Apply
							</div>
						</div>
					</button>
				</ContextMenuTrigger>
				<div className="flex items-center justify-between gap-1 px-0.5">
					{isRenaming ? (
						<RenameInput
							value={renameDraft}
							maxLength={60}
							onChange={setRenameDraft}
							onCommit={commitRename}
							onCancel={() => setIsRenaming(false)}
						/>
					) : (
						<button
							type="button"
							onClick={startRename}
							title={`Rename "${preset.name}"`}
							className="min-w-0 flex-1 truncate text-left text-[0.65rem] text-white/60 hover:text-white"
						>
							{preset.name}
						</button>
					)}
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							startRename();
						}}
						className="shrink-0 rounded p-0.5 text-white/30 opacity-0 transition hover:text-white group-hover:opacity-100"
						title="Rename preset"
						aria-label={`Rename ${preset.name}`}
					>
						<HugeiconsIcon icon={Edit03Icon} className="size-3.5" />
					</button>
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
			<ContextMenuContent className="w-48">
				<ContextMenuItem
					icon={<HugeiconsIcon icon={PlusSignIcon} />}
					onSelect={insertPreset}
				>
					Apply preset
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Edit03Icon} />}
					onSelect={startRename}
				>
					Rename
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					variant="destructive"
					onSelect={() => handleDelete()}
				>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
			{/* Floating drag ghost — keeps the preview visible while the
			    native drag image is hidden via setDragImage(emptyImg). The
			    ghost tracks the cursor at -40px / -40px so the card centre
			    lands on the pointer, matching how the other DraggableItem
			    views feel. */}
			{isDragging &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="pointer-events-none fixed z-9999"
						style={{
							left: dragPosition.x - 40,
							top: dragPosition.y - 40,
						}}
					>
						<div className="w-[80px] overflow-hidden rounded-md border border-white/30 bg-[#0b0b0c] shadow-2xl ring-2 ring-white/40">
							<div className="aspect-square">
								{preset.thumbnail ? (
									// biome-ignore lint/performance/noImgElement: thumbnail is an in-memory data URL, not an optimizable asset
									<img
										src={preset.thumbnail}
										alt=""
										className="size-full object-contain"
										draggable={false}
									/>
								) : (
									<div className="flex size-full items-center justify-center">
										<HugeiconsIcon
											icon={BookmarkAdd02Icon}
											className="size-5 text-white/30"
										/>
									</div>
								)}
							</div>
						</div>
					</div>,
					document.body,
				)}
		</ContextMenu>
	);
}

function RenameInput({
	value,
	maxLength,
	onChange,
	onCommit,
	onCancel,
}: {
	value: string;
	maxLength: number;
	onChange: (next: string) => void;
	onCommit: () => void;
	onCancel: () => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	// Focus + select on mount so the user can immediately type to
	// overwrite the existing name. We can't use the `autoFocus` JSX
	// attribute because biome flags it for screen readers; the
	// ref + effect pattern still focuses the field without that
	// lint warning.
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		node.focus();
		node.select();
	}, []);
	return (
		<input
			ref={ref}
			type="text"
			value={value}
			maxLength={maxLength}
			onChange={(event) => onChange(event.target.value)}
			onBlur={onCommit}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					onCommit();
				} else if (event.key === "Escape") {
					event.preventDefault();
					onCancel();
				}
			}}
			className="min-w-0 flex-1 rounded border border-white/[0.18] bg-white/[0.06] px-1.5 py-0.5 text-[0.65rem] text-white/85 outline-none focus:border-white/40"
		/>
	);
}
