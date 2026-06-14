"use client";

import { create } from "zustand";

export interface TeleprompterState {
	open: boolean;
	script: string;
	settings: {
		scrollSpeed: number;
		fontSize: number;
		textColor: string;
		backgroundColor: string;
		mirrored: boolean;
		highlightLine: boolean;
	};
	isPlaying: boolean;
}

interface TeleprompterStore extends TeleprompterState {
	setOpen: (open: boolean) => void;
	setScript: (script: string) => void;
	setSetting: <K extends keyof TeleprompterState["settings"]>(
		key: K,
		value: TeleprompterState["settings"][K],
	) => void;
	setPlaying: (isPlaying: boolean) => void;
	reset: () => void;
}

const DEFAULT_STATE: TeleprompterState = {
	open: false,
	script: "",
	settings: {
		scrollSpeed: 60,
		fontSize: 48,
		textColor: "#ffffff",
		backgroundColor: "#000000",
		mirrored: false,
		highlightLine: true,
	},
	isPlaying: false,
};

export const useTeleprompterStore = create<TeleprompterStore>()((set) => ({
	...DEFAULT_STATE,
	setOpen: (open) => set({ open }),
	setScript: (script) => set({ script }),
	setSetting: (key, value) =>
		set((s) => ({ settings: { ...s.settings, [key]: value } })),
	setPlaying: (isPlaying) => set({ isPlaying }),
	reset: () => set(DEFAULT_STATE),
}));
