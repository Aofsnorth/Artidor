"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	LockKeyIcon,
	MoreHorizontalIcon,
	StarIcon,
} from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { getElementDisplayName } from "@/lib/timeline";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import {
	usePropertiesStore,
	type MediaSummarySize,
} from "./stores/properties-store";
import { getPropertiesConfig, type PropertiesTabDef } from "./registry";
import { cn } from "@/utils/ui";
import { ProjectDetailsView } from "./details-view";
import type { MediaAsset } from "@/lib/media/types";
import type { TimelineElement } from "@/lib/timeline";
import Image from "next/image";
import { MarqueeText } from "@/components/ui/marquee-text";

import { useToolModeStore } from "@/stores/tool-mode-store";
import { DrawToolConfigPanel } from "../preview/draw-tool-config-panel";

// Wrap the panel in React.memo so re-renders of the editor page
// (which happen on every playhead tick via useElementPlayhead) don't
// cascade down through this entire tree when nothing the panel
// depends on has actually changed. Combined with the narrow Zustand
// selectors below, the panel now only re-renders when the user
// switches tabs, favourites a media, or changes the summary size.
export const PropertiesPanel = memo(function PropertiesPanel() {
	return (
		<div
			data-testid="properties-panel"
			className="panel glass-strong flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/90 shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
		>
			<InspectorView />
		</div>
	);
});

function InspectorView() {
	const editor = useEditor();
	useEditor((e) => e.scenes.getActiveSceneOrNull());
	useEditor((e) => e.media.getAssets());
	const { selectedElements } = useElementSelection();
	const { activeTabPerType, setActiveTab } = usePropertiesStore();
	const toolMode = useToolModeStore((s) => s.toolMode);

	if (toolMode === "draw" || toolMode === "vector") {
		return (
			<>
				<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
					<div className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
						Drawing
					</div>
				</div>
				<ScrollArea className="flex-1 scrollbar-hidden bg-linear-to-b from-transparent to-black/[0.12]">
					<DrawToolConfigPanel />
				</ScrollArea>
			</>
		);
	}

	if (selectedElements.length === 0) {
		return <ProjectDetailsView />;
	}

	if (selectedElements.length > 1) {
		return (
			<>
				<InspectorHeader disabled />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground text-sm">
						{selectedElements.length} elements selected.
					</p>
				</div>
			</>
		);
	}

	const mediaAssets = editor.media.getAssets();

	const elementsWithTracks = editor.timeline.getElementsWithTracks({
		elements: selectedElements,
	});
	const elementWithTrack = elementsWithTracks[0];

	if (!elementWithTrack) return null;

	const { element, track } = elementWithTrack;
	const config = getPropertiesConfig({ element, mediaAssets });
	const visibleTabs = config.tabs;

	if (visibleTabs.length === 0) {
		return (
			<>
				<InspectorHeader disabled />
				<div className="flex flex-1 items-center justify-center px-4 text-center">
					<p className="text-muted-foreground text-sm">
						No controls available for this element.
					</p>
				</div>
			</>
		);
	}

	const storedTabId = activeTabPerType[element.type];
	const isStoredTabVisible = visibleTabs.some((t) => t.id === storedTabId);
	const fallbackTabId = visibleTabs.some((t) => t.id === config.defaultTab)
		? config.defaultTab
		: visibleTabs[0]?.id;
	const activeTabId = isStoredTabVisible ? storedTabId : fallbackTabId;
	const activeTab =
		visibleTabs.find((t) => t.id === activeTabId) ?? visibleTabs[0];

	if (!activeTab) return null;

	const primaryTabs = buildPrimaryInspectorTabs({
		visibleTabs,
		activeTabId: activeTab.id,
		elementType: element.type,
	});

	return (
		<>
			<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
				<div className="flex items-center justify-between">
					<div className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
						Inspector
					</div>
					<button
						type="button"
						className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[0.65rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
						onClick={() => setActiveTab(element.type, config.defaultTab)}
					>
						Reset all
					</button>
				</div>
				<div className="mt-3 flex overflow-x-auto scrollbar-hidden gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1 text-[0.64rem]">
					{primaryTabs.map((tab) => (
						<TooltipProvider key={tab.label} delayDuration={0}>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										disabled={!tab.target}
										className={cn(
											"relative shrink-0 flex items-center justify-center gap-1 rounded-md px-2.5 py-1 text-center font-medium whitespace-nowrap text-white/50 transition hover:bg-white/[0.06] hover:text-white focus:outline-none",
											tab.isActive && "bg-white/[0.12] text-white shadow-sm",
											!tab.target &&
												"cursor-not-allowed opacity-30 hover:bg-transparent hover:text-white/50",
										)}
										onClick={() => {
											if (tab.target) setActiveTab(element.type, tab.target.id);
										}}
									>
										{!tab.target && (
											<HugeiconsIcon
												icon={LockKeyIcon}
												className="size-2.5 opacity-70"
											/>
										)}
										<span className="truncate">{tab.label}</span>
									</button>
								</TooltipTrigger>
								{!tab.target && (
									<TooltipContent
										side="bottom"
										className="max-w-[180px] text-center"
									>
										This tab is not available for the selected element.
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					))}
				</div>
			</div>

			<SelectedElementSummary
				element={element}
				trackId={track.id}
				mediaAssets={mediaAssets}
			/>

			{/* Always show the secondary tab bar. The user can be inside an
			   effect, animation, or advanced sub-tab and still needs to
			   jump back to Transform / Audio / Speed without losing
			   their place. The primary tab bar at the top of the
			   inspector still surfaces the high-level categories
			   (Element / Text / Video / Image / Audio). */}
			{
				<div className="border-b border-white/10 px-3.5 py-3 pt-3.5">
					<div className="scrollbar-hidden flex shrink-0 gap-1 overflow-x-auto">
						{visibleTabs.map((tab) => (
							<TooltipProvider key={tab.id} delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={tab.id === activeTab.id ? "secondary" : "ghost"}
											size="sm"
											onClick={() => setActiveTab(element.type, tab.id)}
											aria-label={tab.label}
											className={cn(
												"h-7 shrink-0 rounded-md border px-2.5 text-[0.68rem] flex items-center justify-center gap-1.5",
												tab.id === activeTab.id
													? "border-white/20 bg-white text-black hover:bg-white/90"
													: "border-white/[0.06] bg-white/[0.025] text-white/[0.5] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
											)}
										>
											<span className="opacity-70 shrink-0">{tab.icon}</span>
											<span className="whitespace-nowrap">{tab.label}</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent side="bottom">{tab.label}</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						))}
					</div>
				</div>
			}

			<ScrollArea className="flex-1 scrollbar-hidden bg-linear-to-b from-transparent to-black/[0.12]">
				{activeTab.content({
					trackId: track.id,
					trackName: track.name,
					mediaAssets,
					mediaAsset:
						"mediaId" in element
							? mediaAssets.find((m) => m.id === element.mediaId)
							: undefined,
				})}
			</ScrollArea>
		</>
	);
}

function InspectorHeader({ disabled }: { disabled?: boolean }) {
	return (
		<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0 truncate text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
					Inspector
				</div>
				<button
					type="button"
					disabled={disabled}
					className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[0.65rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
				>
					Reset all
				</button>
			</div>
			{/* Only render the 5-tab quick switcher when an element IS
			   actually selected. When `disabled` (nothing selected,
			   details view), the tabs would just take up vertical
			   space AND squish into ~30px columns at narrow panel
			   widths. Hiding them gives the details card the full
			   panel to work with. */}
			{!disabled && (
				<div
					className="mt-3 flex overflow-x-auto scrollbar-hidden gap-1 rounded-lg border border-white/[0.08] bg-black/20 p-1 text-[0.64rem]"
					style={{
						maskImage:
							"linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
					}}
				>
					{PRIMARY_INSPECTOR_TABS.map((tab) => (
						<span
							key={tab.label}
							className="relative shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-center font-medium text-white/30"
						>
							{tab.label}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

const PRIMARY_INSPECTOR_TABS = [
	{
		label: "Element",
		ids: ["graphic"],
	},
	{
		label: "Text",
		ids: ["text"],
	},
	{
		label: "Video",
		ids: [
			"transform",
			"audio",
			"speed",
			"speed-ramp",
			"blending",
			"parenting",
			"camera",
			"effects",
			"masks",
			"animations",
		],
		/** Element type this primary "owns" the secondary tab ids for.
		   Shared ids (transform, effects, masks, animations, …) only
		   count as active for this primary when the selected element
		   is of this type. Without this gate, an image element on
		   `transform` would light up both Video *and* Image primaries
		   because both primary tabs declare `transform` as one of
		   their ids. */
		ownedBy: ["video"] as const,
	},
	{
		label: "Image",
		ids: [
			"image",
			"transform",
			"parenting",
			"camera",
			"effects",
			"masks",
			"animations",
		],
		ownedBy: ["image"] as const,
	},
	{
		label: "Audio",
		ids: ["audio-element", "audio-effects"],
	},
] as const;

function buildPrimaryInspectorTabs({
	visibleTabs,
	activeTabId,
	elementType,
}: {
	visibleTabs: PropertiesTabDef[];
	activeTabId: string;
	elementType: string;
}) {
	// Which primary tab should remain highlighted if we are on a "global" secondary tab like element-info?
	let fallbackPrimaryLabel = "Element";
	if (elementType === "video") fallbackPrimaryLabel = "Video";
	if (elementType === "image") fallbackPrimaryLabel = "Image";
	if (elementType === "text") fallbackPrimaryLabel = "Text";
	if (elementType === "audio") fallbackPrimaryLabel = "Audio";
	if (elementType === "effect") fallbackPrimaryLabel = "Video";

	// Context-aware hiding: when the user is inside one of the
	// "focus" categories (Effects, Animation, Adjust*), we only
	// hide the *secondary* tab row underneath (the "transform /
	// audio / speed" chips) — the primary tab bar at the top stays
	// fully visible so the user can still see and click "Video" or
	// "Audio" to jump back. Hiding the primary tabs here was a
	// regression: the top bar would suddenly drop to just "Effects"
	// whenever the user was in a focus sub-tab, which made the
	// inspector feel broken (the user couldn't tell what other
	// categories existed). The focus category owns the *secondary*
	// row only.
	return PRIMARY_INSPECTOR_TABS.map((primaryTab) => {
		// Does this primary "own" its ids for the current element
		// type? Both Video and Image declare `transform` as a
		// secondary id, so without this gate the same active
		// secondary tab would light up two primaries at once.
		const isOwnedByType =
			!("ownedBy" in primaryTab) ||
			// biome-ignore lint/suspicious/noExplicitAny: readonly tuple
			(primaryTab as any).ownedBy?.includes(elementType);

		// When the element type doesn't match the primary's
		// `ownedBy`, drop the target so the button renders in the
		// "locked / not available" state — preventing the user
		// from clicking into the wrong primary and landing on a
		// generic Transform tab.
		const rawTarget = primaryTab.ids
			.map((id) => visibleTabs.find((tab) => tab.id === id))
			.find((tab): tab is PropertiesTabDef => Boolean(tab));
		const target = isOwnedByType ? rawTarget : undefined;

		let isActive =
			isOwnedByType && primaryTab.ids.some((id) => id === activeTabId);
		if (
			activeTabId === "element-info" &&
			primaryTab.label === fallbackPrimaryLabel
		) {
			isActive = true;
		}

		return {
			label: primaryTab.label,
			target,
			isActive,
		};
	});
}

function SelectedElementSummary({
	element,
	trackId,
	mediaAssets,
}: {
	element: TimelineElement;
	trackId: string;
	mediaAssets: MediaAsset[];
}) {
	const mediaId = "mediaId" in element ? element.mediaId : undefined;
	const media = mediaAssets.find((asset) => asset.id === mediaId);
	const thumbnail = media?.thumbnailUrl ?? media?.url;
	const mediaSummarySize = usePropertiesStore((s) => s.mediaSummarySize);
	const setMediaSummarySize = usePropertiesStore((s) => s.setMediaSummarySize);
	const favoriteMediaIds = usePropertiesStore((s) => s.favoriteMediaIds);
	const toggleMediaFavorite = usePropertiesStore((s) => s.toggleMediaFavorite);
	const isFavorited = mediaId ? favoriteMediaIds.has(mediaId) : false;
	const canFavorite = Boolean(mediaId);
	const displayName = getElementDisplayName({
		element,
		mediaName: media?.name,
	});

	if (mediaSummarySize === "hidden") {
		return (
			<div className="mx-3.5 mt-3 flex shrink-0 items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
				<EditableElementName
					element={element}
					trackId={trackId}
					displayName={displayName}
					className="min-w-0 flex-1 text-[0.78rem] font-medium text-white/[0.9]"
				/>
				<MediaSummaryMenu
					size={mediaSummarySize}
					onSizeChange={setMediaSummarySize}
				/>
			</div>
		);
	}

	if (mediaSummarySize === "compact") {
		return (
			<div className="mx-3.5 mt-3 flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 shadow-inner shadow-white/[0.02]">
				<div className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.06]">
					{thumbnail ? (
						<Image
							src={thumbnail}
							alt=""
							fill
							sizes="28px"
							className="object-cover"
							unoptimized
						/>
					) : (
						<span className="text-[0.55rem] uppercase text-white/[0.35]">
							{element.type}
						</span>
					)}
				</div>
				<EditableElementName
					element={element}
					trackId={trackId}
					displayName={displayName}
					className="min-w-0 flex-1 text-[0.78rem] font-medium text-white/[0.9]"
				/>
				<StarButton
					isFavorited={isFavorited}
					disabled={!canFavorite}
					onClick={() => mediaId && toggleMediaFavorite(mediaId)}
				/>
				<MediaSummaryMenu
					size={mediaSummarySize}
					onSizeChange={setMediaSummarySize}
				/>
			</div>
		);
	}

	// "default" — original card layout, now wired to favourite state and
	// with the size dropdown slotted in next to the star.
	return (
		<div className="mx-3.5 mt-3 flex shrink-0 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 shadow-inner shadow-white/[0.02]">
			<div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
				{thumbnail ? (
					<Image
						src={thumbnail}
						alt=""
						fill
						sizes="48px"
						className="object-cover"
						unoptimized
					/>
				) : (
					<span className="text-[0.65rem] uppercase text-white/[0.35]">
						{element.type}
					</span>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<EditableElementName
					element={element}
					trackId={trackId}
					displayName={displayName}
					className="text-sm font-medium text-white/[0.92]"
				/>
				<div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[0.65rem] text-white/42">
					<span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 uppercase tracking-[0.12em]">
						{element.type}
					</span>
					{"sourceDuration" in element && element.sourceDuration ? (
						<span>{Math.round(element.sourceDuration / 120000)}s</span>
					) : (
						""
					)}
				</div>
			</div>
			<StarButton
				isFavorited={isFavorited}
				disabled={!canFavorite}
				onClick={() => mediaId && toggleMediaFavorite(mediaId)}
			/>
			<MediaSummaryMenu
				size={mediaSummarySize}
				onSizeChange={setMediaSummarySize}
			/>
		</div>
	);
}

/**
 * Inline-editable element label. Renders as a static (double-click-to-edit)
 * name normally; on double-click it swaps to a text input. Saving writes
 * `customName` via the standard updateElements command, so it participates in
 * undo/redo. Clearing the field resets to the auto-derived name (customName is
 * removed). Mirrors the timeline track-rename UX so the interaction is
 * consistent across the app.
 */
function EditableElementName({
	element,
	trackId,
	displayName,
	className,
}: {
	element: TimelineElement;
	trackId: string;
	displayName: string;
	className?: string;
}) {
	const editor = useEditor();
	const [isEditing, setIsEditing] = useState(false);
	const [value, setValue] = useState(element.customName ?? "");
	const inputRef = useRef<HTMLInputElement>(null);

	// Keep the draft in sync when the selection changes or an external rename
	// lands while we're not actively editing. The draft derives entirely from
	// customName, so keying on it (plus isEditing) covers element switches too.
	useEffect(() => {
		if (!isEditing) {
			setValue(element.customName ?? "");
		}
	}, [element.customName, isEditing]);

	const save = () => {
		setIsEditing(false);
		const trimmed = value.trim();
		const nextCustomName = trimmed.length > 0 ? trimmed : undefined;
		if (nextCustomName === (element.customName ?? undefined)) {
			return;
		}
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: { customName: nextCustomName },
				},
			],
		});
	};

	if (!isEditing) {
		return (
			<button
				type="button"
				className={cn("min-w-0 cursor-text text-left", className)}
				title={`${displayName} — double-click to rename`}
				onDoubleClick={() => {
					setValue(element.customName ?? "");
					setIsEditing(true);
					setTimeout(() => inputRef.current?.select(), 0);
				}}
			>
				<MarqueeText className="text-left">{displayName}</MarqueeText>
			</button>
		);
	}

	return (
		<input
			ref={inputRef}
			className={cn(
				"w-full min-w-0 rounded bg-black/30 px-1 outline-none ring-1 ring-white/20",
				className,
			)}
			value={value}
			placeholder={displayName}
			autoComplete="off"
			onChange={(e) => setValue(e.target.value)}
			onBlur={save}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					save();
				}
				if (e.key === "Escape") {
					setValue(element.customName ?? "");
					setIsEditing(false);
				}
			}}
		/>
	);
}

/**
 * Star button that toggles the media favourite flag. Filled yellow when
 * the media is favourited, dim outline otherwise. Disabled (no-op click)
 * when the selected element has no media asset to favourite.
 */
function StarButton({
	isFavorited,
	disabled,
	onClick,
}: {
	isFavorited: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={isFavorited ? "Unfavourite media" : "Favourite media"}
			aria-pressed={isFavorited}
			title={
				disabled
					? "This element has no media to favourite"
					: isFavorited
						? "Unfavourite this media"
						: "Mark this media as a favourite"
			}
			className={cn(
				"grid size-7 shrink-0 place-items-center rounded-md border transition focus:outline-none",
				isFavorited
					? "border-yellow-500/30 bg-yellow-400/[0.08] text-yellow-300 hover:border-yellow-500/50 hover:bg-yellow-400/[0.14]"
					: "border-white/[0.08] bg-white/[0.03] text-white/[0.42] hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
				disabled &&
					"cursor-not-allowed opacity-40 hover:bg-white/[0.03] hover:text-white/[0.42]",
			)}
		>
			<HugeiconsIcon
				icon={StarIcon}
				// Fill makes the difference between "favourited" (solid
				// yellow star) and "not favourited" (outline only).
				className={cn("size-3.5", isFavorited && "[&_path]:fill-current")}
			/>
		</button>
	);
}

/**
 * Dropdown that controls the media card's display size. The three
 * options trade vertical space against how much info is shown at a
 * glance — useful when the inspector is short on height and the
 * effect / animation content needs the room.
 */
function MediaSummaryMenu({
	size,
	onSizeChange,
}: {
	size: MediaSummarySize;
	onSizeChange: (size: MediaSummarySize) => void;
}) {
	return (
		<DropdownMenu>
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								aria-label="Media card options"
								className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white focus:outline-none"
							>
								<HugeiconsIcon icon={MoreHorizontalIcon} className="size-3.5" />
							</button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="bottom">Media card options</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DropdownMenuContent
				align="end"
				sideOffset={6}
				className="z-100 min-w-[11rem] rounded-lg border border-white/[0.08] bg-[#09090b]/95 p-1 text-white/95 shadow-xl backdrop-blur-md"
			>
				<DropdownMenuLabel className="px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/40">
					Card size
				</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={size}
					onValueChange={(value) => {
						if (
							value === "default" ||
							value === "compact" ||
							value === "hidden"
						) {
							onSizeChange(value as MediaSummarySize);
						}
					}}
				>
					<DropdownMenuRadioItem
						value="default"
						className="rounded-md text-[0.78rem] text-white/85 focus:bg-white/[0.08] focus:text-white data-[state=checked]:text-white"
					>
						Default
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem
						value="compact"
						className="rounded-md text-[0.78rem] text-white/85 focus:bg-white/[0.08] focus:text-white data-[state=checked]:text-white"
					>
						Compact
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem
						value="hidden"
						className="rounded-md text-[0.78rem] text-white/85 focus:bg-white/[0.08] focus:text-white data-[state=checked]:text-white"
					>
						Hidden
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
