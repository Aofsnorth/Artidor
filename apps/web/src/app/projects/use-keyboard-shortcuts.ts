"use client";

/**
 * useKeyboardShortcuts — global-ish keybindings for the projects
 * page. Returns nothing; mutates the projects store / triggers
 * the action callbacks.
 *
 *   `/`           focus the search bar
 *   `N`           open the New project dialog
 *   `Esc`         clear search + selection
 *   `↑/↓`         move keyboard focus through the project list
 *   `Enter`       open the focused project
 *   `Shift+↑/↓`   extend selection (range)
 *
 * Bindings are skipped when the user is typing in an editable
 * element (input, textarea, contenteditable) or in a dropdown
 * menu / dialog.
 */

import { useEffect } from "react";
import { useProjectsStore } from "@/app/projects/store";

const isEditable = (el: EventTarget | null): boolean => {
	if (!(el instanceof HTMLElement)) return false;
	if (el.isContentEditable) return true;
	const tag = el.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		el.getAttribute("role") === "textbox"
	);
};

export interface KeyboardShortcutHandlers {
	/** Called when `N` is pressed. Should focus the New-project action. */
	onCreateNew: () => void;
	/** Called when `↑/↓` lands on a project id (already resolved
	   by the caller — we hand them the id). */
	onFocusProject: (id: string) => void;
	/** Called when the user presses `Enter` on a focused project. */
	onOpenProject: (id: string) => void;
}

export function useProjectsKeyboardShortcuts({
	projectIds,
	handlers,
}: {
	projectIds: string[];
	handlers: KeyboardShortcutHandlers;
}) {
	const {
		searchQuery,
		setSearchQuery,
		clearSelectedProjects,
		selectedProjectIds,
		setProjectSelected,
		selectProjectRange,
	} = useProjectsStore();

	useEffect(() => {
		const handler = (event: KeyboardEvent) => {
			// Don't hijack typing in an input / textarea.
			if (isEditable(event.target)) return;
			// Don't trigger when a modal / menu is open (those
			// already have their own keybindings — Escape, arrow
			// keys for navigation, etc).
			if (event.defaultPrevented) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;

			switch (event.key) {
				case "/": {
					event.preventDefault();
					// Focus the search input. The page gives it a
					// stable id so we can grab it from anywhere.
					const input = document.getElementById(
						"projects-search-input",
					) as HTMLInputElement | null;
					if (input) {
						input.focus();
						input.select();
					}
					return;
				}
				case "n":
				case "N": {
					event.preventDefault();
					handlers.onCreateNew();
					return;
				}
				case "Escape": {
					if (searchQuery) {
						setSearchQuery({ query: "" });
						clearSelectedProjects();
					} else if (selectedProjectIds.length > 0) {
						clearSelectedProjects();
					}
					return;
				}
				case "ArrowDown":
				case "ArrowUp": {
					if (projectIds.length === 0) return;
					event.preventDefault();
					const lastSelected =
						selectedProjectIds[selectedProjectIds.length - 1] ?? null;
					const currentIndex = lastSelected
						? projectIds.indexOf(lastSelected)
						: -1;
					const direction = event.key === "ArrowDown" ? 1 : -1;
					const nextIndex = Math.max(
						0,
						Math.min(
							projectIds.length - 1,
							currentIndex < 0 ? 0 : currentIndex + direction,
						),
					);
					const nextId = projectIds[nextIndex];
					if (event.shiftKey && lastSelected) {
						selectProjectRange({
							projectId: nextId,
							allProjectIds: projectIds,
						});
					} else {
						// Single-select replacement (clear previous).
						for (const id of selectedProjectIds) {
							setProjectSelected({ projectId: id, isSelected: false });
						}
						setProjectSelected({ projectId: nextId, isSelected: true });
					}
					handlers.onFocusProject(nextId);
					return;
				}
				case "Enter": {
					if (selectedProjectIds.length === 1) {
						event.preventDefault();
						handlers.onOpenProject(selectedProjectIds[0]);
					}
					return;
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [
		projectIds,
		searchQuery,
		selectedProjectIds,
		setSearchQuery,
		clearSelectedProjects,
		setProjectSelected,
		selectProjectRange,
		handlers,
	]);
}
