import type { TransitionDefinition } from "../types";

export const skewTransition: TransitionDefinition = {
	type: "skew",
	name: "Skew",
	keywords: ["skew", "tilt", "distort"],
	category: "slide",
	defaultDuration: 500,
	minDuration: 200,
	maxDuration: 1500,
	directions: ["in", "out"],
	previewStyle: ({ direction }) =>
		`@keyframes transition-skew-${direction}{0%{transform:skewX(${direction === "in" ? 30 : 0}deg) translateX(${direction === "in" ? 100 : 0}%);opacity:${direction === "in" ? 0 : 1};}100%{transform:skewX(0deg) translateX(0);opacity:1;}}`,
	easing: "cubic-bezier(0.4,0,0.2,1)",
};
