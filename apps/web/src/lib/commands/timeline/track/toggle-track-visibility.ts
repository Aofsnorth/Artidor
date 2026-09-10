import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks } from "@/lib/timeline";
import { EditorCore } from "@/core";
import {
	canTrackBeHidden,
	findTrackInSceneTracks,
	updateTrackInSceneTracks,
} from "@/lib/timeline";

export class ToggleTrackVisibilityCommand extends Command {
	private savedState: SceneTracks | null = null;

	constructor(private trackId: string) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;

		const targetTrack = findTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
		});
		// No-op: unknown id or incompatible type. Must not write or the
		// command manager leaves a dead history step behind.
		if (!targetTrack || !canTrackBeHidden(targetTrack)) {
			this.savedState = null;
			return undefined;
		}

		const updatedTracks = updateTrackInSceneTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			update: (track) => ({
				...track,
				hidden: !(track as { hidden: boolean }).hidden,
			}),
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
