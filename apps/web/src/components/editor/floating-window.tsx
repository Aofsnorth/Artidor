"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { MultiplicationSignIcon, MaximizeIcon as WindowMaximizeIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import {
	useEditorUIStore,
	type FloatablePanelId,
	type FloatingPanelState,
} from "@/stores/editor-ui-store";

interface FloatingWindowProps {
	id: FloatablePanelId;
	title: string;
	state: FloatingPanelState;
	children: React.ReactNode;
}

const HEADER_HEIGHT = 32;

/**
 * A draggable, resizable floating window that escapes the editor layout grid.
 * Renders its children via portal so it can float over all other content.
 * Updates the `editor-ui-store` continuously while dragging/resizing so layout
 * is preserved on reload.
 */
export function FloatingWindow({
	id,
	title,
	state,
	children,
}: FloatingWindowProps) {
	const setPosition = useEditorUIStore((s) => s.setFloatingPanelPosition);
	const dockPanel = useEditorUIStore((s) => s.dockPanel);
	const [mounted, setMounted] = useState(false);
	const windowRef = useRef<HTMLDivElement>(null);

	// The actual transient state while dragging/resizing, pushed to zustand on commit
	const [bounds, setBounds] = useState(state);

	useEffect(() => {
		setMounted(true);
		// Keep local bounds in sync if store changes externally
		setBounds(state);
	}, [state]);

	const handleHeaderPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		e.preventDefault();
		const startX = e.clientX;
		const startY = e.clientY;
		const startBounds = { ...bounds };

		const onPointerMove = (moveEvent: PointerEvent) => {
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;
			setBounds({
				...startBounds,
				x: startBounds.x + dx,
				y: Math.max(0, startBounds.y + dy), // prevent dragging header off top edge
			});
		};

		const onPointerUp = () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			// Commit final bounds
			setPosition({
				id,
				position: {
					x: windowRef.current?.offsetLeft ?? bounds.x,
					y: windowRef.current?.offsetTop ?? bounds.y,
					width: bounds.width,
					height: bounds.height,
				},
			});
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	const handleResizePointerDown = (
		e: React.PointerEvent,
		direction: "se" | "e" | "s",
	) => {
		if (e.button !== 0) return;
		e.preventDefault();
		e.stopPropagation();

		const startX = e.clientX;
		const startY = e.clientY;
		const startBounds = { ...bounds };

		const onPointerMove = (moveEvent: PointerEvent) => {
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;

			const newWidth =
				direction === "e" || direction === "se"
					? Math.max(280, startBounds.width + dx)
					: startBounds.width;
			const newHeight =
				direction === "s" || direction === "se"
					? Math.max(220, startBounds.height + dy)
					: startBounds.height;

			setBounds({
				...startBounds,
				width: newWidth,
				height: newHeight,
			});
		};

		const onPointerUp = () => {
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			setPosition({
				id,
				position: {
					x: bounds.x,
					y: bounds.y,
					width: windowRef.current?.offsetWidth ?? bounds.width,
					height: windowRef.current?.offsetHeight ?? bounds.height,
				},
			});
		};

		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
	};

	if (!mounted) return null;

	return createPortal(
		<div
			ref={windowRef}
			className="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/95 shadow-2xl backdrop-blur-xl ring-1 ring-black/5"
			style={{
				left: bounds.x,
				top: bounds.y,
				width: bounds.width,
				height: bounds.height,
			}}
		>
			{/* Draggable Header */}
			<div
				className="flex shrink-0 cursor-grab items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-3 active:cursor-grabbing"
				style={{ height: HEADER_HEIGHT }}
				onPointerDown={handleHeaderPointerDown}
				onDoubleClick={() => dockPanel(id)}
			>
				<span className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
					{title}
				</span>
				<button
					type="button"
					className="grid size-6 place-items-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white"
					onClick={(e) => {
						e.stopPropagation();
						dockPanel(id);
					}}
					title="Dock panel"
				>
					<HugeiconsIcon icon={WindowMaximizeIcon} className="size-3.5" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">{children}</div>

			{/* Resize handles */}
			<div
				className="absolute bottom-0 right-0 z-10 size-4 cursor-nwse-resize"
				onPointerDown={(e) => handleResizePointerDown(e, "se")}
			/>
			<div
				className="absolute bottom-0 left-0 right-4 z-10 h-1 cursor-ns-resize"
				onPointerDown={(e) => handleResizePointerDown(e, "s")}
			/>
			<div
				className="absolute bottom-4 right-0 top-[32px] z-10 w-1 cursor-ew-resize"
				onPointerDown={(e) => handleResizePointerDown(e, "e")}
			/>
		</div>,
		document.body,
	);
}

/**
 * Placeholder rendered in the editor's grid slot when a panel is floating.
 * Provides a button to instantly dock the panel back to its slot.
 */
export function DockPlaceholder({
	id,
	title,
}: {
	id: FloatablePanelId;
	title: string;
}) {
	const dockPanel = useEditorUIStore((s) => s.dockPanel);

	return (
		<div className="flex size-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
			<span className="text-sm font-medium text-white/40">
				{title} is floating
			</span>
			<button
				type="button"
				className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
				onClick={() => dockPanel(id)}
			>
				<HugeiconsIcon icon={WindowMaximizeIcon} className="size-3.5" />
				Dock panel
			</button>
		</div>
	);
}

export function PopOutButton({
	id,
	title,
	className,
}: {
	id: FloatablePanelId;
	title: string;
	className?: string;
}) {
	const popOutPanel = useEditorUIStore((s) => s.popOutPanel);

	return (
		<button
			type="button"
			className={cn(
				"absolute right-2 top-2 z-30 grid size-7 place-items-center rounded-md border border-white/[0.08] bg-black/35 text-white/45 opacity-0 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 hover:text-white group-hover/panel-slot:opacity-100",
				className,
			)}
			onClick={(e) => {
				e.stopPropagation();
				popOutPanel(id);
			}}
			title={`Pop out ${title}`}
		>
			<HugeiconsIcon icon={WindowMaximizeIcon} className="size-3.5" />
		</button>
	);
}
