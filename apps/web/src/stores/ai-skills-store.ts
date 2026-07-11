/**
 * AI Skills store — persists user-defined "macro" skills created by the
 * AI copilot or the user. A skill is a declarative sequence of tool calls
 * (a recipe) that can be replayed later.
 *
 * Security model:
 *  - A skill only contains references to EXISTING registered tools and
 *    their arguments. No arbitrary code, no eval, no shell execution.
 *  - When replayed, each step is validated and executed through the same
 *    `executeTool` path as a live AI tool call, so all safety checks
 *    (argument validation, permission gates, history) still apply.
 *  - Skills are scoped per-project (stored in the project's metadata) so
 *    they don't leak across projects. The persist key includes the
 *    project id when used; the global store below is a fallback for
 *    project-less contexts.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { browserStorage } from "@/stores/browser-storage";

/**
 * A single step in a skill recipe: one tool call with its arguments.
 * The `toolName` must match a registered tool in the AI tool registry.
 * The `args` are the JSON arguments passed to that tool.
 */
export interface AiSkillStep {
	toolName: string;
	args: Record<string, unknown>;
}

/**
 * A saved skill (macro/recipe). Created by the AI or user, replayed on
 * demand. Each skill is a named, ordered list of tool calls.
 */
export interface AiSkill {
	id: string;
	name: string;
	description: string;
	steps: AiSkillStep[];
	createdAt: number;
}

interface AiSkillsState {
	skills: AiSkill[];
	/** Add or replace a skill (upsert by id). */
	saveSkill: (skill: AiSkill) => void;
	/** Delete a skill by id. Returns true if a skill was removed. */
	deleteSkill: (id: string) => boolean;
	/** Get a skill by id. */
	getSkill: (id: string) => AiSkill | undefined;
	/** Clear all skills. */
	clearSkills: () => void;
}

function generateId(): string {
	return `skill_${crypto.randomUUID()}`;
}

export const useAiSkillsStore = create<AiSkillsState>()(
	persist(
		(set, get) => ({
			skills: [],

			saveSkill: (skill) =>
				set((state) => {
					const existingIndex = state.skills.findIndex(
						(s) => s.id === skill.id,
					);
					if (existingIndex >= 0) {
						const next = [...state.skills];
						next[existingIndex] = skill;
						return { skills: next };
					}
					return { skills: [...state.skills, skill] };
				}),

			deleteSkill: (id) => {
				const before = get().skills.length;
				set((state) => ({
					skills: state.skills.filter((s) => s.id !== id),
				}));
				return get().skills.length < before;
			},

			getSkill: (id) => get().skills.find((s) => s.id === id),

			clearSkills: () => set({ skills: [] }),
		}),
		{
			name: "artidor-ai-skills",
			storage: browserStorage,
		},
	),
);

/**
 * Create a new skill with a generated id. Helper for the AI tool executor.
 */
export function createSkill(input: {
	name: string;
	description: string;
	steps: AiSkillStep[];
}): AiSkill {
	return {
		id: generateId(),
		name: input.name,
		description: input.description,
		steps: input.steps,
		createdAt: Date.now(),
	};
}
