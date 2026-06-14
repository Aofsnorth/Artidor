"use client";

import { useTeleprompterStore } from "@/stores/teleprompter-store";
import type { EditorCore } from "@/core";

export class TeleprompterManager {
	constructor(editor: EditorCore) {
		void editor;
	}

	open(): void {
		useTeleprompterStore.getState().setOpen(true);
	}

	close(): void {
		useTeleprompterStore.getState().setOpen(false);
	}

	toggle(): void {
		const state = useTeleprompterStore.getState();
		state.setOpen(!state.open);
	}
}
