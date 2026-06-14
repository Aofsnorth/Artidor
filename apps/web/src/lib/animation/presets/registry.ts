import { DefinitionRegistry } from "@/lib/registry";
import type { AnimationPreset } from "./types";

export class AnimationPresetsRegistry extends DefinitionRegistry<string, AnimationPreset> {
	constructor() {
		super("animationPreset");
	}
}

export const animationPresetsRegistry = new AnimationPresetsRegistry();
