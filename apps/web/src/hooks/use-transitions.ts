import { useCallback } from "react";
import { useEditor } from "@/hooks/use-editor";
import type { Transition } from "@/lib/timeline";
import { transitionsRegistry } from "@/lib/transitions";
import {
	AddTransitionCommand,
	RemoveTransitionCommand,
	UpdateTransitionCommand,
} from "@/lib/commands/scene/transition";
import { generateUUID } from "@/utils/id";

export function useTransitions(): {
	transitions: Transition[];
	addTransition: (params: Omit<Transition, "id">) => Transition;
	removeTransition: (id: string) => void;
	updateTransition: (id: string, patch: Partial<Transition>) => void;
} {
	const editor = useEditor();
	const transitions = useEditor(
		(e) => e.scenes.getActiveScene()?.transitions ?? [],
	);

	const addTransition = useCallback(
		(params: Omit<Transition, "id">): Transition => {
			const transition: Transition = { id: generateUUID(), ...params };
			editor.command.execute({
				command: new AddTransitionCommand(transition),
			});
			return transition;
		},
		[editor],
	);

	const removeTransition = useCallback(
		(id: string) => {
			editor.command.execute({
				command: new RemoveTransitionCommand(id),
			});
		},
		[editor],
	);

	const updateTransition = useCallback(
		(id: string, patch: Partial<Transition>) => {
			editor.command.execute({
				command: new UpdateTransitionCommand(id, patch),
			});
		},
		[editor],
	);

	return { transitions, addTransition, removeTransition, updateTransition };
}

export function useActiveTransitionsAtTime({ time }: { time: number }): Array<{
	transition: Transition;
	definition: ReturnType<typeof transitionsRegistry.get>;
}> {
	const transitions = useEditor(
		(e) => e.scenes.getActiveScene()?.transitions ?? [],
	);

	return transitions
		.filter((t) => time >= t.startTime && time < t.startTime + t.duration)
		.map((transition) => ({
			transition,
			definition: transitionsRegistry.get(transition.transitionType),
		}));
}
