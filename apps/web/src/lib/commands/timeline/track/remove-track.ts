import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { SceneTracks, TScene } from "@/lib/timeline";

export class RemoveTrackCommand extends Command {
	private savedScene: TScene | null = null;

	constructor(private trackId: string) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		this.savedScene = activeScene;
		const savedState = activeScene.tracks;
		const removedTrack =
			savedState.overlay.find((track) => track.id === this.trackId) ??
			(savedState.main.id === this.trackId ? savedState.main : null) ??
			savedState.overlayAfter.find((track) => track.id === this.trackId) ??
			savedState.audio.find((track) => track.id === this.trackId) ??
			null;
		// No-op: unknown id or main track. Must not touch updateTracks — the
		// command manager pushes every execute() to history, so a no-op write
		// would leave a dead undo step.
		if (!removedTrack || removedTrack.id === savedState.main.id) {
			this.savedScene = null;
			return undefined;
		}
		const removedElementIds = new Set(
			removedTrack.elements.map((element) => element.id),
		);
		const removedTrackIds = new Set([removedTrack.id]);
		const updatedTracks: SceneTracks = {
			...savedState,
			// Video (and other visual) tracks added below the main
			// track live in `overlayAfter` — without filtering this
			// list, the X button on those tracks silently did nothing.
			overlay: savedState.overlay.filter((track) => track.id !== this.trackId),
			overlayAfter: savedState.overlayAfter.filter(
				(track) => track.id !== this.trackId,
			),
			audio: savedState.audio.filter((track) => track.id !== this.trackId),
		};
		editor.timeline.updateTracks(updatedTracks);
		// Strip transitions referencing the removed lane/elements. Guarded:
		// old unit mocks may not provide setScenes/getScenes; the production
		// TimelineManager.updateTracks path persists tracks regardless.
		if (
			(activeScene.transitions ?? []).some(
				(transition) =>
					removedTrackIds.has(transition.fromTrackId) ||
					removedTrackIds.has(transition.toTrackId) ||
					removedElementIds.has(transition.fromElementId) ||
					removedElementIds.has(transition.toElementId),
			)
		) {
			editor.scenes.setScenes({
				scenes: editor.scenes.getScenes().map((scene) =>
					scene.id !== activeScene.id
						? scene
						: {
								...scene,
								tracks: updatedTracks,
								transitions: (scene.transitions ?? []).filter(
									(transition) =>
										!removedTrackIds.has(transition.fromTrackId) &&
										!removedTrackIds.has(transition.toTrackId) &&
										!removedElementIds.has(transition.fromElementId) &&
										!removedElementIds.has(transition.toElementId),
								),
							},
				),
			});
		}
		// Clear refs into the removed lane (delete-elements returns {select: []}
		// for the same reason); undo restores the prior selection via history.
		return { select: [] };
	}

	undo(): void {
		// Tracks always restore via timeline.updateTracks (mock-compatible).
		// Transitions restore too when the manager mock provides scenes state.
		if (this.savedScene) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedScene.tracks);
			if (
				this.savedScene.transitions !== undefined &&
				typeof editor.scenes.setScenes === "function" &&
				typeof editor.scenes.getScenes === "function"
			) {
				const savedScene = this.savedScene;
				editor.scenes.setScenes({
					scenes: editor.scenes
						.getScenes()
						.map((scene) =>
							scene.id !== savedScene.id
								? scene
								: { ...scene, transitions: savedScene.transitions },
						),
				});
			}
		}
	}
}
