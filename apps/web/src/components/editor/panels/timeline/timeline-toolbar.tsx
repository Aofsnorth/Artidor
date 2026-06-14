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
	Bookmark02Icon,
	Delete02Icon,
	SnowIcon,
	ScissorIcon,
	MagnetIcon,
	SearchAddIcon,
	SearchMinusIcon,
	Copy01Icon,
	AlignLeftIcon,
	AlignRightIcon,
	UndoIcon,
	RedoIcon,
	Layers01Icon,
	EaseCurveControlPointsIcon,
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
					icon={<HugeiconsIcon icon={Copy01Icon} />}
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
			</TooltipProvider>
		</div>
	);
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

	const isCurrentlyBookmarked = useEditor((e) =>
		e.scenes.isBookmarked({ time: e.playback.getCurrentTime() }),
	);

	return (
		<div className="flex items-center gap-1.5 p-0.5 z-20">
			<TooltipProvider delayDuration={400}>
				<ToolbarButton
					icon={<HugeiconsIcon icon={Bookmark02Icon} />}
					isActive={isCurrentlyBookmarked}
					tooltip={isCurrentlyBookmarked ? "Remove bookmark" : "Add bookmark"}
					onClick={() => invokeAction("toggle-bookmark")}
				/>

				<ToolbarButton
					icon={<HugeiconsIcon icon={MagnetIcon} />}
					isActive={snappingEnabled}
					tooltip="Auto snapping"
					onClick={() => toggleSnapping()}
				/>

				<ToolbarButton
					icon={<OcRippleIcon size={20} className="scale-110" />}
					isActive={rippleEditingEnabled}
					tooltip="Ripple editing"
					onClick={() => toggleRippleEditing()}
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
}: {
	icon: React.ReactNode;
	tooltip: string;
	onClick?: (event: React.MouseEvent) => void;
	disabled?: boolean;
	isActive?: boolean;
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
						"size-7 rounded-md text-white/60 hover:bg-white/[0.08] hover:text-white transition",
						isActive &&
							"bg-white text-black hover:bg-white/90 hover:text-black",
						disabled ? "cursor-not-allowed opacity-50" : "",
					)}
				>
					{icon}
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
