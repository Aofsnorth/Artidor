"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	BookmarkAdd02Icon,
	Delete02Icon,
	Edit03Icon,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";
import {
	CatalogEmptyState,
	CatalogSearch,
	filterCatalogItems,
} from "@/components/editor/panels/assets/views/components/catalog-search";
import { AssetGrid } from "@/components/editor/panels/assets/views/asset-grid";
import { useI18n } from "@/lib/i18n";

export function PresetsView() {
	const { t } = useI18n();
	const { presets, isLoaded, loadPresets } = usePresetsStore();
	const [query, setQuery] = useState("");

	useEffect(() => {
		if (!isLoaded) void loadPresets();
	}, [isLoaded, loadPresets]);

	const filteredPresets = useMemo(
		() =>
			filterCatalogItems({
				items: presets,
				query,
				getText: (preset) => [preset.name, preset.id],
			}),
		[presets, query],
	);

	return (
		<PanelView title={t("catalog.titlePresets")}>
			<div className="flex flex-1 flex-col gap-3 pb-3 min-h-0">
				<CatalogSearch
					value={query}
					onChange={setQuery}
					placeholder={t("catalog.searchPresets")}
				/>
				{presets.length === 0 ? (
					<EmptyState />
				) : filteredPresets.length === 0 ? (
					<CatalogEmptyState query={query} />
				) : (
					<AssetGrid gap="gap-2">
						{filteredPresets.map((preset) => (
							<PresetCard key={preset.id} preset={preset} />
						))}
					</AssetGrid>
				)}
			</div>
		</PanelView>
	);
}

function EmptyState() {
	const { t } = useI18n();
	return (
		<div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 px-6 text-center">
			<HugeiconsIcon
				icon={BookmarkAdd02Icon}
				className="size-9 text-white/30"
			/>
			<p className="text-sm font-medium text-white/80">
				{t("catalog.emptyPresets")}
			</p>
			<p className="text-xs text-white/40 leading-relaxed text-balance">
				{t("catalog.emptyPresetsHint")}
			</p>
		</div>
	);
}

function PresetCard({ preset }: { preset: UserPreset }) {
	const { t } = useI18n();
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
			toast.success(t("catalog.presetAdded", { name: preset.name }));
		} catch (error) {
			console.error("Failed to insert preset:", error);
			toast.error(t("catalog.failedToAddPreset"));
		}
	};

	const handleDelete = (event?: React.MouseEvent) => {
		event?.stopPropagation();
		void removePreset(preset.id);
		toast.success(t("catalog.presetDeleted", { name: preset.name }));
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

	const kindLabel = t(
		`catalog.presetKind.${preset.kind}` as `catalog.presetKind.${UserPreset["kind"]}`,
	);

	return (
		<ContextMenu>
			<div ref={dragRef} className="group relative flex flex-col gap-1">
				<ContextMenuTrigger asChild>
					{/* biome-ignore lint/a11y/useSemanticElements: card contains hover badges and nested affordances; outer button would be invalid */}
					<div
						role="button"
						tabIndex={0}
						onClick={insertPreset}
						draggable
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								insertPreset();
							}
						}}
						className={cn(
							"asset-preview-container cursor-grab active:cursor-grabbing",
							isDragging && "opacity-50 pointer-events-none",
						)}
					>
						<div className="asset-preview-overlay" />
						<div
							className="relative mx-auto mt-2 size-full overflow-hidden rounded-md border border-white/10 bg-[#0b0b0c]"
							style={{ width: "80%", height: "80%" }}
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
						</div>
						<div className="text-white/70 absolute left-1 top-1 z-20 flex items-center gap-0.5 rounded bg-black/60 border border-white/10 px-1 py-0.5 text-[0.55rem] backdrop-blur-sm">
							{kindLabel}
						</div>
						<div className="absolute right-1 top-1 z-20 opacity-0 transition-opacity group-hover:opacity-100">
							<Button
								size="icon"
								variant="secondary"
								className="size-5 bg-black/50 hover:bg-black/80 border border-white/10"
								aria-label={t("catalog.applyAria", { name: preset.name })}
								onClick={(event) => {
									event.stopPropagation();
									insertPreset();
								}}
							>
								<HugeiconsIcon
									icon={PlusSignIcon}
									className="size-3 text-cyan-400"
								/>
							</Button>
						</div>
					</div>
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
							title={t("catalog.renameAria", { name: preset.name })}
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
						title={t("catalog.renamePreset")}
						aria-label={t("catalog.renameAria", { name: preset.name })}
					>
						<HugeiconsIcon icon={Edit03Icon} className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={handleDelete}
						className="shrink-0 rounded p-0.5 text-white/30 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
						title={t("catalog.deletePreset")}
						aria-label={t("catalog.deleteAria", { name: preset.name })}
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
					{t("catalog.applyAria", { name: preset.name })}
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Edit03Icon} />}
					onSelect={startRename}
				>
					{t("catalog.renamePreset")}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					variant="destructive"
					onSelect={() => handleDelete()}
				>
					{t("catalog.deletePreset")}
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
