"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { MediaDragOverlay } from "@/components/editor/panels/assets/drag-overlay";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { FolderGrid } from "@/components/editor/panels/assets/folder-grid";
import { FolderNameDialog } from "@/components/editor/panels/assets/folder-name-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	UploadIcon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useAssetPreviewStore } from "@/stores/asset-preview-store";

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
		assetCardSize,
	} = useAssetsPanelStore();

	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [assetSource, setAssetSource] = useState<AssetSource>("library");
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const folders = useEditor((e) => e.media.getFolders());

	// Folder-name dialog state. `null` means closed.
	const [folderDialog, setFolderDialog] = useState<
		| { mode: "create" }
		| { mode: "rename"; folderId: string; initialName: string }
		| null
	>(null);

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
						if (currentFolderId) {
							asset.folderId = currentFolderId;
						}
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

	const {
		isDragOver,
		justDroppedRef,
		dragProps,
		openFilePicker,
		fileInputProps,
	} = useFileUpload({
		accept: "image/*,video/*,audio/*",
		multiple: true,
		onFilesSelected: (files) => processFiles({ files }),
	});

	// Detect "user dragged in then dragged out without dropping" so the
	// overlay can briefly show a "drop cancelled" hint before unmounting.
	const prevIsDragOverRef = useRef(false);
	const [showCancelHint, setShowCancelHint] = useState(false);
	const cancelHintTimerRef = useRef<number | null>(null);

	useEffect(() => {
		const wasOver = prevIsDragOverRef.current;
		const isOver = isDragOver;
		prevIsDragOverRef.current = isOver;

		// A real drop also flips isDragOver false — skip the cancel hint then
		// (the drop is handled by the file-processing path instead).
		if (justDroppedRef.current) {
			justDroppedRef.current = false;
			return;
		}

		// true → false without a drag-out in between: surface the cancel hint.
		if (wasOver && !isOver) {
			setShowCancelHint(true);
			if (cancelHintTimerRef.current) {
				window.clearTimeout(cancelHintTimerRef.current);
			}
			cancelHintTimerRef.current = window.setTimeout(() => {
				setShowCancelHint(false);
				cancelHintTimerRef.current = null;
			}, 950);
		} else if (isOver) {
			// Re-entered the drop zone — clear any pending cancel.
			setShowCancelHint(false);
			if (cancelHintTimerRef.current) {
				window.clearTimeout(cancelHintTimerRef.current);
				cancelHintTimerRef.current = null;
			}
		}

		return () => {
			if (cancelHintTimerRef.current) {
				window.clearTimeout(cancelHintTimerRef.current);
				cancelHintTimerRef.current = null;
			}
		};
	}, [isDragOver, justDroppedRef]);

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

	// ── Folder handlers ───────────────────────────────────────

	const handleCreateFolder = () => {
		setFolderDialog({ mode: "create" });
	};

	const _openRenameFolderDialog = ({ folderId }: { folderId: string }) => {
		const folder = folders.find((f) => f.id === folderId);
		if (!folder) return;
		setFolderDialog({
			mode: "rename",
			folderId,
			initialName: folder.name,
		});
	};

	const handleFolderDialogSubmit = (name: string) => {
		const dialog = folderDialog;
		if (!dialog) return;
		if (dialog.mode === "create") {
			void editor.media.createFolder({
				projectId: activeProject.metadata.id,
				name,
			});
		} else {
			void editor.media.renameFolder({
				id: dialog.folderId,
				name,
			});
		}
		setFolderDialog(null);
	};

	const handleRenameFolder = async ({
		folderId,
		name,
	}: {
		folderId: string;
		name: string;
	}) => {
		await editor.media.renameFolder({ id: folderId, name });
	};

	const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

	const confirmDeleteFolder = async () => {
		if (!deleteFolderId) return;
		const folderId = deleteFolderId;
		setDeleteFolderId(null);
		
		if (currentFolderId === folderId) setCurrentFolderId(null);
		await editor.media.deleteFolder({ id: folderId });
	};

	const handleDeleteFolder = ({ folderId }: { folderId: string }) => {
		setDeleteFolderId(folderId);
	};

	const assetCountByFolder = useMemo(() => {
		const map = new Map<string, number>();
		for (const asset of mediaFiles) {
			if (asset.folderId) {
				map.set(asset.folderId, (map.get(asset.folderId) ?? 0) + 1);
			}
		}
		return map;
	}, [mediaFiles]);

	const handleSort = ({ key }: { key: MediaSortKey }) => {
		if (mediaSortBy === key) {
			setMediaSort(key, mediaSortOrder === "asc" ? "desc" : "asc");
		} else {
			setMediaSort(key, "asc");
		}
	};

	const filteredMediaItems = useMemo(() => {
		const filtered = mediaFiles.filter(
			(item) =>
				!item.ephemeral &&
				(currentFolderId === null
					? !item.folderId
					: item.folderId === currentFolderId),
		);

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
	}, [mediaFiles, mediaSortBy, mediaSortOrder, currentFolderId]);
	const orderedMediaIds = useMemo(() => {
		return filteredMediaItems.map((item) => item.id);
	}, [filteredMediaItems]);
	const mediaStats = useMemo(() => {
		return {
			all: mediaFiles.length,
			video: mediaFiles.filter((item) => item.type === "video").length,
			audio: mediaFiles.filter((item) => item.type === "audio").length,
			image: mediaFiles.filter((item) => item.type === "image").length,
		};
	}, [mediaFiles]);

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
				// The empty state and the drag overlay are full-height "fill" designs
				// that should never produce a scrollbar — only the populated media grid
				// scrolls. Override the panel's default overflow-y-auto in those states.
				scrollClassName={cn(
					(isDragOver ||
						showCancelHint ||
						(assetSource === "library" &&
							filteredMediaItems.length === 0 &&
							(currentFolderId !== null || folders.length === 0))) &&
						"overflow-y-hidden",
				)}
				className={cn(isDragOver && "bg-accent/30")}
				{...dragProps}
			>
				{isDragOver || showCancelHint ? (
					<MediaDragOverlay
						isVisible={isDragOver}
						isProcessing={isProcessing}
						progress={progress}
						onClick={isDragOver ? openFilePicker : undefined}
						showCancelHint={showCancelHint}
					/>
				) : (
					<div className="@container flex h-full min-h-0 flex-1 flex-col gap-3">
						<AssetSourceTabs
							activeSource={assetSource}
							onChange={setAssetSource}
						/>
						<QuickAccessGrid stats={mediaStats} />
						{assetSource === "library" ? (
							<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-[3px] -m-[3px]">
								<FolderGrid
									folders={folders}
									assetCountByFolder={assetCountByFolder}
									currentFolderId={currentFolderId}
									onEnterFolder={(folderId) => setCurrentFolderId(folderId)}
									onCreateFolder={handleCreateFolder}
									onRenameFolder={(folderId, name) =>
										handleRenameFolder({ folderId, name })
									}
									onDeleteFolder={(folderId) =>
										handleDeleteFolder({ folderId })
									}
									onExitFolder={() => setCurrentFolderId(null)}
								/>
								{filteredMediaItems.length === 0 &&
								(currentFolderId !== null || folders.length === 0) ? (
									<EmptyLibraryState onImport={openFilePicker} />
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
											assetCardSize={assetCardSize}
										/>
									</SelectableSurface>
								)}
							</div>
						) : assetSource === "stock" ? (
							<StockVideoSearch />
						) : (
							<RemoteAssetPlaceholder source={assetSource} />
						)}
					</div>
				)}
				<AlertDialog open={!!deleteFolderId} onOpenChange={(open) => !open && setDeleteFolderId(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete folder?</AlertDialogTitle>
							<AlertDialogDescription>
								Assets inside this folder will be moved back to the library root. This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={confirmDeleteFolder}
								className="bg-red-500 hover:bg-red-600 text-white"
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</PanelView>

			<FolderNameDialog
				open={folderDialog !== null}
				mode={folderDialog?.mode === "rename" ? "rename" : "create"}
				initialName={
					folderDialog?.mode === "rename" ? folderDialog.initialName : ""
				}
				onOpenChange={(open) => {
					if (!open) setFolderDialog(null);
				}}
				onSubmit={handleFolderDialogSubmit}
			/>
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
		<div className="grid grid-cols-1 gap-2 @sm:grid-cols-3 @xs:grid-cols-2">
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

function EmptyLibraryState({ onImport }: { onImport: () => void }) {
	return (
		<button
			type="button"
			onClick={onImport}
			className="glass relative flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden rounded-xl p-8 text-center transition-colors hover:bg-white/[0.08]"
		>
			{/* Background glow — mirrors the drag-to-import overlay so the
			   resting state and the drop state read as one design. */}
			<div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.14),transparent_55%)]" />

			{/* Hero icon: a single dashed ring around the core icon. The resting
			   state keeps just the inner ring; the drag overlay adds the outer
			   one for extra emphasis. */}
			<div className="relative grid size-24 place-items-center">
				<div className="absolute size-28 rounded-full border border-dashed border-white/20 drop-ring-rotate-fast" />
				<div className="relative grid size-24 place-items-center rounded-full border border-white/10 bg-black/35 shadow-inner shadow-white/10">
					<HugeiconsIcon icon={UploadIcon} className="size-8 text-white/85" />
				</div>
			</div>

			<div className="relative max-w-md space-y-2">
				<h3 className="font-serif text-lg text-white">
					Your creative journey begins here
				</h3>
				<p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">
					Import media or drag and drop to get started.
				</p>
			</div>

			<span className="relative rounded-lg border border-white/10 bg-white/[0.08] px-4 py-2 text-xs text-white/85">
				Import media
			</span>
		</button>
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

interface StockVideoResult {
	id: number;
	title: string;
	thumbnail: string;
	duration: number;
	width: number;
	height: number;
	downloadUrl: string;
	author: string;
}

function StockVideoSearch() {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<StockVideoResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searched, setSearched] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const search = useCallback(async (q: string) => {
		if (!q.trim()) {
			setResults([]);
			setSearched(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/stock/videos?q=${encodeURIComponent(q)}&per_page=12`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? `HTTP ${res.status}`);
			}
			const data = (await res.json()) as {
				results: StockVideoResult[];
			};
			setResults(data.results);
			setSearched(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed");
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const handleQueryChange = (value: string) => {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => search(value), 400);
	};

	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="relative">
				<input
					type="text"
					value={query}
					onChange={(e) => handleQueryChange(e.target.value)}
					placeholder="Search stock videos..."
					className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"
				/>
				{loading && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2">
						<div className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
					</div>
				)}
			</div>

			{error && (
				<p className="text-xs text-red-400/80">{error}</p>
			)}

			{!loading && !error && searched && results.length === 0 && (
				<p className="py-8 text-center text-xs text-white/40">
					No videos found. Try a different search term.
				</p>
			)}

			{results.length > 0 && (
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{results.map((video) => (
						<a
							key={video.id}
							href={video.downloadUrl}
							download
							target="_blank"
							rel="noopener noreferrer"
							className="group relative overflow-hidden rounded-lg border border-white/10 bg-black/40 transition-colors hover:border-white/20"
						>
							{video.thumbnail && (
								<Image
									src={video.thumbnail}
									alt={video.title}
									width={320}
									height={180}
									unoptimized
									className="aspect-video w-full object-cover transition-opacity group-hover:opacity-80"
								/>
							)}
							<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
								<p className="truncate text-[0.65rem] text-white/70">
									{video.duration}s · {video.width}×{video.height}
								</p>
								<p className="truncate text-[0.6rem] text-white/40">
									by {video.author}
								</p>
							</div>
						</a>
					))}
				</div>
			)}

			{!loading && !error && !searched && (
				<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
					<p className="text-sm font-semibold text-white/70">
						Search Pexels stock videos
					</p>
					<p className="max-w-[16rem] text-xs text-white/40">
						Free, licensed stock footage. Search for nature, city, abstract, or any topic.
					</p>
				</div>
			)}
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
	const setPreviewAsset = useAssetPreviewStore((s) => s.setPreviewAsset);

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
			onClick={() => setPreviewAsset(item.id)}
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
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const { isSelected, selectedIds } = useSelection();
	const idsToDelete = isSelected(item.id) ? selectedIds : [item.id];
	const deleteLabel =
		idsToDelete.length > 1 ? `Delete ${idsToDelete.length} items` : "Delete";
	const folders = useEditor((e) => e.media.getFolders());

	const handleExtractAudio = async () => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		if (item.type !== "video") {
			toast.error("Only video assets can extract audio");
			return;
		}

		toast.promise(
			async () => {
				const { extractAssetAudio } = await import("@/lib/media/mediabunny");
				const audioBlob = await extractAssetAudio({ asset: item });
				if (!audioBlob || audioBlob.size === 0) {
					throw new Error("No audio track found");
				}

				const audioName = `${item.name.replace(/\.[^.]+$/, "")} (Audio)`;
				const audioFile = new File([audioBlob], `${audioName}.wav`, {
					type: "audio/wav",
				});
				const processed = await processMediaAssets({ files: [audioFile] });
				const asset = processed[0];
				if (!asset) {
					throw new Error("Could not process audio");
				}

				const stored = await editor.media.addMediaAsset({
					projectId: activeProject.metadata.id,
					asset,
				});
				if (!stored) {
					throw new Error("Could not save audio");
				}
				return stored;
			},
			{
				loading: "Extracting audio...",
				success: "Audio extracted and added to library",
				error: (err: Error) => err.message || "Failed to extract audio",
			},
		);
	};

	const handleMoveToFolder = async (folderId: string | null) => {
		if (!activeProject) return;
		for (const id of idsToDelete) {
			await editor.media.moveAssetToFolder({
				assetId: id,
				folderId,
			});
		}
	};

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem>Export clips</ContextMenuItem>
				{item.type === "video" && (
					<ContextMenuItem onClick={handleExtractAudio}>
						Extract audio
					</ContextMenuItem>
				)}
				{folders.length > 0 && (
					<ContextMenuSub>
						<ContextMenuSubTrigger>Move to folder</ContextMenuSubTrigger>
						<ContextMenuSubContent className="w-48">
							<ContextMenuItem
								onClick={() => handleMoveToFolder(null)}
								disabled={!item.folderId}
							>
								(Library root)
							</ContextMenuItem>
							{folders.map((folder) => (
								<ContextMenuItem
									key={folder.id}
									onClick={() => handleMoveToFolder(folder.id)}
									disabled={item.folderId === folder.id}
								>
									{folder.name}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				)}
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
	assetCardSize,
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
	assetCardSize: number;
}) {
	const isGrid = mode === "grid";

	return (
		<div
			className={cn(
				"p-[2px] -m-[2px]",
				isGrid ? "grid gap-2.5" : "flex min-w-0 flex-col gap-1.5", // `min-w-0` lets the
				//   compact list shrink inside the parent flex
				//   column without forcing the panel wider.
			)}
			style={{
				gridTemplateColumns: isGrid
					? `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`
					: undefined,
			}}
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
