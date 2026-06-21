"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditor } from "@/hooks/use-editor";
import { stickers as presetStickers } from "@/lib/presets/stickers";
import type { Sticker as PresetSticker } from "@/lib/presets/types";
import { resolveStickerIntrinsicSize } from "@/lib/stickers";
import {
	buildGraphicElement,
	buildStickerElement,
} from "@/lib/timeline/element-utils";
import { STICKER_CATEGORIES } from "@/lib/stickers/categories";
import { getRegionLabel, resolveQueryToRegions } from "@/lib/stickers";
import { parseShapeStickerId } from "@/lib/stickers/providers/shapes";
import type { TimelineDragData } from "@/lib/timeline/drag";
import type {
	StickerBrowseSection,
	StickerCategory,
	StickerItem as StickerData,
} from "@/lib/stickers";
import { useStickersStore } from "@/stores/stickers-store";
import { cn } from "@/utils/ui";
import { HappyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function StickersView() {
	const {
		browseContent,
		browseStickers,
		searchQuery,
		searchStickers,
		selectedCategory,
		setSearchQuery,
		setSelectedCategory,
		viewMode,
	} = useStickersStore();

	useEffect(() => {
		if (viewMode === "browse" && !browseContent) {
			void browseStickers();
		}
	}, [browseContent, browseStickers, viewMode]);

	return (
		<div className="flex h-full flex-col py-2">
			<div className="px-2">
				<Input
					size="sm"
					variant="default"
					placeholder="Search..."
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery({ query: e.target.value });
						void searchStickers({ query: e.target.value });
					}}
					showClearIcon
					onClear={() => {
						setSearchQuery({ query: "" });
						void searchStickers({ query: "" });
					}}
					className="w-full"
					containerClassName="w-full"
				/>
			</div>

			<Tabs
				value={selectedCategory}
				onValueChange={(value) => {
					setSelectedCategory({ category: value as StickerCategory });
				}}
				variant="underline"
				className="mt-2 flex min-h-0 flex-1 flex-col"
			>
				<TabsList
					aria-label="Sticker categories"
					className="w-full overflow-x-auto scrollbar-hidden"
				>
					{Object.entries(STICKER_CATEGORIES).map(([key, label]) => (
						<TabsTrigger
							key={key}
							value={key}
							className="shrink-0 whitespace-nowrap"
						>
							{label}
						</TabsTrigger>
					))}
				</TabsList>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
					<StickersContentView />
				</div>
			</Tabs>
		</div>
	);
}

function StickerGrid({
	items,
	shouldCapSize = false,
}: {
	items: StickerData[];
	shouldCapSize?: boolean;
}) {
	const gridStyle: CSSProperties & {
		"--sticker-min": string;
		"--sticker-max"?: string;
	} = {
		gridTemplateColumns: shouldCapSize
			? "repeat(auto-fill, minmax(var(--sticker-min, 80px), var(--sticker-max, 140px)))"
			: "repeat(auto-fill, minmax(var(--sticker-min, 80px), 1fr))",
		"--sticker-min": "80px",
		...(shouldCapSize ? { "--sticker-max": "140px" } : {}),
	};

	return (
		<div className="grid gap-2" style={gridStyle}>
			{items.map((item) => (
				<StickerItem key={item.id} item={item} shouldCapSize={shouldCapSize} />
			))}
		</div>
	);
}

function StickerRow({ items }: { items: StickerData[] }) {
	return (
		<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
			{items.map((item) => (
				<div key={item.id} className="w-20 shrink-0">
					<StickerItem item={item} shouldCapSize containerClassName="w-full" />
				</div>
			))}
		</div>
	);
}

function EmptyView({ message }: { message: string }) {
	return (
		<div className="bg-background flex h-full flex-col items-center justify-center gap-3 p-4">
			<HugeiconsIcon
				icon={HappyIcon}
				className="text-muted-foreground size-10"
			/>
			<div className="flex flex-col gap-2 text-center">
				<p className="text-lg font-medium">No stickers found</p>
				<p className="text-muted-foreground text-sm text-balance">{message}</p>
			</div>
		</div>
	);
}

function RegionBanner({ region }: { region: string }) {
	return (
		<div className="flex h-7 items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2">
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="shrink-0 text-sky-600"
				aria-hidden="true"
			>
				<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
				<circle cx="12" cy="10" r="3" />
			</svg>
			<span className="text-xs font-semibold text-sky-600">{region}</span>
		</div>
	);
}

function StickersContentView() {
	const {
		browseContent,
		clearRecentStickers,
		isBrowsing,
		isSearching,
		searchQuery,
		searchResults,
		selectedCategory,
		setSelectedCategory,
		viewMode,
	} = useStickersStore();

	if (viewMode === "search") {
		if (isSearching) {
			return (
				<div className="flex items-center justify-center py-8">
					<Spinner className="text-muted-foreground size-6" />
				</div>
			);
		}

		if (searchResults?.items.length) {
			const normalizedQuery = searchQuery.trim().toLowerCase();
			const isRegionSearch =
				selectedCategory === "flags" &&
				resolveQueryToRegions({ query: normalizedQuery }) !== null;
			const regionLabel = getRegionLabel({ query: normalizedQuery });

			return (
				<div className="flex flex-col gap-3 pb-4">
					{isRegionSearch && <RegionBanner region={regionLabel} />}
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">
							{searchResults.total} results
						</span>
					</div>
					<StickerGrid items={searchResults.items} />
				</div>
			);
		}

		// "all" tab search — sections are in browseContent, fall through to section rendering below
		if (selectedCategory !== "all" && searchQuery) {
			return <EmptyView message={`No stickers found for "${searchQuery}"`} />;
		}
	}

	if (isBrowsing && !browseContent) {
		return (
			<div className="flex items-center justify-center py-8">
				<Spinner className="text-muted-foreground size-6" />
			</div>
		);
	}

	if (!browseContent?.sections.length) {
		const categoryLabel = STICKER_CATEGORIES[selectedCategory];
		return (
			<EmptyView
				message={
					viewMode === "search"
						? `No stickers found for "${searchQuery}"`
						: selectedCategory === "all"
							? "No stickers available yet."
							: `No stickers available in ${categoryLabel.toLowerCase()} yet.`
				}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4 pb-4">
			{browseContent.sections.map((section) => (
				<StickerSection
					key={section.id}
					section={section}
					onClearRecent={clearRecentStickers}
					onSeeAll={(category) => {
						setSelectedCategory({ category });
					}}
				/>
			))}
			<PresetStickersSection />
		</div>
	);
}

function StickerSection({
	section,
	onClearRecent,
	onSeeAll,
}: {
	section: StickerBrowseSection;
	onClearRecent: () => void;
	onSeeAll: (category: StickerCategory) => void;
}) {
	const hasHeader =
		Boolean(section.title) || section.id === "recent" || section.action;

	return (
		<div className="flex flex-col gap-2">
			{hasHeader && (
				<div className="flex items-center justify-between gap-2">
					{section.title ? (
						<p className="text-xs text-muted-foreground">{section.title}</p>
					) : (
						<div />
					)}

					<div className="ml-auto flex items-center gap-2">
						{section.id === "recent" && (
							<Button
								onClick={onClearRecent}
								variant="text"
								size="sm"
								className="h-auto gap-1 p-0 text-xs text-muted-foreground"
							>
								Clear
							</Button>
						)}

						{section.action?.type === "see-all" && section.action.category && (
							<Button
								variant="text"
								size="sm"
								className="h-auto gap-1 p-0 text-xs text-primary"
								onClick={() => {
									onSeeAll(section.action?.category as StickerCategory);
								}}
							>
								See all
							</Button>
						)}
					</div>
				</div>
			)}

			{section.layout === "row" ? (
				<StickerRow items={section.items} />
			) : (
				<StickerGrid items={section.items} />
			)}
		</div>
	);
}

function PresetStickersSection() {
	const grouped = useMemo(
		() =>
			presetStickers.reduce<Record<string, PresetSticker[]>>((acc, sticker) => {
				acc[sticker.subcategory] ??= [];
				acc[sticker.subcategory].push(sticker);
				return acc;
			}, {}),
		[],
	);

	return (
		<div className="flex flex-col gap-3">
			<p className="text-xs text-muted-foreground">Stickers</p>
			{Object.entries(grouped).map(([subcategory, items]) => (
				<div key={subcategory} className="flex flex-col gap-2">
					<p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
						{subcategory}
					</p>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
						{items.map((item) => (
							<PresetStickerItem key={item.id} item={item} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function PresetStickerItem({ item }: { item: PresetSticker }) {
	const editor = useEditor();
	const [isAdding, setIsAdding] = useState(false);
	const pathData =
		item.asset.kind === "emoji" ? item.asset.char : item.asset.paths.join(" ");

	const handleAdd = () => {
		setIsAdding(true);
		try {
			const element = buildGraphicElement({
				definitionId: "freehand",
				name: item.name,
				startTime: editor.playback.getCurrentTime(),
				params: { pathData },
			});

			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
		} catch (error) {
			console.error("Failed to add preset sticker:", error);
			toast.error("Failed to add sticker to timeline");
		} finally {
			setIsAdding(false);
		}
	};

	return (
		<div
			className={cn("relative", isAdding && "pointer-events-none opacity-50")}
		>
			<DraggableItem
				name={item.name}
				preview={
					<div className="flex size-full items-center justify-center rounded-sm bg-accent p-3">
						{item.asset.kind === "emoji" ? (
							<span className="text-4xl leading-none">{item.asset.char}</span>
						) : (
							<svg
								viewBox={item.asset.viewBox}
								className="size-full"
								aria-hidden="true"
							>
								{item.asset.paths.map((d) => (
									<path
										key={`${item.id}-${d}`}
										d={d}
										fill={
											item.asset.kind === "svg" ? item.asset.fill : undefined
										}
									/>
								))}
							</svg>
						)}
					</div>
				}
				dragData={{
					id: item.id,
					type: "sticker",
					name: item.name,
					stickerId: item.id,
				}}
				onAddToTimeline={handleAdd}
				aspectRatio={1}
				shouldShowLabel={false}
				isRounded
				variant="card"
				containerClassName="w-full"
			/>
			{isAdding && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60">
					<Spinner className="size-6 text-white" />
				</div>
			)}
		</div>
	);
}

interface StickerItemProps {
	item: StickerData;
	shouldCapSize?: boolean;
	containerClassName?: string;
}

function StickerItem({
	item,
	shouldCapSize = false,
	containerClassName,
}: StickerItemProps) {
	const editor = useEditor();
	const { addToRecentStickers } = useStickersStore();
	const [isAdding, setIsAdding] = useState(false);
	const [hasImageError, setHasImageError] = useState(false);


	useEffect(() => {
		if (!item.id) {
			return;
		}

		setHasImageError(false);
	}, [item.id]);

	const displayName = item.name;
	const shapePreset =
		item.provider === "shapes"
			? parseShapeStickerId({ stickerId: item.id })
			: null;

	const handleAdd = async () => {
		setIsAdding(true);
		try {
			const currentTime = editor.playback.getCurrentTime();

			let element:
				| ReturnType<typeof buildGraphicElement>
				| ReturnType<typeof buildStickerElement>;
			if (shapePreset) {
				element = buildGraphicElement({
					definitionId: shapePreset.definitionId,
					name: shapePreset.name,
					startTime: currentTime,
					params: shapePreset.params,
				});
			} else {
				const { width: intrinsicWidth, height: intrinsicHeight } =
					await resolveStickerIntrinsicSize({ stickerId: item.id });
				element = buildStickerElement({
					stickerId: item.id,
					name: item.name,
					startTime: currentTime,
					intrinsicWidth,
					intrinsicHeight,
				});
			}

			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});

			addToRecentStickers({ stickerId: item.id });
		} catch (error) {
			console.error("Failed to add sticker:", error);
			toast.error("Failed to add sticker to timeline");
		} finally {
			setIsAdding(false);
		}
	};

	const preview = (
		<div className="relative flex size-full items-center justify-center p-3">
			<div
				aria-hidden
				className="absolute inset-0 rounded-sm bg-black"
			/>
			{hasImageError ? (
				<span className="relative z-10 text-white text-center text-xs break-all">
					{displayName}
				</span>
			) : (
				<Image
					src={item.previewUrl}
					alt={displayName}
					width={64}
					height={64}
					className="relative z-10 size-full object-contain"
					style={
						shouldCapSize
							? {
									maxWidth: "var(--sticker-max, 160px)",
									maxHeight: "var(--sticker-max, 160px)",
								}
							: undefined
					}
					onError={() => setHasImageError(true)}
					loading="lazy"
					unoptimized
				/>
			)}
		</div>
	);

	const dragData: TimelineDragData = shapePreset
		? {
				id: item.id,
				type: "graphic",
				name: displayName,
				definitionId: shapePreset.definitionId,
				params: shapePreset.params ?? {},
			}
		: {
				id: item.id,
				type: "sticker",
				name: displayName,
				stickerId: item.id,
			};

	return (
		<div
			className={cn("relative", isAdding && "pointer-events-none opacity-50")}
		>
			<DraggableItem
				name={displayName}
				preview={preview}
				dragData={dragData}
				onAddToTimeline={handleAdd}
				aspectRatio={1}
				shouldShowLabel={false}
				isRounded
				variant="card"
				containerClassName={containerClassName ?? "w-full"}
			/>
			{isAdding && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60">
					<Spinner className="size-6 text-white" />
				</div>
			)}
		</div>
	);
}
