import type {
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
} from "@/lib/animation/types";

export type AnimationPresetCategory =
	| "entrance"
	| "emphasis"
	| "exit"
	| "combo"
	| "loop";

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
