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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFreezeFrame } from "@/hooks/use-freeze-frame";
import {
	AlignLeftIcon,
	AlignRightIcon,
	Bookmark01Icon,
	Bookmark02Icon,
	Camera01Icon,
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
	ScissorIcon,
	SnowIcon,
	Square01Icon,
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
import { Plus } from "lucide-react";
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
			<div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-transparent px-2.5 py-0.5 z-20">
				{/* Left Section: + Track, Separator, Action Buttons */}
				<div className="flex min-w-0 items-center gap-2">
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
		{ label: "Text track", type: "text" as const },
		{ label: "Effect track", type: "effect" as const },
	];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2.5 border border-white/10 bg-white/[0.04] text-[0.66rem] font-bold text-white/90 hover:bg-white/[0.08]"
					aria-label="Add track"
				>
					<Plus className="size-3" />
					Add track
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="z-100 w-40">
				{options.map((option) => (
					<DropdownMenuItem
						key={option.type}
						onClick={() => {
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
	const freezeFrame = useFreezeFrame();

	return (
		<div className="flex items-center gap-0.5">
			<TooltipProvider delayDuration={400}>
				{/* History */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={UndoIcon} />}
					tooltip="Undo"
					onClick={() => invokeAction("undo")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={RedoIcon} />}
					tooltip="Redo"
					onClick={() => invokeAction("redo")}
				/>

				<SectionDivider />

				{/* Selection */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={TickDouble01Icon} />}
					tooltip="Select all"
					onClick={() => invokeAction("select-all")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Tick01Icon} />}
					tooltip="Deselect all"
					onClick={() => invokeAction("deselect-all")}
				/>

				<SectionDivider />

				{/* Clipboard */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy01Icon} />}
					tooltip="Copy selected"
					onClick={() => invokeAction("copy-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ClipboardIcon} />}
					tooltip="Paste at playhead"
					onClick={() => invokeAction("paste-copied")}
				/>

				<SectionDivider />

				{/* Edit operations */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={SnowIcon} />}
					tooltip="Freeze frame"
					onClick={(e) => {
						e.stopPropagation();
						freezeFrame();
					}}
				/>
				<GraphEditorToolbarButton />
				<ToolbarButton
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					tooltip="Delete selected"
					onClick={() => invokeAction("delete-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={ScissorIcon} />}
					tooltip="Split clip"
					onClick={() => invokeAction("split")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Copy02Icon} />}
					tooltip="Duplicate selected"
					onClick={() => invokeAction("duplicate-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignLeftIcon} />}
					tooltip="Split left"
					onClick={() => invokeAction("split-left")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={AlignRightIcon} />}
					tooltip="Split right"
					onClick={() => invokeAction("split-right")}
				/>

				<SectionDivider />

				{/* Grouping & parenting */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={GroupLayersIcon} />}
					tooltip="Group selected"
					onClick={() => invokeAction("group-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Layers01Icon} />}
					tooltip="Ungroup selected"
					onClick={() => invokeAction("ungroup-selected")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Link01Icon} />}
					tooltip="Link parent"
					onClick={() => invokeAction("link-parent")}
				/>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Unlink01Icon} />}
					tooltip="Unlink parent"
					onClick={() => invokeAction("unlink-parent")}
				/>

				<SectionDivider />

				{/* Audio workflow */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={MusicNote03Icon} />}
					tooltip="Add beat markers"
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

	return (
		<div className="flex items-center z-20">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex h-7 items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#161618]/70 hover:bg-[#1f1f22]/80 hover:border-white/15 px-3.5 text-[0.68rem] font-semibold text-white transition focus:outline-none cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
					>
						<span className="tracking-wide select-none">
							{currentScene?.name || "Main scene"}
						</span>
						<div className="h-3 w-px bg-white/15" />
						<HugeiconsIcon
							icon={Layers01Icon}
							className="size-3.5 text-white/75"
						/>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-40 z-100">
					{scenes.map((scene) => (
						<DropdownMenuItem
							key={scene.id}
							onClick={() => editor.scenes.switchToScene({ sceneId: scene.id })}
						>
							{scene.name}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
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

	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
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

				{/* Toggles */}
				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Auto snapping"
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
