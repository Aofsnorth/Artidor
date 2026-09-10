"use client";

import { useOpenDialogsStore } from "@/stores/open-dialogs-store";
import { useTeleprompterStore } from "@/stores/teleprompter-store";
import type { EditorCore } from "@/core";

export class TeleprompterManager {
	constructor(editor: EditorCore) {
		void editor;
	}

	// The mounted <TeleprompterDialog> reads useOpenDialogsStore (key
	// "teleprompter"). The old code toggled the orphaned
	// useTeleprompterStore.open flag that no component reads, so open()
	// silently did nothing. Stop playback on close so audio/scroll state
	// from a previous session never resumes on the next open.
	open(): void {
		useOpenDialogsStore.getState().setOpen("teleprompter", true);
	}

	close(): void {
		useOpenDialogsStore.getState().setOpen("teleprompter", false);
		useTeleprompterStore.getState().setPlaying(false);
	}

	toggle(): void {
		const dialogs = useOpenDialogsStore.getState();
		const next = !(dialogs.open.teleprompter ?? false);
		if (next) {
			this.open();
		} else {
			this.close();
		}
	}
}
