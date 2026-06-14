import { DefinitionRegistry } from "@/lib/registry";
import type { TransitionDefinition } from "./types";

export class TransitionsRegistry extends DefinitionRegistry<string, TransitionDefinition> {
	constructor() {
		super("transition");
	}
}

export const transitionsRegistry = new TransitionsRegistry();
