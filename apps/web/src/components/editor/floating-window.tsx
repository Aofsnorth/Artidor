"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { MaximizeIcon as WindowMaximizeIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";
import {
	useEditorUIStore,
	type FloatablePanelId,
	type FloatingPanelState,
} from "@/stores/editor-ui-store";
import { useSettingsStore } from "@/stores/settings-store";

interface FloatingWindowProps {
	id: FloatablePanelId;
	title: string;
	state: FloatingPanelState;
	children: React.ReactNode;
}

/**
 * Copy all stylesheets from the parent document into the child window's
 * head so the panel content renders identically in the new window.
 */
function copyStylesToChild(childDoc: Document): void {
	// Copy <style> tags
	const styles = document.querySelectorAll("style");
	for (const style of styles) {
		const clone = childDoc.createElement("style");
		clone.textContent = style.textContent;
		childDoc.head.appendChild(clone);
	}

	// Copy <link rel="stylesheet"> tags
	const links = document.querySelectorAll('link[rel="stylesheet"]');
	for (const link of links) {
		const clone = childDoc.createElement("link");
		clone.rel = "stylesheet";
		clone.href = (link as HTMLLinkElement).href;
		childDoc.head.appendChild(clone);
	}

	// Copy <link rel="preload" as="font"> for web fonts
	const fontLinks = document.querySelectorAll('link[rel="preload"][as="font"]');
	for (const link of fontLinks) {
		const clone = childDoc.createElement("link");
		clone.rel = "preload";
		clone.as = "font";
		clone.href = (link as HTMLLinkElement).href;
		clone.crossOrigin = "anonymous";
		childDoc.head.appendChild(clone);
	}
}

/**
 * A panel that opens in a separate browser window using `window.open()`.
 * The panel content is rendered via React's `createPortal` into the new
 * window's document, so the React tree (context, state, effects) remains
 * in the parent window while the DOM lives in the child window.
 *
 * When the child window is closed (by the user or the OS), the panel
 * automatically docks back to its grid slot.
 */
export function FloatingWindow({
	id,
	title,
	state,
	children,
}: FloatingWindowProps) {
	const dockPanel = useEditorUIStore((s) => s.dockPanel);
	const childWindowRef = useRef<Window | null>(null);
	const [childContainer, setChildContainer] = useState<HTMLElement | null>(null);

	// Open a new browser window on mount, close it on unmount
	useEffect(() => {
		const features = [
			`width=${state.width}`,
			`height=${state.height}`,
			`left=${state.x}`,
			`top=${state.y}`,
			"menubar=no",
			"toolbar=no",
			"location=no",
			"status=no",
			"resizable=yes",
			"scrollbars=no",
		].join(",");

		const childWin = window.open("", `artidor-panel-${id}`, features);
		if (!childWin) {
			// Popup blocked — dock back immediately
			dockPanel(id);
			return;
		}

		childWindowRef.current = childWin;

		// Set up the child window's document
		childWin.document.title = `${title} — Artidor`;
		childWin.document.body.style.margin = "0";
		childWin.document.body.style.padding = "0";
		childWin.document.body.style.overflow = "hidden";
		childWin.document.body.style.background = "#09090b";
		childWin.document.body.style.color = "#fff";
		childWin.document.body.style.fontFamily = "inherit";

		// Copy styles from parent
		copyStylesToChild(childWin.document);

		// Create a container for React to render into
		const container = childWin.document.createElement("div");
		container.id = "artidor-popout-root";
		container.style.width = "100%";
		container.style.height = "100vh";
		container.style.overflow = "hidden";
		childWin.document.body.appendChild(container);

		setChildContainer(container);

		// Listen for the child window being closed by the user
		const checkWindowClosed = () => {
			if (childWin.closed) {
				dockPanel(id);
				return;
			}
			// Poll periodically — there's no reliable "close" event on a
			// window opened via window.open() from the opener's perspective.
			requestAnimationFrame(checkWindowClosed);
		};
		const rafId = requestAnimationFrame(checkWindowClosed);

		return () => {
			cancelAnimationFrame(rafId);
			if (childWindowRef.current && !childWindowRef.current.closed) {
				childWindowRef.current.close();
			}
			childWindowRef.current = null;
			setChildContainer(null);
		};
	}, [id, title, dockPanel, state.x, state.y, state.width, state.height]);

	if (!childContainer) return null;

	return createPortal(
		<div className="flex size-full flex-col overflow-hidden bg-[#09090b]">
			{/* Minimal header — the browser window already has its own title bar */}
			<div className="flex h-8 shrink-0 items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-3">
				<span className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
					{title}
				</span>
				<button
					type="button"
					className="grid size-6 place-items-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white"
					onClick={() => dockPanel(id)}
					title="Dock panel back to editor"
				>
					<HugeiconsIcon icon={WindowMaximizeIcon} className="size-3.5" />
				</button>
			</div>

			{/* Panel content fills the rest of the window */}
			<div className="flex-1 overflow-hidden">{children}</div>
		</div>,
		childContainer,
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
				{title} is in a separate window
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
	const enablePopoutPanels = useSettingsStore(
		(s) => s.enablePopoutPanels,
	);

	// When disabled in settings, hide the button entirely so it doesn't
	// interfere with the workflow.
	if (!enablePopoutPanels) return null;

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
			title={`Pop out ${title} to new window`}
		>
			<HugeiconsIcon icon={WindowMaximizeIcon} className="size-3.5" />
		</button>
	);
}
