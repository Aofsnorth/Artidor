import { Command, type CommandResult } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene, Transition } from "@/lib/timeline";
import { updateSceneInArray } from "@/lib/scenes";

export class AddTransitionCommand extends Command {
	private savedScenes: TScene[] | null = null;

	constructor(private transition: Transition) {
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
			updates: { transitions: [...currentTransitions, this.transition] },
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

		const scenes = editor.scenes.getScenes();
		this.savedScenes = [...scenes];

		const currentTransitions = activeScene.transitions ?? [];
		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: activeScene.id,
			updates: {
				transitions: currentTransitions.map((t) =>
					t.id === this.transitionId ? { ...t, ...this.patch } : t,
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
