import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TScene } from "@/lib/timeline";
import { EditorCore } from "@/core";
import type { TimelineTrack } from "@/lib/timeline";

function removeTrackElements<TTrack extends TimelineTrack>({
	track,
	elements,
}: {
	track: TTrack;
	elements: { trackId: string; elementId: string }[];
}): TTrack {
	const nextElements = track.elements.filter(
		(element) =>
			!elements.some(
				(target) =>
					target.trackId === track.id && target.elementId === element.id,
			),
	);

	return { ...track, elements: nextElements } as TTrack;
}

export class DeleteElementsCommand extends Command {
	private savedScene: TScene | null = null;
	private readonly elements: { trackId: string; elementId: string }[];

	constructor({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}) {
		super();
		this.elements = elements;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		this.savedScene = activeScene;

		const updatedTracks: SceneTracks = {
			...activeScene.tracks,
			overlay: activeScene.tracks.overlay.map((track) =>
				removeTrackElements({ track, elements: this.elements }),
			),
			main: removeTrackElements({
				track: activeScene.tracks.main,
				elements: this.elements,
			}),
			overlayAfter: activeScene.tracks.overlayAfter.map((track) =>
				removeTrackElements({ track, elements: this.elements }),
			),
			audio: activeScene.tracks.audio.map((track) =>
				removeTrackElements({ track, elements: this.elements }),
			),
		};

		const removedElementIds = new Set(
			this.elements.map((element) => element.elementId),
		);
		const removedTrackIds = new Set(
			this.elements.map((element) => element.trackId),
		);
		editor.timeline.updateTracks(updatedTracks);
		// Transitions referencing deleted clips/tracks dangle otherwise;
		// the renderer never reads them today, but stale ids break
		// existence/same-scene validation on re-add.
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

		return {
			select: [],
		};
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
