import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene, Transition } from "@/lib/timeline";
import { updateSceneInArray } from "@/lib/scenes";
import { transitionsRegistry } from "@/lib/transitions/registry";

/**
 * Overlap window shared by add + update validation: the transition lives
 * INSIDE the intersection of the two clips (min(endA,endB)-max(startA,startB)).
 * Returns null when either clip is missing or the clips do not overlap.
 */
export function getTransitionOverlapWindow({
	tracks,
	fromTrackId,
	fromElementId,
	toTrackId,
	toElementId,
}: {
	tracks: TScene["tracks"];
	fromTrackId: string;
	fromElementId: string;
	toTrackId: string;
	toElementId: string;
}): { overlapStart: number; overlapEnd: number } | null {
	const find = (trackId: string, elementId: string) => {
		const allTracks = [
			...tracks.overlay,
			tracks.main,
			...tracks.overlayAfter,
			...tracks.audio,
		];
		const track = allTracks.find((candidate) => candidate.id === trackId);
		const element = track?.elements.find(
			(candidate) => candidate.id === elementId,
		);
		return element ?? null;
	};
	const from = find(fromTrackId, fromElementId);
	const to = find(toTrackId, toElementId);
	if (!from || !to) return null;
	const overlapStart = Math.max(from.startTime, to.startTime);
	const overlapEnd = Math.min(
		from.startTime + from.duration,
		to.startTime + to.duration,
	);
	if (overlapEnd <= overlapStart) return null;
	return { overlapStart, overlapEnd };
}

/**
 * Clamp a requested (startTime, duration) into the overlap window and the
 * definition's [minDuration, maxDuration] (+ both clip durations). Throws on
 * missing clips / zero overlap so callers fail loudly instead of storing a
 * transition outside both clips.
 */
export function clampTransitionToOverlap({
	tracks,
	transitionType,
	fromTrackId,
	fromElementId,
	toTrackId,
	toElementId,
	startTime,
	duration,
}: {
	tracks: TScene["tracks"];
	transitionType: string;
	fromTrackId: string;
	fromElementId: string;
	toTrackId: string;
	toElementId: string;
	startTime: number;
	duration: number;
}): { startTime: number; duration: number } {
	const window = getTransitionOverlapWindow({
		tracks,
		fromTrackId,
		fromElementId,
		toTrackId,
		toElementId,
	});
	if (!window) {
		throw new Error("Transition clips missing or do not overlap");
	}
	const definition = transitionsRegistry.get(transitionType);
	const overlapLength = window.overlapEnd - window.overlapStart;
	const clampedDuration = Math.max(
		definition.minDuration,
		Math.min(duration, overlapLength, definition.maxDuration),
	);
	const clampedStartTime = Math.max(
		window.overlapStart,
		Math.min(startTime, window.overlapEnd - clampedDuration),
	);
	return { startTime: clampedStartTime, duration: clampedDuration };
}

export class AddTransitionCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(private transition: Transition) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		// Existence + overlap + same-scene (single-scene store: both clips
		// must resolve in THIS scene) + known definition. Throws otherwise.
		const { startTime, duration } = clampTransitionToOverlap({
			tracks: activeScene.tracks,
			transitionType: this.transition.transitionType,
			fromTrackId: this.transition.fromTrackId,
			fromElementId: this.transition.fromElementId,
			toTrackId: this.transition.toTrackId,
			toElementId: this.transition.toElementId,
			startTime: this.transition.startTime,
			duration: this.transition.duration,
		});

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const currentTransitions = activeScene.transitions ?? [];
		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: {
				transitions: [
					...currentTransitions,
					{ ...this.transition, startTime, duration },
				],
			},
		});
		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}

export class RemoveTransitionCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(private transitionId: string) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const currentTransitions = activeScene.transitions ?? [];
		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: {
				transitions: currentTransitions.filter(
					(t) => t.id !== this.transitionId,
				),
			},
		});
		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}

export class UpdateTransitionCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(
		private transitionId: string,
		private patch: Partial<Transition>,
	) {
		super();
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const existing = (activeScene.transitions ?? []).find(
			(t) => t.id === this.transitionId,
		);
		if (!existing) {
			throw new Error("Transition not found");
		}
		const merged: Transition = { ...existing, ...this.patch };
		// Re-validate the merged endpoints: patched clip refs or geometry
		// must still exist, overlap, and stay in this scene.
		const { startTime, duration } = clampTransitionToOverlap({
			tracks: activeScene.tracks,
			transitionType: merged.transitionType,
			fromTrackId: merged.fromTrackId,
			fromElementId: merged.fromElementId,
			toTrackId: merged.toTrackId,
			toElementId: merged.toElementId,
			startTime: merged.startTime,
			duration: merged.duration,
		});

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const currentTransitions = activeScene.transitions ?? [];
		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: {
				transitions: currentTransitions.map((t) =>
					t.id === this.transitionId ? { ...merged, startTime, duration } : t,
				),
			},
		});
		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}
}
