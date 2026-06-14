import { create } from "zustand";
import type { EditorCore } from "@/core";
import type { Transition } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { updateSceneInArray } from "@/lib/scenes";

interface TransitionsState {
	transitions: Transition[];
	selectedTransitionId: string | null;
	setTransitions: (transitions: Transition[]) => void;
	addTransition: (transition: Transition) => void;
	removeTransition: (id: string) => void;
	updateTransition: (id: string, patch: Partial<Transition>) => void;
	clearTransitions: () => void;
}

export const useTransitionsStore = create<TransitionsState>((set) => ({
	transitions: [],
	selectedTransitionId: null,
	setTransitions: (transitions) => set({ transitions }),
	addTransition: (transition) =>
		set((state) => ({ transitions: [...state.transitions, transition] })),
	removeTransition: (id) =>
		set((state) => ({
			transitions: state.transitions.filter((t) => t.id !== id),
			selectedTransitionId:
				state.selectedTransitionId === id ? null : state.selectedTransitionId,
		})),
	updateTransition: (id, patch) =>
		set((state) => ({
			transitions: state.transitions.map((t) =>
				t.id === id ? { ...t, ...patch } : t,
			),
		})),
	clearTransitions: () => set({ transitions: [], selectedTransitionId: null }),
}));

export function createTransitionId(): string {
	return generateUUID();
}

export function buildTransition({
	transitionType,
	fromTrackId,
	fromElementId,
	toTrackId,
	toElementId,
	startTime,
	duration,
}: Omit<Transition, "id">): Transition {
	return {
		id: createTransitionId(),
		transitionType,
		fromTrackId,
		fromElementId,
		toTrackId,
		toElementId,
		startTime,
		duration,
	};
}

export function applyTransitionsToScene({
	editor,
	transitions,
}: {
	editor: EditorCore;
	transitions: Transition[];
}): void {
	const project = editor.project.getActive();
	if (!project) return;
	const scene = project.scenes.find((s) => s.isMain);
	if (!scene) return;
	const scenes = editor.scenes.getScenes();
	const updatedScenes = updateSceneInArray({
		scenes,
		sceneId: scene.id,
		updates: { transitions },
	});
	editor.scenes.setScenes({ scenes: updatedScenes });
}
