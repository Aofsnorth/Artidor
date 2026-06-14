import { EditorCore } from "@/core";
import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TimelineTrack } from "@/lib/timeline";

export type TrackPropertyUpdates = Partial<Pick<TimelineTrack, "name">>;

export class UpdateTrackCommand extends Command {
	private savedState: SceneTracks | null = null;

	constructor(
		private params: {
			trackId: string;
			updates: TrackPropertyUpdates;
		},
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const scene = editor.scenes.getActiveSceneOrNull();
		if (!scene) return undefined;

		this.savedState = scene.tracks;

		const updatedTracks = this.applyUpdates(scene.tracks);
		editor.timeline.updateTracks(updatedTracks);
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			EditorCore.getInstance().timeline.updateTracks(this.savedState);
		}
	}

	private applyUpdates(tracks: SceneTracks): SceneTracks {
		return {
			...tracks,
			overlay: tracks.overlay.map((t) =>
				t.id === this.params.trackId ? this.applyUpdatesToTrack(t) : t,
			),
			main:
				tracks.main.id === this.params.trackId
					? this.applyUpdatesToTrack(tracks.main)
					: tracks.main,
			audio: tracks.audio.map((t) =>
				t.id === this.params.trackId ? this.applyUpdatesToTrack(t) : t,
			),
		};
	}

	private applyUpdatesToTrack<TTrack extends TimelineTrack>(
		track: TTrack,
	): TTrack {
		return { ...track, ...this.params.updates };
	}
}
