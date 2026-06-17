"use client";

import { create } from "zustand";
import type { ElementRef } from "@/lib/timeline";

interface SavePresetDialogState {
	isOpen: boolean;
	/** The element refs queued for saving when the dialog confirms. */
	elements: ElementRef[];
	defaultName: string;
	openDialog: (params: { elements: ElementRef[]; defaultName: string }) => void;
	close: () => void;
}

export const useSavePresetDialogStore = create<SavePresetDialogState>(
	(set) => ({
		isOpen: false,
		elements: [],
		defaultName: "",
		openDialog: ({ elements, defaultName }) =>
			set({ isOpen: true, elements, defaultName }),
		close: () => set({ isOpen: false, elements: [], defaultName: "" }),
	}),
);
