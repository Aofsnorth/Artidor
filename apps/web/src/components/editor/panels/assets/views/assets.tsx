"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { MediaDragOverlay } from "@/components/editor/panels/assets/drag-overlay";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/lib/timeline/creation";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { useEditor } from "@/hooks/use-editor";
import { useFileUpload } from "@/hooks/use-file-upload";
import { invokeAction } from "@/lib/actions";
import { processMediaAssets } from "@/lib/media/processing";
import { showMediaUploadToast } from "@/lib/media/upload-toast";
import {
	SelectableItem,
	SelectableSurface,
	useSelection,
	useSelectionScope,
} from "@/lib/selection";
import { buildElementFromMedia } from "@/lib/timeline/element-utils";
import {
	type MediaSortKey,
	type MediaSortOrder,
	type MediaViewMode,
	useAssetsPanelStore,
} from "@/stores/assets-panel-store";
import { MASKABLE_ELEMENT_TYPES } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import { cn } from "@/utils/ui";
import {
	CloudUploadIcon,
	GridViewIcon,
	LeftToRightListDashIcon,
	SortingOneNineIcon,
	Image02Icon,
	MusicNote03Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

type AssetSource = "library" | "stock" | "cloud";

export function MediaView() {
	const editor = useEditor();
	const mediaFiles = useEditor((e) => e.media.getAssets());
	const activeProject = useEditor((e) => e.project.getActive());

	const {
		mediaViewMode,
		setMediaViewMode,
		highlightMediaId,
		clearHighlight,
		mediaSortBy,
		mediaSortOrder,
		setMediaSort,
	} = useAssetsPanelStore();

	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [assetSource, setAssetSource] = useState<AssetSource>("library");

	const processFiles = async ({ files }: { files: File[] }) => {
		if (!files || files.length === 0) return;
		if (!activeProject) {
			toast.error("No active project");
			return;
		}

		setIsProcessing(true);
		setProgress(0);
		try {
			await showMediaUploadToast({
				filesCount: files.length,
				promise: async () => {
					const processedAssets = await processMediaAssets({
						files,
						onProgress: (progress: { progress: number }) =>
							setProgress(progress.progress),
					});
					for (const asset of processedAssets) {
						await editor.media.addMediaAsset({
							projectId: activeProject.metadata.id,
							asset,
						});
					}
					return {
						uploadedCount: processedAssets.length,
						assetNames: processedAssets.map((asset) => asset.name),
					};
				},
			});
		} catch (error) {
			console.error("Error processing files:", error);
		} finally {
			setIsProcessing(false);
			setProgress(0);
		}
	};

	const { isDragOver, dragProps, openFilePicker, fileInputProps } =
		useFileUpload({
			accept: "image/*,video/*,audio/*",
			multiple: true,
			onFilesSelected: (files) => processFiles({ files }),
		});

	const handleRemove = ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => {
		event.stopPropagation();

		invokeAction("remove-media-assets", {
			projectId: activeProject.metadata.id,
			assetIds: ids,
		});
	};

	const handleSort = ({ key }: { key: MediaSortKey }) => {
		if (mediaSortBy === key) {
			setMediaSort(key, mediaSortOrder === "asc" ? "desc" : "asc");
		} else {
			setMediaSort(key, "asc");
		}
	};

	const filteredMediaItems = useMemo(() => {
		const filtered = mediaFiles.filter((item) => !item.ephemeral);

		filtered.sort((a, b) => {
			let valueA: string | number;
			let valueB: string | number;

			switch (mediaSortBy) {
				case "name":
					valueA = a.name.toLowerCase();
					valueB = b.name.toLowerCase();
					break;
				case "type":
					valueA = a.type;
					valueB = b.type;
					break;
				case "duration":
					valueA = a.duration || 0;
					valueB = b.duration || 0;
					break;
				case "size":
					valueA = a.file.size;
					valueB = b.file.size;
					break;
				default:
					return 0;
			}

			if (valueA < valueB) return mediaSortOrder === "asc" ? -1 : 1;
			if (valueA > valueB) return mediaSortOrder === "asc" ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [mediaFiles, mediaSortBy, mediaSortOrder]);
	const orderedMediaIds = useMemo(() => {
		return filteredMediaItems.map((item) => item.id);
	}, [filteredMediaItems]);
	const mediaStats = useMemo(() => {
		return {
			all: filteredMediaItems.length,
			video: filteredMediaItems.filter((item) => item.type === "video").length,
			audio: filteredMediaItems.filter((item) => item.type === "audio").length,
			image: filteredMediaItems.filter((item) => item.type === "image").length,
		};
	}, [filteredMediaItems]);

	return (
		<>
			<input {...fileInputProps} />

			<PanelView
				title="Assets"
				actions={
					<MediaActions
						mediaViewMode={mediaViewMode}
						setMediaViewMode={setMediaViewMode}
						isProcessing={isProcessing}
						sortBy={mediaSortBy}
						sortOrder={mediaSortOrder}
						onSort={handleSort}
						onImport={openFilePicker}
					/>
				}
				contentClassName="px-3 pb-3"
				className={cn(isDragOver && "bg-accent/30")}
				{...dragProps}
			>
				{isDragOver ? (
					<MediaDragOverlay
						isVisible={true}
						isProcessing={isProcessing}
						progress={progress}
						onClick={openFilePicker}
					/>
				) : (
					<div className="flex flex-col gap-3">
						<AssetSourceTabs
							activeSource={assetSource}
							onChange={setAssetSource}
						/>
						<QuickAccessGrid stats={mediaStats} />
						{assetSource === "library" ? (
							filteredMediaItems.length === 0 ? (
								<EmptyLibraryState />
							) : (
								<SelectableSurface
									ariaLabel="Assets"
									orderedIds={orderedMediaIds}
									revealId={highlightMediaId}
									onRevealComplete={clearHighlight}
								>
									<MediaScopeRegistrar />
									<MediaItemList
										items={filteredMediaItems}
										mode={mediaViewMode}
										onRemove={handleRemove}
									/>
								</SelectableSurface>
							)
						) : (
							<RemoteAssetPlaceholder source={assetSource} />
						)}
					</div>
				)}
			</PanelView>
		</>
	);
}

function MediaScopeRegistrar() {
	useSelectionScope();
	return null;
}

function AssetSourceTabs({
	activeSource,
	onChange,
}: {
	activeSource: AssetSource;
	onChange: (source: AssetSource) => void;
}) {
	const sources: Array<{
		key: AssetSource;
		label: string;
		description: string;
	}> = [
		{ key: "library", label: "Library", description: "Local project media" },
		{ key: "stock", label: "Stock", description: "Browse licensed assets" },
		{ key: "cloud", label: "Cloud", description: "Synced team media" },
	];

	return (
		<div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/20 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
			{sources.map((source) => {
				const isActive = activeSource === source.key;

				return (
					<button
						key={source.key}
						type="button"
						onClick={() => onChange(source.key)}
						className={cn(
							"min-w-0 rounded-lg px-2 py-2 text-left transition-all duration-200",
							isActive
								? "border border-white/[0.12] bg-white/[0.12] text-white shadow-[0_10px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
								: "border border-transparent text-white/[0.48] hover:bg-white/[0.055] hover:text-white/[0.78]",
						)}
						title={source.description}
					>
						<span className="block truncate text-[0.68rem] font-semibold">
							{source.label}
						</span>
						<span className="mt-0.5 hidden truncate text-[0.55rem] text-white/[0.35] xl:block">
							{source.description}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function QuickAccessGrid({
	stats,
}: {
	stats: { all: number; video: number; audio: number; image: number };
}) {
	const cards = [
		{
			label: "Videos",
			value: stats.video,
			tone: "from-blue-400/[0.22] to-cyan-300/[0.08]",
		},
		{
			label: "Audio",
			value: stats.audio,
			tone: "from-emerald-300/[0.22] to-lime-300/[0.08]",
		},
		{
			label: "Images",
			value: stats.image,
			tone: "from-violet-300/[0.22] to-fuchsia-300/[0.08]",
		},
	] as const;

	return (
		<div className="grid grid-cols-3 gap-2">
			{cards.map((card) => (
				<div
					key={card.label}
					className={cn(
						"rounded-xl border border-white/[0.075] bg-gradient-to-br px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]",
						card.tone,
					)}
				>
					<div className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-white/[0.35]">
						{card.label}
					</div>
					<div className="mt-1 text-lg font-semibold leading-none tracking-[-0.03em] text-white/90">
						{card.value}
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyLibraryState() {
	return (
		<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
			<div className="rounded-full border border-white/[0.08] bg-white/[0.06] p-3 text-white/[0.55]">
				<HugeiconsIcon icon={CloudUploadIcon} className="size-5" />
			</div>
			<div>
				<p className="text-sm font-semibold text-white/[0.82]">
					No media files yet
				</p>
				<p className="mt-1 max-w-[18rem] text-xs leading-relaxed text-white/[0.38]">
					Drop files above, use the source tabs to import, or paste a public
					Google Drive link from the projects page.
				</p>
			</div>
		</div>
	);
}

function RemoteAssetPlaceholder({
	source,
}: {
	source: Exclude<AssetSource, "library">;
}) {
	const copy =
		source === "stock"
			? {
					title: "Stock library is coming soon",
					description:
						"The UI is ready for stock footage, audio, and templates. Use local imports while backend search is wired up.",
				}
			: {
					title: "Cloud media is coming soon",
					description:
						"This slot is prepared for synced files, shared team folders, and remote project assets.",
				};

	return (
		<div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.055),transparent_55%),rgba(255,255,255,0.025)] px-6 text-center">
			<div className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/[0.45]">
				{source}
			</div>
			<div>
				<p className="text-sm font-semibold text-white/[0.82]">{copy.title}</p>
				<p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-white/[0.38]">
					{copy.description}
				</p>
			</div>
			<p className="text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white/[0.32]">
				Local imports stay in the header action
			</p>
		</div>
	);
}

function MediaAssetDraggable({
	item,
	preview,
	variant,
	isRounded,
}: {
	item: MediaAsset;
	preview: React.ReactNode;
	variant: "card" | "compact";
	isRounded?: boolean;
}) {
	const editor = useEditor();

	const addElementAtTime = ({
		asset,
		startTime,
	}: {
		asset: MediaAsset;
		startTime: number;
	}) => {
		const duration =
			asset.duration != null
				? Math.round(asset.duration * TICKS_PER_SECOND)
				: DEFAULT_NEW_ELEMENT_DURATION;
		const element = buildElementFromMedia({
			mediaId: asset.id,
			mediaType: asset.type,
			name: asset.name,
			duration,
			startTime,
		});
		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<DraggableItem
			name={item.name}
			preview={preview}
			dragData={{
				id: item.id,
				type: "media",
				mediaType: item.type,
				name: item.name,
				...(item.type !== "audio" && {
					targetElementTypes: [...MASKABLE_ELEMENT_TYPES],
				}),
			}}
			shouldShowPlusOnDrag={false}
			onAddToTimeline={({ currentTime }) =>
				addElementAtTime({ asset: item, startTime: currentTime })
			}
			variant={variant}
			isRounded={isRounded}
		/>
	);
}

function MediaItemWithContextMenu({
	item,
	children,
	onRemove,
}: {
	item: MediaAsset;
	children: React.ReactNode;
	onRemove: ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => void;
}) {
	const { isSelected, selectedIds } = useSelection();
	const idsToDelete = isSelected(item.id) ? selectedIds : [item.id];
	const deleteLabel =
		idsToDelete.length > 1 ? `Delete ${idsToDelete.length} items` : "Delete";

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>Export clips</ContextMenuItem>
				<ContextMenuItem
					variant="destructive"
					onClick={(event: React.MouseEvent<HTMLDivElement>) =>
						onRemove({ event, ids: idsToDelete })
					}
				>
					{deleteLabel}
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

function MediaItemList({
	items,
	mode,
	onRemove,
}: {
	items: MediaAsset[];
	mode: MediaViewMode;
	onRemove: ({
		event,
		ids,
	}: {
		event: React.MouseEvent;
		ids: string[];
	}) => void;
}) {
	const isGrid = mode === "grid";

	return (
		<div
			className={cn(isGrid ? "grid gap-2.5" : "flex flex-col gap-1.5")}
			style={
				isGrid
					? { gridTemplateColumns: "repeat(auto-fill, minmax(6.2rem, 1fr))" }
					: undefined
			}
		>
			{items.map((item) => (
				<MediaItemWithContextMenu item={item} onRemove={onRemove} key={item.id}>
					<SelectableItem className={cn(!isGrid && "w-full")} id={item.id}>
						<MediaAssetDraggable
							item={item}
							preview={
								<MediaPreview
									item={item}
									variant={isGrid ? "grid" : "compact"}
								/>
							}
							variant={isGrid ? "card" : "compact"}
							isRounded={isGrid ? false : undefined}
						/>
					</SelectableItem>
				</MediaItemWithContextMenu>
			))}
		</div>
	);
}

function formatDuration({ duration }: { duration: number }) {
	const min = Math.floor(duration / 60);
	const sec = Math.floor(duration % 60);
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function MediaDurationBadge({ duration }: { duration?: number }) {
	if (!duration) return null;

	return (
		<div className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-xs text-white">
			{formatDuration({ duration })}
		</div>
	);
}

function MediaDurationLabel({ duration }: { duration?: number }) {
	if (!duration) return null;

	return (
		<span className="text-xs opacity-70">{formatDuration({ duration })}</span>
	);
}

function MediaTypePlaceholder({
	icon,
	label,
	duration,
	variant,
}: {
	icon: IconSvgElement;
	label: string;
	duration?: number;
	variant: "muted" | "bordered";
}) {
	const iconClassName = cn("size-6", variant === "bordered" && "mb-1");

	return (
		<div
			className={cn(
				"text-muted-foreground flex size-full flex-col items-center justify-center rounded",
				variant === "muted" ? "bg-muted/30" : "border",
			)}
		>
			<HugeiconsIcon icon={icon} className={iconClassName} />
			<span className="text-xs">{label}</span>
			<MediaDurationLabel duration={duration} />
		</div>
	);
}

function MediaPreview({
	item,
	variant = "grid",
}: {
	item: MediaAsset;
	variant?: "grid" | "compact";
}) {
	const shouldShowDurationBadge = variant === "grid";

	if (item.type === "image") {
		return (
			<div className="relative flex size-full items-center justify-center bg-muted">
				<Image
					src={item.url ?? ""}
					alt={item.name}
					fill
					sizes="100vw"
					className="object-cover"
					loading="lazy"
					unoptimized
				/>
			</div>
		);
	}

	if (item.type === "video") {
		if (item.thumbnailUrl) {
			return (
				<div className="relative size-full">
					<Image
						src={item.thumbnailUrl}
						alt={item.name}
						fill
						sizes="100vw"
						className="rounded object-cover"
						loading="lazy"
						unoptimized
					/>
					{shouldShowDurationBadge ? (
						<MediaDurationBadge duration={item.duration} />
					) : null}
				</div>
			);
		}

		return (
			<MediaTypePlaceholder
				icon={Video01Icon}
				label="Video"
				duration={item.duration}
				variant="muted"
			/>
		);
	}

	if (item.type === "audio") {
		return (
			<MediaTypePlaceholder
				icon={MusicNote03Icon}
				label="Audio"
				duration={item.duration}
				variant="bordered"
			/>
		);
	}

	return (
		<MediaTypePlaceholder icon={Image02Icon} label="Unknown" variant="muted" />
	);
}

function MediaActions({
	mediaViewMode,
	setMediaViewMode,
	isProcessing,
	sortBy,
	sortOrder,
	onSort,
	onImport,
}: {
	mediaViewMode: MediaViewMode;
	setMediaViewMode: (mode: MediaViewMode) => void;
	isProcessing: boolean;
	sortBy: MediaSortKey;
	sortOrder: MediaSortOrder;
	onSort: ({ key }: { key: MediaSortKey }) => void;
	onImport: () => void;
}) {
	return (
		<div className="flex shrink-0 gap-1.5">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							variant="ghost"
							onClick={() =>
								setMediaViewMode(mediaViewMode === "grid" ? "list" : "grid")
							}
							disabled={isProcessing}
							className="size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-white/60 hover:bg-white/[0.09] hover:text-white"
						>
							{mediaViewMode === "grid" ? (
								<HugeiconsIcon icon={LeftToRightListDashIcon} />
							) : (
								<HugeiconsIcon icon={GridViewIcon} />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>
							{mediaViewMode === "grid"
								? "Switch to list view"
								: "Switch to grid view"}
						</p>
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<DropdownMenu>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<Button
									size="icon"
									variant="ghost"
									disabled={isProcessing}
									className="size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-white/60 hover:bg-white/[0.09] hover:text-white"
								>
									<HugeiconsIcon icon={SortingOneNineIcon} />
								</Button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<DropdownMenuContent align="end">
							<SortMenuItem
								label="Name"
								sortKey="name"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="Type"
								sortKey="type"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="Duration"
								sortKey="duration"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
							<SortMenuItem
								label="File size"
								sortKey="size"
								currentSortBy={sortBy}
								currentSortOrder={sortOrder}
								onSort={onSort}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
					<TooltipContent>
						<p>
							Sort by {sortBy} (
							{sortOrder === "asc" ? "ascending" : "descending"})
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Button
				variant="secondary"
				onClick={onImport}
				disabled={isProcessing}
				size="sm"
				className="h-8 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-black hover:bg-white/90"
			>
				<HugeiconsIcon icon={CloudUploadIcon} />
				Import
			</Button>
		</div>
	);
}

function SortMenuItem({
	label,
	sortKey,
	currentSortBy,
	currentSortOrder,
	onSort,
}: {
	label: string;
	sortKey: MediaSortKey;
	currentSortBy: MediaSortKey;
	currentSortOrder: MediaSortOrder;
	onSort: ({ key }: { key: MediaSortKey }) => void;
}) {
	const isActive = currentSortBy === sortKey;
	const arrow = isActive ? (currentSortOrder === "asc" ? "↑" : "↓") : "";

	return (
		<DropdownMenuItem onClick={() => onSort({ key: sortKey })}>
			{label} {arrow}
		</DropdownMenuItem>
	);
}
