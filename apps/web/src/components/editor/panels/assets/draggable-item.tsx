"use client";

import { Plus } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MarqueeText } from "@/components/ui/marquee-text";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { clearDragData, setDragData } from "@/lib/drag-data";
import type { TimelineDragData } from "@/lib/timeline/drag";
import { cn } from "@/utils/ui";

export interface DraggableItemProps {
	name: string;
	preview: ReactNode;
	dragData: TimelineDragData;
	onDragStart?: ({ e }: { e: React.DragEvent }) => void;
	onAddToTimeline?: ({ currentTime }: { currentTime: number }) => void;
	aspectRatio?: number;
	className?: string;
	containerClassName?: string;
	shouldShowPlusOnDrag?: boolean;
	shouldShowLabel?: boolean;
	isRounded?: boolean;
	variant?: "card" | "compact";
	isDraggable?: boolean;
}

export function DraggableItem({
	name,
	preview,
	dragData,
	onDragStart,
	onAddToTimeline,
	aspectRatio = 16 / 9,
	className = "",
	containerClassName,
	shouldShowPlusOnDrag = true,
	shouldShowLabel = true,
	isRounded = true,
	variant = "card",
	isDraggable = true,
}: DraggableItemProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
	const dragRef = useRef<HTMLDivElement>(null);
	const editor = useEditor();

	const handleAddToTimeline = () => {
		onAddToTimeline?.({ currentTime: editor.playback.getCurrentTime() });
	};

	const emptyImg = new window.Image();
	emptyImg.src =
		"data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

	const resetDrag = useCallback(() => {
		setIsDragging(false);
		clearDragData();
	}, []);

	useEffect(() => {
		if (!isDragging) return;

		const handleDragOver = (e: DragEvent) => {
			setDragPosition({ x: e.clientX, y: e.clientY });
		};

		// Safety nets: HTML5 drag-and-drop does NOT reliably fire `dragend`
		// when the user alt-tabs / switches windows mid-drag, which would
		// otherwise leave the floating preview and global drag data stuck on
		// screen. Reset the drag when the window loses focus, the tab is
		// hidden, or any global drop/dragend fires.
		const handleAbort = () => resetDrag();
		const handleVisibility = () => {
			if (document.hidden) resetDrag();
		};

		document.addEventListener("dragover", handleDragOver);
		window.addEventListener("blur", handleAbort);
		document.addEventListener("drop", handleAbort);
		document.addEventListener("dragend", handleAbort);
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			document.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("blur", handleAbort);
			document.removeEventListener("drop", handleAbort);
			document.removeEventListener("dragend", handleAbort);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [isDragging, resetDrag]);

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.setDragImage(emptyImg, 0, 0);

		setDragData({ dataTransfer: e.dataTransfer, dragData });
		e.dataTransfer.effectAllowed = "copy";

		setDragPosition({ x: e.clientX, y: e.clientY });
		setIsDragging(true);

		onDragStart?.({ e });
	};

	const handleDragEnd = () => {
		resetDrag();
	};

	return (
		<>
			{variant === "card" ? (
				<div
					ref={dragRef}
					className={cn(
						// `w-full` instead of the old hard-coded `w-28` so the
						// card actually fills the grid column width that the
						// parent `minmax(assetCardSize, 1fr)` layout produced.
						// Without this the column is e.g. 200px wide but the
						// card stays at 112px with empty space on the sides.
						"group relative w-full",
						containerClassName,
					)}
				>
					<div
						className={cn(
							// `w-full` propagates the parent's width down so
							// the AspectRatio can pick it up. Previously the
							// card was sized `w-28` (hard-coded 112px) which
							// meant the AspectRatio rendered a 112px-wide
							// thumbnail regardless of the user's chosen
							// card size or the column width.
							"asset-preview-container relative flex h-auto w-full cursor-default flex-col gap-1",
							className,
						)}
					>
						<div className="asset-preview-overlay" />
						<AspectRatio
							ratio={aspectRatio}
							className={cn(
								"relative overflow-hidden w-full h-full p-[2px] z-10 mx-auto",
								isRounded && "rounded-sm",
								isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
							)}
							draggable={isDraggable}
							onDragStart={isDraggable ? handleDragStart : undefined}
							onDragEnd={isDraggable ? handleDragEnd : undefined}
						>
							{preview}
							{!isDragging && (
								<PlusButton
									className="opacity-0 transition-opacity group-hover:opacity-100 bg-black/50 hover:bg-black/80 border border-white/10 text-cyan-400 z-20"
									onClick={handleAddToTimeline}
								/>
							)}
						</AspectRatio>
					</div>
					{shouldShowLabel && (
						<div className="mt-1 flex w-full justify-center">
							<MarqueeText
								className="text-foreground z-10 w-full text-center text-[0.7rem] font-medium drop-shadow-md"
								pxPerSecond={30}
							>
								{name}
							</MarqueeText>
						</div>
					)}
				</div>
			) : (
				<div
					ref={dragRef}
					className={cn("group relative w-full", containerClassName)}
				>
					<button
						type="button"
						className={cn(
							"flex h-8 w-full cursor-default items-center gap-3 px-1 outline-none",
							isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
							className,
						)}
						draggable={isDraggable}
						onDragStart={isDraggable ? handleDragStart : undefined}
						onDragEnd={isDraggable ? handleDragEnd : undefined}
					>
						<div className="size-6 shrink-0 overflow-hidden rounded-sm">
							{preview}
						</div>
						<span className="w-full flex-1 truncate text-sm text-left">
							{name}
						</span>
					</button>
				</div>
			)}

			{isDraggable &&
				isDragging &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="pointer-events-none fixed z-9999"
						style={{
							left: dragPosition.x - 40,
							top: dragPosition.y - 40,
						}}
					>
						<div className="w-[80px]">
							<AspectRatio
								ratio={1}
								className="ring-primary relative overflow-hidden rounded-md shadow-2xl ring-3"
							>
								<div className="size-full [&_img]:size-full [&_img]:rounded-none [&_img]:object-cover">
									{preview}
								</div>
								{shouldShowPlusOnDrag && (
									<PlusButton
										onClick={handleAddToTimeline}
										tooltipText="Add to timeline or drag to position"
									/>
								)}
							</AspectRatio>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}

function PlusButton({
	className,
	onClick,
	tooltipText,
}: {
	className?: string;
	onClick?: () => void;
	tooltipText?: string;
}) {
	const button = (
		<Button
			size="icon"
			className={cn(
				"bg-background hover:bg-background text-foreground absolute right-2 bottom-2 size-5",
				className,
			)}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick?.();
			}}
			title={tooltipText}
		>
			<Plus />
		</Button>
	);

	if (tooltipText) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p>{tooltipText}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	return button;
}
