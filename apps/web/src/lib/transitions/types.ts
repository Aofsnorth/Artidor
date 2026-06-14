export type TransitionCategory = "fade" | "slide" | "zoom" | "wipe" | "glitch";

export type TransitionDirection = "in" | "out" | "cross";

export interface TransitionParams {
	duration: number;
	direction: TransitionDirection;
}

export interface TransitionDefinition {
	type: string;
	name: string;
	keywords: string[];
	category: TransitionCategory;
	/** Default duration in ticks. */
	defaultDuration: number;
	minDuration: number;
	maxDuration: number;
	directions: TransitionDirection[];
	/**
	 * CSS animation hint for UI-only preview overlay.
	 * Returns a CSS keyframe descriptor (style block) for the canvas wrapper.
	 */
	previewStyle: (params: TransitionParams) => string;
	/**
	 * Easing function name for the CSS keyframe.
	 */
	easing: string;
}
