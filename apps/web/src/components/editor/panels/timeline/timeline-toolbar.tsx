"use client";

import { useEditor } from "@/hooks/use-editor";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TIMELINE_ZOOM_BUTTON_FACTOR } from "./interaction";
import { TIMELINE_ZOOM_MAX } from "@/lib/timeline/scale";
import { sliderToZoom, zoomToSlider } from "@/lib/timeline/zoom-utils";
import { invokeAction } from "@/lib/actions";
import { cn } from "@/utils/ui";
import { useTimelineStore } from "@/stores/timeline-store";
import { ScenesView } from "@/components/editor/scenes-view";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFreezeFrame } from "@/hooks/use-freeze-frame";
import { getElementKeyframes } from "@/lib/animation";
import type { TimelineTrack } from "@/lib/timeline";
import { getPropertyLabel } from "./expanded-layout";
import { useEffect, useMemo, useState } from "react";
import {
	AlignLeftIcon,
	AlignRightIcon,
	AlignHorizontalCenterIcon,
	Bookmark01Icon,
	Bookmark02Icon,
	Camera01Icon,
	ClapperboardIcon,
	ClipboardIcon,
	Copy01Icon,
	Copy02Icon,
	Delete02Icon,
	EaseCurveControlPointsIcon,
	EyeIcon,
	GroupLayersIcon,
	Layers01Icon,
	Link01Icon,
	Maximize01Icon,
	MagnetIcon,
	MusicNote03Icon,
	PlayIcon,
	ScissorIcon,
	SnowIcon,
	Square01Icon,
	TimelineIcon,
	GitMergeIcon,
	Target01Icon,
	Tick01Icon,
	TickDouble01Icon,
	UndoIcon,
	RedoIcon,
	Unlink01Icon,
	VolumeMute02Icon,
	VolumeOffIcon,
	SearchAddIcon,
	SearchMinusIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { OcRippleIcon } from "@/components/icons";
import { Plus, StretchHorizontal } from "lucide-react";
import { useGraphEditorController } from "./graph-editor/use-controller";
import { GraphEditorPopover } from "./graph-editor/popover";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TimelineToolbar({
	zoomLevel,
	minZoom,
	setZoomLevel,
}: {
	zoomLevel: number;
	minZoom: number;
	setZoomLevel: ({ zoom }: { zoom: number }) => void;
}) {
	const handleZoom = ({ direction }: { direction: "in" | "out" }) => {
		const newZoomLevel =
			direction === "in"
				? Math.min(TIMELINE_ZOOM_MAX, zoomLevel * TIMELINE_ZOOM_BUTTON_FACTOR)
				: Math.max(minZoom, zoomLevel / TIMELINE_ZOOM_BUTTON_FACTOR);
		setZoomLevel({ zoom: newZoomLevel });
	};

	return (
		<ScrollArea className="scrollbar-hidden">
			<div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-transparent px-3.5 py-0.5 z-20">
				{/* Left Section: + Track, Separator, Action Buttons */}
				<div className="flex min-w-0 items-center gap-2 justify-start">
					<AddTrackDropdown />
					<div className="h-5 w-px bg-white/10 mx-1" />
					<ToolbarLeftSection />
				</div>

				{/* Center Section: Scene Selector with navigation arrows */}
				<SceneSelector />

				{/* Right Section: Snapping, Ripple, Zoom controls */}
				<div className="justify-self-end">
					<ToolbarRightSection
						zoomLevel={zoomLevel}
						minZoom={minZoom}
						onZoomChange={(zoom) => setZoomLevel({ zoom })}
						onZoom={handleZoom}
					/>
				</div>
			</div>
		</ScrollArea>
	);
}

function AddTrackDropdown() {
	const editor = useEditor();
	const options = [
		{ label: "Video track", type: "video" as const },
		{ label: "Audio track", type: "audio" as const },
		{ label: "Camera track", type: "camera" as const },
		{ label: "Text track", type: "text" as const },
		{ label: "Image track", type: "image" as const },
		{ label: "Effect track", type: "effect" as const },
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2.5 border border-white/10 bg-white/[0.04] text-[0.66rem] font-bold text-white/90 hover:bg-white/[0.08]"
					aria-label="Add timeline track"
				>
					<Plus className="size-3" />
					Add timeline
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="z-100 w-40">
				{options.map((option) => (
					<DropdownMenuItem
						key={option.type}
						onClick={() => {
							// CapCut-style: just add the track lane. No
							// implicit element drop, no built-in text/camera
							// placeholder — the user picks what to put on it.
							editor.timeline.addTrack({ type: option.type });
						}}
					>
						{option.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ToolbarLeftSection() {
	const editor = useEditor();
	const freezeFrame = useFreezeFrame();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const allTimelineElements = useEditor((e) =>
		Object.values(e.scenes.getActiveScene().tracks)
			.flat()
			.flatMap((track) => track.elements),
	);
	const [hasClipboardEntry, setHasClipboardEntry] = useState(() =>
		editor.clipboard.hasEntry(),
	);
	const playhead = useEditor((e) => e.playback.getCurrentTime());
	const canUndo = useEditor((e) => e.command.canUndo());
	const canRedo = useEditor((e) => e.command.canRedo());
	const alignDirection = useMemo(() => {
		for (const ref of selectedElements) {
			const track = editor.timeline.getTrackById({ trackId: ref.trackId });
			const element = track?.elements.find((el) => el.id === ref.elementId);
			if (!element) continue;
			if (playhead < element.startTime) return "left";
			if (playhead > element.startTime + element.duration) return "right";
		}
		return "center";
	}, [editor, selectedElements, playhead]);
	useEffect(
		() =>
			editor.clipboard.subscribe(() =>
				setHasClipboardEntry(editor.clipboard.hasEntry()),
			),
		[editor],
	);

	const hasSelection = selectedElements.length > 0;
	const singleSelection = selectedElements.length === 1;
	const canSelectAll = allTimelineElements.length > selectedElements.length;
	const canAlignToPlayhead = alignDirection !== "center";
	const canAddBeatMarkers =
		singleSelection &&
		selectedElements.some((ref) => {
			const track = editor.timeline.getTrackById({ trackId: ref.trackId });
			const element = track?.elements.find((el) => el.id === ref.elementId);
			return element?.type === "audio" || element?.type === "video";
		});
	const alignIcon =
		alignDirection === "left"
			? AlignLeftIcon
			: alignDirection === "right"
				? AlignRightIcon
				: AlignHorizontalCenterIcon;

	return (
		<div className="flex items-center gap-0.5">
			<TooltipProvider delayDuration={400}>
				{/* History */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={UndoIcon} />}
					tooltip="Undo"
					disabled={!canUndo}
					onClick={() => invokeAction("undo")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={RedoIcon} />}
					tooltip="Redo"
					disabled={!canRedo}
					onClick={() => invokeAction("redo")}
				/>

				<SectionDivider />

				{/* Selection */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={TickDouble01Icon} />}
					tooltip="Select all"
					disabled={!canSelectAll}
					onClick={() => invokeAction("select-all")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Tick01Icon} />}
					tooltip="Deselect all"
					disabled={!hasSelection}
					onClick={() => invokeAction("deselect-all")}
				/>

				<SectionDivider />

				{/* Clipboard */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					tooltip="Copy layer"
					disabled={!hasSelection}
					onClick={() => invokeAction("copy-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ClipboardIcon} />}
					tooltip="Paste layer at playhead"
					disabled={!hasClipboardEntry}
					onClick={() => invokeAction("paste-copied")}
				/>

				<SectionDivider />

				{/* Edit operations */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={SnowIcon} />}
					tooltip="Freeze frame"
					disabled={!singleSelection}
					onClick={(e) => {
						e.stopPropagation();
						freezeFrame();
					}}
				/>
				<GraphEditorToolbarButton />
				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip="Delete selected"
					disabled={!hasSelection}
					onClick={() => invokeAction("delete-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ScissorIcon} />}
					tooltip="Split clip"
					disabled={!hasSelection}
					onClick={() => invokeAction("split")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy02Icon} />}
					tooltip="Duplicate selected"
					disabled={!hasSelection}
					onClick={() => invokeAction("duplicate-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip="Split left"
					disabled={!hasSelection}
					onClick={() => invokeAction("split-left")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip="Split right"
					disabled={!hasSelection}
					onClick={() => invokeAction("split-right")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={alignIcon} />}
					tooltip="Align to playhead"
					disabled={!canAlignToPlayhead}
					onClick={() => invokeAction("align-to-playhead")}
				/>
				<ToolbarButton
					icon={<StretchHorizontal className="size-3.5" />}
					tooltip="Extend to playhead"
					disabled={!canAlignToPlayhead}
					onClick={() => invokeAction("extend-to-playhead")}
				/>

				<SectionDivider />

				{/* Grouping & parenting */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={GroupLayersIcon} />}
					tooltip="Group selected"
					disabled={!hasSelection}
					onClick={() => invokeAction("group-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={GitMergeIcon} />}
					tooltip="Combine selected"
					disabled={!hasSelection}
					onClick={() => invokeAction("combine-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Layers01Icon} />}
					tooltip="Ungroup selected"
					disabled={!hasSelection}
					onClick={() => invokeAction("ungroup-selected")}
				/>

				<SectionDivider />

				{/* Audio */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={MusicNote03Icon} />}
					tooltip="Add beat markers"
					disabled={!canAddBeatMarkers}
					onClick={() => invokeAction("add-beat-markers")}
				/>
			</TooltipProvider>
		</div>
	);
}

/**
 * Thin vertical divider between toolbar button groups. Keeps the
 * toolbar legible when it gets crowded without committing to a
 * hard-coded count of buttons per group.
 */
function SectionDivider() {
	return <div className="mx-1 h-5 w-px bg-white/10" />;
}

function SceneSelector() {
	const editor = useEditor();
	const currentScene = editor.scenes.getActiveScene();
	const scenes = editor.scenes.getScenes();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const focusedKeyframePropertyPaths = useTimelineStore(
		(s) => s.focusedKeyframePropertyPaths,
	);
	const toggleFocusedKeyframePropertyPath = useTimelineStore(
		(s) => s.toggleFocusedKeyframePropertyPath,
	);
	const keyframeLayerSearch = useTimelineStore((s) => s.keyframeLayerSearch);
	const setKeyframeLayerSearch = useTimelineStore(
		(s) => s.setKeyframeLayerSearch,
	);
	const keyframeLayerNames = useTimelineStore((s) => s.keyframeLayerNames);
	const setKeyframeLayerName = useTimelineStore((s) => s.setKeyframeLayerName);
	const keyframeLayers = useMemo(() => {
		const layers = new Map<string, { propertyPath: string; label: string }>();
		const tracks = Object.values(
			currentScene?.tracks ?? {},
		).flat() as TimelineTrack[];
		for (const selectedElement of selectedElements) {
			const track = tracks.find(
				(track) => track.id === selectedElement.trackId,
			);
			const element = track?.elements.find(
				(element) => element.id === selectedElement.elementId,
			);
			for (const keyframe of getElementKeyframes({
				animations: element?.animations,
			})) {
				layers.set(keyframe.propertyPath, {
					propertyPath: keyframe.propertyPath,
					label:
						keyframeLayerNames[keyframe.propertyPath] ||
						getPropertyLabel(keyframe.propertyPath),
				});
			}
		}
		return [...layers.values()].filter((layer) =>
			layer.label.toLowerCase().includes(keyframeLayerSearch.toLowerCase()),
		);
	}, [currentScene, keyframeLayerNames, keyframeLayerSearch, selectedElements]);
	const hasKeyframeLayers = keyframeLayers.length > 0;

	const [mode, setMode] = useState<"scene" | "timeline">("scene");
	const timelineIndex = Math.max(
		1,
		scenes.findIndex((s) => s.id === currentScene?.id) + 1,
	);

	// Icon mirrors the active mode — no text in the toolbar slot.
	// The chevron/manage-scenes icon swaps the same way so both buttons
	// stay in sync with the dropdown.
	const modeIcon = mode === "timeline" ? TimelineIcon : ClapperboardIcon;

	return (
		<div className="flex items-center z-20 gap-1.5">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex h-7 items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#161618]/70 hover:bg-[#1f1f22]/80 hover:border-white/15 px-3.5 text-[0.68rem] font-semibold text-white transition focus:outline-none cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
					>
						<span className="tracking-wide select-none">
							{hasKeyframeLayers
								? "Keyframes"
								: mode === "timeline"
									? `Timeline ${timelineIndex}`
									: currentScene?.name || "Main scene"}
						</span>
						<div className="h-3 w-px bg-white/15" />
						<HugeiconsIcon
							icon={Layers01Icon}
							className="size-3.5 text-white/75"
						/>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56 z-100">
					{hasKeyframeLayers ? (
						<>
							<div className="p-1.5">
								<input
									value={keyframeLayerSearch}
									onChange={(event) =>
										setKeyframeLayerSearch(event.target.value)
									}
									placeholder="Search keyframes"
									className="h-7 w-full rounded-md border border-white/10 bg-black/30 px-2 text-xs text-white outline-none placeholder:text-white/35"
									onKeyDown={(event) => event.stopPropagation()}
								/>
							</div>
							{keyframeLayers.map((layer) => (
								<DropdownMenuItem
									key={layer.propertyPath}
									onClick={() =>
										toggleFocusedKeyframePropertyPath(layer.propertyPath)
									}
									className={cn(
										"gap-2",
										focusedKeyframePropertyPaths.includes(layer.propertyPath) &&
											"bg-white/10 text-white",
									)}
								>
									<button
										type="button"
										onClick={(event) => {
											event.stopPropagation();
											toggleFocusedKeyframePropertyPath(layer.propertyPath);
										}}
										className={cn(
											"size-3 rounded-full border border-white/25",
											focusedKeyframePropertyPaths.includes(
												layer.propertyPath,
											) &&
												"border-white bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]",
										)}
										aria-label={`Select ${layer.label} keyframes`}
									/>
									<input
										value={layer.label}
										onClick={(event) => event.stopPropagation()}
										onKeyDown={(event) => event.stopPropagation()}
										onChange={(event) =>
											setKeyframeLayerName(
												layer.propertyPath,
												event.target.value,
											)
										}
										className="min-w-0 flex-1 bg-transparent text-xs outline-none"
									/>
								</DropdownMenuItem>
							))}
						</>
					) : (
						<>
							{/* Mode switcher inline at the top of the dropdown.
							    Same Scene | Timeline toggle as before, just
							    moved inside so the toolbar stays compact. */}
							<div className="px-1.5 pb-1.5 pt-1">
								<div className="flex h-7 items-center rounded-full border border-white/[0.08] bg-black/40 p-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em]">
									<button
										type="button"
										onClick={() => setMode("scene")}
										className={cn(
											"h-6 flex-1 rounded-full transition focus:outline-none",
											mode === "scene"
												? "bg-white text-black"
												: "text-white/55 hover:text-white",
										)}
									>
										Scene
									</button>
									<button
										type="button"
										onClick={() => setMode("timeline")}
										className={cn(
											"h-6 flex-1 rounded-full transition focus:outline-none",
											mode === "timeline"
												? "bg-white text-black"
												: "text-white/55 hover:text-white",
										)}
									>
										Timeline
									</button>
								</div>
							</div>
							{scenes.map((scene, idx) => (
								<DropdownMenuItem
									key={scene.id}
									onClick={() =>
										editor.scenes.switchToScene({ sceneId: scene.id })
									}
								>
									{mode === "timeline" ? `Timeline ${idx + 1}` : scene.name}
								</DropdownMenuItem>
							))}
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Layered chevron button — opens the ScenesView sheet (matches
			    screenshot #2: select scenes, cancel / delete N, main
			    scene dropdown). Icon swaps with mode; tooltip only on
			    hover so the toolbar stays compact. */}
			<ScenesView>
				<button
					type="button"
					className="group relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-white/[0.08] bg-[#161618]/70 text-white/70 transition hover:bg-[#1f1f22]/80 hover:border-white/15 hover:text-white focus:outline-none shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
					title={mode === "timeline" ? "Manage timelines" : "Manage scenes"}
					aria-label={mode === "timeline" ? "Manage timelines" : "Manage scenes"}
				>
					<HugeiconsIcon icon={modeIcon} className="size-3.5" />
					<span className="pointer-events-none absolute -bottom-6 whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-1.5 py-0.5 text-[0.6rem] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
						{mode === "timeline" ? "Manage timelines" : "Manage scenes"}
					</span>
				</button>
			</ScenesView>
		</div>
	);
}

function ToolbarRightSection({
	zoomLevel,
	minZoom,
	onZoomChange,
	onZoom,
}: {
	zoomLevel: number;
	minZoom: number;
	onZoomChange: (zoom: number) => void;
	onZoom: (options: { direction: "in" | "out" }) => void;
}) {
	const snappingEnabled = useTimelineStore((s) => s.snappingEnabled);
	const rippleEditingEnabled = useTimelineStore((s) => s.rippleEditingEnabled);
	const toggleSnapping = useTimelineStore((s) => s.toggleSnapping);
	const toggleRippleEditing = useTimelineStore((s) => s.toggleRippleEditing);
	const autoScrollEnabled = useTimelineStore((s) => s.autoScrollEnabled);
	const toggleAutoScroll = useTimelineStore((s) => s.toggleAutoScroll);
	const autoPlayWhileScrubbing = useTimelineStore(
		(s) => s.autoPlayWhileScrubbing,
	);
	const toggleAutoPlayWhileScrubbing = useTimelineStore(
		(s) => s.toggleAutoPlayWhileScrubbing,
	);

	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
	);

	const editor = useEditor();
	const selectedElements = useEditor((e) => e.selection.getSelectedElements());
	const selectedTimelineElements = useMemo(
		() =>
			selectedElements.flatMap((ref) => {
				const track = editor.timeline.getTrackById({ trackId: ref.trackId });
				const element = track?.elements.find((el) => el.id === ref.elementId);
				return element ? [element] : [];
			}),
		[editor, selectedElements],
	);
	const canLinkParent = selectedElements.length === 2;
	const canUnlinkParent = selectedTimelineElements.some(
		(element) => (element as { parentId?: string }).parentId,
	);

	return (
		<div className="flex items-center gap-1.5 p-0.5 z-20">
			<TooltipProvider delayDuration={400}>
				{/* Bookmarks */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Bookmark02Icon} />}
					isActive={isCurrentlyBookmarked}
					tooltip={isCurrentlyBookmarked ? "Remove bookmark" : "Add bookmark"}
					onClick={() => invokeAction("toggle-bookmark")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Bookmark01Icon} />}
					tooltip="Toggle bookmark on selected element"
					onClick={() => invokeAction("toggle-element-bookmark")}
				/>

				<SectionDivider />

				{/* Linking (moved from left for balance) */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Link01Icon} />}
					tooltip="Link parent"
					disabled={!canLinkParent}
					onClick={() => invokeAction("link-parent")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Unlink01Icon} />}
					tooltip="Unlink parent"
					disabled={!canUnlinkParent}
					onClick={() => invokeAction("unlink-parent")}
				/>

				<SectionDivider />

				{/* Toggles */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Magnet"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={Target01Icon} />}
					isActive={autoScrollEnabled}
					tooltip="Auto-scroll timeline during playback"
					onClick={() => toggleAutoScroll()}
				>
					{autoScrollEnabled && (
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]"
						/>
					)}
				</ToolbarButton>
				<ToolbarButton
					icon={<HugeiconsIcon icon={PlayIcon} />}
					isActive={autoPlayWhileScrubbing}
					tooltip="Auto-play while dragging playhead"
					onClick={() => toggleAutoPlayWhileScrubbing()}
				>
					{autoPlayWhileScrubbing && (
						<span
							aria-hidden="true"
							className="pointer-events-none absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_rgba(103,232,249,0.85)]"
						/>
					)}
				</ToolbarButton>

				<ToolbarButton
					icon={<OcRippleIcon size={20} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip="Ripple editing"
					onClick={() => toggleRippleEditing()}
				/>

				<SectionDivider />

				{/* Audio */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={VolumeOffIcon} />}
					tooltip="Toggle source audio (mute video clip's original audio)"
					onClick={() => invokeAction("toggle-source-audio")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={VolumeMute02Icon} />}
					tooltip="Toggle elements muted (selected)"
					onClick={() => invokeAction("toggle-elements-muted-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={EyeIcon} />}
					tooltip="Toggle elements visibility (selected)"
					onClick={() => invokeAction("toggle-elements-visibility-selected")}
				/>

				<SectionDivider />

				{/* View */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Maximize01Icon} />}
					tooltip="Fit timeline to view"
					onClick={() => invokeAction("fit-to-screen")}
				/>

				<SectionDivider />

				{/* Insert */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Camera01Icon} />}
					tooltip="Add camera layer"
					onClick={() => invokeAction("add-camera")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Square01Icon} />}
					tooltip="Add null layer"
					onClick={() => invokeAction("add-null-layer")}
				/>
			</TooltipProvider>

			<div className="mx-1 h-5 w-px bg-white/10" />

			<div className="flex items-center gap-1">
				<Button
					variant="text"
					size="icon"
					className="size-7"
					onClick={() => onZoom({ direction: "out" })}
					aria-label="Zoom out"
				>
					<HugeiconsIcon icon={SearchMinusIcon} size={15} />
				</Button>
				<Slider
					className="w-20 sm:w-24"
					value={[zoomToSlider({ zoomLevel, minZoom })]}
					onValueChange={(values) =>
						onZoomChange(sliderToZoom({ sliderPosition: values[0], minZoom }))
					}
					min={0}
					max={1}
					step={0.005}
				/>
				<Button
					variant="text"
					size="icon"
					className="size-7"
					onClick={() => onZoom({ direction: "in" })}
					aria-label="Zoom in"
				>
					<HugeiconsIcon icon={SearchAddIcon} size={15} />
				</Button>
			</div>
		</div>
	);
}

function ToolbarButton({
	icon,
	tooltip,
	onClick,
	disabled,
	isActive,
	children,
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick?: (event: React.MouseEvent) => void;
	disabled?: boolean;
	isActive?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>
				<Button
					variant={isActive ? "secondary" : "text"}
					size="icon"
					disabled={disabled}
					onClick={onClick}
					className={cn(
						// Compact button — fits more tools in a small
						// toolbar without scroll. The cursor + tooltip
						// remain the only affordance.
						"relative size-6 rounded text-white/60 hover:bg-white/[0.08] hover:text-white transition",
						isActive &&
							"bg-white text-black hover:bg-white/90 hover:text-black",
						disabled ? "cursor-not-allowed opacity-50" : "",
					)}
				>
					{icon}
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

function GraphEditorToolbarButton() {
	const controller = useGraphEditorController();

	return (
		<GraphEditorPopover
			open={controller.open}
			onOpenChange={controller.onOpenChange}
			value={
				controller.state.status === "ready"
					? controller.state.cubicBezier
					: null
			}
			message={
				controller.state.status === "ready" ? "" : controller.state.message
			}
			componentOptions={
				controller.state.status === "ready"
					? controller.state.componentOptions
					: []
			}
			activeComponentKey={
				controller.state.status === "ready"
					? controller.state.activeComponentKey
					: null
			}
			onActiveComponentKeyChange={controller.onActiveComponentKeyChange}
			onPreviewValue={controller.onPreviewValue}
			onCommitValue={controller.onCommitValue}
			onCancelPreview={controller.onCancelPreview}
		>
			<Tooltip>
				<PopoverTrigger asChild>
					<TooltipTrigger asChild>
						<button
							type="button"
							disabled={!controller.canOpen}
							className={cn(
								"flex h-7 w-7 items-center justify-center rounded-md text-white/60 transition-colors focus:outline-none cursor-pointer",
								!controller.canOpen
									? "opacity-50 cursor-not-allowed"
									: "hover:bg-white/[0.08] hover:text-white",
								controller.open && "bg-white text-black hover:bg-white/90",
							)}
						>
							<HugeiconsIcon
								icon={EaseCurveControlPointsIcon}
								className="size-[1.125rem]"
							/>
						</button>
					</TooltipTrigger>
				</PopoverTrigger>
				<TooltipContent side="top" sideOffset={12} className="z-100">
					{controller.tooltip}
				</TooltipContent>
			</Tooltip>
		</GraphEditorPopover>
	);
}
