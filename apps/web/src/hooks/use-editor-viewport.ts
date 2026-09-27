"use client";

/**
 * Editor viewport breakpoints — "Compatible with different screen sizes".
 *
 * The editor layout is percentage-based, so at narrow window widths the
 * resizable side panels (Assets / Properties) shrink proportionally and
 * become unusable long before anything actually breaks. This hook classifies
 * the window width into three breakpoints so `EditorPanels` can apply
 * pixel floors to the side panels (and tuck away secondary chrome) while the
 * window is narrow, without touching the user's saved percentage preset.
 *
 * Pure helpers are exported separately so the classification logic is
 * unit-testable without a DOM.
 */

import { useSyncExternalStore } from "react";

export type EditorViewport = "compact" | "medium" | "wide";

/** Below this width the editor is in compact mode. */
export const EDITOR_VIEWPORT_COMPACT_PX = 1024;
/** From this width up the editor is wide (unadapted, percentage layout). */
export const EDITOR_VIEWPORT_MEDIUM_PX = 1440;

export function resolveEditorViewport(width: number): EditorViewport {
	if (width < EDITOR_VIEWPORT_COMPACT_PX) return "compact";
	if (width < EDITOR_VIEWPORT_MEDIUM_PX) return "medium";
	return "wide";
}

/** The two docked side panels that get pixel floors on narrow windows. */
export type SidePanelId = "tools" | "properties";

export interface SidePanelConstraints {
	minSize: string;
	maxSize: string;
}

/** Wide (≥1440px) keeps the historical percentage bounds. */
const WIDE_SIDE_PANEL: SidePanelConstraints = {
	minSize: "15%",
	maxSize: "40%",
};

/**
 * Bounds for a docked side panel at the given viewport. On narrow windows
 * the percentage `minSize` lets the panel collapse to an unusable sliver
 * (15% of a 900px window is 135px), so the floor switches to pixels and the
 * ceiling relaxes a little — the floor needs headroom to be satisfiable
 * alongside the preview's own 30% minimum.
 */
export function sidePanelConstraints(
	viewport: EditorViewport,
	panel: SidePanelId,
): SidePanelConstraints {
	if (viewport === "wide") return WIDE_SIDE_PANEL;
	if (viewport === "medium") {
		return {
			minSize: panel === "tools" ? "220px" : "200px",
			maxSize: "45%",
		};
	}
	return {
		minSize: panel === "tools" ? "176px" : "160px",
		maxSize: "60%",
	};
}

function subscribe(onChange: () => void): () => void {
	window.addEventListener("resize", onChange);
	return () => window.removeEventListener("resize", onChange);
}

function getClientViewport(): EditorViewport {
	return resolveEditorViewport(window.innerWidth);
}

function getServerViewport(): EditorViewport {
	return "wide";
}

/**
 * Current editor viewport breakpoint, kept in sync with `window.innerWidth`
 * via `useSyncExternalStore` (SSR-safe: renders as "wide" on the server and
 * settles to the real breakpoint right after hydration). The snapshot is a
 * plain string, so React skips re-renders while the breakpoint is unchanged
 * — resize events between breakpoints cost nothing.
 */
export function useEditorViewport(): EditorViewport {
	return useSyncExternalStore(subscribe, getClientViewport, getServerViewport);
}
