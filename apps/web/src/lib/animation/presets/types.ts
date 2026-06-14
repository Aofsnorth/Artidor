import type {
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
} from "@/lib/animation/types";

export type AnimationPresetCategory = "entrance" | "exit" | "combo";

export interface AnimationPresetKeyframe {
	propertyPath: AnimationPath;
	time: number;
	value: AnimationValue;
	interpolation?: AnimationInterpolation;
}

export interface AnimationPreset {
	id: string;
	type: string;
	name: string;
	keywords: string[];
	category: AnimationPresetCategory;
	/** Total duration in ticks. */
	duration: number;
	keyframes: (params: { elementDuration: number }) => AnimationPresetKeyframe[];
}
